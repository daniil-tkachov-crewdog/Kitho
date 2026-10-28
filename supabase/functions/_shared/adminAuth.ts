// Admin session tokens: base64url(payload).base64url(HMAC-SHA256), signed with ADMIN_TOKEN_SECRET.
import { json } from './http.ts'

const TOKEN_TTL_MS = 12 * 60 * 60 * 1000
const enc = new TextEncoder()

const b64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const fromB64url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0))

async function key() {
  const secret = Deno.env.get('ADMIN_TOKEN_SECRET')
  if (!secret) throw new Error('ADMIN_TOKEN_SECRET is not set')
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'])
}

/** Constant-time string comparison. */
export function safeEqual(a: string, b: string) {
  const x = enc.encode(a)
  const y = enc.encode(b)
  let diff = x.length ^ y.length
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0)
  return diff === 0
}

export async function signAdminToken(): Promise<string> {
  const payload = b64url(enc.encode(JSON.stringify({ exp: Date.now() + TOKEN_TTL_MS })))
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', await key(), enc.encode(payload)))
  return `${payload}.${b64url(sig)}`
}

async function verifyAdminToken(token: string): Promise<boolean> {
  const [payload, sig] = token.split('.')
  if (!payload || !sig) return false
  try {
    const ok = await crypto.subtle.verify('HMAC', await key(), fromB64url(sig), enc.encode(payload))
    return ok && JSON.parse(new TextDecoder().decode(fromB64url(payload))).exp > Date.now()
  } catch {
    return false
  }
}

/** Returns a 401 response unless the request carries a valid admin token. */
export async function requireAdmin(req: Request): Promise<Response | null> {
  const token = req.headers.get('x-admin-token') ?? ''
  return (await verifyAdminToken(token)) ? null : json(401, { error: 'Admin session expired. Log in again.' })
}
