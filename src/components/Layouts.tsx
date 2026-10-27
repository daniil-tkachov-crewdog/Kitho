import { useEffect, useState } from 'react'
import { Link, NavLink, Navigate, Outlet, useLocation } from 'react-router-dom'
import { isProfileComplete, useAuth } from '../lib/auth'
import { subscribeMyChats, unreadTotal } from '../lib/api'
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
  const { session, profile, loading } = useAuth()
  const location = useLocation()
  const unread = useUnreadCount(!!session, location.pathname)

  if (loading) return <div className="spinner" aria-label="Loading" />
  if (!session) return <Navigate to="/auth" replace state={{ from: location.pathname }} />
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
