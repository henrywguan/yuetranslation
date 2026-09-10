import { env } from './env.js'
import { resolveSpeakVoice } from './ttsVoices.js'

/** Client-facing max TTL — refresh more often; pairs with prepaid debit. */
export const SPEECH_TOKEN_MAX_TTL_S = 180
/** Minimum remaining live seconds required to mint a token. */
export const SPEECH_TOKEN_MIN_REMAINING_S = 15
/** Live seconds debited on each successful mint (closes no-heartbeat abuse). */
export const SPEECH_TOKEN_PREPAY_S = 60

export async function issueSpeechToken(opts?: { expiresIn?: number }) {
  if (!env.azureSpeechKey) throw new Error('AZURE_SPEECH_KEY missing')
  const url = `https://${env.azureSpeechRegion}.api.cognitive.microsoft.com/sts/v1.0/issueToken`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': env.azureSpeechKey,
      'Content-Length': '0',
    },
  })
  if (!res.ok) throw new Error(`Azure token failed: ${res.status}`)
  const expiresIn = Math.max(
    SPEECH_TOKEN_MIN_REMAINING_S,
    Math.min(SPEECH_TOKEN_MAX_TTL_S, Math.floor(opts?.expiresIn ?? SPEECH_TOKEN_MAX_TTL_S)),
  )
  return {
    token: await res.text(),
    region: env.azureSpeechRegion,
    expiresIn,
  }
}

function escapeXml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export type SynthesizeOpts = {
  /** Explicit allowlisted voice id (preview / override). */
  voice?: string | null
  preferredYue?: string | null
  preferredEn?: string | null
  preferredCmn?: string | null
  preferredWuu?: string | null
  preferredSichuan?: string | null
  preferredTl?: string | null
  preferredEs?: string | null
  preferredVi?: string | null
}

const TTS_CLIP_CACHE_MAX = 48
const ttsClipCache = new Map<string, Buffer>()

export function ttsClipCacheKey(voice: string, text: string) {
  return `${voice}\n${text}`
}

export function resetTtsClipCacheForTests() {
  ttsClipCache.clear()
}

export function ttsClipCacheSizeForTests() {
  return ttsClipCache.size
}

export function rememberTtsClipForTests(voice: string, text: string, buf: Buffer) {
  rememberTtsClip(ttsClipCacheKey(voice, text), buf)
}

function rememberTtsClip(key: string, buf: Buffer) {
  if (ttsClipCache.has(key)) ttsClipCache.delete(key)
  ttsClipCache.set(key, buf)
  while (ttsClipCache.size > TTS_CLIP_CACHE_MAX) {
    const oldest = ttsClipCache.keys().next().value
    if (oldest === undefined) break
    ttsClipCache.delete(oldest)
  }
}

function cachedTtsClip(key: string): Buffer | undefined {
  const hit = ttsClipCache.get(key)
  if (!hit) return undefined
  ttsClipCache.delete(key)
  ttsClipCache.set(key, hit)
  return hit
}

export async function synthesize(text: string, lang: string, opts: SynthesizeOpts = {}): Promise<Buffer> {
  const pick = resolveSpeakVoice(
    lang,
    opts.preferredYue,
    opts.preferredEn,
    opts.preferredCmn,
    opts.preferredWuu,
    opts.preferredSichuan,
    opts.preferredTl,
    opts.preferredEs,
    opts.voice,
    opts.preferredVi,
  )
  const cacheKey = ttsClipCacheKey(pick.voice, text)
  const cached = cachedTtsClip(cacheKey)
  if (cached) return Buffer.from(cached)

  if (!env.azureSpeechKey) throw new Error('AZURE_SPEECH_KEY missing')
  // fil-PH neural voices are much quieter than zh-HK / en-US on iPhone speakers
  // (even at device max). Use Azure's loudest relative prosody so Tagalog speak
  // is in the same ballpark as Cantonese/English without client-side gain nodes.
  const spoken =
    pick.xmlLang === 'fil-PH'
      ? `<prosody volume="x-loud">${escapeXml(text)}</prosody>`
      : escapeXml(text)
  const ssml = `<speak version="1.0" xml:lang="${pick.xmlLang}"><voice name="${pick.voice}">${spoken}</voice></speak>`
  const url = `https://${env.azureSpeechRegion}.tts.speech.microsoft.com/cognitiveservices/v1`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': env.azureSpeechKey,
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3',
    },
    body: ssml,
  })
  if (!res.ok) throw new Error(`TTS failed: ${res.status}`)
  const audio = Buffer.from(await res.arrayBuffer())
  rememberTtsClip(cacheKey, audio)
  return audio
}
