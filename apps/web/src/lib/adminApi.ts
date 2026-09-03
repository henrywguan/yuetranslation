import { getAccessToken } from './auth'
import { resolveApiBase } from './api'
import type { IncidentBannerSettings } from './types'

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
  /** Custom Account Hub username; null if unset. */
  username: string | null
  createdAt: string | null
  plan: 'free' | 'family' | 'business'
  role: 'admin' | 'family' | null
  isAdmin: boolean
  disabled: boolean
  bannedUntil: string | null
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null
  stripeDashboardUrl: string | null
  rangeFrom: string
  rangeTo: string
  months: string[]
  liveSeconds: number
  ttsChars: number
  translateCount: number
  cameraSeconds: number
  cameraTranslateCount: number
  docsPages: number
  aiVisionCount: number
  liveLimitSeconds: number
  ttsLimitChars: number
  cameraLimitSeconds: number
  docsLimitPages: number
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

export type AdminBugReport = {
  id: string
  created_at: string
  issue_type: string
  user_id: string
  email: string | null
  route: string | null
  mode: string | null
  client: Record<string, unknown>
  context: Record<string, unknown>
  status: 'open' | 'triaged' | 'closed'
}

export type AdminListQuery = {
  from?: string
  to?: string
  /** @deprecated Prefer from/to — full calendar month */
  month?: string
  q?: string
  plan?: string
  overQuota?: boolean
  disabled?: boolean
  sort?: string
  dir?: 'asc' | 'desc'
}

export type AdminUsageMonth = {
  month: string
  liveSeconds: number
  ttsChars: number
  translateCount: number
  cameraSeconds: number
  cameraTranslateCount: number
  docsPages: number
  aiVisionCount: number
}

export type AdminUsageRangeQuery = {
  from?: string
  to?: string
}

function toQuery(params: AdminListQuery): string {
  const sp = new URLSearchParams()
  if (params.from) sp.set('from', params.from)
  if (params.to) sp.set('to', params.to)
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
  rangeFrom: string
  rangeTo: string
  months: string[]
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

export async function fetchAdminUserUsage(
  userId: string,
  range: AdminUsageRangeQuery = {},
): Promise<{
  user: { id: string; email: string | null } | null
  rangeFrom: string
  rangeTo: string
  months: AdminUsageMonth[]
  total: AdminUsageMonth
}> {
  const sp = new URLSearchParams()
  if (range.from) sp.set('from', range.from)
  if (range.to) sp.set('to', range.to)
  const qs = sp.toString()
  const res = await adminFetch(
    `/admin/users/${encodeURIComponent(userId)}/usage${qs ? `?${qs}` : ''}`,
  )
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.message || 'Failed to load usage')
  }
  return res.json()
}

export async function adminSetPlan(userId: string, plan: 'free' | 'family' | 'business') {
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

export async function adminSetRole(userId: string, role: 'admin' | 'family' | null) {
  const res = await adminFetch(`/admin/users/${encodeURIComponent(userId)}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.message || 'Failed to set role')
  }
  return res.json()
}

export type AdminUsageReset = {
  month?: string
  liveSeconds?: number
  ttsChars?: number
  cameraSeconds?: number
  docsPages?: number
}

export async function adminResetUsage(userId: string, patch: AdminUsageReset) {
  const res = await adminFetch(`/admin/users/${encodeURIComponent(userId)}/reset-usage`, {
    method: 'POST',
    body: JSON.stringify(patch),
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

export async function fetchAdminBugReports(limit = 100): Promise<{ reports: AdminBugReport[] }> {
  const res = await adminFetch(`/admin/bug-reports?limit=${limit}`)
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.message || 'Failed to load bug reports')
  }
  return res.json()
}

export async function adminPatchBugReportStatus(
  reportId: string,
  status: 'open' | 'triaged' | 'closed',
) {
  const res = await adminFetch(`/admin/bug-reports/${encodeURIComponent(reportId)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.message || 'Failed to update report')
  }
  return res.json()
}

export type BugReportAiAnswer = {
  verdict: 'test' | 'real' | 'unclear'
  suggestedStatus: 'open' | 'triaged' | 'closed'
  headline: string
  analysis: string
  likelyCause: string | null
  nextSteps: string[]
  confidence: number
  heuristics: { likelyTest: boolean; reasons: string[] }
  model: string
  generatedAt: string
}

export async function fetchBugReportAiAnswer(
  reportId: string,
): Promise<{ ok: boolean; answer: BugReportAiAnswer }> {
  const res = await adminFetch(`/admin/bug-reports/${encodeURIComponent(reportId)}/ai-answer`, {
    method: 'POST',
    body: JSON.stringify({}),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error((data as { message?: string }).message || 'AI answer failed')
  }
  return data as { ok: boolean; answer: BugReportAiAnswer }
}

export async function resendBugReportEmail(
  reportId: string,
): Promise<{ ok: boolean; message?: string }> {
  const res = await adminFetch(
    `/admin/bug-reports/${encodeURIComponent(reportId)}/resend-email`,
    {
      method: 'POST',
      body: JSON.stringify({}),
    },
  )
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error((data as { message?: string }).message || 'Resend email failed')
  }
  return data as { ok: boolean }
}

export type { IncidentBannerSettings } from './types'

export async function fetchAdminIncidentBanner(): Promise<{
  incidentBanner: IncidentBannerSettings
}> {
  const res = await adminFetch('/admin/incident-banner')
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error((data as { message?: string }).message || 'Failed to load incident banner')
  }
  return data as { incidentBanner: IncidentBannerSettings }
}

export async function patchAdminIncidentBanner(
  enabled: boolean,
): Promise<{ ok: boolean; incidentBanner: IncidentBannerSettings }> {
  const res = await adminFetch('/admin/incident-banner', {
    method: 'PATCH',
    body: JSON.stringify({ enabled }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error((data as { message?: string }).message || 'Failed to update incident banner')
  }
  return data as { ok: boolean; incidentBanner: IncidentBannerSettings }
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
  a.download = `jyut-users-${params.from || 'export'}_${params.to || ''}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export type ResendAudienceSyncResult = {
  ok: boolean
  scanned: number
  synced: number
  skipped: number
  failed: number
  errors: { email: string; message: string }[]
}

/** Scan all auth users and upsert emails into the configured Resend Audience. */
export async function syncResendAudience(): Promise<ResendAudienceSyncResult> {
  const res = await adminFetch('/admin/resend-audience/sync', { method: 'POST' })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error((data as { message?: string }).message || 'Resend audience sync failed')
  }
  return data as ResendAudienceSyncResult
}

export type HouseholdUsageBackfillResult = {
  ok: boolean
  householdsEnsured: number
  householdsMerged: number
  monthsMerged: number
}

/** Fold legacy per-user usage into household pools for all months (idempotent). */
export async function backfillHouseholdUsage(): Promise<HouseholdUsageBackfillResult> {
  const res = await adminFetch('/admin/household-usage/backfill', { method: 'POST' })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error((data as { message?: string }).message || 'Household usage backfill failed')
  }
  return data as HouseholdUsageBackfillResult
}

export type CampaignFields = {
  subject: string
  preview: string
  eyebrow: string
  headline: string
  body: string
  ctaLabel: string
  ctaUrl: string
  secondary: string
  signOff: string
}

export type CampaignVariant =
  | 'announcement'
  | 'product-update'
  | 'feature-spotlight'
  | 'newsletter'
  | 'welcome'
  | 'plain'

export type EmailTemplateItem = {
  id: string
  source: 'builtin' | 'custom'
  kind: string
  variant: CampaignVariant
  name: string
  description: string
  thumb: 'hero' | 'split' | 'digest' | 'minimal' | 'spotlight' | 'welcome'
  defaults: CampaignFields
  updatedAt?: string
}

export type EmailContact = {
  id: string
  email: string
  name: string | null
  source: 'resend' | 'app'
  unsubscribed?: boolean
}

export async function fetchEmailTemplates(): Promise<{ templates: EmailTemplateItem[] }> {
  const res = await adminFetch('/admin/email/templates')
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((data as { message?: string }).message || 'Failed to load templates')
  return data as { templates: EmailTemplateItem[] }
}

export async function fetchEmailContacts(): Promise<{
  contacts: EmailContact[]
  audienceId: string | null
  audienceConfigured: boolean
}> {
  const res = await adminFetch('/admin/email/contacts')
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((data as { message?: string }).message || 'Failed to load contacts')
  return data as {
    contacts: EmailContact[]
    audienceId: string | null
    audienceConfigured: boolean
  }
}

export async function previewAdminEmail(input: {
  variant: CampaignVariant
  fields: CampaignFields
  includeUnsubscribe?: boolean
}): Promise<{ html: string }> {
  const res = await adminFetch('/admin/email/preview', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((data as { message?: string }).message || 'Preview failed')
  return data as { html: string }
}

export async function saveEmailTemplate(input: {
  id?: string
  name: string
  description?: string
  baseVariant: CampaignVariant
  fields: CampaignFields
}): Promise<{ ok: boolean; id: string }> {
  const res = await adminFetch('/admin/email/templates', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((data as { message?: string }).message || 'Save failed')
  return data as { ok: boolean; id: string }
}

export async function archiveEmailTemplate(templateId: string): Promise<void> {
  const res = await adminFetch(`/admin/email/templates/${encodeURIComponent(templateId)}`, {
    method: 'DELETE',
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error((data as { message?: string }).message || 'Archive failed')
  }
}

export async function sendAdminEmail(input: {
  mode: 'recipients' | 'audience'
  templateKey: string
  variant: CampaignVariant
  fields: CampaignFields
  emails?: string[]
  confirm: true
}): Promise<{
  ok: boolean
  mode: string
  sent?: number
  failed?: number
  attempted?: number
  broadcastId?: string
  errors?: { email: string; message: string }[]
  hint?: string | null
}> {
  const res = await adminFetch('/admin/email/send', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((data as { message?: string }).message || 'Send failed')
  return data as {
    ok: boolean
    mode: string
    sent?: number
    failed?: number
    attempted?: number
    broadcastId?: string
    errors?: { email: string; message: string }[]
    hint?: string | null
  }
}

import { formatExactDuration } from './formatDuration'

/** Format integer seconds as `1h 02m 03s` (always shows seconds). */
export function formatLiveSeconds(total: number): string {
  return formatExactDuration(total)
}
