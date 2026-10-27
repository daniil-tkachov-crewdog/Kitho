// Deletes the calling user's photos and auth account. DB rows cascade from auth.users.
import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' })

  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return json(401, { error: 'Not signed in' })

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: userData, error: userError } = await admin.auth.getUser(token)
  if (userError || !userData.user) return json(401, { error: 'Not signed in' })
  const userId = userData.user.id

  // Remove every file in the user's photo folder.
  const { data: files, error: listError } = await admin.storage.from('photos').list(userId, { limit: 100 })
  if (listError) return json(500, { error: 'Could not delete photos' })
  if (files.length) {
    const { error } = await admin.storage.from('photos').remove(files.map((f) => `${userId}/${f.name}`))
    if (error) return json(500, { error: 'Could not delete photos' })
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(userId)
  if (deleteError) return json(500, { error: 'Could not delete account' })

  return json(200, { ok: true })
})
