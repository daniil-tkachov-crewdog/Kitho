import { supabase } from './supabase'

export const PUBLIC_PROFILE_COLUMNS = 'id, name, age, location, description, created_at'
export const MAX_PHOTOS = 3

export type Photo = { id: string; path: string; position: number }
export type Profile = {
  id: string
  name: string
  age: number
  location: string
  description: string
  created_at: string
  photos: Photo[]
}
export type ProfileInput = {
  name: string
  age: number
  location: string
  description: string
  phone: string | null
}

function sortPhotos<T extends { photos: Photo[] }>(p: T): T {
  return { ...p, photos: [...p.photos].sort((a, b) => a.position - b.position) }
}

export async function getProfile(id: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select(`${PUBLIC_PROFILE_COLUMNS}, photos(id, path, position)`)
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data ? sortPhotos(data as Profile) : null
}

export async function getMyPhone(): Promise<string | null> {
  const { data, error } = await supabase.rpc('get_my_private')
  if (error) throw error
  return data?.[0]?.phone ?? null
}

export async function saveProfile(id: string, input: ProfileInput, exists: boolean) {
  const { error } = exists
    ? await supabase.from('profiles').update(input).eq('id', id)
    : await supabase.from('profiles').insert({ id, ...input })
  if (error) throw error
}

/** Uploads a photo file and records it at the given slot (1–3), replacing whatever was there. */
export async function uploadPhoto(userId: string, file: File, position: number, previous?: Photo) {
  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
  const path = `${userId}/${crypto.randomUUID()}.${ext}`
  const up = await supabase.storage.from('photos').upload(path, file, { contentType: file.type })
  if (up.error) throw up.error
  if (previous) await deletePhoto(previous)
  const { error } = await supabase.from('photos').insert({ profile_id: userId, path, position })
  if (error) {
    await supabase.storage.from('photos').remove([path])
    throw error
  }
}

export async function deletePhoto(photo: Photo) {
  const { error } = await supabase.from('photos').delete().eq('id', photo.id)
  if (error) throw error
  await supabase.storage.from('photos').remove([photo.path])
}

const urlCache = new Map<string, { url: string; expires: number }>()

export async function photoUrls(paths: string[]): Promise<Record<string, string>> {
  const now = Date.now()
  const missing = paths.filter((p) => !(urlCache.get(p)?.expires! > now))
  if (missing.length) {
    const { data, error } = await supabase.storage.from('photos').createSignedUrls(missing, 3600)
    if (error) throw error
    for (const item of data) {
      if (item.path && item.signedUrl) urlCache.set(item.path, { url: item.signedUrl, expires: now + 50 * 60_000 })
    }
  }
  return Object.fromEntries(paths.flatMap((p) => (urlCache.has(p) ? [[p, urlCache.get(p)!.url]] : [])))
}

/** Profiles in sign-up order (no ranking), excluding me, only those with at least one photo. */
export async function getFeedPage(myId: string, offset: number, limit = 20): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select(`${PUBLIC_PROFILE_COLUMNS}, photos!inner(id, path, position)`)
    .neq('id', myId)
    .order('created_at', { ascending: true })
    .order('id', { ascending: true })
    .range(offset, offset + limit - 1)
  if (error) throw error
  return (data as Profile[]).map(sortPhotos)
}

export async function likeProfile(myId: string, targetId: string) {
  const { error } = await supabase.from('likes').insert({ liker_id: myId, liked_id: targetId })
  if (error && error.code !== '23505') throw error // already liked → fine
}

export async function sendGreeting(myId: string, targetId: string, body: string) {
  const { error } = await supabase.from('messages').insert({ sender_id: myId, receiver_id: targetId, body })
  if (error?.code === '23505') throw new Error('You have already sent a greeting to this person.')
  if (error) throw error
}

export async function getSentState(myId: string, targetIds: string[]) {
  if (!targetIds.length) return { liked: new Set<string>(), messaged: new Set<string>() }
  const [likes, msgs] = await Promise.all([
    supabase.from('likes').select('liked_id').eq('liker_id', myId).in('liked_id', targetIds),
    supabase.from('messages').select('receiver_id').eq('sender_id', myId).in('receiver_id', targetIds),
  ])
  if (likes.error) throw likes.error
  if (msgs.error) throw msgs.error
  return {
    liked: new Set(likes.data.map((r) => r.liked_id as string)),
    messaged: new Set(msgs.data.map((r) => r.receiver_id as string)),
  }
}

export type InboxLike = { created_at: string; profile: Profile }
export type InboxMessage = { id: string; body: string; created_at: string; profile: Profile }

export async function getInbox(myId: string) {
  const [likes, msgs] = await Promise.all([
    supabase
      .from('likes')
      .select(`created_at, profile:profiles!likes_liker_id_fkey(${PUBLIC_PROFILE_COLUMNS}, photos(id, path, position))`)
      .eq('liked_id', myId)
      .order('created_at', { ascending: false }),
    supabase
      .from('messages')
      .select(`id, body, created_at, profile:profiles!messages_sender_id_fkey(${PUBLIC_PROFILE_COLUMNS}, photos(id, path, position))`)
      .eq('receiver_id', myId)
      .order('created_at', { ascending: false }),
  ])
  if (likes.error) throw likes.error
  if (msgs.error) throw msgs.error
  const fix = <T extends { profile: Profile }>(r: T): T => ({ ...r, profile: sortPhotos(r.profile) })
  return {
    likes: (likes.data as unknown as InboxLike[]).filter((r) => r.profile).map(fix),
    messages: (msgs.data as unknown as InboxMessage[]).filter((r) => r.profile).map(fix),
  }
}

export async function deleteAccount() {
  const { error } = await supabase.functions.invoke('delete-account', { method: 'POST' })
  if (error) throw error
}

export function errorText(e: unknown): string {
  if (e instanceof Error) return e.message
  if (e && typeof e === 'object' && 'message' in e) return String((e as { message: unknown }).message)
  return 'Something went wrong. Please try again.'
}
