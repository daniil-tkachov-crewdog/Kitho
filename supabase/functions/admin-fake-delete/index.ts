// Admin: permanently delete one fake profile and its photos (likes, messages and reports cascade).
import { json, preflight, readBody } from '../_shared/http.ts'
import { requireAdmin } from '../_shared/adminAuth.ts'
import { serviceClient } from '../_shared/serviceClient.ts'
import { deletePhotos } from '../_shared/deleteUserData.ts'

Deno.serve(async (req) => {
  const early = preflight(req) ?? (await requireAdmin(req))
  if (early) return early

  const { id } = await readBody<{ id: string }>(req)
  if (!id) return json(400, { error: 'Missing id' })
  const admin = serviceClient()
  const photosError = await deletePhotos(admin, id)
  if (photosError) return json(500, { error: photosError })
  const { error } = await admin.from('profiles').delete().eq('id', id).eq('fake', true)
  return error ? json(500, { error: 'Could not delete profile' }) : json(200, { ok: true })
})
