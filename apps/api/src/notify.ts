/**
 * Admin notify emails via Resend + React Email.
 *
 * IMPORTANT: Do not statically import `.tsx` email sources or `@react-email/*`
 * at module top-level. Vercel’s Node function loads `apps/api` with type
 * stripping (no JSX transform). Eager `.tsx` imports crash the whole API
 * (`FUNCTION_INVOCATION_FAILED`), which leaves the web app stuck on
 * “Connecting…”. Templates are compiled to plain JS under `emails/compiled/`
 * and loaded only when sending.
 */
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import type { ReactElement } from 'react'
import { Resend, type Attachment } from 'resend'
import { env } from './env.js'
import { issueTypeLabel, shortReportId } from './emails/bugReportMeta.js'

const notifyDir = dirname(fileURLToPath(import.meta.url))

let client: Resend | null = null

function getResend(): Resend | null {
  if (!env.resendApiKey) return null
  if (!client) client = new Resend(env.resendApiKey)
  return client
}

export function notifyConfigured(): boolean {
  return Boolean(getResend() && env.adminNotifyEmails.length && env.notifyFromEmail)
}

/** Admin / health diagnostics — why notify may be skipped. */
export function notifyStatus() {
  const from = env.notifyFromEmail
  const fromDomain =
    from.match(/<([^<>@]+@[^<>]+)>/)?.[1]?.split('@')[1] ||
    from.match(/@([^>\s]+)/)?.[1] ||
    null
  const testFrom = Boolean(fromDomain && /(^|\.)resend\.dev$/i.test(fromDomain))
  return {
    configured: notifyConfigured(),
    hasResendKey: Boolean(env.resendApiKey),
    hasFrom: Boolean(from),
    recipientCount: env.adminNotifyEmails.length,
    fromDomain,
    testFromDomain: testFrom,
    hint: testFrom
      ? 'Resend test senders only deliver to the Resend account owner email — verify your domain and YUE_NOTIFY_FROM for other inboxes.'
      : !env.resendApiKey
        ? 'Set RESEND_API_KEY on Vercel.'
        : !from
          ? 'Set YUE_NOTIFY_FROM to a verified address (must include @).'
          : !env.adminNotifyEmails.length
            ? 'Set YUE_ADMIN_NOTIFY_EMAILS or YUE_ADMIN_EMAILS.'
            : null,
  }
}

/** True when Resend + from address can send user-facing auth emails. */
export function userEmailConfigured(): boolean {
  return Boolean(getResend() && env.notifyFromEmail)
}

/** Resolve compiled React Email modules reliably on Vercel (includeFiles + bundled handler). */
async function importCompiledEmail<T>(basename: string): Promise<T> {
  const rel = `./emails/compiled/${basename}.js`
  try {
    return (await import(rel)) as T
  } catch (first) {
    const abs = pathToFileURL(join(notifyDir, 'emails', 'compiled', `${basename}.js`)).href
    try {
      return (await import(abs)) as T
    } catch {
      throw first
    }
  }
}

function adminLink(path = '/#/admin'): string {
  const base = env.appUrl.replace(/\/+$/, '')
  return `${base}${path.startsWith('/') ? path : `/${path}`}`
}

function appPublicUrl(): string {
  return env.appUrl.replace(/\/+$/, '') || 'https://jyuttranslate.com'
}

/** Absolute logo URL — more reliable in Gmail than CID for a stable brand mark. */
function logoSrcForTemplate(): string {
  return `${appPublicUrl()}/apple-touch-icon.png`
}

/**
 * Resend v4 maps `inlineContentId` → API `inline_content_id`.
 * Passing `contentId` is silently ignored — images show as downloads only.
 * Local binary content should be a Base64 string (not a raw Buffer) for the JSON API.
 */
function inlineImageAttachment(input: {
  filename: string
  contentType: string
  inlineContentId: string
  /** Raw bytes — encoded to Base64 for Resend. */
  bytes: Buffer
}): Attachment {
  return {
    filename: input.filename,
    contentType: input.contentType,
    content: input.bytes.toString('base64'),
    inlineContentId: input.inlineContentId,
  }
}

async function sendUserEmail(subject: string, html: string, to: string): Promise<void> {
  const resend = getResend()
  if (!resend || !env.notifyFromEmail) {
    throw new Error('User email not configured — set RESEND_API_KEY and YUE_NOTIFY_FROM.')
  }
  const { error } = await resend.emails.send({
    from: env.notifyFromEmail,
    to: [to],
    subject,
    html,
  })
  if (error) {
    throw new Error(error.message || 'Resend send failed')
  }
}

async function renderEmailHtml(loadElement: () => Promise<ReactElement>): Promise<string> {
  const [{ render }, element] = await Promise.all([
    import('@react-email/render'),
    loadElement(),
  ])
  return render(element)
}

export type SendAuthEmailInput = {
  to: string
  actionType: string
  tokenHash: string
  otpCode?: string | null
  redirectTo: string
  supabaseUrl: string
}

/** Branded Supabase auth email (signup confirm, magic link, recovery, …). */
export async function sendAuthEmail(input: SendAuthEmailInput): Promise<void> {
  const { authEmailCopy, buildSupabaseVerifyUrl } = await import('./emails/authEmailMeta.js')
  const copy = authEmailCopy(input.actionType)
  const verifyUrl = buildSupabaseVerifyUrl({
    supabaseUrl: input.supabaseUrl,
    tokenHash: input.tokenHash,
    verifyType: copy.verifyType,
    redirectTo: input.redirectTo || appPublicUrl(),
  })
  const html = await renderEmailHtml(async () => {
    const [{ createElement }, { AuthEmail }] = await Promise.all([
      import('react'),
      importCompiledEmail<typeof import('./emails/compiled/AuthEmail.js')>('AuthEmail'),
    ])
    return createElement(AuthEmail, {
      copy,
      verifyUrl,
      otpCode: input.otpCode,
      appUrl: appPublicUrl(),
      logoSrc: logoSrcForTemplate(),
    })
  })
  await sendUserEmail(copy.subject, html, input.to)
}

async function sendAdminEmail(
  subject: string,
  html: string,
  attachments?: Attachment[],
): Promise<void> {
  const resend = getResend()
  if (!resend || !env.adminNotifyEmails.length || !env.notifyFromEmail) {
    const st = notifyStatus()
    console.warn('[notify] Skipped admin email', {
      hasResendKey: st.hasResendKey,
      hasFrom: st.hasFrom,
      recipientCount: st.recipientCount,
      hint: st.hint,
    })
    return
  }
  const { error } = await resend.emails.send({
    from: env.notifyFromEmail,
    to: env.adminNotifyEmails,
    subject,
    html,
    ...(attachments?.length ? { attachments } : {}),
  })
  if (error) {
    throw new Error(error.message || 'Resend send failed')
  }
}

async function renderAndSend(
  subject: string,
  loadElement: () => Promise<ReactElement>,
  attachments?: Attachment[],
): Promise<void> {
  const [{ render }, element] = await Promise.all([
    import('@react-email/render'),
    loadElement(),
  ])
  const html = await render(element)
  await sendAdminEmail(subject, html, attachments)
}

/** Fire-and-forget React Email — never throw to callers (webhooks must stay 200). */
function queueReactEmail(
  subject: string,
  loadElement: () => Promise<ReactElement>,
  attachments?: Attachment[],
): void {
  void renderAndSend(subject, loadElement, attachments).catch((e) => {
    console.error('[notify] send failed', e instanceof Error ? e.message : e)
  })
}

export function notifyNewSignup(input: {
  email: string | null
  userId: string
  provider?: string | null
  emailConfirmed?: boolean
}): void {
  const label = input.email || input.userId
  const when = new Date().toISOString()
  queueReactEmail(`JyutTranslate · New sign-up: ${label}`, async () => {
    const [{ createElement }, { SignupEmail }] = await Promise.all([
      import('react'),
      importCompiledEmail<typeof import('./emails/compiled/SignupEmail.js')>('SignupEmail'),
    ])
    return createElement(SignupEmail, {
      email: input.email || '—',
      userId: input.userId,
      provider: input.provider || 'email',
      emailConfirmed: input.emailConfirmed ? 'Yes' : 'Pending',
      createdAt: when,
      adminUrl: adminLink(),
      appUrl: appPublicUrl(),
      logoSrc: logoSrcForTemplate(),
    })
  })
}

export function notifyUserUpgrade(input: {
  email: string | null
  userId: string
  plan: 'family' | 'business'
  previousPlan: 'free' | 'family' | 'business'
  source: 'stripe' | 'admin'
  stripeCustomerId?: string | null
}): void {
  if (input.previousPlan === input.plan) return
  if (input.plan !== 'family' && input.plan !== 'business') return

  const label = input.email || input.userId
  const via = input.source === 'stripe' ? 'Stripe checkout' : 'Admin panel'
  const when = new Date().toISOString()

  queueReactEmail(`JyutTranslate · Upgrade: ${label} → ${input.plan}`, async () => {
    const [{ createElement }, { UpgradeEmail }] = await Promise.all([
      import('react'),
      importCompiledEmail<typeof import('./emails/compiled/UpgradeEmail.js')>('UpgradeEmail'),
    ])
    return createElement(UpgradeEmail, {
      email: input.email || '—',
      userId: input.userId,
      fromPlan: input.previousPlan,
      toPlan: input.plan,
      source: via,
      when,
      stripeCustomerId: input.stripeCustomerId || null,
      adminUrl: adminLink(),
      appUrl: appPublicUrl(),
      logoSrc: logoSrcForTemplate(),
    })
  })
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function parseDataUrl(dataUrl: string): { contentType: string; base64: string; ext: string } | null {
  const match = /^data:([^;,]+);base64,([A-Za-z0-9+/=\s]+)$/.exec(dataUrl.trim())
  if (!match) return null
  const contentType = match[1].trim().toLowerCase()
  const base64 = match[2].replace(/\s+/g, '')
  if (!base64 || base64.length > 800_000) return null
  const ext =
    contentType.includes('png')
      ? 'png'
      : contentType.includes('webp')
        ? 'webp'
        : contentType.includes('gif')
          ? 'gif'
          : 'jpg'
  return { contentType, base64, ext }
}

function recentEventLines(client: Record<string, unknown>, limit = 6): string[] {
  const events = Array.isArray(client.events) ? client.events : []
  return events
    .slice(-limit)
    .map((raw) => {
      const e = asRecord(raw)
      const kind = typeof e.kind === 'string' ? e.kind : 'event'
      const detail = typeof e.detail === 'string' ? e.detail.slice(0, 80) : ''
      const status = typeof e.status === 'number' ? ` ${e.status}` : ''
      return detail ? `${kind}${status}: ${detail}` : `${kind}${status}`
    })
    .filter(Boolean)
}

export type BugReportNotifyInput = {
  reportId: string
  issueType: string
  email: string | null
  userId: string
  route: string | null
  mode: string | null
  client?: Record<string, unknown>
  context?: Record<string, unknown>
}

function buildBugReportEmailProps(input: BugReportNotifyInput, hasScreenshot: boolean) {
  const clientPayload = asRecord(input.client)
  const context = asRecord(input.context)
  const entitlement = asRecord(clientPayload.entitlement)
  const envSnap = asRecord(clientPayload.env)
  const viewport = asRecord(envSnap.viewport)
  const server = asRecord(context.server)
  const openai = asRecord(server.openai)

  return {
    reportId: input.reportId,
    shortId: shortReportId(input.reportId),
    issueType: input.issueType,
    issueLabel: issueTypeLabel(input.issueType),
    email: input.email,
    userId: input.userId,
    route: input.route,
    mode: input.mode,
    plan: typeof entitlement.plan === 'string' ? entitlement.plan : null,
    lastError: typeof clientPayload.lastError === 'string' ? clientPayload.lastError : null,
    note: typeof clientPayload.note === 'string' ? clientPayload.note : null,
    appVersion: typeof clientPayload.appVersion === 'string' ? clientPayload.appVersion : null,
    theme: typeof envSnap.theme === 'string' ? envSnap.theme : null,
    viewport:
      typeof viewport.w === 'number' && typeof viewport.h === 'number'
        ? `${viewport.w}×${viewport.h}`
        : null,
    live: Boolean(clientPayload.live),
    translating: Boolean(clientPayload.translating),
    demoMode: Boolean(clientPayload.demoMode),
    cloudReady: typeof server.cloudReady === 'boolean' ? server.cloudReady : null,
    modelConfigured: typeof openai.configured === 'boolean' ? openai.configured : null,
    visionConfigured: typeof server.azureVision === 'boolean' ? server.azureVision : null,
    recentEvents: recentEventLines(clientPayload),
    adminUrl: adminLink('/#/admin'),
    appUrl: appPublicUrl(),
    logoSrc: logoSrcForTemplate(),
    hasScreenshot,
  }
}

function bugReportAttachments(parsedShot: ReturnType<typeof parseDataUrl>): Attachment[] | undefined {
  if (!parsedShot) return undefined
  return [
    inlineImageAttachment({
      filename: `bug-screenshot.${parsedShot.ext}`,
      contentType: parsedShot.contentType,
      inlineContentId: 'bug-screenshot',
      bytes: Buffer.from(parsedShot.base64, 'base64'),
    }),
  ]
}

/** Send bug-report admin email; retries without screenshot if the attachment fails. */
export async function sendBugReportNotify(
  input: BugReportNotifyInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!notifyConfigured()) {
    const hint = notifyStatus().hint || 'Notify not configured'
    console.warn('[notify] bug report skipped', { reportId: input.reportId, hint })
    return { ok: false, error: hint }
  }

  const clientPayload = asRecord(input.client)
  const screenshotRaw =
    typeof clientPayload.screenshot === 'string' ? clientPayload.screenshot : null
  const parsedShot = screenshotRaw ? parseDataUrl(screenshotRaw) : null

  const label = input.email || input.userId
  const shortId = shortReportId(input.reportId)
  const issueLabel = issueTypeLabel(input.issueType)
  const subject = `JyutTranslate · ${issueLabel} (${shortId}) · ${label}`

  const loadElement = async (includeScreenshot: boolean) => {
    const [{ createElement }, { BugReportEmail }] = await Promise.all([
      import('react'),
      importCompiledEmail<typeof import('./emails/compiled/BugReportEmail.js')>('BugReportEmail'),
    ])
    return createElement(
      BugReportEmail,
      buildBugReportEmailProps(input, includeScreenshot && Boolean(parsedShot)),
    )
  }

  try {
    await renderAndSend(
      subject,
      () => loadElement(true),
      bugReportAttachments(parsedShot),
    )
    return { ok: true }
  } catch (first) {
    if (!parsedShot) {
      const msg = first instanceof Error ? first.message : String(first)
      console.error('[notify] bug report send failed', { reportId: input.reportId, error: msg })
      return { ok: false, error: msg }
    }
    console.warn('[notify] bug report retry without screenshot', {
      reportId: input.reportId,
      error: first instanceof Error ? first.message : String(first),
    })
    try {
      const retrySubject = `${subject} (screenshot omitted)`
      await renderAndSend(retrySubject, () => loadElement(false))
      return { ok: true }
    } catch (retryErr) {
      const msg = retryErr instanceof Error ? retryErr.message : String(retryErr)
      console.error('[notify] bug report send failed after retry', {
        reportId: input.reportId,
        error: msg,
      })
      return { ok: false, error: msg }
    }
  }
}

/** Rich React Email + Resend notify for bug reports (screenshot via CID when present). */
export function notifyBugReport(input: BugReportNotifyInput): void {
  void sendBugReportNotify(input)
}
