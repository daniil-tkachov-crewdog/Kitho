import { useState, type FormEvent } from 'react'
import { adminLogin } from '../../lib/admin'
import { errorText } from '../../lib/api'

export default function AdminLogin({ onLoggedIn }: { onLoggedIn: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await adminLogin(email, password)
      onLoggedIn()
    } catch (err) {
      setError(errorText(err))
      setBusy(false)
    }
  }

  return (
    <div className="auth-wrap">
      <form className="panel auth-panel" onSubmit={onSubmit}>
        <h2>Kitho: Admin</h2>
        {error && <div className="alert alert-error">{error}</div>}
        <div className="field">
          <label htmlFor="admin-email">Email</label>
          <input id="admin-email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required />
        </div>
        <div className="field">
          <label htmlFor="admin-password">Password</label>
          <input id="admin-password" className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
        </div>
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Logging in…' : 'Login'}</button>
      </form>
    </div>
  )
}
