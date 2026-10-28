// Admin: live counters (visitors, registered users, reports) and the latest visits.
import { json, preflight } from '../_shared/http.ts'
import { requireAdmin } from '../_shared/adminAuth.ts'
import { serviceClient } from '../_shared/serviceClient.ts'

Deno.serve(async (req) => {
  const early = preflight(req) ?? (await requireAdmin(req))
  if (early) return early

  const db = serviceClient()
  const [stats, visits] = await Promise.all([db.rpc('admin_stats').single(), db.rpc('admin_list_visits', { p_limit: 200 })])
  if (stats.error || visits.error) return json(500, { error: 'Could not load stats' })
  return json(200, { stats: stats.data, visits: visits.data })
})
