import type { Response } from 'express'
import { z } from 'zod'
import { env, isAdminEmail } from './env.js'
import type { AuthedRequest } from './auth.js'
import { requireAdmin, userHasAdminAccess } from './auth.js'
import {
  getAuthUserById,
  getProfile,
  listAuditLog,
  listAuthUsers,
  listBugReports,
  listProfiles,
  setAuthBanned,
  updateBugReportStatus,
  upsertProfilePlan,
  writeAuditLog,
  type ProfileRow,
} from './supabase.js'
import { notifyUserUpgrade } from './notify.js'
import { backfillResendAudience } from './resendAudience.js'
import {
  currentMonthKey,
  getUsageForMonth,
  listUsageMonths,
  setUsageMonth,
} from './usage.js'

export type AdminUserRow = {
  id: string
  email: string | null
  displayName: string | null
  /** Custom Account Hub username from profiles; null if unset. */
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
  month: string
  liveSeconds: number
  ttsChars: number
  translateCount: number
  cameraSeconds: number
  cameraTranslateCount: number
  docsPages: number
  aiVisionCount: number
  liveLimitSeconds: number
  ttsLimitChars: number
  /** Hard cap seconds for Free; 0 means unlimited (Family/Business) or disabled. */
  cameraLimitSeconds: number
  docsLimitPages: number
  overQuota: boolean
}

function liveLimitSeconds(plan: ProfileRow['plan']): number {
  if (plan === 'family') return env.familyLiveMinutes * 60
  if (plan === 'business') return env.businessLiveMinutes * 60
  return env.freeLiveMinutes * 60
}

function ttsLimitChars(plan: ProfileRow['plan']): number {
  if (plan === 'family') return env.familyTtsChars
  if (plan === 'business') return env.businessTtsChars
  return env.freeAllowTts ? env.freeTtsChars : 0
}

function cameraLimitSeconds(plan: ProfileRow['plan']): number {
  if (plan === 'business') return 0
  if (plan === 'family') return env.familyCameraMinutes * 60
  return env.freeAllowCamera ? env.freeCameraMinutes * 60 : 0
}

function docsLimitPages(plan: ProfileRow['plan']): number {
  if (plan === 'business') return 0
  if (plan === 'family') return env.familyDocsPages
  return env.freeAllowCamera ? env.freeDocsPages : 0
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
    const docsPages = usage?.docs_pages ?? 0
    const aiVisionCount = usage?.ai_vision_count ?? 0
    const liveLim = liveLimitSeconds(plan)
    const ttsLim = ttsLimitChars(plan)
    const camLim = cameraLimitSeconds(plan)
    const docsLim = docsLimitPages(plan)
    const overQuota =
      (liveLim > 0 && liveSeconds >= liveLim) ||
      (ttsLim > 0 && ttsChars >= ttsLim) ||
      (camLim > 0 && cameraSeconds >= camLim) ||
      (docsLim > 0 && docsPages >= docsLim)

    return {
      id: u.id,
      email: u.email,
      displayName: u.displayName,
      username: profile?.username ?? null,
      createdAt: u.createdAt,
      plan,
      role: profile?.role ?? null,
      isAdmin: isAdminEmail(u.email) || profile?.role === 'admin',
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
      docsPages,
      aiVisionCount,
      liveLimitSeconds: liveLim,
      ttsLimitChars: ttsLim,
      cameraLimitSeconds: camLim,
      docsLimitPages: docsLim,
      overQuota,
    }
  })
}

type SortKey =
  | 'email'
  | 'plan'
  | 'role'
  | 'createdAt'
  | 'liveSeconds'
  | 'ttsChars'
  | 'translateCount'
  | 'cameraSeconds'
  | 'docsPages'
  | 'aiVisionCount'

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
        (r.username || '').toLowerCase().includes(q) ||
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
  const auth = await requireAdmin(req, res)
  if (!auth) return
  res.json({
    ok: true,
    email: auth.email,
    userId: auth.userId,
    adminConfigured: env.adminEmails.length > 0,
  })
}

export async function adminListUsers(req: AuthedRequest, res: Response) {
  const auth = await requireAdmin(req, res)
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
      'role',
      'createdAt',
      'liveSeconds',
      'ttsChars',
      'translateCount',
      'cameraSeconds',
      'docsPages',
      'aiVisionCount',
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
  const auth = await requireAdmin(req, res)
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
      'username',
      'plan',
      'role',
      'isAdmin',
      'disabled',
      'createdAt',
      'month',
      'liveSeconds',
      'ttsChars',
      'translateCount',
      'cameraSeconds',
      'cameraTranslateCount',
      'aiVisionCount',
      'docsPages',
      'liveLimitSeconds',
      'ttsLimitChars',
      'cameraLimitSeconds',
      'docsLimitPages',
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
          r.username,
          r.plan,
          r.role,
          r.isAdmin,
          r.disabled,
          r.createdAt,
          r.month,
          r.liveSeconds,
          r.ttsChars,
          r.translateCount,
          r.cameraSeconds,
          r.cameraTranslateCount,
          r.aiVisionCount,
          r.docsPages,
          r.liveLimitSeconds,
          r.ttsLimitChars,
          r.cameraLimitSeconds,
          r.docsLimitPages,
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
  const auth = await requireAdmin(req, res)
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
  plan: z.enum(['free', 'family', 'business']),
})

export async function adminSetPlan(req: AuthedRequest, res: Response) {
  const auth = await requireAdmin(req, res)
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
    if (plan !== previous && (plan === 'family' || plan === 'business')) {
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

const RoleBody = z.object({
  role: z.union([z.literal('admin'), z.literal('family'), z.null()]),
})

export async function adminSetRole(req: AuthedRequest, res: Response) {
  const auth = await requireAdmin(req, res)
  if (!auth) return
  const userId = String(req.params.userId || '')
  const parsed = RoleBody.safeParse(req.body)
  if (!userId || !parsed.success) {
    res.status(400).json({ message: 'role must be admin, family, or null' })
    return
  }
  if (userId === auth.userId && parsed.data.role !== 'admin') {
    const selfAllowed = await userHasAdminAccess(auth.userId, auth.email)
    if (selfAllowed) {
      res.status(400).json({ message: 'You cannot remove your own admin access.' })
      return
    }
  }
  try {
    const target = await getAuthUserById(userId)
    const profile = await getProfile(userId)
    const previous = profile?.role ?? null
    await upsertProfilePlan(userId, { role: parsed.data.role })
    await writeAuditLog({
      actorId: auth.userId,
      actorEmail: auth.email,
      action: 'set_role',
      targetUserId: userId,
      targetEmail: target?.email,
      detail: { role: parsed.data.role, previous },
    })
    res.json({ ok: true, userId, role: parsed.data.role })
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to set role' })
  }
}

const ResetBody = z
  .object({
    month: z
      .string()
      .regex(/^\d{4}_\d{2}$/)
      .optional(),
    liveSeconds: z.number().int().min(0).optional(),
    ttsChars: z.number().int().min(0).optional(),
    cameraSeconds: z.number().int().min(0).optional(),
    docsPages: z.number().int().min(0).optional(),
  })
  .refine(
    (data) =>
      data.liveSeconds !== undefined ||
      data.ttsChars !== undefined ||
      data.cameraSeconds !== undefined ||
      data.docsPages !== undefined,
    { message: 'At least one usage field is required' },
  )

export async function adminResetUsage(req: AuthedRequest, res: Response) {
  const auth = await requireAdmin(req, res)
  if (!auth) return
  const userId = String(req.params.userId || '')
  const parsed = ResetBody.safeParse(req.body ?? {})
  if (!userId || !parsed.success) {
    res.status(400).json({ message: 'Invalid request' })
    return
  }
  const month = parsed.data.month || currentMonthKey()
  const { liveSeconds, ttsChars, cameraSeconds, docsPages } = parsed.data
  try {
    const target = await getAuthUserById(userId)
    await setUsageMonth(userId, month, { liveSeconds, ttsChars, cameraSeconds, docsPages })
    await writeAuditLog({
      actorId: auth.userId,
      actorEmail: auth.email,
      action: 'reset_usage',
      targetUserId: userId,
      targetEmail: target?.email,
      detail: { month, liveSeconds, ttsChars, cameraSeconds, docsPages },
    })
    res.json({ ok: true, userId, month, liveSeconds, ttsChars, cameraSeconds, docsPages })
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to reset usage' })
  }
}

const BanBody = z.object({
  disabled: z.boolean(),
})

export async function adminSetDisabled(req: AuthedRequest, res: Response) {
  const auth = await requireAdmin(req, res)
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
    const profile = await getProfile(userId)
    if (
      parsed.data.disabled &&
      (isAdminEmail(target?.email) || profile?.role === 'admin')
    ) {
      res.status(400).json({ message: 'Cannot ban an admin user.' })
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
  const auth = await requireAdmin(req, res)
  if (!auth) return
  try {
    const limit = Number(req.query.limit || 100)
    const entries = await listAuditLog(limit)
    res.json({ entries })
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to load audit log' })
  }
}

export async function adminListBugReports(req: AuthedRequest, res: Response) {
  const auth = await requireAdmin(req, res)
  if (!auth) return
  try {
    const limit = Number(req.query.limit || 100)
    const reports = await listBugReports(limit)
    res.json({ reports })
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to load bug reports' })
  }
}

const BugReportStatus = z.enum(['open', 'triaged', 'closed'])

export async function adminPatchBugReportStatus(req: AuthedRequest, res: Response) {
  const auth = await requireAdmin(req, res)
  if (!auth) return
  const reportId = String(req.params.reportId || '').trim()
  if (!reportId) {
    res.status(400).json({ message: 'reportId required' })
    return
  }
  const parsed = z.object({ status: BugReportStatus }).safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ message: 'status must be open, triaged, or closed' })
    return
  }
  try {
    const row = await updateBugReportStatus(reportId, parsed.data.status)
    if (!row) {
      res.status(404).json({ message: 'Report not found' })
      return
    }
    res.json({ ok: true, report: row })
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to update report' })
  }
}

export async function adminBugReportAiAnswer(req: AuthedRequest, res: Response) {
  const auth = await requireAdmin(req, res)
  if (!auth) return
  const reportId = String(req.params.reportId || '').trim()
  if (!reportId) {
    res.status(400).json({ message: 'reportId required' })
    return
  }
  try {
    const { generateBugReportAiAnswer } = await import('./bugReportAi.js')
    const answer = await generateBugReportAiAnswer(reportId)
    await writeAuditLog({
      actorId: auth.userId,
      actorEmail: auth.email,
      action: 'bug_report_ai_answer',
      targetUserId: undefined,
      targetEmail: undefined,
      detail: {
        reportId,
        verdict: answer.verdict,
        suggestedStatus: answer.suggestedStatus,
        model: answer.model,
      },
    })
    res.json({ ok: true, answer })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'AI answer failed'
    res.status(msg === 'Report not found' ? 404 : 500).json({ message: msg })
  }
}

/** One-time / on-demand: sync every Supabase Auth email into the Resend Audience. */
export async function adminSyncResendAudience(req: AuthedRequest, res: Response) {
  const auth = await requireAdmin(req, res)
  if (!auth) return
  try {
    const result = await backfillResendAudience()
    await writeAuditLog({
      actorId: auth.userId,
      actorEmail: auth.email,
      action: 'resend_audience_sync',
      detail: result,
    })
    res.json({ ok: true, ...result })
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Resend audience sync failed' })
  }
}

const CampaignFieldsSchema = z.object({
  subject: z.string(),
  preview: z.string(),
  eyebrow: z.string(),
  headline: z.string(),
  body: z.string(),
  ctaLabel: z.string(),
  ctaUrl: z.string(),
  secondary: z.string(),
  signOff: z.string(),
})

const CampaignVariantSchema = z.enum([
  'announcement',
  'product-update',
  'feature-spotlight',
  'newsletter',
  'welcome',
  'plain',
])

export async function adminListEmailTemplates(req: AuthedRequest, res: Response) {
  const auth = await requireAdmin(req, res)
  if (!auth) return
  try {
    const { listEmailTemplates } = await import('./emailCampaign.js')
    const templates = await listEmailTemplates(false)
    res.json({ templates })
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to list templates' })
  }
}

export async function adminListEmailContacts(req: AuthedRequest, res: Response) {
  const auth = await requireAdmin(req, res)
  if (!auth) return
  try {
    const { listEmailContacts } = await import('./emailCampaign.js')
    const result = await listEmailContacts()
    res.json(result)
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to list contacts' })
  }
}

export async function adminPreviewEmail(req: AuthedRequest, res: Response) {
  const auth = await requireAdmin(req, res)
  if (!auth) return
  const parsed = z
    .object({
      variant: CampaignVariantSchema,
      fields: CampaignFieldsSchema,
      includeUnsubscribe: z.boolean().optional(),
    })
    .safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ message: 'Invalid preview payload' })
    return
  }
  try {
    const { renderCampaignHtml } = await import('./emailCampaign.js')
    const html = await renderCampaignHtml({
      variant: parsed.data.variant,
      fields: parsed.data.fields,
      includeUnsubscribe: parsed.data.includeUnsubscribe,
    })
    res.json({ html })
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Preview failed' })
  }
}

export async function adminSaveEmailTemplate(req: AuthedRequest, res: Response) {
  const auth = await requireAdmin(req, res)
  if (!auth) return
  const parsed = z
    .object({
      id: z.string().uuid().optional(),
      name: z.string().min(1).max(120),
      description: z.string().max(500).optional(),
      baseVariant: CampaignVariantSchema,
      fields: CampaignFieldsSchema,
    })
    .safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ message: 'Invalid template payload' })
    return
  }
  try {
    const { saveCustomTemplate } = await import('./emailCampaign.js')
    const saved = await saveCustomTemplate({
      ...parsed.data,
      actorId: auth.userId,
    })
    await writeAuditLog({
      actorId: auth.userId,
      actorEmail: auth.email,
      action: 'email_template_save',
      detail: { id: saved.id, name: parsed.data.name },
    })
    res.json({ ok: true, id: saved.id })
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to save template' })
  }
}

export async function adminArchiveEmailTemplate(req: AuthedRequest, res: Response) {
  const auth = await requireAdmin(req, res)
  if (!auth) return
  const id = String(req.params.templateId || '').trim()
  if (!id) {
    res.status(400).json({ message: 'templateId required' })
    return
  }
  try {
    const { archiveCustomTemplate } = await import('./emailCampaign.js')
    await archiveCustomTemplate(id)
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to archive template' })
  }
}

export async function adminSendEmail(req: AuthedRequest, res: Response) {
  const auth = await requireAdmin(req, res)
  if (!auth) return
  const parsed = z
    .object({
      mode: z.enum(['recipients', 'audience']),
      templateKey: z.string().min(1),
      variant: CampaignVariantSchema,
      fields: CampaignFieldsSchema,
      emails: z.array(z.string().email()).optional(),
      confirm: z.literal(true),
    })
    .safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ message: 'Invalid send payload (confirm: true required)' })
    return
  }
  if (!parsed.data.fields.subject.trim()) {
    res.status(400).json({ message: 'Subject is required' })
    return
  }
  try {
    const {
      sendCampaignToAudience,
      sendCampaignToRecipients,
    } = await import('./emailCampaign.js')

    if (parsed.data.mode === 'audience') {
      const result = await sendCampaignToAudience({
        actorId: auth.userId,
        actorEmail: auth.email,
        templateKey: parsed.data.templateKey,
        variant: parsed.data.variant,
        fields: parsed.data.fields,
      })
      await writeAuditLog({
        actorId: auth.userId,
        actorEmail: auth.email,
        action: 'email_send_audience',
        detail: { ...result, subject: parsed.data.fields.subject, templateKey: parsed.data.templateKey },
      })
      res.json({ ok: true, mode: 'audience', ...result })
      return
    }

    const emails = parsed.data.emails || []
    const result = await sendCampaignToRecipients({
      actorId: auth.userId,
      actorEmail: auth.email,
      templateKey: parsed.data.templateKey,
      variant: parsed.data.variant,
      fields: parsed.data.fields,
      emails,
    })
    await writeAuditLog({
      actorId: auth.userId,
      actorEmail: auth.email,
      action: 'email_send_recipients',
      detail: {
        sent: result.sent,
        failed: result.failed,
        attempted: result.attempted,
        subject: parsed.data.fields.subject,
        templateKey: parsed.data.templateKey,
        errors: result.errors.slice(0, 20),
        hint: result.hint,
      },
    })
    res.json({ ok: true, mode: 'recipients', ...result })
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Send failed' })
  }
}

