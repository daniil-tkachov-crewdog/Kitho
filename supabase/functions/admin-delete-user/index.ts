// Admin: permanently delete one user's profile, photos and account.
import { json, preflight, readBody } from '../_shared/http.ts'
import { requireAdmin } from '../_shared/adminAuth.ts'
import { serviceClient } from '../_shared/serviceClient.ts'
import { deleteUserData } from '../_shared/deleteUserData.ts'

Deno.serve(async (req) => {
  const early = preflight(req) ?? (await requireAdmin(req))
  if (early) return early

  const { id } = await readBody<{ id: string }>(req)
  if (!id) return json(400, { error: 'Missing id' })
  const error = await deleteUserData(serviceClient(), id)
  return error ? json(500, { error }) : json(200, { ok: true })
})
