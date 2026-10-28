// Admin: read (empty body) or update the report system parameters.
import { json, preflight, readBody } from '../_shared/http.ts'
import { requireAdmin } from '../_shared/adminAuth.ts'
import { serviceClient } from '../_shared/serviceClient.ts'

type Settings = { restrict_points: number; ban_points: number; decay_days: number }
type Body = { reasons: Record<string, number>; settings: Settings }

const isInt = (v: unknown, min: number, max: number) => Number.isInteger(v) && (v as number) >= min && (v as number) <= max

Deno.serve(async (req) => {
  const early = preflight(req) ?? (await requireAdmin(req))
  if (early) return early

  const db = serviceClient()
  const { reasons, settings } = await readBody<Body>(req)

  if (reasons || settings) {
    if (reasons && !Object.values(reasons).every((p) => isInt(p, 1, 3))) return json(400, { error: 'Points per reason must be 1–3.' })
    if (settings) {
      const { restrict_points, ban_points, decay_days } = settings
      if (!isInt(restrict_points, 1, 1000) || !isInt(ban_points, 1, 1000) || !isInt(decay_days, 1, 365)) {
        return json(400, { error: 'Thresholds must be 1–1000 points, decay 1–365 days.' })
      }
    }
    if (reasons) {
      const rows = Object.entries(reasons).map(([reason, points]) => ({ reason, points }))
      const { error } = await db.from('report_reason_points').upsert(rows)
      if (error) return json(400, { error: error.message })
    }
    if (settings) {
      const { restrict_points, ban_points, decay_days } = settings
      const { error } = await db.from('report_settings').update({ restrict_points, ban_points, decay_days }).eq('id', true)
      if (error) return json(400, { error: error.message })
      await db.rpc('refresh_all_points') // apply new thresholds now
    }
  }

  const [r, s] = await Promise.all([db.from('report_reason_points').select('reason, points'), db.from('report_settings').select('restrict_points, ban_points, decay_days').single()])
  if (r.error || s.error) return json(500, { error: 'Could not load settings' })
  return json(200, { reasons: Object.fromEntries(r.data.map((x) => [x.reason, x.points])), settings: s.data })
})
