// Admin: create or update a fake profile and its photos (one path or null per slot, photos already uploaded).
import { json, preflight, readBody } from '../_shared/http.ts'
import { requireAdmin } from '../_shared/adminAuth.ts'
import { serviceClient } from '../_shared/serviceClient.ts'

const MAX_PHOTOS = 3

type Body = {
  id: string
  exists: boolean
  name: string
  age: number
  location: string
  description: string
  phone: string | null
  photos: (string | null)[]
}

Deno.serve(async (req) => {
  const early = preflight(req) ?? (await requireAdmin(req))
  if (early) return early

  const { id, exists, name, age, location, description, phone, photos } = await readBody<Body>(req)
  if (!id || !name?.trim() || !location?.trim() || !Number.isInteger(age)) return json(400, { error: 'Missing profile details' })
  if (!Array.isArray(photos) || photos.length !== MAX_PHOTOS || !photos.some(Boolean)) return json(400, { error: 'Add at least one photo' })
  if (photos.some((p) => p && !p.startsWith(`${id}/`))) return json(400, { error: 'Invalid photo' })

  const admin = serviceClient()
  const fields = { name: name.trim(), age, location: location.trim(), description: description?.trim() ?? '', phone: phone?.trim() || null }
  const { error } = exists
    ? await admin.from('profiles').update(fields).eq('id', id).eq('fake', true)
    : await admin.from('profiles').insert({ id, ...fields, fake: true })
  if (error) return json(400, { error: error.message })

  const { data: current, error: listError } = await admin.from('photos').select('id, path, position').eq('profile_id', id)
  if (listError) return json(500, { error: 'Could not save photos' })

  const removed: string[] = []
  for (let i = 0; i < MAX_PHOTOS; i++) {
    const position = i + 1
    const path = photos[i]
    const old = current.find((p) => p.position === position)
    if (old?.path === path) continue
    if (old) {
      const { error: delError } = await admin.from('photos').delete().eq('id', old.id)
      if (delError) return json(500, { error: 'Could not save photos' })
      removed.push(old.path)
    }
    if (path) {
      const { error: insError } = await admin.from('photos').insert({ profile_id: id, path, position })
      if (insError) return json(500, { error: 'Could not save photos' })
    }
  }
  if (removed.length) await admin.storage.from('photos').remove(removed)
  return json(200, { ok: true })
})
