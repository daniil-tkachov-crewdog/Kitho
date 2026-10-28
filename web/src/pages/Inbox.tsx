import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { errorText, getLikesReceived, listChats, photoUrls, subscribeMyChats, type ChatSummary, type InboxLike, type Profile } from '../lib/api'

type Chat = ChatSummary & { profile: Profile }
type Data = { likes: InboxLike[]; chats: Chat[]; urls: Record<string, string> }

const when = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })

function chatLabel(c: Chat, uid: string): string | null {
  if (c.status === 'declined') return 'Declined'
  if (c.status === 'pending') return c.initiator_id === uid ? 'Waiting for reply' : 'New letter'
  if (!c.last_message_at) return 'New match — say hi!'
  return null
}

export default function Inbox() {
  const { session } = useAuth()
  const uid = session!.user.id
  const [tab, setTab] = useState<'likes' | 'chats'>('chats')
  const [data, setData] = useState<Data | null>(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const [likes, chats] = await Promise.all([getLikesReceived(uid), listChats()])
      const paths = [...likes, ...chats].map((r) => r.profile.photos[0]?.path).filter(Boolean) as string[]
      const urls = paths.length ? await photoUrls([...new Set(paths)]) : {}
      setData({ likes, chats, urls })
    } catch (e) {
      setError(errorText(e))
    }
  }, [uid])

  useEffect(() => {
    load()
    return subscribeMyChats(load)
  }, [load])

  const unread = data?.chats.reduce((n, c) => n + c.unread, 0) ?? 0
  const avatar = (p: Profile) => {
    const photo = p.photos[0] && data?.urls[p.photos[0].path]
    return photo ? <img className="avatar" src={photo} alt={p.name} /> : <div className="avatar" />
  }

  return (
    <div className="container narrow">
      <div className="page-head"><h1>Inbox</h1></div>
      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'chats'} className={tab === 'chats' ? 'on' : ''} onClick={() => setTab('chats')}>
          Chats{unread ? ` (${unread} new)` : ''}
        </button>
        <button role="tab" aria-selected={tab === 'likes'} className={tab === 'likes' ? 'on' : ''} onClick={() => setTab('likes')}>
          Who liked me{data ? ` (${data.likes.length})` : ''}
        </button>
      </div>
      {error && <div className="alert alert-error">{error}</div>}
      {!data && !error && <div className="spinner" aria-label="Loading" />}
      {data && tab === 'likes' && (
        <div className="list">
          {!data.likes.length && <p className="muted">No likes yet. They’ll show up here.</p>}
          {data.likes.map(({ created_at, profile: p }) => (
            <div className="list-item" key={p.id}>
              {avatar(p)}
              <div className="body">
                <strong>{p.name}, {p.age}</strong> <span className="muted">· {p.location}</span>
                <div><time dateTime={created_at}>{when(created_at)}</time></div>
              </div>
            </div>
          ))}
        </div>
      )}
      {data && tab === 'chats' && (
        <div className="list">
          {!data.chats.length && <p className="muted">No chats yet. Match with someone or send a letter to start one.</p>}
          {data.chats.map((c) => {
            const label = chatLabel(c, uid)
            const at = c.last_message_at ?? c.created_at
            return (
              <Link className="list-item chat-item" to={`/chat/${c.id}`} key={c.id}>
                {avatar(c.profile)}
                <div className="body">
                  <strong>{c.profile.name}, {c.profile.age}</strong> <span className="muted">· {c.profile.location}</span>
                  <div><time dateTime={at}>{when(at)}</time>{label && <span className="chat-label"> · {label}</span>}</div>
                  {c.last_body && <p className="chat-preview">{c.last_sender_id === uid ? 'You: ' : ''}{c.last_body}</p>}
                </div>
                {c.unread > 0 && <span className="badge" aria-label={`${c.unread} unread`}>{c.unread}</span>}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
