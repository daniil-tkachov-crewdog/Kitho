// Deletes the calling user's photos and auth account. DB rows cascade from auth.users.
import { json, preflight } from '../_shared/http.ts'
import { serviceClient } from '../_shared/serviceClient.ts'
import { deleteUserData } from '../_shared/deleteUserData.ts'

Deno.serve(async (req) => {
  const early = preflight(req)
  if (early) return early

  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return json(401, { error: 'Not signed in' })

  const admin = serviceClient()
  const { data: userData, error: userError } = await admin.auth.getUser(token)
  if (userError || !userData.user) return json(401, { error: 'Not signed in' })

  const error = await deleteUserData(admin, userData.user.id)
  return error ? json(500, { error }) : json(200, { ok: true })
})
