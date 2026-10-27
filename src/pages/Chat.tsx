import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import {
  declineChat, errorText, getChat, getMessages, likeProfile, markChatRead, photoUrls, sendMessage, subscribeChat,
  type ChatDetail, type Message,
} from '../lib/api'
import { ChevronLeftIcon } from '../components/Icons'

const time = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })

export default function Chat() {
  const { id = '' } = useParams()
  const { session } = useAuth()
  const uid = session!.user.id
  const navigate = useNavigate()
  const [chat, setChat] = useState<ChatDetail | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [photo, setPhoto] = useState<string | null>(null)
  const [missing, setMissing] = useState(false)
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [c, msgs] = await Promise.all([getChat(uid, id), getMessages(id)])
        if (cancelled) return
        if (!c) return setMissing(true)
        setChat(c)
        setMessages(msgs)
        const path = c.profile.photos[0]?.path
        if (path) setPhoto((await photoUrls([path]))[path] ?? null)
        markChatRead(id).catch(() => {})
      } catch (e) {
        if (!cancelled) setError(errorText(e))
      }
    })()
    const unsubscribe = subscribeChat(
      id,
      (m) => {
        setMessages((list) => (list.some((x) => x.id === m.id) ? list : [...list, m]))
        if (m.sender_id !== uid) markChatRead(id).catch(() => {})
      },
      (s) => setChat((c) => c && { ...c, ...s }),
    )
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [id, uid])

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [messages.length])

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError('')
    try {
      await action()
    } catch (e) {
      setError(errorText(e))
    } finally {
      setBusy(false)
    }
  }

  function onSend(e: FormEvent) {
    e.preventDefault()
    const text = body.trim()
    if (!chat || !text) return
    run(async () => {
      await sendMessage(chat.profile.id, text)
      setBody('')
      setMessages(await getMessages(id))
      setChat((c) => c && (c.status === 'pending' && c.initiator_id !== uid ? { ...c, status: 'active' } : c))
    })
  }

  if (missing) {
    return (
      <div className="container narrow">
        <div className="empty panel"><h2>Chat not found</h2><Link to="/inbox" className="btn btn-ghost">Back to inbox</Link></div>
      </div>
    )
  }
  if (!chat) return error ? <div className="container narrow"><div className="alert alert-error">{error}</div></div> : <div className="spinner" aria-label="Loading" />

  const p = chat.profile
  const isSender = chat.initiator_id === uid
  const waiting = chat.status === 'pending' && isSender
  const letterForMe = chat.status === 'pending' && !isSender
  const closed = chat.status === 'declined'
  const canWrite = !waiting && !closed

  return (
    <div className="container narrow chat">
      <div className="chat-head">
        <Link to="/inbox" className="chat-back" aria-label="Back to inbox"><ChevronLeftIcon /></Link>
        {photo ? <img className="avatar" src={photo} alt={p.name} /> : <div className="avatar" />}
        <div>
          <strong>{p.name}, {p.age}</strong>
          <div className="muted">{p.location}</div>
        </div>
      </div>

      <div className="chat-thread">
        {!messages.length && <p className="muted chat-note">It’s a match! Say hi to {p.name}.</p>}
        {messages.map((m) => (
          <div key={m.id} className={`bubble ${m.sender_id === uid ? 'mine' : 'theirs'}`}>
            <p>{m.body}</p>
            <time dateTime={m.created_at}>{time(m.created_at)}</time>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {waiting && <p className="muted chat-note">Letter sent. You can write again once {p.name} replies.</p>}
      {closed && <p className="muted chat-note">{isSender ? `${p.name} declined your letter.` : 'You declined this letter.'} This conversation is closed.</p>}
      {letterForMe && (
        <div className="chat-letter-actions">
          <span className="muted">{p.name} sent you a letter. Reply, like back, or decline.</span>
          <div className="actions">
            <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => run(async () => {
              await likeProfile(uid, p.id)
              setChat((c) => c && { ...c, status: 'active' })
            })}>Like back</button>
            <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => run(async () => {
              await declineChat(chat.id)
              navigate('/inbox')
            })}>Decline</button>
          </div>
        </div>
      )}
      {canWrite && (
        <form className="chat-input" onSubmit={onSend}>
          <textarea
            className="textarea"
            rows={1}
            maxLength={2000}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) onSend(e)
            }}
            placeholder={letterForMe ? `Reply to ${p.name}…` : 'Write a message…'}
          />
          <button className="btn btn-primary" disabled={busy || !body.trim()}>Send</button>
        </form>
      )}
    </div>
  )
}
