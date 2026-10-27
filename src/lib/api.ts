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

export async function getSentState(myId: string, targetIds: string[]) {
  if (!targetIds.length) return { liked: new Set<string>(), chats: new Map<string, string>() }
  const [likes, chats] = await Promise.all([
    supabase.from('likes').select('liked_id').eq('liker_id', myId).in('liked_id', targetIds),
    supabase
      .from('chats')
      .select('id, user_a, user_b')
      .or(`and(user_a.eq.${myId},user_b.in.(${targetIds})),and(user_b.eq.${myId},user_a.in.(${targetIds}))`),
  ])
  if (likes.error) throw likes.error
  if (chats.error) throw chats.error
  return {
    liked: new Set(likes.data.map((r) => r.liked_id as string)),
    chats: new Map(chats.data.map((c) => [(c.user_a === myId ? c.user_b : c.user_a) as string, c.id as string])),
  }
}

export type InboxLike = { created_at: string; profile: Profile }

export async function getLikesReceived(myId: string): Promise<InboxLike[]> {
  const { data, error } = await supabase
    .from('likes')
    .select(`created_at, profile:profiles!likes_liker_id_fkey(${PUBLIC_PROFILE_COLUMNS}, photos(id, path, position))`)
    .eq('liked_id', myId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data as unknown as InboxLike[]).filter((r) => r.profile).map((r) => ({ ...r, profile: sortPhotos(r.profile) }))
}

export type ChatStatus = 'pending' | 'active' | 'declined'
export type ChatSummary = {
  id: string
  other_id: string
  status: ChatStatus
  initiator_id: string | null
  created_at: string
  last_message_at: string | null
  last_body: string | null
  last_sender_id: string | null
  unread: number
}
export type Message = { id: string; chat_id: string; sender_id: string; body: string; created_at: string; liked_by: string[] }

async function profilesById(ids: string[]): Promise<Record<string, Profile>> {
  if (!ids.length) return {}
  const { data, error } = await supabase
    .from('profiles')
    .select(`${PUBLIC_PROFILE_COLUMNS}, photos(id, path, position)`)
    .in('id', ids)
  if (error) throw error
  return Object.fromEntries((data as Profile[]).map((p) => [p.id, sortPhotos(p)]))
}

export async function listChats(): Promise<(ChatSummary & { profile: Profile })[]> {
  const { data, error } = await supabase.rpc('list_my_chats')
  if (error) throw error
  const chats = data as ChatSummary[]
  const profiles = await profilesById([...new Set(chats.map((c) => c.other_id))])
  return chats.filter((c) => profiles[c.other_id]).map((c) => ({ ...c, profile: profiles[c.other_id] }))
}

export async function unreadTotal(): Promise<number> {
  const { data, error } = await supabase.rpc('list_my_chats')
  if (error) throw error
  return (data as ChatSummary[]).reduce((n, c) => n + c.unread, 0)
}

export type ChatDetail = {
  id: string
  status: ChatStatus
  initiator_id: string | null
  other_read_at: string // when the other person last read this chat ('-infinity' if never)
  profile: Profile
}
type ChatRow = {
  id: string
  user_a: string
  user_b: string
  status: ChatStatus
  initiator_id: string | null
  a_last_read_at: string
  b_last_read_at: string
}
const otherReadAt = (row: ChatRow, myId: string) => (row.user_a === myId ? row.b_last_read_at : row.a_last_read_at)

export async function getChat(myId: string, chatId: string): Promise<ChatDetail | null> {
  const { data, error } = await supabase
    .from('chats')
    .select('id, user_a, user_b, status, initiator_id, a_last_read_at, b_last_read_at')
    .eq('id', chatId)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  const row = data as ChatRow
  const otherId = row.user_a === myId ? row.user_b : row.user_a
  const profile = (await profilesById([otherId]))[otherId]
  return profile
    ? { id: row.id, status: row.status, initiator_id: row.initiator_id, other_read_at: otherReadAt(row, myId), profile }
    : null
}

export async function getMessages(chatId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('id, chat_id, sender_id, body, created_at, liked_by')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data as Message[]
}

/** Sends a text message to a user; creates a pending chat (letter) if none exists. Returns the chat id. */
export async function sendMessage(toId: string, body: string): Promise<string> {
  const { data, error } = await supabase.rpc('send_message', { p_to: toId, p_body: body })
  if (error) throw error
  return data as string
}

export async function declineChat(chatId: string) {
  const { error } = await supabase.rpc('decline_chat', { p_chat: chatId })
  if (error) throw error
}

export async function markChatRead(chatId: string) {
  const { error } = await supabase.rpc('mark_chat_read', { p_chat: chatId })
  if (error) throw error
}

/** Toggles my like on a message. Returns the new liked state. */
export async function toggleMessageLike(messageId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('toggle_message_like', { p_message: messageId })
  if (error) throw error
  return data as boolean
}

export const REPORT_REASONS = [
  { code: 'fake', label: 'Fake profile or catfishing' },
  { code: 'spam', label: 'Spam or scam' },
  { code: 'harassment', label: 'Harassment or bullying' },
  { code: 'inappropriate', label: 'Inappropriate or sexual content' },
  { code: 'hate', label: 'Hate speech or discrimination' },
  { code: 'threats', label: 'Threats or violence' },
  { code: 'underage', label: 'Appears to be under 18' },
  { code: 'other', label: 'Something else' },
] as const
export type ReportReason = (typeof REPORT_REASONS)[number]['code']

export async function reportProfile(myId: string, reportedId: string, reason: ReportReason, details: string) {
  const { error } = await supabase.from('reports').insert({ reporter_id: myId, reported_id: reportedId, reason, details })
  if (error) throw error
}

/** Live updates for one chat: new and changed messages, status and read-receipt changes. Returns an unsubscribe function. */
export function subscribeChat(
  myId: string,
  chatId: string,
  onMessage: (m: Message) => void,
  onChat: (c: Pick<ChatDetail, 'status' | 'initiator_id' | 'other_read_at'>) => void,
) {
  const channel = supabase
    .channel(`chat:${chatId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` }, (p) =>
      onMessage(p.new as Message),
    )
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` }, (p) =>
      onMessage(p.new as Message),
    )
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chats', filter: `id=eq.${chatId}` }, (p) => {
      const row = p.new as ChatRow
      onChat({ status: row.status, initiator_id: row.initiator_id, other_read_at: otherReadAt(row, myId) })
    })
    .subscribe()
  return () => void supabase.removeChannel(channel)
}

/** Fires on any new message or chat change visible to me (RLS-filtered). Returns an unsubscribe function. */
export function subscribeMyChats(onChange: () => void) {
  const channel = supabase
    .channel(`my-chats:${crypto.randomUUID()}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'chats' }, onChange)
    .subscribe()
  return () => void supabase.removeChannel(channel)
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
