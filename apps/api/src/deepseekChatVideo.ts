/**
 * Chat video generation for #/chat `generate_video` via Higgsfield Seedance 2.5.
 * Credentials stay server-side (`HF_CREDENTIALS` = KEY_ID:KEY_SECRET).
 */
import {
  config,
  higgsfield,
  NotEnoughCreditsError,
  type V2Response,
} from '@higgsfield/client/v2'
import { randomUUID } from 'node:crypto'
import { env } from './env.js'

export const SEEDANCE_TEXT_TO_VIDEO = 'bytedance/seedance-2.5/text-to-video' as const

export type SeedanceResolution = '480p' | '720p' | '1080p'
export type SeedanceAspectRatio = '16:9' | '4:3' | '1:1' | '3:4' | '9:16' | '21:9'
export type SeedanceOutputFormat = 'mp4' | 'mov'

export type GeneratedChatVideo = {
  id: string
  prompt: string
  url: string
  requestId?: string
  createdAt: number
  duration: number
  resolution: SeedanceResolution
  aspectRatio: SeedanceAspectRatio
}

const RESOLUTIONS = new Set<SeedanceResolution>(['480p', '720p', '1080p'])
const ASPECTS = new Set<SeedanceAspectRatio>(['16:9', '4:3', '1:1', '3:4', '9:16', '21:9'])
const FORMATS = new Set<SeedanceOutputFormat>(['mp4', 'mov'])

/** Chat tool caps — keep cost bounded; Seedance allows up to 30s. */
export const CHAT_VIDEO_DURATION_MIN = 4
export const CHAT_VIDEO_DURATION_MAX = 15

let configuredCredsFingerprint = ''

function configureHiggsfield(credentials: string) {
  const trimmed = credentials.trim()
  if (!trimmed) throw new Error('HF_CREDENTIALS is not configured on the API.')
  if (!trimmed.includes(':')) {
    throw new Error('HF_CREDENTIALS must be KEY_ID:KEY_SECRET (Higgsfield platform API).')
  }
  if (trimmed !== configuredCredsFingerprint) {
    config({ credentials: trimmed })
    configuredCredsFingerprint = trimmed
  }
}

export function chatVideoConfigured(): boolean {
  const c = env.hfCredentials
  return Boolean(c && c.includes(':'))
}

export function clampChatVideoDuration(raw: unknown): number {
  const n = typeof raw === 'number' ? raw : Number(raw)
  if (!Number.isFinite(n)) return 5
  return Math.min(CHAT_VIDEO_DURATION_MAX, Math.max(CHAT_VIDEO_DURATION_MIN, Math.round(n)))
}

export function parseSeedanceResolution(raw: unknown): SeedanceResolution {
  const s = String(raw || '720p').trim() as SeedanceResolution
  return RESOLUTIONS.has(s) ? s : '720p'
}

export function parseSeedanceAspectRatio(raw: unknown): SeedanceAspectRatio {
  const s = String(raw || '16:9').trim() as SeedanceAspectRatio
  return ASPECTS.has(s) ? s : '16:9'
}

export function parseSeedanceOutputFormat(raw: unknown): SeedanceOutputFormat {
  const s = String(raw || 'mp4').trim() as SeedanceOutputFormat
  return FORMATS.has(s) ? s : 'mp4'
}

/** Markdown the model should paste; renderer treats `Video ·` alt as an in-chat player. */
export function videoMarkdown(prompt: string, url: string): string {
  const alt = `Video · ${prompt.replace(/[\[\]]/g, '').slice(0, 100)}`
  return `![${alt}](${url})`
}

export function extractVideoUrl(result: V2Response): string | null {
  const url = result.video?.url?.trim()
  return url || null
}

export function assertSeedanceSuccess(result: V2Response): string {
  const status = String(result.status || '').toLowerCase()
  if (status === 'completed') {
    const url = extractVideoUrl(result)
    if (!url) throw new Error('Seedance completed without a video URL.')
    return url
  }
  if (status === 'nsfw' || status === 'moderated') {
    throw new Error('Seedance blocked this prompt (moderation). Try a different description.')
  }
  if (status === 'canceled' || status === 'cancelled') {
    throw new Error('Seedance generation was canceled.')
  }
  if (status === 'failed') {
    throw new Error('Seedance generation failed.')
  }
  throw new Error(`Seedance ended with status "${result.status || 'unknown'}".`)
}

/**
 * Generate one Seedance 2.5 text-to-video clip.
 * Returns markdown the model should include in its reply.
 */
export async function generateChatVideo(
  prompt: string,
  opts?: {
    signal?: AbortSignal
    duration?: number
    resolution?: SeedanceResolution
    aspectRatio?: SeedanceAspectRatio
    outputFormat?: SeedanceOutputFormat
    generateAudio?: boolean
  },
): Promise<{ markdown: string; video: GeneratedChatVideo }> {
  const cleaned = prompt.trim().slice(0, 3_000)
  if (!cleaned) throw new Error('prompt required')
  if (opts?.signal?.aborted) throw new Error('Aborted')

  configureHiggsfield(env.hfCredentials)

  const duration = clampChatVideoDuration(opts?.duration ?? 5)
  const resolution = parseSeedanceResolution(opts?.resolution)
  const aspectRatio = parseSeedanceAspectRatio(opts?.aspectRatio)
  const outputFormat = parseSeedanceOutputFormat(opts?.outputFormat)
  const generateAudio = opts?.generateAudio !== false

  let result: V2Response
  try {
    result = await higgsfield.subscribe(SEEDANCE_TEXT_TO_VIDEO, {
      input: {
        prompt: cleaned,
        duration,
        resolution,
        aspect_ratio: aspectRatio,
        output_format: outputFormat,
        generate_audio: generateAudio,
      },
      withPolling: true,
    })
  } catch (err) {
    if (err instanceof NotEnoughCreditsError) {
      throw new Error(
        'Higgsfield account is out of credits for Seedance. Top up the API key in HF_CREDENTIALS, then retry.',
      )
    }
    throw err
  }

  if (opts?.signal?.aborted) throw new Error('Aborted')

  const url = assertSeedanceSuccess(result)
  const video: GeneratedChatVideo = {
    id: randomUUID(),
    prompt: cleaned,
    url,
    requestId: result.request_id,
    createdAt: Date.now(),
    duration,
    resolution,
    aspectRatio,
  }
  return { markdown: videoMarkdown(cleaned, url), video }
}
