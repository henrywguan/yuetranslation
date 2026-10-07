import { env } from './env.js'
import { resolveSpeakVoice } from './ttsVoices.js'
import {
  buildPerformedSsml,
  performanceCacheToken,
  type PracticePartnerBeats,
} from './practicePartnerPerformance.js'

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
  preferredEses?: string | null
  preferredVi?: string | null
  preferredTh?: string | null
  preferredLo?: string | null
  preferredKo?: string | null
  preferredJa?: string | null
  preferredId?: string | null
  preferredMs?: string | null
  preferredPt?: string | null
  preferredFr?: string | null
  preferredHi?: string | null
  preferredKm?: string | null
  preferredMy?: string | null
  preferredJv?: string | null
  preferredIt?: string | null
  preferredDe?: string | null
  preferredNl?: string | null
  /**
   * Azure SSML `volume="x-loud"` — Practice Partner and other “fill the room”
   * surfaces. Cached separately from normal clips.
   */
  loud?: boolean
  /**
   * Practice Partner three-beat clip. Reaction prosody, then a steady x-loud
   * phrase. Never raw SSML from the client. Playback gain stays on the client.
   */
  performance?: PracticePartnerBeats | null
}

const TTS_CLIP_CACHE_MAX = 48
const ttsClipCache = new Map<string, Buffer>()

export function ttsClipCacheKey(voice: string, text: string, loud = false, kind = '') {
  return kind
    ? `${voice}\n${kind}\n${loud ? 'loud' : 'norm'}\n${text}`
    : `${voice}\n${loud ? 'loud' : 'norm'}\n${text}`
}

export function resetTtsClipCacheForTests() {
  ttsClipCache.clear()
}

export function ttsClipCacheSizeForTests() {
  return ttsClipCache.size
}

export function rememberTtsClipForTests(voice: string, text: string, buf: Buffer, loud = false) {
  rememberTtsClip(ttsClipCacheKey(voice, text, loud), buf)
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
    opts.preferredEses,
    opts.preferredTh,
    opts.preferredLo,
    opts.preferredKo,
    opts.preferredJa,
    opts.preferredId,
    opts.preferredMs,
    opts.preferredPt,
    opts.preferredFr,
    opts.preferredHi,
    opts.preferredKm,
    opts.preferredMy,
    opts.preferredJv,
    opts.preferredIt,
    opts.preferredDe,
    opts.preferredNl,
  )
  const loud = Boolean(opts.loud) || pick.xmlLang === 'fil-PH'
  const performance = opts.performance?.phrase ? opts.performance : null
  const cacheKey = performance
    ? ttsClipCacheKey(pick.voice, performanceCacheToken(performance), true, 'perf')
    : ttsClipCacheKey(pick.voice, text, loud)
  const cached = cachedTtsClip(cacheKey)
  if (cached) return Buffer.from(cached)

  if (!env.azureSpeechKey) throw new Error('AZURE_SPEECH_KEY missing')
  // fil-PH neural voices (and Practice Partner / loud mode) need Azure's max
  // prosody — HTMLAudioElement.volume cannot go past 1.0.
  // A performed clip sets its own volumes: reaction loud, phrase x-loud.
  const spoken = performance
    ? null
    : loud
      ? `<prosody volume="x-loud">${escapeXml(text)}</prosody>`
      : escapeXml(text)
  const ssml = performance
    ? buildPerformedSsml(pick.xmlLang, pick.voice, performance)
    : `<speak version="1.0" xml:lang="${pick.xmlLang}"><voice name="${pick.voice}">${spoken}</voice></speak>`
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
