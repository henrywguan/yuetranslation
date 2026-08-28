import { render } from '@react-email/render'
import { createElement } from 'react'
import { Resend } from 'resend'
import { env } from './env.js'
import {
  BugReportEmail,
  issueTypeLabel,
  shortReportId,
  type BugReportEmailProps,
} from './emails/BugReportEmail.js'

let client: Resend | null = null

function getResend(): Resend | null {
  if (!env.resendApiKey) return null
  if (!client) client = new Resend(env.resendApiKey)
  return client
}

export function notifyConfigured(): boolean {
  return Boolean(getResend() && env.adminNotifyEmails.length && env.notifyFromEmail)
}

function adminLink(path = '/#/admin'): string {
  const base = env.appUrl.replace(/\/+$/, '')
  return `${base}${path.startsWith('/') ? path : `/${path}`}`
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

type EmailAttachment = {
  filename: string
  content: Buffer
  contentId?: string
  contentType?: string
}

async function sendAdminEmail(
  subject: string,
  html: string,
  attachments?: EmailAttachment[],
): Promise<void> {
  const resend = getResend()
  if (!resend || !env.adminNotifyEmails.length || !env.notifyFromEmail) {
    console.warn('[notify] Skipped — RESEND_API_KEY, YUE_NOTIFY_FROM, or admin notify emails missing')
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

/** Fire-and-forget admin email — never throw to callers (webhooks must stay 200). */
export function queueAdminEmail(
  subject: string,
  html: string,
  attachments?: EmailAttachment[],
): void {
  void sendAdminEmail(subject, html, attachments).catch((e) => {
    console.error('[notify] send failed', e)
  })
}

export function notifyNewSignup(input: {
  email: string | null
  userId: string
  provider?: string | null
  emailConfirmed?: boolean
}): void {
  const label = input.email || input.userId
  const provider = input.provider || 'email'
  const confirmed = input.emailConfirmed ? 'Yes' : 'Pending'
  queueAdminEmail(
    `JyutTranslate · New sign-up: ${label}`,
    `<p>A new user signed up on JyutTranslate.</p>
<ul>
  <li><strong>Email:</strong> ${escapeHtml(input.email || '—')}</li>
  <li><strong>User ID:</strong> <code>${escapeHtml(input.userId)}</code></li>
  <li><strong>Provider:</strong> ${escapeHtml(provider)}</li>
  <li><strong>Email confirmed:</strong> ${confirmed}</li>
</ul>
<p><a href="${adminLink()}">Open admin panel</a></p>`,
  )
}

export function notifyUserUpgrade(input: {
  email: string | null
  userId: string
  plan: 'pro' | 'max'
  previousPlan: 'free' | 'pro' | 'max'
  source: 'stripe' | 'admin'
  stripeCustomerId?: string | null
}): void {
  if (input.previousPlan === input.plan) return
  if (input.plan !== 'pro' && input.plan !== 'max') return

  const label = input.email || input.userId
  const via = input.source === 'stripe' ? 'Stripe checkout' : 'Admin panel'
  const stripeLine = input.stripeCustomerId
    ? `<li><strong>Stripe customer:</strong> <code>${escapeHtml(input.stripeCustomerId)}</code></li>`
    : ''

  queueAdminEmail(
    `JyutTranslate · Upgrade: ${label} → ${input.plan}`,
    `<p>A user upgraded on JyutTranslate.</p>
<ul>
  <li><strong>Email:</strong> ${escapeHtml(input.email || '—')}</li>
  <li><strong>User ID:</strong> <code>${escapeHtml(input.userId)}</code></li>
  <li><strong>Plan:</strong> ${escapeHtml(input.previousPlan)} → <strong>${escapeHtml(input.plan)}</strong></li>
  <li><strong>Source:</strong> ${escapeHtml(via)}</li>
  ${stripeLine}
</ul>
<p><a href="${adminLink()}">Open admin panel</a></p>`,
  )
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

/** Rich React Email + Resend notify for bug reports (screenshot via CID when present). */
export function notifyBugReport(input: BugReportNotifyInput): void {
  const clientPayload = asRecord(input.client)
  const context = asRecord(input.context)
  const entitlement = asRecord(clientPayload.entitlement)
  const envSnap = asRecord(clientPayload.env)
  const viewport = asRecord(envSnap.viewport)
  const server = asRecord(context.server)
  const openai = asRecord(server.openai)

  const screenshotRaw =
    typeof clientPayload.screenshot === 'string' ? clientPayload.screenshot : null
  const parsedShot = screenshotRaw ? parseDataUrl(screenshotRaw) : null

  const props: BugReportEmailProps = {
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
    hasScreenshot: Boolean(parsedShot),
  }

  const label = input.email || input.userId
  const subject = `JyutTranslate · ${props.issueLabel} (${props.shortId}) · ${label}`

  void (async () => {
    try {
      const html = await render(createElement(BugReportEmail, props))
      const attachments: EmailAttachment[] | undefined = parsedShot
        ? [
            {
              filename: `bug-screenshot.${parsedShot.ext}`,
              content: Buffer.from(parsedShot.base64, 'base64'),
              contentId: 'bug-screenshot',
              contentType: parsedShot.contentType,
            },
          ]
        : undefined
      await sendAdminEmail(subject, html, attachments)
    } catch (e) {
      console.error('[notify] bug report email failed', e)
    }
  })()
}
