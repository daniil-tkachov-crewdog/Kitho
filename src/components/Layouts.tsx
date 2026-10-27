import { Link, NavLink, Navigate, Outlet, useLocation } from 'react-router-dom'
import { isProfileComplete, useAuth } from '../lib/auth'
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
            <NavLink to="/inbox" className="navlink"><InboxIcon /><span>Inbox</span></NavLink>
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
