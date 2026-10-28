// Admin login: checks credentials against the ADMIN_EMAIL / ADMIN_PASSWORD secrets and returns an admin token.
import { json, preflight, readBody } from '../_shared/http.ts'
import { safeEqual, signAdminToken } from '../_shared/adminAuth.ts'

Deno.serve(async (req) => {
  const early = preflight(req)
  if (early) return early

  const { email, password } = await readBody<{ email: string; password: string }>(req)
  const okEmail = safeEqual(String(email ?? '').trim().toLowerCase(), (Deno.env.get('ADMIN_EMAIL') ?? '').toLowerCase())
  const okPassword = safeEqual(String(password ?? ''), Deno.env.get('ADMIN_PASSWORD') ?? '')
  if (!Deno.env.get('ADMIN_PASSWORD') || !okEmail || !okPassword) return json(401, { error: 'Wrong email or password.' })

  return json(200, { token: await signAdminToken() })
})
