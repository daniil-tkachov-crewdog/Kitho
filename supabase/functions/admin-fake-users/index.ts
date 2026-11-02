// Admin: all fake profiles with their ID number, details, photos (signed URLs) and report count.
import { json, preflight } from '../_shared/http.ts'
import { requireAdmin } from '../_shared/adminAuth.ts'
import { serviceClient } from '../_shared/serviceClient.ts'

type Row = { photos: { position: number; path: string }[] }

Deno.serve(async (req) => {
  const early = preflight(req) ?? (await requireAdmin(req))
  if (early) return early

  const admin = serviceClient()
  const { data, error } = await admin.rpc('admin_list_fake_users')
  if (error) return json(500, { error: 'Could not load fake users' })

  const rows = data as Row[]
  const paths = rows.flatMap((r) => r.photos.map((p) => p.path))
  const urls: Record<string, string> = {}
  if (paths.length) {
    const { data: signed, error: signError } = await admin.storage.from('photos').createSignedUrls(paths, 3600)
    if (signError) return json(500, { error: 'Could not load photos' })
    for (const s of signed) if (s.path && s.signedUrl) urls[s.path] = s.signedUrl
  }
  const users = rows.map((r) => ({ ...r, photos: r.photos.map((p) => ({ ...p, url: urls[p.path] ?? '' })) }))
  return json(200, { users })
})
