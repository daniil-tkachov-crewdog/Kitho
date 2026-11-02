import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import {
  AdminAuthError, getAdminChat, getAdminChats, getGreetingSettings, saveGreetingSettings, sendToUser,
  type AdminChatDetail, type GreetingSettings,
} from '../../lib/admin'
import { errorText } from '../../lib/api'
import { formatDateTime, useAdminData } from './useAdminData'

const POLL_MS = 5000

/** Greeting settings + user ↔ admin chats. `openUser` preselects a chat (e.g. from the Users tab). */
export default function AdminMessagesTab({ onExpired, openUser }: { onExpired: () => void; openUser: string | null }) {
  const { data: chats, error, refresh } = useAdminData(getAdminChats, POLL_MS, onExpired)
  const [selected, setSelected] = useState<string | null>(openUser)

  useEffect(() => {
    if (openUser) setSelected(openUser)
  }, [openUser])

  return (
    <section>
      <h2>Admin Messages</h2>
      <GreetingForm onExpired={onExpired} />
      <h3>Chats</h3>
      {error && <div className="alert alert-error">{error}</div>}
      <div className="admin-chats">
        <div className="admin-chat-list">
          {chats && !chats.length && !selected && <p className="muted">No chats yet.</p>}
          {chats?.map((c) => {
            const at = c.last_message_at ?? c.created_at
            return (
              <button key={c.user_id} className={`admin-chat-item${c.user_id === selected ? ' on' : ''}`} onClick={() => setSelected(c.user_id)}>
                <div className="admin-chat-item-head">
                  <strong>{c.name}</strong> <span className="mono muted">{c.personal_id ?? ''}</span>
                  {c.unread > 0 && <span className="badge" aria-label={`${c.unread} unread`}>{c.unread}</span>}
                </div>
                <div className="muted admin-chat-time">{formatDateTime(at)}</div>
                {c.last_body && <p className="chat-preview">{c.last_from_admin ? 'You: ' : ''}{c.last_body}</p>}
              </button>
            )
          })}
        </div>
        <div className="admin-chat-pane">
          {selected ? <ChatPane key={selected} userId={selected} onExpired={onExpired} onChange={refresh} /> : <p className="muted">Select a chat.</p>}
        </div>
      </div>
    </section>
  )
}

function GreetingForm({ onExpired }: { onExpired: () => void }) {
  const [settings, setSettings] = useState<GreetingSettings | null>(null)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const fail = useCallback((e: unknown) => {
    if (e instanceof AdminAuthError) onExpired()
    else setMessage({ ok: false, text: errorText(e) })
  }, [onExpired])

  useEffect(() => {
    getGreetingSettings().then((s) => {
      setSettings(s)
      setText(s.greeting_text)
    }, fail)
  }, [fail])

  if (!settings) return message ? <div className="alert alert-error">{message.text}</div> : null

  async function save(next: GreetingSettings, note: string) {
    setBusy(true)
    setMessage(null)
    try {
      const saved = await saveGreetingSettings(next)
      setSettings(saved)
      setMessage({ ok: true, text: note })
    } catch (e) {
      fail(e)
    } finally {
      setBusy(false)
    }
  }

  const on = settings.greeting_enabled
  return (
    <div className="admin-card">
      <label className="toggle">
        <input
          type="checkbox"
          role="switch"
          checked={on}
          disabled={busy}
          onChange={() => save({ ...settings, greeting_enabled: !on }, on ? 'Greeting turned off.' : 'Greeting turned on.')}
        />
        <span className="toggle-track" aria-hidden="true" />
        <span>Greeting message</span>
      </label>
      <p className="muted">Sent automatically from “Admin” to each new user when they create their profile.</p>
      <div className="field">
        <textarea
          className="textarea admin-greeting"
          maxLength={2000}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write the greeting message…"
        />
      </div>
      {message && <div className={`alert ${message.ok ? 'alert-ok' : 'alert-error'}`}>{message.text}</div>}
      <button className="btn btn-primary" disabled={busy || text === settings.greeting_text} onClick={() => save({ ...settings, greeting_text: text }, 'Saved.')}>
        Save
      </button>
    </div>
  )
}

function ChatPane({ userId, onExpired, onChange }: { userId: string; onExpired: () => void; onChange: () => void }) {
  const load = useCallback(() => getAdminChat(userId), [userId])
  const { data, error } = useAdminData(load, POLL_MS, onExpired)
  const [chat, setChat] = useState<AdminChatDetail | null>(null)
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [sendError, setSendError] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (data) setChat(data)
  }, [data])

  useEffect(() => {
    if (chat) onChange() // refresh unread counts once this chat has been read
  }, [chat?.messages.length]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'nearest' })
  }, [chat?.messages.length])

  async function onSend(e: FormEvent) {
    e.preventDefault()
    const text = body.trim()
    if (!text) return
    setBusy(true)
    setSendError('')
    try {
      setChat(await sendToUser(userId, text))
      setBody('')
    } catch (err) {
      if (err instanceof AdminAuthError) onExpired()
      else setSendError(errorText(err))
    } finally {
      setBusy(false)
    }
  }

  if (!chat) return error ? <div className="alert alert-error">{error}</div> : <div className="spinner" aria-label="Loading" />

  const readAt = chat.user_read_at ? new Date(chat.user_read_at).getTime() : -Infinity
  const lastMine = [...chat.messages].reverse().find((m) => m.from_admin)

  return (
    <div className="admin-chat">
      <div className="admin-chat-title"><strong>{chat.name}</strong></div>
      <div className="chat-thread admin-chat-thread">
        {!chat.messages.length && <p className="muted chat-note">No messages yet. Say hi to {chat.name}.</p>}
        {chat.messages.map((m) => (
          <div key={m.id} className={`msg ${m.from_admin ? 'mine' : 'theirs'}`}>
            <div className="bubble">
              <p>{m.body}</p>
              <time dateTime={m.created_at}>{formatDateTime(m.created_at)}</time>
            </div>
            {m === lastMine && <div className="msg-status">{new Date(m.created_at).getTime() <= readAt ? 'Seen' : 'Delivered'}</div>}
          </div>
        ))}
        <div ref={endRef} />
      </div>
      {(sendError || error) && <div className="alert alert-error">{sendError || error}</div>}
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
          placeholder={`Message ${chat.name}…`}
        />
        <button className="btn btn-primary" disabled={busy || !body.trim()}>Send</button>
      </form>
    </div>
  )
}
