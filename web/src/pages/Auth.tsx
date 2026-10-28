import { useEffect, useState, type FormEvent } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { errorText } from '../lib/api'
import { AppleIcon, GoogleIcon } from '../components/Icons'

type Mode = 'login' | 'signup' | 'verify'

export default function Auth() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [mode, setMode] = useState<Mode>(params.get('mode') === 'signup' ? 'signup' : 'login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  useEffect(() => {
    setError('')
    setInfo('')
  }, [mode])

  if (session && mode !== 'verify') return <Navigate to="/feed" replace />

  async function run(fn: () => Promise<void>) {
    setBusy(true)
    setError('')
    try {
      await fn()
    } catch (e) {
      setError(errorText(e))
    } finally {
      setBusy(false)
    }
  }

  const onLogin = (e: FormEvent) => {
    e.preventDefault()
    run(async () => {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (error?.code === 'email_not_confirmed') {
        await supabase.auth.resend({ type: 'signup', email: email.trim() })
        setMode('verify')
        setInfo('Your email isn’t verified yet. We sent you a new code.')
        return
      }
      if (error) throw error
      navigate('/feed', { replace: true })
    })
  }

  const onSignup = (e: FormEvent) => {
    e.preventDefault()
    if (password.length < 8) return setError('Password must be at least 8 characters.')
    if (password !== password2) return setError('Passwords don’t match.')
    run(async () => {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: `${window.location.origin}/profile` },
      })
      if (error) throw error
      if (data.session) return navigate('/profile', { replace: true }) // email confirmation disabled
      setMode('verify')
      setInfo(`We sent a verification code to ${email.trim()}.`)
    })
  }

  const onVerify = (e: FormEvent) => {
    e.preventDefault()
    run(async () => {
      const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' })
      if (error) throw error
      navigate('/profile', { replace: true })
    })
  }

  const onResend = () =>
    run(async () => {
      const { error } = await supabase.auth.resend({ type: 'signup', email: email.trim() })
      if (error) throw error
      setInfo('New code sent. Check your inbox (and spam folder).')
    })

  return (
    <div className="auth-wrap">
      <div className="panel auth-panel">
        {mode === 'verify' ? (
          <form onSubmit={onVerify}>
            <h2 className="center">Check your email</h2>
            <p className="center muted">Enter the code we sent to <strong>{email}</strong>.</p>
            {info && <div className="alert alert-ok">{info}</div>}
            {error && <div className="alert alert-error">{error}</div>}
            <div className="field">
              <label htmlFor="code">Verification code</label>
              <input
                id="code"
                className="input code-input"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={8}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                required
              />
            </div>
            <button className="btn btn-primary btn-block" disabled={busy || code.length < 6}>Verify email</button>
            <p className="center muted" style={{ marginTop: 16, marginBottom: 0 }}>
              Didn’t get it? <button type="button" className="linkish" onClick={onResend} disabled={busy}>Resend code</button>
              {' · '}
              <button type="button" className="linkish" onClick={() => setMode('login')}>Back</button>
            </p>
          </form>
        ) : (
          <>
            <div className="switcher" role="tablist">
              <button role="tab" aria-selected={mode === 'login'} className={mode === 'login' ? 'on' : ''} onClick={() => setMode('login')}>Log in</button>
              <button role="tab" aria-selected={mode === 'signup'} className={mode === 'signup' ? 'on' : ''} onClick={() => setMode('signup')}>Sign up</button>
            </div>
            {info && <div className="alert alert-ok">{info}</div>}
            {error && <div className="alert alert-error">{error}</div>}
            <form onSubmit={mode === 'login' ? onLogin : onSignup}>
              <div className="field">
                <label htmlFor="email">Email</label>
                <input id="email" type="email" className="input" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="field">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  className="input"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  minLength={mode === 'signup' ? 8 : undefined}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              {mode === 'signup' && (
                <div className="field">
                  <label htmlFor="password2">Re-type your password</label>
                  <input id="password2" type="password" className="input" autoComplete="new-password" value={password2} onChange={(e) => setPassword2(e.target.value)} required />
                </div>
              )}
              <button className="btn btn-primary btn-block" disabled={busy}>{mode === 'login' ? 'Log in' : 'Sign up'}</button>
            </form>
            <div className="divider">or</div>
            <div className="social">
              <button className="btn btn-ghost" disabled title="Coming soon"><GoogleIcon /> {mode === 'login' ? 'Log in' : 'Sign up'} with Google</button>
              <button className="btn btn-ghost" disabled title="Coming soon"><AppleIcon /> {mode === 'login' ? 'Log in' : 'Sign up'} with Apple</button>
              <p className="center muted" style={{ fontSize: '0.8rem', margin: 0 }}>Google and Apple sign-in coming soon.</p>
            </div>
            {mode === 'signup' && (
              <p className="center muted" style={{ fontSize: '0.82rem', marginTop: 16, marginBottom: 0 }}>
                By signing up you agree to our <a href="/terms">Terms of Use</a> and <a href="/privacy">Privacy Policy</a>.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
