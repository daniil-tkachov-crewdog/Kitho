// Admin: signed upload URL for one photo of a fake profile (stored under <profile id>/).
import { json, preflight, readBody } from '../_shared/http.ts'
import { requireAdmin } from '../_shared/adminAuth.ts'
import { serviceClient } from '../_shared/serviceClient.ts'

const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }

Deno.serve(async (req) => {
  const early = preflight(req) ?? (await requireAdmin(req))
  if (early) return early

  const { id, type } = await readBody<{ id: string; type: string }>(req)
  if (!id || !type || !EXT[type]) return json(400, { error: 'Missing id or unsupported image type' })
  const path = `${id}/${crypto.randomUUID()}.${EXT[type]}`
  const { data, error } = await serviceClient().storage.from('photos').createSignedUploadUrl(path)
  return error ? json(500, { error: 'Could not prepare upload' }) : json(200, { path: data.path, token: data.token })
})
