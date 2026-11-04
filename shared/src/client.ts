import type { SupabaseClient } from '@supabase/supabase-js'

type Shared = { client: SupabaseClient; uuid: () => string }
let shared: Shared | null = null

/** Each app (web, mobile) calls this once with its own Supabase client and UUID generator. */
export function initShared(s: Shared) {
  shared = s
}

function get(): Shared {
  if (!shared) throw new Error('initShared() was not called')
  return shared
}

export const sb = () => get().client
export const uuid = () => get().uuid()
