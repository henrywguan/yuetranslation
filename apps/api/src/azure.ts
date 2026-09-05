import { env } from './env.js'
import { resolveSpeakVoice } from './ttsVoices.js'

export async function issueSpeechToken() {
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
  return {
    token: await res.text(),
    region: env.azureSpeechRegion,
    expiresIn: 540,
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
}

export async function synthesize(text: string, lang: string, opts: SynthesizeOpts = {}): Promise<Buffer> {
  if (!env.azureSpeechKey) throw new Error('AZURE_SPEECH_KEY missing')
  const pick = resolveSpeakVoice(
    lang,
    opts.preferredYue,
    opts.preferredEn,
    opts.preferredCmn,
    opts.preferredWuu,
    opts.voice,
  )
  const ssml = `<speak version="1.0" xml:lang="${pick.xmlLang}"><voice name="${pick.voice}">${escapeXml(text)}</voice></speak>`
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
  return Buffer.from(await res.arrayBuffer())
}
