import { useState, type FormEvent } from 'react'
import { FAKE_EMAIL, saveFakeUser, uploadFakePhoto, type FakeUser } from '../../lib/admin'
import { errorText, MAX_PHOTOS } from '../../lib/api'
import { prepareImage } from '../../lib/image'
import Modal from '../../components/Modal'

type Slot = { kind: 'existing'; path: string; url: string } | { kind: 'new'; file: File; url: string } | null

/** Create (user = null) or edit a fake profile: same fields as the normal profile, email fixed to the admin one. */
export default function FakeProfileModal({ user, onClose, onSaved }: { user: FakeUser | null; onClose: () => void; onSaved: () => void }) {
  const [id] = useState(() => user?.id ?? crypto.randomUUID())
  const [name, setName] = useState(user?.name ?? '')
  const [age, setAge] = useState(user ? String(user.age) : '')
  const [location, setLocation] = useState(user?.location ?? '')
  const [description, setDescription] = useState(user?.description ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [slots, setSlots] = useState<Slot[]>(() =>
    [1, 2, 3].map((pos) => {
      const p = user?.photos.find((x) => x.position === pos)
      return p ? { kind: 'existing', path: p.path, url: p.url } : null
    }),
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

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
    const ageNum = Number(age)
    if (!name.trim() || !location.trim()) return setError('Please fill in the name and location.')
    if (!Number.isInteger(ageNum) || ageNum < 1 || ageNum > 120) return setError('Please enter a valid age.')
    if (!slots.some(Boolean)) return setError('Please add at least one photo.')

    setBusy(true)
    try {
      const photos: (string | null)[] = []
      for (let i = 0; i < MAX_PHOTOS; i++) {
        const slot = slots[i]
        photos.push(slot?.kind === 'new' ? await uploadFakePhoto(id, slot.file) : (slot?.path ?? null))
      }
      await saveFakeUser({
        id,
        exists: !!user,
        name: name.trim(),
        age: ageNum,
        location: location.trim(),
        description: description.trim(),
        phone: phone.trim() || null,
        photos,
      })
      onSaved()
    } catch (err) {
      setError(errorText(err))
      setBusy(false)
    }
  }

  return (
    <Modal title={user ? 'Edit fake profile' : 'Create fake profile'} onClose={() => !busy && onClose()}>
      <form className="admin-fake-form" onSubmit={onSave}>
        {error && <div className="alert alert-error">{error}</div>}
        <div className="field"><label>Photos <span className="hint">(1–3, first one is the main photo)</span></label></div>
        <div className="photo-slots">
          {slots.map((slot, i) => (
            <div key={i} className={`slot${slot ? ' filled' : ''}`}>
              {slot ? (
                <>
                  {slot.url && <img src={slot.url} alt={`Photo ${i + 1}`} />}
                  {i === 0 && <span className="badge">Main</span>}
                  <div className="slot-actions">
                    <label className="btn btn-sm">
                      Replace
                      <input type="file" accept="image/jpeg,image/png,image/webp" hidden disabled={busy} onChange={(e) => pickPhoto(i, e.target.files?.[0])} />
                    </label>
                    <button type="button" className="btn btn-sm" onClick={() => removePhoto(i)} disabled={busy}>Remove</button>
                  </div>
                </>
              ) : (
                <label className="add">
                  <span className="plus">+</span>
                  <span>Add photo</span>
                  <input type="file" accept="image/jpeg,image/png,image/webp" hidden disabled={busy} onChange={(e) => pickPhoto(i, e.target.files?.[0])} />
                </label>
              )}
            </div>
          ))}
        </div>
        <div className="grid-2">
          <div className="field">
            <label htmlFor="fake-name">Name</label>
            <input id="fake-name" className="input" maxLength={50} value={name} onChange={(e) => setName(e.target.value)} disabled={busy} required />
          </div>
          <div className="field">
            <label htmlFor="fake-age">Age</label>
            <input id="fake-age" className="input" type="number" min={1} max={120} value={age} onChange={(e) => setAge(e.target.value)} disabled={busy} required />
          </div>
        </div>
        <div className="field">
          <label htmlFor="fake-location">Location</label>
          <input id="fake-location" className="input" maxLength={100} placeholder="City, Country" value={location} onChange={(e) => setLocation(e.target.value)} disabled={busy} required />
        </div>
        <div className="field">
          <label htmlFor="fake-description">About me</label>
          <textarea id="fake-description" className="textarea" maxLength={1000} value={description} onChange={(e) => setDescription(e.target.value)} disabled={busy} placeholder="A few words about you…" />
        </div>
        <div className="field">
          <label htmlFor="fake-email">Email</label>
          <input id="fake-email" className="input" value={FAKE_EMAIL} disabled />
        </div>
        <div className="field">
          <label htmlFor="fake-phone">Phone <span className="hint">(optional)</span></label>
          <input id="fake-phone" className="input" type="tel" maxLength={30} value={phone} onChange={(e) => setPhone(e.target.value)} disabled={busy} />
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
        </div>
      </form>
    </Modal>
  )
}
