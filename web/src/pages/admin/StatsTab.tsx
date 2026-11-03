import { useCallback, useEffect, useState } from 'react'
import { getStats, type StatsPeriod, type Visit } from '../../lib/admin'
import { errorText } from '../../lib/api'
import { formatDateTime, useAdminData } from './useAdminData'

const PERIODS: { key: StatsPeriod; label: string }[] = [
  { key: '24h', label: 'Last 24h' },
  { key: '7d', label: '7 days' },
  { key: '1m', label: '1 month' },
  { key: '6m', label: '6 months' },
]

export default function StatsTab({ onExpired }: { onExpired: () => void }) {
  const [period, setPeriod] = useState<StatsPeriod>('24h')
  // Live refresh covers the first page; older pages are appended with "Load more".
  const load = useCallback(() => getStats(period), [period])
  const { data, error } = useAdminData(load, 5000, onExpired)
  const [more, setMore] = useState<Visit[]>([])
  const [hasMore, setHasMore] = useState<boolean | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [moreError, setMoreError] = useState('')

  useEffect(() => {
    setMore([])
    setHasMore(null)
    setMoreError('')
  }, [period])

  const first = data?.visits ?? []
  const visits = [...first, ...more.filter((m) => !first.some((f) => f.id === m.id))]
  const canLoadMore = hasMore ?? !!data?.hasMore

  async function loadMore() {
    setLoadingMore(true)
    setMoreError('')
    try {
      const r = await getStats(period, first.length + more.length)
      setMore((m) => [...m, ...r.visits])
      setHasMore(r.hasMore)
    } catch (e) {
      setMoreError(errorText(e))
    } finally {
      setLoadingMore(false)
    }
  }

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
      <div className="period-chips" role="tablist" aria-label="Period">
        {PERIODS.map((p) => (
          <button key={p.key} role="tab" aria-selected={period === p.key} className={period === p.key ? 'on' : ''} onClick={() => setPeriod(p.key)}>
            {p.label}
          </button>
        ))}
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr><th>Who visits</th><th>Location</th><th>Device</th><th>Browser</th><th>Time</th></tr>
          </thead>
          <tbody>
            {visits.map((v) => (
              <tr key={v.id}>
                <td>{v.who}</td>
                <td>{v.location || '—'}</td>
                <td>{v.device}</td>
                <td>{v.browser}</td>
                <td className="nowrap">{formatDateTime(v.created_at)}</td>
              </tr>
            ))}
            {data && !visits.length && <tr><td colSpan={5} className="muted">No visits in this period.</td></tr>}
          </tbody>
        </table>
      </div>
      {moreError && <div className="alert alert-error">{moreError}</div>}
      {canLoadMore && (
        <div className="load-more">
          <button className="btn btn-ghost btn-sm" disabled={loadingMore} onClick={loadMore}>{loadingMore ? 'Loading…' : 'Load more'}</button>
        </div>
      )}
    </section>
  )
}
