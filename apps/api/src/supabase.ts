import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'
import { env } from './env.js'

let admin: SupabaseClient | null = null

export function supabaseConfigured(): boolean {
  return Boolean(env.supabaseUrl && env.supabaseServiceRole)
}

export function getAdmin(): SupabaseClient | null {
  if (!supabaseConfigured()) return null
  if (!admin) {
    admin = createClient(env.supabaseUrl, env.supabaseServiceRole, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }
  return admin
}

export async function getUserFromJwt(jwt: string): Promise<User | null> {
  const client = getAdmin()
  if (!client) return null
  const { data, error } = await client.auth.getUser(jwt)
  if (error || !data.user) return null
  return data.user
}

export type ProfileRow = {
  id: string
  plan: 'free' | 'family' | 'business'
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  disabled: boolean
  role: 'admin' | 'family' | null
  tts_voice_yue: string | null
  tts_voice_en: string | null
  tts_voice_cmn: string | null
  /** Cross-device Auto-speak preference. */
  auto_speak: boolean
  username: string | null
  username_changed_at: string | null
  updated_at: string
}

function normalizePlan(plan: unknown): ProfileRow['plan'] {
  // Legacy Stripe / DB values: `pro` → Family, `max` → Business.
  if (plan === 'family' || plan === 'pro') return 'family'
  if (plan === 'business' || plan === 'max') return 'business'
  return 'free'
}

function normalizeProfile(data: unknown): ProfileRow {
  const row = data as ProfileRow & {
    plan?: string
    disabled?: boolean
    role?: ProfileRow['role']
    tts_voice_yue?: string | null
    tts_voice_en?: string | null
    tts_voice_cmn?: string | null
    auto_speak?: boolean | null
    username?: string | null
    username_changed_at?: string | null
  }
  return {
    ...row,
    plan: normalizePlan(row.plan),
    disabled: Boolean(row.disabled),
    role: row.role === 'admin' || row.role === 'family' ? row.role : null,
    username: typeof row.username === 'string' && row.username.trim() ? row.username.trim() : null,
    username_changed_at:
      typeof row.username_changed_at === 'string' ? row.username_changed_at : null,
    tts_voice_yue: typeof row.tts_voice_yue === 'string' ? row.tts_voice_yue : null,
    tts_voice_en: typeof row.tts_voice_en === 'string' ? row.tts_voice_en : null,
    tts_voice_cmn: typeof row.tts_voice_cmn === 'string' ? row.tts_voice_cmn : null,
    auto_speak: Boolean(row.auto_speak),
  }
}

export async function getProfile(userId: string): Promise<ProfileRow | null> {
  const client = getAdmin()
  if (!client) return null
  const { data, error } = await client.from('profiles').select('*').eq('id', userId).maybeSingle()
  if (error || !data) return null
  return normalizeProfile(data)
}

export async function upsertProfilePlan(
  userId: string,
  patch: Partial<
    Pick<
      ProfileRow,
      | 'plan'
      | 'stripe_customer_id'
      | 'stripe_subscription_id'
      | 'disabled'
      | 'role'
      | 'tts_voice_yue'
      | 'tts_voice_en'
      | 'tts_voice_cmn'
      | 'auto_speak'
      | 'username'
      | 'username_changed_at'
    >
  >,
): Promise<void> {
  const client = getAdmin()
  if (!client) throw new Error('Database is not configured.')
  const { error } = await client
    .from('profiles')
    .upsert({ id: userId, ...patch, updated_at: new Date().toISOString() }, { onConflict: 'id' })
  if (error) throw new Error(error.message)
}

const USERNAME_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{2,23}$/

export function normalizeUsernameInput(raw: string): string | null {
  const trimmed = raw.trim()
  if (!USERNAME_RE.test(trimmed)) return null
  return trimmed
}

/** True when another profile already owns this username (case-insensitive). */
export async function isUsernameTaken(username: string, exceptUserId?: string): Promise<boolean> {
  const client = getAdmin()
  if (!client) return false
  let q = client.from('profiles').select('id').ilike('username', username).limit(2)
  const { data, error } = await q
  if (error || !data?.length) return false
  if (!exceptUserId) return data.length > 0
  return data.some((row) => row.id !== exceptUserId)
}

export async function findProfileByStripeCustomer(customerId: string): Promise<ProfileRow | null> {
  const client = getAdmin()
  if (!client) return null
  const { data } = await client
    .from('profiles')
    .select('*')
    .eq('stripe_customer_id', customerId)
    .maybeSingle()
  if (!data) return null
  return normalizeProfile(data)
}

export async function findProfileByStripeSubscription(subscriptionId: string): Promise<ProfileRow | null> {
  const client = getAdmin()
  if (!client) return null
  const { data } = await client
    .from('profiles')
    .select('*')
    .eq('stripe_subscription_id', subscriptionId)
    .maybeSingle()
  if (!data) return null
  return normalizeProfile(data)
}

export type AuthUserSummary = {
  id: string
  email: string | null
  displayName: string | null
  createdAt: string | null
  bannedUntil: string | null
}

/** Paginate Supabase Auth users (service role). */
export async function listAuthUsers(): Promise<AuthUserSummary[]> {
  const client = getAdmin()
  if (!client) return []
  const out: AuthUserSummary[] = []
  let page = 1
  const perPage = 200
  for (;;) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage })
    if (error) throw error
    const users = data.users || []
    for (const u of users) {
      const meta = (u.user_metadata || {}) as Record<string, unknown>
      const displayName =
        (typeof meta.full_name === 'string' && meta.full_name) ||
        (typeof meta.name === 'string' && meta.name) ||
        null
      out.push({
        id: u.id,
        email: u.email ?? null,
        displayName,
        createdAt: u.created_at ?? null,
        bannedUntil: (u as { banned_until?: string | null }).banned_until ?? null,
      })
    }
    if (users.length < perPage) break
    page += 1
    if (page > 50) break
  }
  return out
}

export async function listProfiles(): Promise<ProfileRow[]> {
  const client = getAdmin()
  if (!client) return []
  const { data, error } = await client.from('profiles').select('*')
  if (error || !data) return []
  return (data as ProfileRow[]).map((row) => normalizeProfile(row))
}

export async function getAuthUserById(userId: string): Promise<AuthUserSummary | null> {
  const client = getAdmin()
  if (!client) return null
  const { data, error } = await client.auth.admin.getUserById(userId)
  if (error || !data.user) return null
  const u = data.user
  const meta = (u.user_metadata || {}) as Record<string, unknown>
  const displayName =
    (typeof meta.full_name === 'string' && meta.full_name) ||
    (typeof meta.name === 'string' && meta.name) ||
    null
  return {
    id: u.id,
    email: u.email ?? null,
    displayName,
    createdAt: u.created_at ?? null,
    bannedUntil: (u as { banned_until?: string | null }).banned_until ?? null,
  }
}

/** Ban or unban via Auth Admin API (blocks sign-in when banned). */
export async function setAuthBanned(userId: string, banned: boolean): Promise<void> {
  const client = getAdmin()
  if (!client) return
  await client.auth.admin.updateUserById(userId, {
    ban_duration: banned ? '876000h' : 'none',
  })
}

export type AuditAction =
  | 'set_plan'
  | 'set_role'
  | 'reset_usage'
  | 'ban'
  | 'unban'
  | 'resend_audience_sync'
  | 'email_send_recipients'
  | 'email_send_audience'
  | 'email_template_save'
  | 'bug_report_ai_answer'
  | 'bug_report_resend_email'
  | 'incident_banner'
  | 'household_usage_backfill'

export async function writeAuditLog(entry: {
  actorId: string
  actorEmail: string | null
  action: AuditAction
  targetUserId?: string | null
  targetEmail?: string | null
  detail?: Record<string, unknown>
}): Promise<void> {
  const client = getAdmin()
  if (!client) return
  await client.from('admin_audit_log').insert({
    actor_id: entry.actorId,
    actor_email: entry.actorEmail,
    action: entry.action,
    target_user_id: entry.targetUserId,
    target_email: entry.targetEmail ?? null,
    detail: entry.detail ?? null,
  })
}

export type BugReportRow = {
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

export async function insertBugReport(entry: {
  issueType: string
  userId: string
  email: string | null
  route: string | null
  mode: string | null
  client: Record<string, unknown>
  context: Record<string, unknown>
}): Promise<BugReportRow> {
  const client = getAdmin()
  if (!client) throw new Error('Database not configured')
  const { data, error } = await client
    .from('bug_reports')
    .insert({
      issue_type: entry.issueType,
      user_id: entry.userId,
      email: entry.email,
      route: entry.route,
      mode: entry.mode,
      client: entry.client,
      context: entry.context,
    })
    .select('*')
    .single()
  if (error || !data) throw new Error(error?.message || 'Failed to insert bug report')
  return data as BugReportRow
}

export async function countRecentBugReports(userId: string, minutes: number): Promise<number> {
  const client = getAdmin()
  if (!client) return 0
  const since = new Date(Date.now() - minutes * 60_000).toISOString()
  const { count, error } = await client
    .from('bug_reports')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', since)
  if (error) throw new Error(error.message)
  return count ?? 0
}

export async function listBugReports(limit = 100): Promise<BugReportRow[]> {
  const client = getAdmin()
  if (!client) return []
  const { data, error } = await client
    .from('bug_reports')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(Math.min(500, Math.max(1, limit)))
  if (error || !data) return []
  return data as BugReportRow[]
}

export async function getBugReportById(reportId: string): Promise<BugReportRow | null> {
  const client = getAdmin()
  if (!client) return null
  const { data, error } = await client
    .from('bug_reports')
    .select('*')
    .eq('id', reportId)
    .maybeSingle()
  if (error || !data) return null
  return data as BugReportRow
}

export async function updateBugReportStatus(
  reportId: string,
  status: 'open' | 'triaged' | 'closed',
): Promise<BugReportRow | null> {
  const client = getAdmin()
  if (!client) return null
  const { data, error } = await client
    .from('bug_reports')
    .update({ status })
    .eq('id', reportId)
    .select('*')
    .single()
  if (error || !data) return null
  return data as BugReportRow
}

export async function listAuditLog(limit = 100): Promise<
  {
    id: number
    actor_id: string
    actor_email: string | null
    action: string
    target_user_id: string | null
    target_email: string | null
    detail: Record<string, unknown> | null
    created_at: string
  }[]
> {
  const client = getAdmin()
  if (!client) return []
  const { data } = await client
    .from('admin_audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(Math.min(500, Math.max(1, limit)))
  return (data || []) as {
    id: number
    actor_id: string
    actor_email: string | null
    action: string
    target_user_id: string | null
    target_email: string | null
    detail: Record<string, unknown> | null
    created_at: string
  }[]
}
