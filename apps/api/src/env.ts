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
  openaiApiKey: (process.env.OPENAI_API_KEY || '').trim(),
  /** OpenAI-compatible base URL (e.g. https://api.deepseek.com/v1). Empty = official OpenAI. */
  openaiBaseUrl: trimUrl(process.env.OPENAI_BASE_URL || ''),
  openaiModel: (process.env.OPENAI_MODEL || 'gpt-4o-mini').trim(),
  /**
   * Allow loading dictionaries under non-commercial licenses (words.hk).
   * Keep off for paid/ad-supported commercial deployments unless you have a separate license.
   */
  allowNoncommercialDicts: (process.env.YUE_ALLOW_NONCOMMERCIAL_DICTS || '0') === '1',
  /** Load words.hk gloss pack when present AND non-commercial gate is open. */
  enableWordshk: (process.env.YUE_ENABLE_WORDSHK || '0') === '1',
  freeLiveMinutes: Number(process.env.YUE_FREE_LIVE_MINUTES || 20),
  freeTtsChars: Number(process.env.YUE_FREE_TTS_CHARS || 0),
  freeAllowLive: (process.env.YUE_FREE_ALLOW_LIVE || '1') === '1',
  freeAllowTts: (process.env.YUE_FREE_ALLOW_TTS || '0') === '1',
  openMode: (process.env.YUE_OPEN_MODE || '1') === '1',
  requireLogin: (process.env.YUE_REQUIRE_LOGIN || '1') === '1',
  guestLiveMinutes: Number(process.env.YUE_GUEST_LIVE_MINUTES || 0),
  proLiveMinutes: Number(process.env.YUE_PRO_LIVE_MINUTES || 600),
  proTtsChars: Number(process.env.YUE_PRO_TTS_CHARS || 200000),
  maxLiveMinutes: Number(process.env.YUE_MAX_LIVE_MINUTES || 2400),
  maxTtsChars: Number(process.env.YUE_MAX_TTS_CHARS || 500000),
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
  stripePriceProMonth: (process.env.STRIPE_PRICE_PRO_MONTH || '').trim(),
  stripePriceProYear: (process.env.STRIPE_PRICE_PRO_YEAR || '').trim(),
  stripePriceMaxMonth: (process.env.STRIPE_PRICE_MAX_MONTH || '').trim(),
  stripePriceMaxYear: (process.env.STRIPE_PRICE_MAX_YEAR || '').trim(),
}

/** True when we can create a model client. */
export function openaiConfigured() {
  if (env.openaiApiKey) return true
  // Local Ollama / LM Studio often need no real key — base URL alone is enough.
  if (env.openaiBaseUrl && /localhost|127\.0\.0\.1/i.test(env.openaiBaseUrl)) return true
  return false
}

export function cloudReady() {
  return Boolean(env.azureSpeechKey && openaiConfigured())
}

export function openaiStatus() {
  return {
    configured: openaiConfigured(),
    hasApiKey: Boolean(env.openaiApiKey),
    hasBaseUrl: Boolean(env.openaiBaseUrl),
    model: env.openaiModel,
    envFile: envPath,
  }
}
