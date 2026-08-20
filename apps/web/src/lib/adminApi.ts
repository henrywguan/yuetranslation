import { getAccessToken } from './auth'

function resolveApiBase(): string {
  if (typeof window !== 'undefined') {
    const fromQuery = new URLSearchParams(window.location.search).get('api')
    if (fromQuery) return fromQuery.replace(/\/$/, '')
  }
  return (import.meta.env.VITE_API_BASE as string) || '/api'
}

async function adminFetch(path: string, init: RequestInit = {}) {
  const headers: Record<string, string> = {
    ...(init.body ? { 'Content-Type': 'application/json' } : {}),
    ...((init.headers as Record<string, string>) || {}),
  }
  const token = await getAccessToken()
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`${resolveApiBase()}${path}`, {
    credentials: 'same-origin',
    ...init,
    headers,
  })
  return res
}

export type AdminUser = {
  id: string
  email: string | null
  displayName: string | null
  createdAt: string | null
  plan: 'free' | 'pro' | 'max'
  disabled: boolean
  bannedUntil: string | null
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null
  stripeDashboardUrl: string | null
  month: string
  liveSeconds: number
  ttsChars: number
  translateCount: number
  liveLimitSeconds: number
  ttsLimitChars: number
  overQuota: boolean
}

export type AdminAuditEntry = {
  id: number
  actor_id: string
  actor_email: string | null
  action: string
  target_user_id: string | null
  target_email: string | null
  detail: Record<string, unknown> | null
  created_at: string
}

export type AdminListQuery = {
  month?: string
  q?: string
  plan?: string
  overQuota?: boolean
  disabled?: boolean
  sort?: string
  dir?: 'asc' | 'desc'
}

function toQuery(params: AdminListQuery): string {
  const sp = new URLSearchParams()
  if (params.month) sp.set('month', params.month)
  if (params.q) sp.set('q', params.q)
  if (params.plan && params.plan !== 'all') sp.set('plan', params.plan)
  if (params.overQuota) sp.set('overQuota', '1')
  if (params.disabled) sp.set('disabled', '1')
  if (params.sort) sp.set('sort', params.sort)
  if (params.dir) sp.set('dir', params.dir)
  const s = sp.toString()
  return s ? `?${s}` : ''
}

export async function fetchAdminMe(): Promise<{ ok: boolean; email: string | null }> {
  const res = await adminFetch('/admin/me')
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw Object.assign(new Error(data.message || 'Not an admin'), { status: res.status })
  }
  return res.json()
}

export async function fetchAdminUsers(params: AdminListQuery = {}): Promise<{
  month: string
  count: number
  users: AdminUser[]
}> {
  const res = await adminFetch(`/admin/users${toQuery(params)}`)
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.message || 'Failed to load users')
  }
  return res.json()
}

export async function fetchAdminUserUsage(userId: string): Promise<{
  user: { id: string; email: string | null } | null
  months: { month: string; liveSeconds: number; ttsChars: number; translateCount: number }[]
}> {
  const res = await adminFetch(`/admin/users/${encodeURIComponent(userId)}/usage`)
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.message || 'Failed to load usage')
  }
  return res.json()
}

export async function adminSetPlan(userId: string, plan: 'free' | 'pro' | 'max') {
  const res = await adminFetch(`/admin/users/${encodeURIComponent(userId)}/plan`, {
    method: 'PATCH',
    body: JSON.stringify({ plan }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.message || 'Failed to set plan')
  }
  return res.json()
}

export async function adminResetUsage(userId: string, month?: string) {
  const res = await adminFetch(`/admin/users/${encodeURIComponent(userId)}/reset-usage`, {
    method: 'POST',
    body: JSON.stringify(month ? { month } : {}),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.message || 'Failed to reset usage')
  }
  return res.json()
}

export async function adminSetDisabled(userId: string, disabled: boolean) {
  const res = await adminFetch(`/admin/users/${encodeURIComponent(userId)}/disabled`, {
    method: 'PATCH',
    body: JSON.stringify({ disabled }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.message || 'Failed to update ban')
  }
  return res.json()
}

export async function fetchAdminAudit(limit = 100): Promise<{ entries: AdminAuditEntry[] }> {
  const res = await adminFetch(`/admin/audit?limit=${limit}`)
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.message || 'Failed to load audit log')
  }
  return res.json()
}

/** Download CSV using the current admin session. */
export async function downloadAdminUsersCsv(params: AdminListQuery = {}) {
  const res = await adminFetch(`/admin/users.csv${toQuery(params)}`)
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.message || 'CSV export failed')
  }
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `jyut-users-${params.month || 'export'}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

/** Format integer seconds as `1h 02m 03s` (always shows seconds). */
export function formatLiveSeconds(total: number): string {
  const s = Math.max(0, Math.floor(total))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m ${String(sec).padStart(2, '0')}s`
  if (m > 0) return `${m}m ${String(sec).padStart(2, '0')}s`
  return `${sec}s`
}
