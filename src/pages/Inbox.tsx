import { useEffect, useState } from 'react'
import { useAuth } from '../lib/auth'
import { errorText, getInbox, photoUrls, type InboxLike, type InboxMessage } from '../lib/api'

type Data = { likes: InboxLike[]; messages: InboxMessage[]; urls: Record<string, string> }

const when = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })

export default function Inbox() {
  const { session } = useAuth()
  const uid = session!.user.id
  const [tab, setTab] = useState<'likes' | 'messages'>('likes')
  const [data, setData] = useState<Data | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    ;(async () => {
      try {
        const inbox = await getInbox(uid)
        const paths = [...inbox.likes, ...inbox.messages].map((r) => r.profile.photos[0]?.path).filter(Boolean) as string[]
        const urls = paths.length ? await photoUrls([...new Set(paths)]) : {}
        setData({ ...inbox, urls })
      } catch (e) {
        setError(errorText(e))
      }
    })()
  }, [uid])

  return (
    <div className="container narrow">
      <div className="page-head"><h1>Inbox</h1></div>
      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'likes'} className={tab === 'likes' ? 'on' : ''} onClick={() => setTab('likes')}>
          Who liked me{data ? ` (${data.likes.length})` : ''}
        </button>
        <button role="tab" aria-selected={tab === 'messages'} className={tab === 'messages' ? 'on' : ''} onClick={() => setTab('messages')}>
          Messages{data ? ` (${data.messages.length})` : ''}
        </button>
      </div>
      {error && <div className="alert alert-error">{error}</div>}
      {!data && !error && <div className="spinner" aria-label="Loading" />}
      {data && (
        <div className="list">
          {tab === 'likes' && !data.likes.length && <p className="muted">No likes yet. They’ll show up here.</p>}
          {tab === 'messages' && !data.messages.length && <p className="muted">No messages yet. Greetings people send you will show up here.</p>}
          {(tab === 'likes'
            ? data.likes.map((r) => ({ key: r.profile.id, body: null, ...r }))
            : data.messages.map((r) => ({ key: r.id, ...r }))
          ).map(({ key, body, created_at, profile: p }) => {
            const photo = p.photos[0] && data.urls[p.photos[0].path]
            return (
              <div className="list-item" key={key}>
                {photo ? <img className="avatar" src={photo} alt={p.name} /> : <div className="avatar" />}
                <div className="body">
                  <strong>{p.name}, {p.age}</strong> <span className="muted">· {p.location}</span>
                  <div><time dateTime={created_at}>{when(created_at)}</time></div>
                  {body && <p>{body}</p>}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
