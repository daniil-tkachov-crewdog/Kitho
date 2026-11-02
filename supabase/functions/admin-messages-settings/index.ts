// Admin: read (empty body) or update the greeting message settings.
import { json, preflight, readBody } from '../_shared/http.ts'
import { requireAdmin } from '../_shared/adminAuth.ts'
import { serviceClient } from '../_shared/serviceClient.ts'

type Body = { greeting_enabled: boolean; greeting_text: string }

Deno.serve(async (req) => {
  const early = preflight(req) ?? (await requireAdmin(req))
  if (early) return early

  const db = serviceClient()
  const { greeting_enabled, greeting_text } = await readBody<Body>(req)

  if (greeting_enabled !== undefined || greeting_text !== undefined) {
    if (typeof greeting_enabled !== 'boolean' || typeof greeting_text !== 'string') return json(400, { error: 'Invalid settings.' })
    if (greeting_text.length > 2000) return json(400, { error: 'Greeting must be at most 2000 characters.' })
    const { error } = await db.from('admin_settings').update({ greeting_enabled, greeting_text }).eq('id', true)
    if (error) return json(400, { error: error.message })
  }

  const { data, error } = await db.from('admin_settings').select('greeting_enabled, greeting_text').single()
  if (error) return json(500, { error: 'Could not load settings' })
  return json(200, data)
})
