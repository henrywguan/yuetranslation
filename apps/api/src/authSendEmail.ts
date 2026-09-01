import type { Response } from 'express'
import type { AuthedRequest } from './auth.js'
import { env } from './env.js'
import { verifySupabaseAuthHook } from './authWebhook.js'
import { sendAuthEmail } from './notify.js'

export type SupabaseSendEmailPayload = {
  user: {
    email: string
    id?: string
  }
  email_data: {
    token: string
    token_hash: string
    redirect_to: string
    email_action_type: string
    site_url: string
    token_new?: string
    token_hash_new?: string
  }
}

function readRawBody(req: AuthedRequest): string {
  if (typeof req.body === 'string') return req.body
  if (Buffer.isBuffer(req.body)) return req.body.toString('utf8')
  return ''
}

/**
 * Supabase **Send Email** Auth Hook — replaces default Supabase auth emails with
 * branded React Email templates sent via Resend.
 *
 * Dashboard → Authentication → Hooks → Send Email → HTTPS
 * URL: `https://<api-host>/api/internal/auth-send-email`
 */
export async function handleAuthSendEmail(req: AuthedRequest, res: Response) {
  const rawBody = readRawBody(req)
  if (!rawBody) {
    res.status(400).json({ message: 'Empty body' })
    return
  }

  const secret = env.supabaseSendEmailHookSecret
  if (!secret) {
    res.status(503).json({ message: 'Send Email hook secret is not configured.' })
    return
  }

  if (!verifySupabaseAuthHook(rawBody, req.headers, secret)) {
    res.status(401).json({ message: 'Unauthorized auth hook' })
    return
  }

  let payload: SupabaseSendEmailPayload
  try {
    payload = JSON.parse(rawBody) as SupabaseSendEmailPayload
  } catch {
    res.status(400).json({ message: 'Invalid JSON body' })
    return
  }

  const email = payload.user?.email?.trim()
  const emailData = payload.email_data
  if (!email || !emailData?.token_hash || !emailData.email_action_type) {
    res.status(400).json({ message: 'Missing user email or email_data in hook payload.' })
    return
  }

  const supabaseUrl = env.supabaseUrl || emailData.site_url?.trim()
  if (!supabaseUrl) {
    res.status(503).json({ message: 'SUPABASE_URL is not configured on the API.' })
    return
  }

  try {
    await sendAuthEmail({
      to: email,
      actionType: emailData.email_action_type,
      tokenHash: emailData.token_hash,
      otpCode: emailData.token || null,
      redirectTo: emailData.redirect_to || env.appUrl,
      supabaseUrl,
    })
    res.status(200).json({})
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    console.error('[auth-send-email] failed', { email, action: emailData.email_action_type, message })
    res.status(500).json({
      error: {
        http_code: 500,
        message,
      },
    })
  }
}
