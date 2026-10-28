// Supabase client with the service role (bypasses RLS). Backend only.
import { createClient } from 'npm:@supabase/supabase-js@2'

export const serviceClient = () =>
  createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
