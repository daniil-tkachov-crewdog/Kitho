import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { deleteAccount, errorText } from '../lib/api'
import Modal from '../components/Modal'

export default function Settings() {
  const navigate = useNavigate()
  const [confirm, setConfirm] = useState(false)
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function logout() {
    await supabase.auth.signOut()
    navigate('/', { replace: true })
  }

  async function onDelete() {
    setBusy(true)
    setError('')
    try {
      await deleteAccount()
      await supabase.auth.signOut({ scope: 'local' })
      navigate('/', { replace: true })
    } catch (e) {
      setError(errorText(e))
      setBusy(false)
    }
  }

  return (
    <div className="container narrow">
      <div className="page-head">
        <h1>Settings</h1>
        <Link to="/profile" className="btn btn-ghost">Back to profile</Link>
      </div>
      <div className="settings-list">
        <div className="settings-row">
          <div>
            <h3>Edit profile</h3>
            <p>Change your photos, name, age, location and description.</p>
          </div>
          <Link to="/profile" className="btn btn-ghost">Edit profile</Link>
        </div>
        <div className="settings-row">
          <div>
            <h3>Log out</h3>
            <p>Sign out of Kitho on this device.</p>
          </div>
          <button className="btn btn-ghost" onClick={logout}>Log out</button>
        </div>
        <div className="settings-row danger">
          <div>
            <h3>Delete my account</h3>
            <p>Permanently deletes your profile, photos, likes and messages. This can’t be undone.</p>
          </div>
          <button className="btn btn-danger" onClick={() => setConfirm(true)}>Delete my account</button>
        </div>
      </div>
      {confirm && (
        <Modal title="Delete your account?" onClose={() => !busy && setConfirm(false)}>
          <p className="muted">Everything will be permanently deleted. Type <strong>DELETE</strong> to confirm.</p>
          {error && <div className="alert alert-error">{error}</div>}
          <div className="field">
            <input className="input" value={typed} onChange={(e) => setTyped(e.target.value)} aria-label="Type DELETE to confirm" autoFocus />
          </div>
          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={() => setConfirm(false)} disabled={busy}>Cancel</button>
            <button className="btn btn-danger" onClick={onDelete} disabled={busy || typed !== 'DELETE'}>{busy ? 'Deleting…' : 'Delete forever'}</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
