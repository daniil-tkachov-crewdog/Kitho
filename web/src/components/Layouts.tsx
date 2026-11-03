import { useEffect, useState } from 'react'
import { Link, NavLink, Navigate, Outlet, useLocation } from 'react-router-dom'
import { isProfileComplete, useAuth } from '../lib/auth'
import { errorText, setBirthDate, subscribeMyChats, unreadTotal } from '../lib/api'
import DobWheel, { ageFrom, defaultDob, dobToIso, type Dob } from './DobWheel'
import { supabase } from '../lib/supabase'
import Logo from './Logo'
import Footer from './Footer'
import { CompassIcon, InboxIcon, UserIcon } from './Icons'

/** Public pages: logo left, Log in / Sign up (or "Open app") right. */
export function PublicLayout() {
  const { session } = useAuth()
  return (
    <div className="page">
      <header className="header">
        <div className="container">
          <Logo />
          {session ? (
            <Link to="/feed" className="btn btn-primary btn-sm">Open Kitho</Link>
          ) : (
            <Link to="/auth" className="btn btn-primary btn-sm">Log in / Sign up</Link>
          )}
        </div>
      </header>
      <main>
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}

/** Signed-in area. Redirects to /auth when logged out and to /profile until the profile is complete. */
export function AppLayout() {
  const { session, profile, status, banned, loading } = useAuth()
  const location = useLocation()
  const unread = useUnreadCount(!!session && !banned, location.pathname)

  if (loading) return <div className="spinner" aria-label="Loading" />
  if (!session) return <Navigate to="/auth" replace state={{ from: location.pathname }} />
  if (banned) return <Suspended />
  const complete = isProfileComplete(profile)
  if (!complete && location.pathname !== '/profile' && location.pathname !== '/settings') {
    return <Navigate to="/profile" replace />
  }

  return (
    <div className="page app">
      <header className="header">
        <div className="container">
          <Logo to="/feed" />
          <nav className="nav" aria-label="Main">
            <NavLink to="/feed" className="navlink"><CompassIcon /><span>Discover</span></NavLink>
            <NavLink to="/inbox" className="navlink"><InboxIcon /><span>Inbox</span>{unread > 0 && <span className="badge" aria-label={`${unread} unread`}>{unread}</span>}</NavLink>
            <NavLink to="/profile" className="navlink"><UserIcon /><span>Profile</span></NavLink>
          </nav>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
      {profile && status && !status.birth_date && <DobPrompt />}
    </div>
  )
}

/** Existing users without a date of birth must add one before using the app (can't be dismissed). */
function DobPrompt() {
  const { session, refreshProfile } = useAuth()
  const [dob, setDob] = useState<Dob>(defaultDob)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const age = ageFrom(dob)

  async function save() {
    if (age < 18) return setError('You must be 18 or over to use Kitho.')
    setBusy(true)
    setError('')
    try {
      await setBirthDate(session!.user.id, dobToIso(dob))
      await refreshProfile()
    } catch (e) {
      setError(errorText(e))
      setBusy(false)
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal" role="dialog" aria-modal="true" aria-label="Add your date of birth">
        <h3>Add your date of birth</h3>
        <p className="muted">Kitho is for adults only. Your age is calculated from it and can’t be changed later.</p>
        {error && <div className="alert alert-error">{error}</div>}
        <DobWheel value={dob} onChange={setDob} />
        <div className="dob-age"><span className="muted">Your age</span><strong>{age}</strong></div>
        <div className="modal-actions" style={{ marginTop: 20 }}>
          <button className="btn btn-primary" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Confirm'}</button>
        </div>
      </div>
    </div>
  )
}

/** Shown instead of the app to banned users. */
function Suspended() {
  return (
    <div className="page">
      <header className="header">
        <div className="container"><Logo /></div>
      </header>
      <main className="auth-wrap">
        <div className="panel auth-panel center">
          <h2>Account suspended</h2>
          <p className="muted">Your account has been suspended for breaking the community rules.</p>
          <button className="btn btn-ghost btn-block" onClick={() => void supabase.auth.signOut()}>Log out</button>
        </div>
      </main>
    </div>
  )
}

/** Total unread chat messages, kept live via realtime and refreshed on navigation. */
function useUnreadCount(enabled: boolean, pathname: string) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!enabled) return
    const refresh = () => unreadTotal().then(setCount, () => {})
    refresh()
    return subscribeMyChats(refresh)
  }, [enabled, pathname])
  return count
}
