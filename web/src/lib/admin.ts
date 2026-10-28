// Admin panel API client. Every call goes to its own Edge Function with the admin token.
const BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string
const TOKEN_KEY = 'kitho_admin_token'

export class AdminAuthError extends Error {}

export function getAdminToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function clearAdminToken() {
  try {
    sessionStorage.removeItem(TOKEN_KEY)
  } catch {
    /* ignore */
  }
}

async function call<T>(fn: string, body: unknown = {}): Promise<T> {
  const res = await fetch(`${BASE}/${fn}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: KEY, 'x-admin-token': getAdminToken() ?? '' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (res.status === 401 && fn !== 'admin-login') {
    clearAdminToken()
    throw new AdminAuthError(data.error ?? 'Admin session expired.')
  }
  if (!res.ok) throw new Error(data.error ?? 'Something went wrong.')
  return data as T
}

export async function adminLogin(email: string, password: string) {
  const { token } = await call<{ token: string }>('admin-login', { email, password })
  try {
    sessionStorage.setItem(TOKEN_KEY, token)
  } catch {
    /* ignore */
  }
}

export type Visit = { id: string; who: string; location: string; device: string; browser: string; created_at: string }
export type Stats = { visitors: number; users: number; reports: number }
export const getStats = () => call<{ stats: Stats; visits: Visit[] }>('admin-stats')

export type AdminUser = {
  id: string
  personal_id: string | null
  name: string | null
  email: string | null
  phone: string | null
  location: string | null
  age: number | null
  reports: number
  points: number
  restricted: boolean
  restricted_manual: boolean
  banned: boolean
  created_at: string
}
export const getUsers = () => call<{ users: AdminUser[] }>('admin-users').then((r) => r.users)
export const setRestricted = (id: string, restricted: boolean) => call('admin-restrict', { id, restricted })
export const setBanned = (id: string, banned: boolean) => call('admin-ban', { id, banned })
export const deleteUser = (id: string) => call('admin-delete-user', { id })

export type AdminReport = {
  id: string
  created_at: string
  reason: string
  details: string
  points: number
  reported_id: string
  reported_personal_id: string | null
  reported_name: string
  reporter_id: string
  reporter_personal_id: string | null
  reporter_name: string
}
export const getReports = () => call<{ reports: AdminReport[] }>('admin-reports').then((r) => r.reports)

export type ReportSettings = { restrict_points: number; ban_points: number; decay_days: number }
export type ReportConfig = { reasons: Record<string, number>; settings: ReportSettings }
export const getReportConfig = () => call<ReportConfig>('admin-report-settings')
export const saveReportConfig = (config: ReportConfig) => call<ReportConfig>('admin-report-settings', config)
