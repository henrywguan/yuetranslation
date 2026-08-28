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
  plan: 'free' | 'pro' | 'max'
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  disabled: boolean
  role: 'admin' | 'family' | null
  updated_at: string
}

export async function getProfile(userId: string): Promise<ProfileRow | null> {
  const client = getAdmin()
  if (!client) return null
  const { data, error } = await client.from('profiles').select('*').eq('id', userId).maybeSingle()
  if (error || !data) return null
  const row = data as ProfileRow & { disabled?: boolean; role?: ProfileRow['role'] }
  return {
    ...row,
    disabled: Boolean(row.disabled),
    role: row.role === 'admin' || row.role === 'family' ? row.role : null,
  }
}

export async function upsertProfilePlan(
  userId: string,
  patch: Partial<
    Pick<ProfileRow, 'plan' | 'stripe_customer_id' | 'stripe_subscription_id' | 'disabled' | 'role'>
  >,
): Promise<void> {
  const client = getAdmin()
  if (!client) return
  await client
    .from('profiles')
    .upsert({ id: userId, ...patch, updated_at: new Date().toISOString() }, { onConflict: 'id' })
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
  const row = data as ProfileRow & { disabled?: boolean; role?: ProfileRow['role'] }
  return {
    ...row,
    disabled: Boolean(row.disabled),
    role: row.role === 'admin' || row.role === 'family' ? row.role : null,
  }
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
  const row = data as ProfileRow & { disabled?: boolean; role?: ProfileRow['role'] }
  return {
    ...row,
    disabled: Boolean(row.disabled),
    role: row.role === 'admin' || row.role === 'family' ? row.role : null,
  }
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
  return (data as ProfileRow[]).map((row) => ({
    ...row,
    disabled: Boolean(row.disabled),
    role: row.role === 'admin' || row.role === 'family' ? row.role : null,
  }))
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
