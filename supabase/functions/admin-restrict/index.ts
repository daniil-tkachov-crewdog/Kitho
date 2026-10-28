// Admin: restrict or unrestrict one user (restricted users' likes and messages are silently not delivered).
import { json, preflight, readBody } from '../_shared/http.ts'
import { requireAdmin } from '../_shared/adminAuth.ts'
import { serviceClient } from '../_shared/serviceClient.ts'

Deno.serve(async (req) => {
  const early = preflight(req) ?? (await requireAdmin(req))
  if (early) return early

  const { id, restricted } = await readBody<{ id: string; restricted: boolean }>(req)
  if (!id || typeof restricted !== 'boolean') return json(400, { error: 'Missing id or restricted' })
  const { error } = await serviceClient().rpc('admin_set_restricted', { p_id: id, p_on: restricted })
  return error ? json(400, { error: error.message }) : json(200, { ok: true })
})
