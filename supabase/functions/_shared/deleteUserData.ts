// Permanently deletes a user's photos and auth account. DB rows cascade from auth.users.
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'

/** Removes every file in the profile's photo folder. Returns an error message or null. */
export async function deletePhotos(admin: SupabaseClient, profileId: string): Promise<string | null> {
  const { data: files, error: listError } = await admin.storage.from('photos').list(profileId, { limit: 100 })
  if (listError) return 'Could not delete photos'
  if (files.length) {
    const { error } = await admin.storage.from('photos').remove(files.map((f) => `${profileId}/${f.name}`))
    if (error) return 'Could not delete photos'
  }
  return null
}

export async function deleteUserData(admin: SupabaseClient, userId: string): Promise<string | null> {
  // Banned accounts: keep a hash of the email so it can't be used to sign up again.
  const { error: rememberError } = await admin.rpc('remember_banned_email', { p_user: userId })
  if (rememberError) return 'Could not delete account'
  const photosError = await deletePhotos(admin, userId)
  if (photosError) return photosError
  const { error } = await admin.auth.admin.deleteUser(userId)
  return error ? 'Could not delete account' : null
}
