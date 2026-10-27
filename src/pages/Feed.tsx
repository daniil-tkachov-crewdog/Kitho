import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '../lib/auth'
import { errorText, getFeedPage, getSentState, likeProfile, photoUrls, sendGreeting, type Profile } from '../lib/api'
import PhotoCarousel from '../components/PhotoCarousel'
import Modal from '../components/Modal'
import { HeartIcon, PinIcon } from '../components/Icons'

const PAGE = 20
const posKey = (uid: string) => `kitho.feedPos.${uid}`

function readPos(uid: string): number {
  try {
    const n = Number(localStorage.getItem(posKey(uid)))
    return Number.isFinite(n) && n >= 0 ? n : 0
  } catch {
    return 0
  }
}

type Batch = { start: number; items: Profile[]; liked: Set<string>; messaged: Set<string> }

export default function Feed() {
  const { session } = useAuth()
  const uid = session!.user.id
  const [pos, setPos] = useState(() => readPos(uid))
  const [batch, setBatch] = useState<Batch | null>(null)
  const [urls, setUrls] = useState<string[]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [msgOpen, setMsgOpen] = useState(false)

  const start = Math.floor(pos / PAGE) * PAGE

  useEffect(() => {
    try {
      localStorage.setItem(posKey(uid), String(pos))
    } catch {
      /* storage unavailable — position just won't persist */
    }
  }, [uid, pos])

  // Load the page containing `pos`. Past the end → wrap around to the first profile.
  useEffect(() => {
    if (batch?.start === start) return
    let cancelled = false
    ;(async () => {
      try {
        const items = await getFeedPage(uid, start, PAGE)
        if (cancelled) return
        if (!items.length && start > 0) return setPos(0)
        const { liked, messaged } = await getSentState(uid, items.map((p) => p.id))
        if (!cancelled) setBatch({ start, items, liked, messaged })
      } catch (e) {
        if (!cancelled) setError(errorText(e))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [uid, start, batch?.start])

  const current = batch && batch.start === start ? batch.items[pos - start] : undefined
  const reachedEnd = !!batch && batch.start === start && batch.items.length > 0 && !current

  useEffect(() => {
    if (!reachedEnd) return
    setBatch(null) // reload so new profiles show up on the next lap
    setPos(0)
  }, [reachedEnd])

  useEffect(() => {
    setUrls([])
    if (!current) return
    let cancelled = false
    photoUrls(current.photos.map((p) => p.path))
      .then((map) => !cancelled && setUrls(current.photos.map((p) => map[p.path]).filter(Boolean)))
      .catch((e) => !cancelled && setError(errorText(e)))
    return () => {
      cancelled = true
    }
  }, [current])

  const next = useCallback(() => {
    setError('')
    setPos((p) => p + 1)
  }, [])

  async function onLike() {
    if (!current || !batch) return
    setBusy(true)
    setError('')
    try {
      await likeProfile(uid, current.id)
      setBatch({ ...batch, liked: new Set(batch.liked).add(current.id) })
    } catch (e) {
      setError(errorText(e))
    } finally {
      setBusy(false)
    }
  }

  if (error && !batch) return <div className="feed-wrap"><div className="alert alert-error">{error}</div></div>
  if (!batch || (batch.start !== start)) return <div className="spinner" aria-label="Loading" />

  if (!batch.items.length) {
    return (
      <div className="feed-wrap">
        <div className="empty panel">
          <h2>No one here yet</h2>
          <p className="muted">You’re early! New profiles will show up here as people join. Check back soon.</p>
        </div>
      </div>
    )
  }
  if (!current) return <div className="spinner" aria-label="Loading" />

  const liked = batch.liked.has(current.id)
  const messaged = batch.messaged.has(current.id)

  return (
    <div className="feed-wrap">
      {error && <div className="alert alert-error">{error}</div>}
      <article className="profile-card">
        <PhotoCarousel urls={urls} alt={current.name} />
        <div className="profile-body">
          <div className="profile-meta">
            <h2>{current.name}, <span>{current.age}</span></h2>
            <div className="loc"><PinIcon /> {current.location}</div>
            {current.description && <p className="bio">{current.description}</p>}
          </div>
          <div className="actions">
            <button className="btn btn-ghost" onClick={next}>Sweep</button>
            <button className={`btn btn-ghost action-like${liked ? ' on' : ''}`} onClick={onLike} disabled={busy || liked}>
              <HeartIcon className="" /> {liked ? 'Liked' : 'Like'}
            </button>
            <button className="btn btn-primary" onClick={() => setMsgOpen(true)} disabled={messaged}>
              {messaged ? 'Sent' : 'Message'}
            </button>
          </div>
        </div>
      </article>
      {msgOpen && (
        <GreetingModal
          name={current.name}
          onClose={() => setMsgOpen(false)}
          onSend={async (body) => {
            await sendGreeting(uid, current.id, body)
            setBatch((b) => b && { ...b, messaged: new Set(b.messaged).add(current.id) })
            setMsgOpen(false)
          }}
        />
      )}
    </div>
  )
}

function GreetingModal({ name, onClose, onSend }: { name: string; onClose: () => void; onSend: (body: string) => Promise<void> }) {
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await onSend(body.trim())
    } catch (err) {
      setError(errorText(err))
      setBusy(false)
    }
  }

  return (
    <Modal title={`Say hello to ${name}`} onClose={onClose}>
      <form onSubmit={submit}>
        <p className="muted">You can send one greeting message to each person. Make it count!</p>
        {error && <div className="alert alert-error">{error}</div>}
        <div className="field">
          <textarea
            className="textarea"
            maxLength={500}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={`Hi ${name}! …`}
            autoFocus
            required
          />
          <span className="hint">{body.length}/500</span>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={busy || !body.trim()}>Send</button>
        </div>
      </form>
    </Modal>
  )
}
