// CORS + JSON helpers shared by every Edge Function.
export const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

export const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

/** Handles OPTIONS and rejects non-POST requests. Returns a response to send, or null to continue. */
export function preflight(req: Request): Response | null {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' })
  return null
}

export async function readBody<T>(req: Request): Promise<Partial<T>> {
  try {
    return (await req.json()) ?? {}
  } catch {
    return {}
  }
}
