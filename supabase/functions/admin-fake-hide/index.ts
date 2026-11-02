// Admin: hide or unhide one fake profile (hidden profiles are invisible to everyone).
import { json, preflight, readBody } from '../_shared/http.ts'
import { requireAdmin } from '../_shared/adminAuth.ts'
import { serviceClient } from '../_shared/serviceClient.ts'

Deno.serve(async (req) => {
  const early = preflight(req) ?? (await requireAdmin(req))
  if (early) return early

  const { id, hidden } = await readBody<{ id: string; hidden: boolean }>(req)
  if (!id || typeof hidden !== 'boolean') return json(400, { error: 'Missing id or hidden' })
  const { error } = await serviceClient().rpc('admin_set_hidden', { p_id: id, p_on: hidden })
  return error ? json(400, { error: error.message }) : json(200, { ok: true })
})
