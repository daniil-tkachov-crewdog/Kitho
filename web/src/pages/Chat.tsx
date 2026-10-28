import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import {
  declineChat, errorText, getChat, getMessages, likeProfile, markChatRead, photoUrls, reportProfile, sendMessage, subscribeChat,
  toggleMessageLike, REPORT_REASONS, type ChatDetail, type Message, type ReportReason,
} from '../lib/api'
import Modal from '../components/Modal'
import { AlertIcon, ChevronLeftIcon, HeartIcon } from '../components/Icons'

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
  const [reportOpen, setReportOpen] = useState(false)
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
      uid,
      id,
      (m) => {
        setMessages((list) => upsert(list, m))
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

  function onLike(m: Message) {
    run(async () => {
      const liked = await toggleMessageLike(m.id)
      setMessages((list) =>
        list.map((x) => (x.id === m.id ? { ...x, liked_by: liked ? [...x.liked_by.filter((u) => u !== uid), uid] : x.liked_by.filter((u) => u !== uid) } : x)),
      )
    })
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
        <div className="chat-who">
          <strong>{p.name}, {p.age}</strong>
          <div className="muted">{p.location}</div>
        </div>
        <button className="chat-report" onClick={() => setReportOpen(true)} aria-label={`Report ${p.name}`} title="Report">
          <AlertIcon />
        </button>
      </div>

      <div className="chat-thread">
        {!messages.length && <p className="muted chat-note">It’s a match! Say hi to {p.name}.</p>}
        {messages.map((m) => {
          const mine = m.sender_id === uid
          const likedByMe = m.liked_by.includes(uid)
          const seen = new Date(m.created_at).getTime() <= new Date(chat.other_read_at).getTime()
          return (
            <div key={m.id} className={`msg ${mine ? 'mine' : 'theirs'}`}>
              <div className="msg-row">
                <div className="bubble" onDoubleClick={() => onLike(m)}>
                  <p>{m.body}</p>
                  <time dateTime={m.created_at}>{time(m.created_at)}</time>
                  {m.liked_by.length > 0 && (
                    <span className="bubble-likes" aria-label={`${m.liked_by.length} like${m.liked_by.length > 1 ? 's' : ''}`}>
                      <HeartIcon />{m.liked_by.length > 1 && m.liked_by.length}
                    </span>
                  )}
                </div>
                <button
                  className={`msg-like${likedByMe ? ' on' : ''}`}
                  onClick={() => onLike(m)}
                  disabled={busy}
                  aria-label={likedByMe ? 'Unlike message' : 'Like message'}
                  aria-pressed={likedByMe}
                >
                  <HeartIcon />
                </button>
              </div>
              {mine && <div className="msg-status">{seen ? 'Seen' : 'Delivered'}</div>}
            </div>
          )
        })}
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
      {reportOpen && (
        <ReportModal
          name={p.name}
          onClose={() => setReportOpen(false)}
          onSubmit={(reason, details) => reportProfile(uid, p.id, reason, details)}
        />
      )}
    </div>
  )
}

const upsert = (list: Message[], m: Message) =>
  list.some((x) => x.id === m.id) ? list.map((x) => (x.id === m.id ? m : x)) : [...list, m]

function ReportModal({ name, onClose, onSubmit }: {
  name: string
  onClose: () => void
  onSubmit: (reason: ReportReason, details: string) => Promise<void>
}) {
  const [reason, setReason] = useState<ReportReason | ''>('')
  const [details, setDetails] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!reason) return
    setBusy(true)
    setError('')
    try {
      await onSubmit(reason, details.trim())
      setDone(true)
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <Modal title="Report sent" onClose={onClose}>
        <p className="muted">Thanks. Our team will review your report about {name}.</p>
        <div className="modal-actions"><button className="btn btn-primary" onClick={onClose}>Close</button></div>
      </Modal>
    )
  }

  return (
    <Modal title={`Report ${name}`} onClose={onClose}>
      <form onSubmit={submit}>
        <p className="muted">Why are you reporting this person? They won’t know it was you.</p>
        {error && <div className="alert alert-error">{error}</div>}
        <div className="report-reasons" role="radiogroup" aria-label="Reason">
          {REPORT_REASONS.map((r) => (
            <label key={r.code} className={`report-reason${reason === r.code ? ' on' : ''}`}>
              <input type="radio" name="reason" value={r.code} checked={reason === r.code} onChange={() => setReason(r.code)} />
              {r.label}
            </label>
          ))}
        </div>
        <div className="field">
          <textarea
            className="textarea report-details"
            maxLength={1000}
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="Add details (optional)"
          />
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-danger" disabled={busy || !reason}>Report</button>
        </div>
      </form>
    </Modal>
  )
}
