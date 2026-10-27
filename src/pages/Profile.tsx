import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { isProfileComplete, useAuth } from '../lib/auth'
import { deletePhoto, errorText, getMyPhone, MAX_PHOTOS, photoUrls, saveProfile, uploadPhoto, type Photo } from '../lib/api'
import { prepareImage } from '../lib/image'
import { LockIcon } from '../components/Icons'

type Slot = { kind: 'existing'; photo: Photo; url: string } | { kind: 'new'; file: File; url: string } | null

export default function Profile() {
  const { session, profile, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const uid = session!.user.id
  const [editing, setEditing] = useState(!profile)
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')
  const [phone, setPhone] = useState('')
  const [slots, setSlots] = useState<Slot[]>([null, null, null])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  // Load (or reset to) the stored profile.
  async function reset() {
    setName(profile?.name ?? '')
    setAge(profile ? String(profile.age) : '')
    setLocation(profile?.location ?? '')
    setDescription(profile?.description ?? '')
    const photos = profile?.photos ?? []
    const map = photos.length ? await photoUrls(photos.map((p) => p.path)).catch(() => ({}) as Record<string, string>) : {}
    setSlots([1, 2, 3].map((pos) => {
      const p = photos.find((x) => x.position === pos)
      return p ? { kind: 'existing', photo: p, url: map[p.path] ?? '' } : null
    }))
    if (profile) {
      setPhone((await getMyPhone().catch(() => null)) ?? '')
    }
  }

  useEffect(() => {
    void reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile])

  async function pickPhoto(index: number, file: File | undefined) {
    if (!file) return
    setError('')
    try {
      const prepared = await prepareImage(file)
      setSlots((s) => s.map((slot, i) => (i === index ? { kind: 'new', file: prepared, url: URL.createObjectURL(prepared) } : slot)))
    } catch (e) {
      setError(errorText(e))
    }
  }

  const removePhoto = (index: number) => setSlots((s) => s.map((slot, i) => (i === index ? null : slot)))

  async function onSave(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSaved(false)
    const ageNum = Number(age)
    if (!name.trim() || !location.trim()) return setError('Please fill in your name and location.')
    if (!Number.isInteger(ageNum) || ageNum < 1 || ageNum > 120) return setError('Please enter a valid age.')
    if (!slots.some(Boolean)) return setError('Please add at least one photo.')

    setBusy(true)
    try {
      await saveProfile(uid, {
        name: name.trim(),
        age: ageNum,
        location: location.trim(),
        description: description.trim(),
        phone: phone.trim() || null,
      }, !!profile)

      const existing = profile?.photos ?? []
      for (let i = 0; i < MAX_PHOTOS; i++) {
        const pos = i + 1
        const orig = existing.find((p) => p.position === pos)
        const slot = slots[i]
        if (slot?.kind === 'new') await uploadPhoto(uid, slot.file, pos, orig)
        else if (!slot && orig) await deletePhoto(orig)
      }
      const firstTime = !isProfileComplete(profile)
      await refreshProfile()
      setEditing(false)
      setSaved(true)
      if (firstTime) navigate('/feed')
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }

  function onCancel() {
    setError('')
    setEditing(false)
    void reset()
  }

  const ro = !editing || busy

  return (
    <div className="container narrow">
      <form onSubmit={onSave}>
        <div className="page-head">
          <h1>{profile ? 'My profile' : 'Create your profile'}</h1>
          <div className="row">
            <Link to="/settings" className="btn btn-ghost">Settings</Link>
            {editing ? (
              <>
                {profile && <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={busy}>Cancel</button>}
                <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
              </>
            ) : (
              <button type="button" className="btn btn-primary" onClick={() => { setSaved(false); setEditing(true) }}>Edit</button>
            )}
          </div>
        </div>

        {!profile && <div className="alert alert-ok">Add your details and at least one photo to start browsing.</div>}
        {saved && <div className="alert alert-ok">Profile saved.</div>}
        {error && <div className="alert alert-error">{error}</div>}

        <div className="panel" style={{ marginBottom: 48 }}>
          <div className="field"><label>Photos <span className="hint">(1–3, first one is your main photo)</span></label></div>
          <div className="photo-slots">
            {slots.map((slot, i) => (
              <div key={i} className={`slot${slot ? ' filled' : ''}`}>
                {slot ? (
                  <>
                    {slot.url && <img src={slot.url} alt={`Your photo ${i + 1}`} />}
                    {i === 0 && <span className="badge">Main</span>}
                    {editing && (
                      <div className="slot-actions">
                        <label className="btn btn-sm">
                          Replace
                          <input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => pickPhoto(i, e.target.files?.[0])} />
                        </label>
                        <button type="button" className="btn btn-sm" onClick={() => removePhoto(i)}>Remove</button>
                      </div>
                    )}
                  </>
                ) : editing ? (
                  <label className="add">
                    <span style={{ fontSize: '2rem', lineHeight: 1 }}>+</span>
                    <span>Add photo</span>
                    <input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => pickPhoto(i, e.target.files?.[0])} />
                  </label>
                ) : (
                  <span>Empty</span>
                )}
              </div>
            ))}
          </div>

          <div className="grid-2">
            <div className="field">
              <label htmlFor="name">Name</label>
              <input id="name" className="input" maxLength={50} value={name} onChange={(e) => setName(e.target.value)} disabled={ro} required />
            </div>
            <div className="field">
              <label htmlFor="age">Age</label>
              <input id="age" className="input" type="number" min={1} max={120} value={age} onChange={(e) => setAge(e.target.value)} disabled={ro} required />
            </div>
          </div>
          <div className="field">
            <label htmlFor="location">Location</label>
            <input id="location" className="input" maxLength={100} placeholder="City, Country" value={location} onChange={(e) => setLocation(e.target.value)} disabled={ro} required />
          </div>
          <div className="field">
            <label htmlFor="description">About me</label>
            <textarea id="description" className="textarea" maxLength={1000} value={description} onChange={(e) => setDescription(e.target.value)} disabled={ro} placeholder="A few words about you…" />
          </div>

          <div className="private-box">
            <h3><LockIcon /> Private — only you can see this</h3>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" className="input" value={session!.user.email ?? ''} disabled />
            </div>
            <div className="field">
              <label htmlFor="phone">Phone <span className="hint">(optional)</span></label>
              <input id="phone" className="input" type="tel" maxLength={30} value={phone} onChange={(e) => setPhone(e.target.value)} disabled={ro} />
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
