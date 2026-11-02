import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import {
  errorText, getAdminMessages, getMyAdminChat, markAdminChatRead, sendAdminMessage, subscribeAdminChat, type AdminMessage,
} from '../lib/api'
import { ChevronLeftIcon } from '../components/Icons'

const time = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })

/** The user's direct chat with the Kitho admin (no likes, reports or letters). */
export default function AdminChat() {
  const { session } = useAuth()
  const uid = session!.user.id
  const [messages, setMessages] = useState<AdminMessage[] | null>(null)
  const [adminReadAt, setAdminReadAt] = useState('-infinity')
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [chat, msgs] = await Promise.all([getMyAdminChat(), getAdminMessages()])
        if (cancelled) return
        setMessages(msgs)
        if (chat) {
          setAdminReadAt(chat.admin_read_at)
          markAdminChatRead().catch(() => {})
        }
      } catch (e) {
        if (!cancelled) setError(errorText(e))
      }
    })()
    const unsubscribe = subscribeAdminChat(
      uid,
      (m) => {
        setMessages((list) => (list && !list.some((x) => x.id === m.id) ? [...list, m] : list))
        if (m.from_admin) markAdminChatRead().catch(() => {})
      },
      setAdminReadAt,
    )
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [uid])

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [messages?.length])

  async function onSend(e: FormEvent) {
    e.preventDefault()
    const text = body.trim()
    if (!text) return
    setBusy(true)
    setError('')
    try {
      await sendAdminMessage(text)
      setBody('')
      setMessages(await getAdminMessages())
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }

  if (!messages) return error ? <div className="container narrow"><div className="alert alert-error">{error}</div></div> : <div className="spinner" aria-label="Loading" />

  const lastMine = [...messages].reverse().find((m) => !m.from_admin)
  const readAt = new Date(adminReadAt).getTime()

  return (
    <div className="container narrow chat">
      <div className="chat-head inbox-admin">
        <Link to="/inbox" className="chat-back" aria-label="Back to inbox"><ChevronLeftIcon /></Link>
        <div className="avatar" aria-hidden="true">K</div>
        <div className="chat-who">
          <strong>Admin</strong><span className="admin-tag">Kitho</span>
          <div className="muted">The Kitho team</div>
        </div>
      </div>

      <div className="chat-thread">
        {!messages.length && <p className="muted chat-note">Questions or ideas? Write to the Kitho team here.</p>}
        {messages.map((m) => (
          <div key={m.id} className={`msg ${m.from_admin ? 'theirs' : 'mine'}`}>
            <div className="bubble">
              <p>{m.body}</p>
              <time dateTime={m.created_at}>{time(m.created_at)}</time>
            </div>
            {m === lastMine && <div className="msg-status">{new Date(m.created_at).getTime() <= readAt ? 'Seen' : 'Delivered'}</div>}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {error && <div className="alert alert-error">{error}</div>}
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
          placeholder="Write a message…"
        />
        <button className="btn btn-primary" disabled={busy || !body.trim()}>Send</button>
      </form>
    </div>
  )
}
