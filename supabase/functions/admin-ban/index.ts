// Admin: ban or unban one user (banned users are hidden from everyone and locked out).
import { json, preflight, readBody } from '../_shared/http.ts'
import { requireAdmin } from '../_shared/adminAuth.ts'
import { serviceClient } from '../_shared/serviceClient.ts'

Deno.serve(async (req) => {
  const early = preflight(req) ?? (await requireAdmin(req))
  if (early) return early

  const { id, banned } = await readBody<{ id: string; banned: boolean }>(req)
  if (!id || typeof banned !== 'boolean') return json(400, { error: 'Missing id or banned' })
  const { error } = await serviceClient().rpc('admin_set_banned', { p_id: id, p_on: banned })
  return error ? json(400, { error: error.message }) : json(200, { ok: true })
})
