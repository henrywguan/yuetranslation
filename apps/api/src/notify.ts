import { Resend } from 'resend'
import { env } from './env.js'

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

async function sendAdminEmail(subject: string, html: string): Promise<void> {
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
  })
  if (error) {
    throw new Error(error.message || 'Resend send failed')
  }
}

/** Fire-and-forget admin email — never throw to callers (webhooks must stay 200). */
export function queueAdminEmail(subject: string, html: string): void {
  void sendAdminEmail(subject, html).catch((e) => {
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
