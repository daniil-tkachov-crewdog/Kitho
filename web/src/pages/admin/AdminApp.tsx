import { useCallback, useState } from 'react'
import { clearAdminToken, getAdminToken } from '../../lib/admin'
import AdminLogin from './AdminLogin'
import StatsTab from './StatsTab'
import UsersTab from './UsersTab'
import ReportsTab from './ReportsTab'

const TABS = ['Stats', 'Users', 'Reports'] as const
type Tab = (typeof TABS)[number]

/** Isolated admin panel at /admin: login screen, then header + left tab list. */
export default function AdminApp() {
  const [loggedIn, setLoggedIn] = useState(() => !!getAdminToken())
  const [tab, setTab] = useState<Tab>('Stats')

  const logout = useCallback(() => {
    clearAdminToken()
    setLoggedIn(false)
  }, [])

  if (!loggedIn) return <AdminLogin onLoggedIn={() => setLoggedIn(true)} />

  return (
    <div className="admin">
      <header className="admin-header">
        <h1>Kitho: Admin</h1>
        <button className="btn btn-ghost btn-sm" onClick={logout}>Log out</button>
      </header>
      <div className="admin-body">
        <nav className="admin-tabs" aria-label="Admin sections">
          {TABS.map((t) => (
            <button key={t} className={t === tab ? 'on' : ''} onClick={() => setTab(t)}>{t}</button>
          ))}
        </nav>
        <main className="admin-main">
          {tab === 'Stats' && <StatsTab onExpired={logout} />}
          {tab === 'Users' && <UsersTab onExpired={logout} />}
          {tab === 'Reports' && <ReportsTab onExpired={logout} />}
        </main>
      </div>
    </div>
  )
}
