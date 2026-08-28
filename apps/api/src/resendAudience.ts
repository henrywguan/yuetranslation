import { Resend } from 'resend'
import { env } from './env.js'

let client: Resend | null = null

function getResend(): Resend | null {
  if (!env.resendApiKey) return null
  if (!client) client = new Resend(env.resendApiKey)
  return client
}

function splitName(full?: string | null): { firstName?: string; lastName?: string } {
  const trimmed = full?.trim()
  if (!trimmed) return {}
  const parts = trimmed.split(/\s+/).filter(Boolean)
  if (!parts.length) return {}
  if (parts.length === 1) return { firstName: parts[0] }
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') }
}

function isDuplicateContactError(message: string): boolean {
  return /already exists|duplicate|conflict/i.test(message)
}

export type ResendContactInput = {
  email: string
  userId?: string
  displayName?: string | null
  provider?: string | null
}

/** Add or refresh a contact in the configured Resend Audience. */
export async function syncResendAudienceContact(input: ResendContactInput): Promise<void> {
  const email = input.email.trim().toLowerCase()
  if (!email || !env.resendAudienceId) return

  const resend = getResend()
  if (!resend) return

  const { firstName, lastName } = splitName(input.displayName)
  const base = {
    audienceId: env.resendAudienceId,
    email,
    unsubscribed: false,
    ...(firstName ? { firstName } : {}),
    ...(lastName ? { lastName } : {}),
  }

  const created = await resend.contacts.create(base)
  if (!created.error) return

  if (!isDuplicateContactError(created.error.message || '')) {
    throw new Error(created.error.message || 'Resend contact create failed')
  }

  const updated = await resend.contacts.update({
    ...base,
    email,
  })
  if (updated.error) {
    throw new Error(updated.error.message || 'Resend contact update failed')
  }
}

/** Fire-and-forget Resend Audience sync — safe for webhooks and API handlers. */
export function queueResendAudienceContact(input: ResendContactInput): void {
  if (!env.resendAudienceId || !input.email?.trim()) return
  void syncResendAudienceContact(input).catch((e) => {
    console.error('[resend-audience] sync failed', e)
  })
}
