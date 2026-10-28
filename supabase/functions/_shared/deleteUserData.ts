// Permanently deletes a user's photos and auth account. DB rows cascade from auth.users.
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'

export async function deleteUserData(admin: SupabaseClient, userId: string): Promise<string | null> {
  const { data: files, error: listError } = await admin.storage.from('photos').list(userId, { limit: 100 })
  if (listError) return 'Could not delete photos'
  if (files.length) {
    const { error } = await admin.storage.from('photos').remove(files.map((f) => `${userId}/${f.name}`))
    if (error) return 'Could not delete photos'
  }
  const { error } = await admin.auth.admin.deleteUser(userId)
  return error ? 'Could not delete account' : null
}
