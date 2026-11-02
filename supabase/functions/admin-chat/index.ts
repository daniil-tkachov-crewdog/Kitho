// Admin: one user's admin chat. Optionally sends a message first (creates the chat if missing), then marks it read.
import { json, preflight, readBody } from '../_shared/http.ts'
import { requireAdmin } from '../_shared/adminAuth.ts'
import { serviceClient } from '../_shared/serviceClient.ts'

type Body = { user_id: string; body: string }
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

Deno.serve(async (req) => {
  const early = preflight(req) ?? (await requireAdmin(req))
  if (early) return early

  const db = serviceClient()
  const { user_id, body } = await readBody<Body>(req)
  if (typeof user_id !== 'string' || !UUID.test(user_id)) return json(400, { error: 'Invalid user.' })

  const { data: profile, error: pErr } = await db.from('profiles').select('id, name, fake').eq('id', user_id).maybeSingle()
  if (pErr) return json(500, { error: 'Could not load user' })
  if (!profile) return json(404, { error: 'This user has no profile yet.' })
  if (profile.fake) return json(400, { error: 'Fake profiles can’t be messaged.' })

  if (body !== undefined) {
    if (typeof body !== 'string' || !body.trim() || body.length > 2000) return json(400, { error: 'Message must be 1–2000 characters.' })
    const { error } = await db.rpc('admin_chat_post', { p_user: user_id, p_from_admin: true, p_body: body })
    if (error) return json(400, { error: error.message })
  }

  const [m, c] = await Promise.all([
    db.from('admin_messages').select('id, from_admin, body, created_at').eq('user_id', user_id).order('created_at', { ascending: true }),
    db.from('admin_chats').select('user_last_read_at').eq('user_id', user_id).maybeSingle(),
  ])
  if (m.error || c.error) return json(500, { error: 'Could not load chat' })
  if (c.data) await db.rpc('admin_mark_admin_chat_read', { p_user: user_id })

  return json(200, { name: profile.name, messages: m.data, user_read_at: c.data?.user_last_read_at ?? null })
})
