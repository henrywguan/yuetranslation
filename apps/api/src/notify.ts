import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { render } from '@react-email/render'
import { createElement, type ReactElement } from 'react'
import { Resend } from 'resend'
import { env } from './env.js'
import {
  BugReportEmail,
  issueTypeLabel,
  shortReportId,
  type BugReportEmailProps,
} from './emails/BugReportEmail.js'
import { EMAIL_LOGO_CID } from './emails/brand.js'
import { SignupEmail } from './emails/SignupEmail.js'
import { UpgradeEmail } from './emails/UpgradeEmail.js'

let client: Resend | null = null
let logoBuffer: Buffer | null | undefined

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

function appPublicUrl(): string {
  return env.appUrl.replace(/\/+$/, '') || 'https://jyuttranslate.com'
}

type EmailAttachment = {
  filename: string
  content: Buffer
  contentId?: string
  contentType?: string
}

function loadLogoBuffer(): Buffer | null {
  if (logoBuffer !== undefined) return logoBuffer
  try {
    const here = dirname(fileURLToPath(import.meta.url))
    logoBuffer = readFileSync(join(here, 'emails/assets/jyut-logo.png'))
  } catch (e) {
    console.warn('[notify] logo asset missing — emails will use public icon URL fallback', e)
    logoBuffer = null
  }
  return logoBuffer
}

/** Always attach the brand mark as CID so clients that block remote images still show it. */
function brandAttachments(extra?: EmailAttachment[]): EmailAttachment[] {
  const out: EmailAttachment[] = []
  const logo = loadLogoBuffer()
  if (logo) {
    out.push({
      filename: 'jyut-logo.png',
      content: logo,
      contentId: EMAIL_LOGO_CID,
      contentType: 'image/png',
    })
  }
  if (extra?.length) out.push(...extra)
  return out
}

function logoSrcForTemplate(): string | undefined {
  // Prefer CID when we successfully loaded the PNG; otherwise absolute public icon.
  if (loadLogoBuffer()) return `cid:${EMAIL_LOGO_CID}`
  return `${appPublicUrl()}/apple-touch-icon.png`
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

async function renderAndSend(
  subject: string,
  element: ReactElement,
  extraAttachments?: EmailAttachment[],
): Promise<void> {
  const html = await render(element)
  await sendAdminEmail(subject, html, brandAttachments(extraAttachments))
}

/** Fire-and-forget React Email — never throw to callers (webhooks must stay 200). */
function queueReactEmail(
  subject: string,
  element: ReactElement,
  extraAttachments?: EmailAttachment[],
): void {
  void renderAndSend(subject, element, extraAttachments).catch((e) => {
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
  const when = new Date().toISOString()
  queueReactEmail(
    `JyutTranslate · New sign-up: ${label}`,
    createElement(SignupEmail, {
      email: input.email || '—',
      userId: input.userId,
      provider: input.provider || 'email',
      emailConfirmed: input.emailConfirmed ? 'Yes' : 'Pending',
      createdAt: when,
      adminUrl: adminLink(),
      appUrl: appPublicUrl(),
      logoSrc: logoSrcForTemplate(),
    }),
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
  const when = new Date().toISOString()

  queueReactEmail(
    `JyutTranslate · Upgrade: ${label} → ${input.plan}`,
    createElement(UpgradeEmail, {
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
    }),
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
    appUrl: appPublicUrl(),
    logoSrc: logoSrcForTemplate(),
    hasScreenshot: Boolean(parsedShot),
  }

  const label = input.email || input.userId
  const subject = `JyutTranslate · ${props.issueLabel} (${props.shortId}) · ${label}`

  const shotAttachment: EmailAttachment[] | undefined = parsedShot
    ? [
        {
          filename: `bug-screenshot.${parsedShot.ext}`,
          content: Buffer.from(parsedShot.base64, 'base64'),
          contentId: 'bug-screenshot',
          contentType: parsedShot.contentType,
        },
      ]
    : undefined

  queueReactEmail(subject, createElement(BugReportEmail, props), shotAttachment)
}
