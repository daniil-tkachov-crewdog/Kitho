// Visitor tracker: records who (signed-in user or guest), approximate location (IP), device and browser.
import { json, preflight, readBody } from '../_shared/http.ts'
import { serviceClient } from '../_shared/serviceClient.ts'
import { parseBrowser, parseDevice } from './userAgent.ts'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function locate(ip: string): Promise<string> {
  if (!ip) return ''
  try {
    const res = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}?fields=success,city,country`, { signal: AbortSignal.timeout(2500) })
    const geo = await res.json()
    return geo.success ? [geo.city, geo.country].filter(Boolean).join(', ') : ''
  } catch {
    return ''
  }
}

Deno.serve(async (req) => {
  const early = preflight(req)
  if (early) return early

  const { visitor_id } = await readBody<{ visitor_id: string }>(req)
  if (!visitor_id || !UUID.test(visitor_id)) return json(400, { error: 'Invalid visitor id' })

  const db = serviceClient()
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') ?? ''
  const { data } = token.split('.').length === 3 ? await db.auth.getUser(token) : { data: null }

  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim()
  const ua = req.headers.get('user-agent') ?? ''
  const { error } = await db.from('visits').insert({
    visitor_id,
    user_id: data?.user?.id ?? null,
    location: await locate(ip),
    device: parseDevice(ua),
    browser: parseBrowser(ua),
  })
  return error ? json(500, { error: 'Could not record visit' }) : json(200, { ok: true })
})
