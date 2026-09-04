import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

const envPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.env')

/** Load apps/api/.env, overriding empty shell vars and stripping a UTF-8 BOM if present. */
function loadApiEnv() {
  if (!fs.existsSync(envPath)) {
    dotenv.config({ path: envPath })
    return
  }
  const raw = fs.readFileSync(envPath)
  // Windows editors sometimes save with a BOM; dotenv then misses OPENAI_API_KEY.
  const text = raw.toString('utf8').replace(/^\uFEFF/, '')
  dotenv.config({ path: envPath, override: true })
  // Re-parse BOM-stripped contents so keys always win over empty system env.
  const parsed = dotenv.parse(text)
  for (const [key, value] of Object.entries(parsed)) {
    process.env[key] = value
  }
}

loadApiEnv()

function trimUrl(value: string): string {
  return value.trim().replace(/\/+$/, '')
}

export const env = {
  port: Number(process.env.PORT || 8787),
  // Strip internal whitespace — Windows editors often wrap long keys with a space.
  azureSpeechKey: (process.env.AZURE_SPEECH_KEY || '').replace(/\s+/g, ''),
  azureSpeechRegion: (process.env.AZURE_SPEECH_REGION || 'eastasia').trim(),
  /**
   * Azure AI Vision Read (OCR). Requires a dedicated Vision / multi-service key —
   * the Speech key alone does not grant OCR access.
   */
  azureVisionKey: (process.env.AZURE_VISION_KEY || '').replace(/\s+/g, ''),
  azureVisionEndpoint: trimUrl(
    process.env.AZURE_VISION_ENDPOINT ||
      (process.env.AZURE_VISION_KEY
        ? `https://${(process.env.AZURE_VISION_REGION || process.env.AZURE_SPEECH_REGION || 'eastasia').trim()}.api.cognitive.microsoft.com`
        : ''),
  ),
  openaiApiKey: (process.env.OPENAI_API_KEY || '').trim(),
  /** OpenAI-compatible base URL (e.g. https://api.deepseek.com/v1). Empty = official OpenAI. */
  openaiBaseUrl: trimUrl(process.env.OPENAI_BASE_URL || ''),
  openaiModel: (process.env.OPENAI_MODEL || 'gpt-4o-mini').trim(),
  /**
   * Vision LLM for Cam OCR fallback (calligraphy / foil).
   * Same key/host as translate by default — set OPENAI_VISION_MODEL to a vision-capable
   * model (e.g. deepseek-v4-flash-vision-exp or gpt-4o-mini). Empty MODEL = fallback off.
   */
  openaiVisionApiKey: (
    process.env.OPENAI_VISION_API_KEY ||
    process.env.OPENAI_API_KEY ||
    ''
  ).trim(),
  openaiVisionBaseUrl: trimUrl(
    process.env.OPENAI_VISION_BASE_URL || process.env.OPENAI_BASE_URL || '',
  ),
  /** Empty = vision LLM fallback disabled (Azure Read only). */
  openaiVisionModel: (process.env.OPENAI_VISION_MODEL || '').trim(),
  /**
   * Allow loading dictionaries under non-commercial licenses (words.hk).
   * Keep off for paid/ad-supported commercial deployments unless you have a separate license.
   */
  allowNoncommercialDicts: (process.env.YUE_ALLOW_NONCOMMERCIAL_DICTS || '0') === '1',
  /** Load words.hk gloss pack when present AND non-commercial gate is open. */
  enableWordshk: (process.env.YUE_ENABLE_WORDSHK || '0') === '1',
  freeLiveMinutes: Number(process.env.YUE_FREE_LIVE_MINUTES || 60),
  /** Soft analytics default for Free; Family/Business TTS is unlimited (see entitlements). */
  freeTtsChars: Number(process.env.YUE_FREE_TTS_CHARS || 30000),
  /** Free camera hard cap (minutes / month). */
  freeCameraMinutes: Number(process.env.YUE_FREE_CAMERA_MINUTES || 60),
  /** Family camera hard cap (minutes / month). Business is unlimited but counted. */
  familyCameraMinutes: Number(
    process.env.YUE_FAMILY_CAMERA_MINUTES || process.env.YUE_PRO_CAMERA_MINUTES || 480,
  ),
  /** Free document pages / month (Cam → Documents). */
  freeDocsPages: Number(process.env.YUE_FREE_DOCS_PAGES || 40),
  /** Family document pages / month. Business is unlimited but counted. */
  familyDocsPages: Number(
    process.env.YUE_FAMILY_DOCS_PAGES || process.env.YUE_PRO_DOCS_PAGES || 400,
  ),
  freeAllowLive: (process.env.YUE_FREE_ALLOW_LIVE || '1') === '1',
  /** When 0, Free plan has no tap-to-play quota. Auto-speak stays a paid-plan flag. */
  freeAllowTts: (process.env.YUE_FREE_ALLOW_TTS || '1') === '1',
  freeAllowCamera: (process.env.YUE_FREE_ALLOW_CAMERA || '1') === '1',
  openMode: (process.env.YUE_OPEN_MODE || '1') === '1',
  requireLogin: (process.env.YUE_REQUIRE_LOGIN || '1') === '1',
  /** Guest trial live minutes / month (0 = guests cannot use live). */
  guestLiveMinutes: Number(process.env.YUE_GUEST_LIVE_MINUTES || 30),
  /** Guest trial camera minutes / month (0 = guests cannot use Cam AR/Upload). */
  guestCameraMinutes: Number(process.env.YUE_GUEST_CAMERA_MINUTES || 30),
  familyLiveMinutes: Number(
    process.env.YUE_FAMILY_LIVE_MINUTES || process.env.YUE_PRO_LIVE_MINUTES || 480,
  ),
  familyTtsChars: Number(
    process.env.YUE_FAMILY_TTS_CHARS || process.env.YUE_PRO_TTS_CHARS || 200000,
  ),
  businessLiveMinutes: Number(
    process.env.YUE_BUSINESS_LIVE_MINUTES || process.env.YUE_MAX_LIVE_MINUTES || 2400,
  ),
  businessTtsChars: Number(
    process.env.YUE_BUSINESS_TTS_CHARS || process.env.YUE_MAX_TTS_CHARS || 500000,
  ),
  appUrl: trimUrl(
    process.env.YUE_APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:5173'),
  ),
  supabaseUrl: trimUrl(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''),
  supabaseServiceRole: (process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim(),
  /** Public anon key — safe to expose to the browser (RLS still applies). */
  supabaseAnonKey: (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim(),
  stripeSecretKey: (process.env.STRIPE_SECRET_KEY || '').trim(),
  stripeWebhookSecret: (process.env.STRIPE_WEBHOOK_SECRET || '').trim(),
  stripePriceFamilyMonth: (
    process.env.STRIPE_PRICE_FAMILY_MONTH ||
    process.env.STRIPE_PRICE_PRO_MONTH ||
    ''
  ).trim(),
  stripePriceFamilyYear: (
    process.env.STRIPE_PRICE_FAMILY_YEAR ||
    process.env.STRIPE_PRICE_PRO_YEAR ||
    ''
  ).trim(),
  stripePriceBusinessMonth: (
    process.env.STRIPE_PRICE_BUSINESS_MONTH ||
    process.env.STRIPE_PRICE_MAX_MONTH ||
    ''
  ).trim(),
  stripePriceBusinessYear: (
    process.env.STRIPE_PRICE_BUSINESS_YEAR ||
    process.env.STRIPE_PRICE_MAX_YEAR ||
    ''
  ).trim(),
  /**
   * Comma-separated admin emails (case-insensitive).
   * Only these accounts can call /api/admin/* and see #/admin.
   */
  adminEmails: (process.env.YUE_ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
  /** Resend API key for admin notification emails. */
  resendApiKey: (process.env.RESEND_API_KEY || '').trim(),
  /**
   * Resend Audience ID — new sign-ins are synced as contacts automatically.
   * Resend Dashboard → Audiences → copy the audience id (seg_… or uuid).
   */
  resendAudienceId: (process.env.RESEND_AUDIENCE_ID || '').trim(),
  /**
   * From address — must be a verified domain in Resend (or onboarding@resend.dev for tests).
   * Accepts `email@domain.com` or `Name <email@domain.com>`.
   * Common mistake `Name <noreply.domain.com>` (missing @) is normalized when possible.
   */
  notifyFromEmail: normalizeNotifyFrom(process.env.YUE_NOTIFY_FROM || ''),
  /**
   * Support / Reply-To address (does not need to be the Resend From domain).
   * Default: help@mail.jyuttranslate.com (Cloudflare Email Routing → your inbox).
   * Override with YUE_SUPPORT_FROM. Used as Resend `replyTo` on user-facing and admin mail.
   */
  supportFromEmail: normalizeNotifyFrom(
    process.env.YUE_SUPPORT_FROM || 'JyutTranslate Help <help@mail.jyuttranslate.com>',
  ),
  /**
   * Admin inboxes for sign-up / upgrade alerts. Falls back to YUE_ADMIN_EMAILS when unset.
   */
  adminNotifyEmails: (() => {
    const raw = (process.env.YUE_ADMIN_NOTIFY_EMAILS || process.env.YUE_ADMIN_EMAILS || '')
      .split(',')
      .map((e) => e.trim())
      .filter(Boolean)
    return raw
  })(),
  /** Shared secret for POST /api/internal/signup-notify (Database Webhook fallback). */
  notifyWebhookSecret: (process.env.YUE_NOTIFY_WEBHOOK_SECRET || '').trim(),
  /**
   * Supabase Auth Hook secret from Authentication → Hooks (Standard Webhooks `whsec_…`).
   * Preferred for sign-up alerts when Database Webhooks are unavailable.
   */
  supabaseAuthHookSecret: (process.env.SUPABASE_AUTH_HOOK_SECRET || '').trim(),
  /**
   * Supabase **Send Email** hook secret (Authentication → Hooks → Send Email).
   * When the hook is configured, user auth emails use React Email via Resend.
   */
  supabaseSendEmailHookSecret: (
    process.env.SUPABASE_SEND_EMAIL_HOOK_SECRET ||
    process.env.SEND_EMAIL_HOOK_SECRET ||
    ''
  ).trim(),
  /**
   * When 1, fold legacy per-user usage into household pools once per serverless instance
   * on cold start (idempotent). Set on deploy after migration 015, then remove when done.
   */
  runHouseholdUsageBackfill: (process.env.YUE_RUN_HOUSEHOLD_USAGE_BACKFILL || '0') === '1',
}

/**
 * Normalize Resend `from` to `email@domain` or `Name <email@domain>`.
 * Fixes the common Vercel typo `JyutTranslate <noreply.jyuttranslate.com>` (domain without @).
 */
export function normalizeNotifyFrom(raw: string): string {
  const s = raw.trim().replace(/^["']|["']$/g, '')
  if (!s) return ''

  const named = s.match(/^(.+?)\s*<([^<>]+)>\s*$/)
  if (named) {
    const display = named[1]!.trim()
    const addr = coerceEmailAddress(named[2]!.trim())
    if (!addr) return ''
    return `${display} <${addr}>`
  }

  return coerceEmailAddress(s) || ''
}

/** Turn `noreply.example.com` into `noreply@example.com` when @ is missing. */
function coerceEmailAddress(value: string): string | null {
  const v = value.trim()
  if (!v) return null
  if (v.includes('@')) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? v : null
  }
  // noreply.jyuttranslate.com → noreply@jyuttranslate.com
  const parts = v.split('.')
  if (parts.length >= 3 && parts.every((p) => /^[a-zA-Z0-9-]+$/.test(p))) {
    const local = parts[0]!
    const domain = parts.slice(1).join('.')
    const email = `${local}@${domain}`
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null
  }
  return null
}

/** True when this email is on the YUE_ADMIN_EMAILS allowlist. */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email || !env.adminEmails.length) return false
  return env.adminEmails.includes(email.trim().toLowerCase())
}

/**
 * Resend `replyTo` for outbound mail. Prefer YUE_SUPPORT_FROM so replies land in Help
 * (Cloudflare Email Routing), not the noreply From address.
 */
export function supportReplyTo(): string | undefined {
  return env.supportFromEmail || undefined
}

/** True when we can create a model client. */
export function openaiConfigured() {
  if (env.openaiApiKey) return true
  // Local Ollama / LM Studio often need no real key — base URL alone is enough.
  if (env.openaiBaseUrl && /localhost|127\.0\.0\.1/i.test(env.openaiBaseUrl)) return true
  return false
}

/** DeepSeek V4 enables thinking by default; reasoning tokens can exhaust max_tokens. */
function usesDeepSeekThinking() {
  return /deepseek/i.test(`${env.openaiBaseUrl} ${env.openaiModel}`)
}

/**
 * Extra Chat Completions fields for our translation models.
 * DeepSeek V4 thinking is on by default; put `thinking` on the JSON body
 * (Node SDK has no Python-style extra_body merge).
 */
export function llmChatExtras(): Record<string, unknown> {
  if (!usesDeepSeekThinking()) return {}
  return { thinking: { type: 'disabled' } }
}

export function cloudReady() {
  return Boolean(env.azureSpeechKey && openaiConfigured())
}

export function visionConfigured() {
  return Boolean(env.azureVisionKey && env.azureVisionEndpoint)
}

/** Multimodal LLM OCR fallback (calligraphy / foil). Requires OPENAI_VISION_MODEL. */
export function visionLlmConfigured() {
  return Boolean(env.openaiVisionApiKey && env.openaiVisionModel)
}

export function openaiStatus() {
  return {
    configured: openaiConfigured(),
    hasApiKey: Boolean(env.openaiApiKey),
    hasBaseUrl: Boolean(env.openaiBaseUrl),
    model: env.openaiModel,
    visionModel: env.openaiVisionModel || null,
    visionLlm: visionLlmConfigured(),
    envFile: envPath,
  }
}
