import type { Response } from 'express'
import { z } from 'zod'
import { env, isAdminEmail } from './env.js'
import type { AuthedRequest } from './auth.js'
import { requireAdmin } from './auth.js'
import {
  getAuthUserById,
  getProfile,
  listAuditLog,
  listAuthUsers,
  listProfiles,
  setAuthBanned,
  upsertProfilePlan,
  writeAuditLog,
  type ProfileRow,
} from './supabase.js'
import { notifyUserUpgrade } from './notify.js'
import {
  currentMonthKey,
  getUsageForMonth,
  listUsageMonths,
  resetUsageMonth,
} from './usage.js'

export type AdminUserRow = {
  id: string
  email: string | null
  displayName: string | null
  createdAt: string | null
  plan: 'free' | 'pro' | 'max'
  isAdmin: boolean
  disabled: boolean
  bannedUntil: string | null
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null
  stripeDashboardUrl: string | null
  month: string
  liveSeconds: number
  ttsChars: number
  translateCount: number
  cameraSeconds: number
  cameraTranslateCount: number
  liveLimitSeconds: number
  ttsLimitChars: number
  /** Hard cap seconds for Free; 0 means unlimited (Pro/Max) or disabled. */
  cameraLimitSeconds: number
  overQuota: boolean
}

function liveLimitSeconds(plan: ProfileRow['plan']): number {
  if (plan === 'pro') return env.proLiveMinutes * 60
  if (plan === 'max') return env.maxLiveMinutes * 60
  return env.freeLiveMinutes * 60
}

function ttsLimitChars(plan: ProfileRow['plan']): number {
  if (plan === 'pro') return env.proTtsChars
  if (plan === 'max') return env.maxTtsChars
  return env.freeAllowTts ? env.freeTtsChars : 0
}

function cameraLimitSeconds(plan: ProfileRow['plan']): number {
  if (plan === 'max') return 0
  if (plan === 'pro') return env.proCameraMinutes * 60
  return env.freeAllowCamera ? env.freeCameraMinutes * 60 : 0
}

function stripeDashboardUrl(customerId: string | null): string | null {
  if (!customerId) return null
  const test = env.stripeSecretKey.startsWith('sk_test')
  const base = test ? 'https://dashboard.stripe.com/test' : 'https://dashboard.stripe.com'
  return `${base}/customers/${customerId}`
}

async function buildAdminUsers(month: string): Promise<AdminUserRow[]> {
  const [authUsers, profiles, usageMap] = await Promise.all([
    listAuthUsers(),
    listProfiles(),
    getUsageForMonth(month),
  ])
  const profileById = new Map(profiles.map((p) => [p.id, p]))

  return authUsers.map((u) => {
    const profile = profileById.get(u.id)
    const plan = profile?.plan ?? 'free'
    const usage = usageMap.get(u.id)
    const liveSeconds = usage?.live_seconds ?? 0
    const ttsChars = usage?.tts_chars ?? 0
    const translateCount = usage?.translate_count ?? 0
    const cameraSeconds = usage?.camera_seconds ?? 0
    const cameraTranslateCount = usage?.camera_translate_count ?? 0
    const liveLim = liveLimitSeconds(plan)
    const ttsLim = ttsLimitChars(plan)
    const camLim = cameraLimitSeconds(plan)
    const overQuota =
      (liveLim > 0 && liveSeconds >= liveLim) ||
      (ttsLim > 0 && ttsChars >= ttsLim) ||
      (camLim > 0 && cameraSeconds >= camLim)

    return {
      id: u.id,
      email: u.email,
      displayName: u.displayName,
      createdAt: u.createdAt,
      plan,
      isAdmin: isAdminEmail(u.email),
      disabled: Boolean(profile?.disabled) || Boolean(u.bannedUntil),
      bannedUntil: u.bannedUntil,
      stripeCustomerId: profile?.stripe_customer_id ?? null,
      stripeSubscriptionId: profile?.stripe_subscription_id ?? null,
      stripeDashboardUrl: stripeDashboardUrl(profile?.stripe_customer_id ?? null),
      month,
      liveSeconds,
      ttsChars,
      translateCount,
      cameraSeconds,
      cameraTranslateCount,
      liveLimitSeconds: liveLim,
      ttsLimitChars: ttsLim,
      cameraLimitSeconds: camLim,
      overQuota,
    }
  })
}

type SortKey =
  | 'email'
  | 'plan'
  | 'createdAt'
  | 'liveSeconds'
  | 'ttsChars'
  | 'translateCount'
  | 'cameraSeconds'

function sortUsers(rows: AdminUserRow[], sort: SortKey, dir: 'asc' | 'desc') {
  const mul = dir === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => {
    const av = a[sort]
    const bv = b[sort]
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * mul
    return String(av ?? '').localeCompare(String(bv ?? ''), undefined, { sensitivity: 'base' }) * mul
  })
}

function filterUsers(
  rows: AdminUserRow[],
  opts: { q?: string; plan?: string; overQuota?: boolean; disabled?: boolean },
) {
  let out = rows
  if (opts.q) {
    const q = opts.q.trim().toLowerCase()
    out = out.filter(
      (r) =>
        (r.email || '').toLowerCase().includes(q) ||
        (r.displayName || '').toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q),
    )
  }
  if (opts.plan && opts.plan !== 'all') {
    out = out.filter((r) => r.plan === opts.plan)
  }
  if (opts.overQuota) {
    out = out.filter((r) => r.overQuota)
  }
  if (opts.disabled) {
    out = out.filter((r) => r.disabled)
  }
  return out
}

function csvEscape(value: string | number | boolean | null | undefined): string {
  const s = value == null ? '' : String(value)
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export async function adminMe(req: AuthedRequest, res: Response) {
  const auth = requireAdmin(req, res)
  if (!auth) return
  res.json({
    ok: true,
    email: auth.email,
    userId: auth.userId,
    adminConfigured: env.adminEmails.length > 0,
  })
}

export async function adminListUsers(req: AuthedRequest, res: Response) {
  const auth = requireAdmin(req, res)
  if (!auth) return
  try {
    const month = String(req.query.month || currentMonthKey())
    const q = typeof req.query.q === 'string' ? req.query.q : undefined
    const plan = typeof req.query.plan === 'string' ? req.query.plan : undefined
    const overQuota = req.query.overQuota === '1' || req.query.overQuota === 'true'
    const disabled = req.query.disabled === '1' || req.query.disabled === 'true'
    const sort = (typeof req.query.sort === 'string' ? req.query.sort : 'createdAt') as SortKey
    const dir = req.query.dir === 'asc' ? 'asc' : 'desc'
    const allowedSort: SortKey[] = [
      'email',
      'plan',
      'createdAt',
      'liveSeconds',
      'ttsChars',
      'translateCount',
      'cameraSeconds',
    ]
    const sortKey = allowedSort.includes(sort) ? sort : 'createdAt'

    const rows = sortUsers(
      filterUsers(await buildAdminUsers(month), { q, plan, overQuota, disabled }),
      sortKey,
      dir,
    )
    res.json({ month, count: rows.length, users: rows })
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to list users' })
  }
}

export async function adminExportUsersCsv(req: AuthedRequest, res: Response) {
  const auth = requireAdmin(req, res)
  if (!auth) return
  try {
    const month = String(req.query.month || currentMonthKey())
    const q = typeof req.query.q === 'string' ? req.query.q : undefined
    const plan = typeof req.query.plan === 'string' ? req.query.plan : undefined
    const overQuota = req.query.overQuota === '1' || req.query.overQuota === 'true'
    const disabled = req.query.disabled === '1' || req.query.disabled === 'true'
    const rows = filterUsers(await buildAdminUsers(month), { q, plan, overQuota, disabled })

    const header = [
      'id',
      'email',
      'displayName',
      'plan',
      'isAdmin',
      'disabled',
      'createdAt',
      'month',
      'liveSeconds',
      'ttsChars',
      'translateCount',
      'cameraSeconds',
      'cameraTranslateCount',
      'liveLimitSeconds',
      'ttsLimitChars',
      'cameraLimitSeconds',
      'overQuota',
      'stripeCustomerId',
      'stripeDashboardUrl',
    ]
    const lines = [
      header.join(','),
      ...rows.map((r) =>
        [
          r.id,
          r.email,
          r.displayName,
          r.plan,
          r.isAdmin,
          r.disabled,
          r.createdAt,
          r.month,
          r.liveSeconds,
          r.ttsChars,
          r.translateCount,
          r.cameraSeconds,
          r.cameraTranslateCount,
          r.liveLimitSeconds,
          r.ttsLimitChars,
          r.cameraLimitSeconds,
          r.overQuota,
          r.stripeCustomerId,
          r.stripeDashboardUrl,
        ]
          .map(csvEscape)
          .join(','),
      ),
    ]
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="jyut-users-${month}.csv"`)
    res.send(lines.join('\n'))
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'CSV export failed' })
  }
}

export async function adminUserUsage(req: AuthedRequest, res: Response) {
  const auth = requireAdmin(req, res)
  if (!auth) return
  const userId = String(req.params.userId || '')
  if (!userId) {
    res.status(400).json({ message: 'userId required' })
    return
  }
  try {
    const [user, months] = await Promise.all([getAuthUserById(userId), listUsageMonths(userId)])
    res.json({ user, months })
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to load usage' })
  }
}

const PlanBody = z.object({
  plan: z.enum(['free', 'pro', 'max']),
})

export async function adminSetPlan(req: AuthedRequest, res: Response) {
  const auth = requireAdmin(req, res)
  if (!auth) return
  const userId = String(req.params.userId || '')
  const parsed = PlanBody.safeParse(req.body)
  if (!userId || !parsed.success) {
    res.status(400).json({ message: 'plan must be free, pro, or max' })
    return
  }
  try {
    const target = await getAuthUserById(userId)
    const profile = await getProfile(userId)
    const previous = profile?.plan ?? 'free'
    await upsertProfilePlan(userId, { plan: parsed.data.plan })
    await writeAuditLog({
      actorId: auth.userId,
      actorEmail: auth.email,
      action: 'set_plan',
      targetUserId: userId,
      targetEmail: target?.email,
      detail: { plan: parsed.data.plan },
    })
    const plan = parsed.data.plan
    if (plan !== previous && (plan === 'pro' || plan === 'max')) {
      notifyUserUpgrade({
        email: target?.email ?? null,
        userId,
        plan,
        previousPlan: previous,
        source: 'admin',
        stripeCustomerId: profile?.stripe_customer_id ?? null,
      })
    }
    res.json({ ok: true, userId, plan: parsed.data.plan })
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to set plan' })
  }
}

const ResetBody = z.object({
  month: z.string().regex(/^\d{4}_\d{2}$/).optional(),
})

export async function adminResetUsage(req: AuthedRequest, res: Response) {
  const auth = requireAdmin(req, res)
  if (!auth) return
  const userId = String(req.params.userId || '')
  const parsed = ResetBody.safeParse(req.body ?? {})
  if (!userId || !parsed.success) {
    res.status(400).json({ message: 'Invalid request' })
    return
  }
  const month = parsed.data.month || currentMonthKey()
  try {
    const target = await getAuthUserById(userId)
    await resetUsageMonth(userId, month)
    await writeAuditLog({
      actorId: auth.userId,
      actorEmail: auth.email,
      action: 'reset_usage',
      targetUserId: userId,
      targetEmail: target?.email,
      detail: { month },
    })
    res.json({ ok: true, userId, month })
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to reset usage' })
  }
}

const BanBody = z.object({
  disabled: z.boolean(),
})

export async function adminSetDisabled(req: AuthedRequest, res: Response) {
  const auth = requireAdmin(req, res)
  if (!auth) return
  const userId = String(req.params.userId || '')
  const parsed = BanBody.safeParse(req.body)
  if (!userId || !parsed.success) {
    res.status(400).json({ message: 'disabled boolean required' })
    return
  }
  if (userId === auth.userId) {
    res.status(400).json({ message: 'You cannot ban yourself.' })
    return
  }
  try {
    const target = await getAuthUserById(userId)
    if (target?.email && isAdminEmail(target.email) && parsed.data.disabled) {
      res.status(400).json({ message: 'Cannot ban another admin allowlist email.' })
      return
    }
    await upsertProfilePlan(userId, {
      disabled: parsed.data.disabled,
      ...(parsed.data.disabled ? { plan: 'free' as const } : {}),
    })
    await setAuthBanned(userId, parsed.data.disabled)
    await writeAuditLog({
      actorId: auth.userId,
      actorEmail: auth.email,
      action: parsed.data.disabled ? 'ban' : 'unban',
      targetUserId: userId,
      targetEmail: target?.email,
      detail: { disabled: parsed.data.disabled },
    })
    res.json({ ok: true, userId, disabled: parsed.data.disabled })
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to update ban' })
  }
}

export async function adminListAudit(req: AuthedRequest, res: Response) {
  const auth = requireAdmin(req, res)
  if (!auth) return
  try {
    const limit = Number(req.query.limit || 100)
    const entries = await listAuditLog(limit)
    res.json({ entries })
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to load audit log' })
  }
}
