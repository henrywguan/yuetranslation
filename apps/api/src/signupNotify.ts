import type { Response } from 'express'
import type { AuthedRequest } from './auth.js'
import { env } from './env.js'
import { notifyNewSignup } from './notify.js'

type SupabaseAuthUserRecord = {
  id?: string
  email?: string | null
  email_confirmed_at?: string | null
  raw_app_meta_data?: { provider?: string } | null
}

type SupabaseDbWebhookBody = {
  type?: string
  table?: string
  schema?: string
  record?: SupabaseAuthUserRecord
}

/** Supabase Database Webhook on auth.users INSERT → admin email via Resend. */
export function handleSignupNotify(req: AuthedRequest, res: Response) {
  if (!env.notifyWebhookSecret) {
    res.status(503).json({ message: 'Signup notify webhook is not configured.' })
    return
  }

  const secret = req.headers['x-notify-secret']
  if (secret !== env.notifyWebhookSecret) {
    res.status(401).json({ message: 'Unauthorized' })
    return
  }

  const body = (req.body || {}) as SupabaseDbWebhookBody
  if (body.type !== 'INSERT' || body.schema !== 'auth' || body.table !== 'users') {
    res.status(400).json({ message: 'Expected auth.users INSERT webhook payload.' })
    return
  }

  const record = body.record
  if (!record?.id?.trim()) {
    res.status(400).json({ message: 'Missing user id in webhook record.' })
    return
  }
  const userId = record.id.trim()

  notifyNewSignup({
    email: record.email ?? null,
    userId,
    provider: record.raw_app_meta_data?.provider ?? 'email',
    emailConfirmed: Boolean(record.email_confirmed_at),
  })

  res.json({ ok: true })
}
