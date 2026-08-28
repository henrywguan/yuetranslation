import { Resend } from 'resend'
import { env } from './env.js'
import { listAuthUsers } from './supabase.js'

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

export type ResendBackfillResult = {
  scanned: number
  synced: number
  skipped: number
  failed: number
  errors: { email: string; message: string }[]
}

const BACKFILL_ERROR_CAP = 25
const BACKFILL_DELAY_MS = 120

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Scan all Supabase Auth users and upsert each email into the Resend Audience. */
export async function backfillResendAudience(): Promise<ResendBackfillResult> {
  if (!env.resendApiKey || !env.resendAudienceId) {
    throw new Error('Resend audience is not configured (RESEND_API_KEY + RESEND_AUDIENCE_ID).')
  }

  const users = await listAuthUsers()
  const result: ResendBackfillResult = {
    scanned: users.length,
    synced: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  }

  for (let i = 0; i < users.length; i++) {
    const user = users[i]!
    const email = user.email?.trim()
    if (!email) {
      result.skipped += 1
      continue
    }
    try {
      await syncResendAudienceContact({
        email,
        userId: user.id,
        displayName: user.displayName,
      })
      result.synced += 1
    } catch (e) {
      result.failed += 1
      if (result.errors.length < BACKFILL_ERROR_CAP) {
        result.errors.push({
          email,
          message: e instanceof Error ? e.message : 'Sync failed',
        })
      }
    }
    if (i < users.length - 1) await sleep(BACKFILL_DELAY_MS)
  }

  return result
}
