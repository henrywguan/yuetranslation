import { Webhook } from 'standardwebhooks'
import type { AuthedRequest } from './auth.js'

/** Strip `v1,whsec_` prefix Supabase shows in the Auth Hooks UI. */
export function hookSecretBytes(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const whsec = trimmed.match(/whsec_([A-Za-z0-9+/=]+)/)?.[1]
  return whsec || trimmed
}

export function verifySupabaseAuthHook(
  rawBody: string,
  headers: AuthedRequest['headers'],
  secretRaw: string,
): boolean {
  const secret = hookSecretBytes(secretRaw)
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
