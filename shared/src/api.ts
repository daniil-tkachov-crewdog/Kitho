import { sb, uuid } from './client'

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
  birth_date?: string
  location: string
  description: string
  phone: string | null
}

function sortPhotos<T extends { photos: Photo[] }>(p: T): T {
  return { ...p, photos: [...p.photos].sort((a, b) => a.position - b.position) }
}

export async function getProfile(id: string): Promise<Profile | null> {
  const { data, error } = await sb()
    .from('profiles')
    .select(`${PUBLIC_PROFILE_COLUMNS}, photos(id, path, position)`)
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data ? sortPhotos(data as Profile) : null
}

export async function getMyPhone(): Promise<string | null> {
  const { data, error } = await sb().rpc('get_my_private')
  if (error) throw error
  return data?.[0]?.phone ?? null
}

export type MyStatus = { banned: boolean; birth_date: string | null; frozen: boolean }

/** My private status: banned (locked out of the app), birth date (null → must be asked), frozen. */
export async function getMyStatus(): Promise<MyStatus> {
  const { data, error } = await sb().rpc('get_my_status')
  if (error) throw error
  const r = data?.[0]
  return { banned: r?.banned ?? false, birth_date: r?.birth_date ?? null, frozen: r?.frozen ?? false }
}

/** Sets my date of birth (once; the server derives the age and enforces 18+). */
export async function setBirthDate(id: string, birthDate: string) {
  const { error } = await sb().from('profiles').update({ birth_date: birthDate }).eq('id', id)
  if (error) throw error
}

/** Freezes/unfreezes my profile (hidden from the feed; open chats stay). */
export async function setFrozen(id: string, frozen: boolean) {
  const { error } = await sb().from('profiles').update({ frozen }).eq('id', id)
  if (error) throw error
}

/** Whether an email already has an account ('exists') or belongs to a deleted banned account ('banned'). */
export async function checkEmail(email: string): Promise<'free' | 'exists' | 'banned'> {
  const { data, error } = await sb().rpc('check_email', { p_email: email })
  if (error) throw error
  return data as 'free' | 'exists' | 'banned'
}

export type BlockState = { i_blocked: boolean; blocked_me: boolean }

export async function getBlockState(otherId: string): Promise<BlockState> {
  const { data, error } = await sb().rpc('block_state', { p_other: otherId })
  if (error) throw error
  return { i_blocked: data?.[0]?.i_blocked ?? false, blocked_me: data?.[0]?.blocked_me ?? false }
}

/** Blocks or unblocks a user. Returns true when they are now blocked. */
export async function toggleBlock(otherId: string): Promise<boolean> {
  const { data, error } = await sb().rpc('toggle_block', { p_user: otherId })
  if (error) throw error
  return data as boolean
}

export async function saveProfile(id: string, input: ProfileInput, exists: boolean) {
  const { error } = exists
    ? await sb().from('profiles').update(input).eq('id', id)
    : await sb().from('profiles').insert({ id, ...input })
  if (error) throw error
}

/** Uploads photo bytes and records them at the given slot (1–3), replacing whatever was there. */
export async function uploadPhoto(userId: string, body: Blob | ArrayBuffer, contentType: string, position: number, previous?: Photo) {
  const ext = contentType === 'image/png' ? 'png' : contentType === 'image/webp' ? 'webp' : 'jpg'
  const path = `${userId}/${uuid()}.${ext}`
  const up = await sb().storage.from('photos').upload(path, body, { contentType })
  if (up.error) throw up.error
  if (previous) await deletePhoto(previous)
  const { error } = await sb().from('photos').insert({ profile_id: userId, path, position })
  if (error) {
    await sb().storage.from('photos').remove([path])
    throw error
  }
}

export async function deletePhoto(photo: Photo) {
  const { error } = await sb().from('photos').delete().eq('id', photo.id)
  if (error) throw error
  await sb().storage.from('photos').remove([photo.path])
}

const urlCache = new Map<string, { url: string; expires: number }>()

export async function photoUrls(paths: string[]): Promise<Record<string, string>> {
  const now = Date.now()
  const missing = paths.filter((p) => !(urlCache.get(p)?.expires! > now))
  if (missing.length) {
    const { data, error } = await sb().storage.from('photos').createSignedUrls(missing, 3600)
    if (error) throw error
    for (const item of data) {
      if (item.path && item.signedUrl) urlCache.set(item.path, { url: item.signedUrl, expires: now + 50 * 60_000 })
    }
  }
  return Object.fromEntries(paths.flatMap((p) => (urlCache.has(p) ? [[p, urlCache.get(p)!.url]] : [])))
}

/** Profiles in sign-up order (no ranking), excluding me, frozen and blocked (either way), only those with a photo. */
export async function getFeedPage(myId: string, offset: number, limit = 20): Promise<Profile[]> {
  const hidden = await sb().rpc('my_hidden_ids')
  if (hidden.error) throw hidden.error
  const exclude = [myId, ...((hidden.data ?? []) as string[])]
  const { data, error } = await sb()
    .from('profiles')
    .select(`${PUBLIC_PROFILE_COLUMNS}, photos!inner(id, path, position)`)
    .not('id', 'in', `(${exclude.join(',')})`)
    .eq('frozen', false)
    .order('created_at', { ascending: true })
    .order('id', { ascending: true })
    .range(offset, offset + limit - 1)
  if (error) throw error
  return (data as Profile[]).map(sortPhotos)
}

export async function likeProfile(myId: string, targetId: string) {
  const { error } = await sb().from('likes').insert({ liker_id: myId, liked_id: targetId })
  if (error && error.code !== '23505') throw error // already liked → fine
}

export async function getSentState(myId: string, targetIds: string[]) {
  if (!targetIds.length) return { liked: new Set<string>(), chats: new Map<string, string>() }
  const [likes, chats] = await Promise.all([
    sb().from('likes').select('liked_id').eq('liker_id', myId).in('liked_id', targetIds),
    sb()
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
  const { data, error } = await sb()
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
  const { data, error } = await sb()
    .from('profiles')
    .select(`${PUBLIC_PROFILE_COLUMNS}, photos(id, path, position)`)
    .in('id', ids)
  if (error) throw error
  return Object.fromEntries((data as Profile[]).map((p) => [p.id, sortPhotos(p)]))
}

export async function listChats(): Promise<(ChatSummary & { profile: Profile })[]> {
  const { data, error } = await sb().rpc('list_my_chats')
  if (error) throw error
  const chats = data as ChatSummary[]
  const profiles = await profilesById([...new Set(chats.map((c) => c.other_id))])
  return chats.filter((c) => profiles[c.other_id]).map((c) => ({ ...c, profile: profiles[c.other_id] }))
}

export async function unreadTotal(): Promise<number> {
  const [chats, admin] = await Promise.all([sb().rpc('list_my_chats'), getMyAdminChat()])
  if (chats.error) throw chats.error
  return (chats.data as ChatSummary[]).reduce((n, c) => n + c.unread, 0) + (admin?.unread ?? 0)
}

// ── Admin chat (one per user, with the Kitho admin) ─────────────────────────────────────
export type AdminChatSummary = {
  created_at: string
  last_message_at: string | null
  last_body: string | null
  last_from_admin: boolean | null
  unread: number
  admin_read_at: string
}
export type AdminMessage = { id: string; user_id: string; from_admin: boolean; body: string; created_at: string }

/** My chat with the admin, or null if there is none yet. */
export async function getMyAdminChat(): Promise<AdminChatSummary | null> {
  const { data, error } = await sb().rpc('my_admin_chat')
  if (error) throw error
  return ((data as AdminChatSummary[])[0] ?? null)
}

export async function getAdminMessages(): Promise<AdminMessage[]> {
  const { data, error } = await sb()
    .from('admin_messages')
    .select('id, user_id, from_admin, body, created_at')
    .order('created_at', { ascending: true })
  if (error) throw error
  return data as AdminMessage[]
}

export async function sendAdminMessage(body: string) {
  const { error } = await sb().rpc('send_admin_message', { p_body: body })
  if (error) throw error
}

export async function markAdminChatRead() {
  const { error } = await sb().rpc('mark_admin_chat_read')
  if (error) throw error
}

/** Live updates for my admin chat: new messages and admin read receipts. Returns an unsubscribe function. */
export function subscribeAdminChat(myId: string, onMessage: (m: AdminMessage) => void, onRead: (adminReadAt: string) => void) {
  const channel = sb()
    .channel(`admin-chat:${uuid()}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'admin_messages', filter: `user_id=eq.${myId}` }, (p) =>
      onMessage(p.new as AdminMessage),
    )
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'admin_chats', filter: `user_id=eq.${myId}` }, (p) =>
      onRead((p.new as { admin_last_read_at: string }).admin_last_read_at),
    )
    .subscribe()
  return () => void sb().removeChannel(channel)
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
  const { data, error } = await sb()
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
  const { data, error } = await sb()
    .from('messages')
    .select('id, chat_id, sender_id, body, created_at, liked_by')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data as Message[]
}

/** Sends a text message to a user; creates a pending chat (letter) if none exists. Returns the chat id. */
export async function sendMessage(toId: string, body: string): Promise<string> {
  const { data, error } = await sb().rpc('send_message', { p_to: toId, p_body: body })
  if (error) throw error
  return data as string
}

export async function declineChat(chatId: string) {
  const { error } = await sb().rpc('decline_chat', { p_chat: chatId })
  if (error) throw error
}

export async function markChatRead(chatId: string) {
  const { error } = await sb().rpc('mark_chat_read', { p_chat: chatId })
  if (error) throw error
}

/** Toggles my like on a message. Returns the new liked state. */
export async function toggleMessageLike(messageId: string): Promise<boolean> {
  const { data, error } = await sb().rpc('toggle_message_like', { p_message: messageId })
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
  const { error } = await sb().from('reports').insert({ reporter_id: myId, reported_id: reportedId, reason, details })
  if (error) throw error
}

/** Live updates for one chat: new and changed messages, status and read-receipt changes. Returns an unsubscribe function. */
export function subscribeChat(
  myId: string,
  chatId: string,
  onMessage: (m: Message) => void,
  onChat: (c: Pick<ChatDetail, 'status' | 'initiator_id' | 'other_read_at'>) => void,
) {
  const channel = sb()
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
  return () => void sb().removeChannel(channel)
}

/** Fires on any new message or chat change visible to me (RLS-filtered). Returns an unsubscribe function. */
export function subscribeMyChats(onChange: () => void) {
  const channel = sb()
    .channel(`my-chats:${uuid()}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'chats' }, onChange)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'admin_messages' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_chats' }, onChange)
    .subscribe()
  return () => void sb().removeChannel(channel)
}

export async function deleteAccount() {
  const { error } = await sb().functions.invoke('delete-account', { method: 'POST' })
  if (error) throw error
}

export function errorText(e: unknown): string {
  if (e instanceof Error) return e.message
  if (e && typeof e === 'object' && 'message' in e) return String((e as { message: unknown }).message)
  return 'Something went wrong. Please try again.'
}
