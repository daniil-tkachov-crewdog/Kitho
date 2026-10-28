// Admin: all registered users with their ID number, contacts, report count and moderation status.
import { json, preflight } from '../_shared/http.ts'
import { requireAdmin } from '../_shared/adminAuth.ts'
import { serviceClient } from '../_shared/serviceClient.ts'

Deno.serve(async (req) => {
  const early = preflight(req) ?? (await requireAdmin(req))
  if (early) return early

  const { data, error } = await serviceClient().rpc('admin_list_users')
  if (error) return json(500, { error: 'Could not load users' })
  return json(200, { users: data })
})
