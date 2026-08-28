import type { Response } from 'express'
import { Webhook } from 'standardwebhooks'
import type { AuthedRequest } from './auth.js'
import { env } from './env.js'
import { notifyNewSignup } from './notify.js'
import { queueResendAudienceContact } from './resendAudience.js'

type SupabaseAuthUserRecord = {
  id?: string
  email?: string | null
  email_confirmed_at?: string | null
  raw_app_meta_data?: { provider?: string } | null
  app_metadata?: { provider?: string } | null
  user_metadata?: { full_name?: string; name?: string } | null
}

type SupabaseDbWebhookBody = {
  type?: string
  table?: string
  schema?: string
  record?: SupabaseAuthUserRecord
}

type SupabaseAuthHookBody = {
  user?: SupabaseAuthUserRecord
}

function hookSecretBytes(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const whsec = trimmed.match(/whsec_([A-Za-z0-9+/=]+)/)?.[1]
  return whsec || trimmed
}

function providerFromUser(user: SupabaseAuthUserRecord): string {
  return user.raw_app_meta_data?.provider || user.app_metadata?.provider || 'email'
}

function displayNameFromUser(user: SupabaseAuthUserRecord): string | null {
  const meta = user.user_metadata
  if (typeof meta?.full_name === 'string' && meta.full_name.trim()) return meta.full_name.trim()
  if (typeof meta?.name === 'string' && meta.name.trim()) return meta.name.trim()
  return null
}

function notifyFromUser(user: SupabaseAuthUserRecord): boolean {
  const userId = user.id?.trim()
  if (!userId) return false
  const email = user.email?.trim() || null
  notifyNewSignup({
    email,
    userId,
    provider: providerFromUser(user),
    emailConfirmed: Boolean(user.email_confirmed_at),
  })
  if (email) {
    queueResendAudienceContact({
      email,
      userId,
      displayName: displayNameFromUser(user),
      provider: providerFromUser(user),
    })
  }
  return true
}

function verifyAuthHook(rawBody: string, headers: AuthedRequest['headers']): boolean {
  const secret = hookSecretBytes(env.supabaseAuthHookSecret)
  if (!secret) return false
  if (!headers['webhook-id'] || !headers['webhook-signature'] || !headers['webhook-timestamp']) {
    return false
  }
  try {
    const wh = new Webhook(secret)
    wh.verify(rawBody, headers as Record<string, string>)
    return true
  } catch {
    return false
  }
}

/**
 * Sign-up notify endpoint — supports:
 * 1. Supabase Auth Hook (recommended): Authentication → Hooks → Before user created → HTTP
 * 2. Supabase Database Webhook (legacy): requires supabase_functions schema on the project
 */
export function handleSignupNotify(req: AuthedRequest, res: Response) {
  const rawBody =
    typeof req.body === 'string'
      ? req.body
      : Buffer.isBuffer(req.body)
        ? req.body.toString('utf8')
        : ''

  if (!rawBody) {
    res.status(400).json({ message: 'Empty body' })
    return
  }

  let body: SupabaseDbWebhookBody | SupabaseAuthHookBody
  try {
    body = JSON.parse(rawBody) as SupabaseDbWebhookBody | SupabaseAuthHookBody
  } catch {
    res.status(400).json({ message: 'Invalid JSON body' })
    return
  }

  // Auth Hook (Standard Webhooks) — preferred when Database Webhooks are unavailable.
  if ('user' in body && body.user) {
    if (!verifyAuthHook(rawBody, req.headers)) {
      res.status(401).json({ message: 'Unauthorized auth hook' })
      return
    }
    if (!notifyFromUser(body.user)) {
      res.status(400).json({ message: 'Missing user id in auth hook payload.' })
      return
    }
    res.status(200).json({})
    return
  }

  // Database Webhook fallback (auth.users INSERT).
  if (!env.notifyWebhookSecret) {
    res.status(503).json({ message: 'Signup notify webhook is not configured.' })
    return
  }

  const secret = req.headers['x-notify-secret']
  if (secret !== env.notifyWebhookSecret) {
    res.status(401).json({ message: 'Unauthorized' })
    return
  }

  const dbBody = body as SupabaseDbWebhookBody
  if (dbBody.type !== 'INSERT' || dbBody.schema !== 'auth' || dbBody.table !== 'users') {
    res.status(400).json({ message: 'Expected auth.users INSERT webhook payload.' })
    return
  }

  const record = dbBody.record
  if (!record || !notifyFromUser(record)) {
    res.status(400).json({ message: 'Missing user id in webhook record.' })
    return
  }

  res.json({ ok: true })
}
