import { getStats } from '../../lib/admin'
import { formatDateTime, useAdminData } from './useAdminData'

export default function StatsTab({ onExpired }: { onExpired: () => void }) {
  const { data, error } = useAdminData(getStats, 5000, onExpired)

  return (
    <section>
      <h2>Stats</h2>
      {error && <div className="alert alert-error">{error}</div>}
      <div className="admin-stats">
        <div className="admin-stat"><span>Website visitors</span><strong>{data?.stats.visitors ?? '—'}</strong></div>
        <div className="admin-stat"><span>Registered users</span><strong>{data?.stats.users ?? '—'}</strong></div>
        <div className="admin-stat"><span>Reports</span><strong>{data?.stats.reports ?? '—'}</strong></div>
      </div>
      <h3>Visitors log</h3>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr><th>Who visits</th><th>Location</th><th>Device</th><th>Browser</th><th>Time</th></tr>
          </thead>
          <tbody>
            {data?.visits.map((v) => (
              <tr key={v.id}>
                <td>{v.who}</td>
                <td>{v.location || '—'}</td>
                <td>{v.device}</td>
                <td>{v.browser}</td>
                <td className="nowrap">{formatDateTime(v.created_at)}</td>
              </tr>
            ))}
            {data && !data.visits.length && <tr><td colSpan={5} className="muted">No visits yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  )
}
