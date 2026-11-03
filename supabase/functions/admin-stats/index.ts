// Admin: live counters (visitors, registered users, reports) and the visits log for a period (paged).
import { json, preflight } from '../_shared/http.ts'
import { requireAdmin } from '../_shared/adminAuth.ts'
import { serviceClient } from '../_shared/serviceClient.ts'

const PERIOD_MS: Record<string, number> = {
  '24h': 24 * 3600e3,
  '7d': 7 * 24 * 3600e3,
  '1m': 30 * 24 * 3600e3,
  '6m': 182 * 24 * 3600e3,
}
const PAGE = 200

Deno.serve(async (req) => {
  const early = preflight(req) ?? (await requireAdmin(req))
  if (early) return early

  const body = await req.json().catch(() => ({}))
  const period = typeof body.period === 'string' && body.period in PERIOD_MS ? body.period : '24h'
  const offset = Number.isInteger(body.offset) && body.offset >= 0 ? body.offset : 0
  const since = new Date(Date.now() - PERIOD_MS[period]).toISOString()

  const db = serviceClient()
  const [stats, visits] = await Promise.all([
    db.rpc('admin_stats').single(),
    db.rpc('admin_list_visits', { p_since: since, p_limit: PAGE, p_offset: offset }),
  ])
  if (stats.error || visits.error) return json(500, { error: 'Could not load stats' })
  return json(200, { stats: stats.data, visits: visits.data, hasMore: visits.data.length === PAGE })
})
