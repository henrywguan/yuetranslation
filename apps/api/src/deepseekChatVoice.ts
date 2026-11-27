/**
 * DeepSeek Chat voice tools — TTS (/v1/tools/tts) + ASR (/v1/tools/asr).
 * Family/Business only; uses the same OpenAI/DeepSeek API key as #/chat.
 */
import type { Response } from 'express'
import { z } from 'zod'
import type { AuthedRequest } from './auth.js'
import { allowChatCallerRate, resolveChatCaller } from './chatGateUnlock.js'
import { env, openaiConfigured } from './env.js'
import type { GuestRequest } from './guest.js'

function toolsBase(openaiBaseUrl = env.openaiBaseUrl): string {
  const trimmed = openaiBaseUrl.trim().replace(/\/+$/, '')
  const withoutV1 = trimmed.replace(/\/v1$/i, '')
  return `${withoutV1 || 'https://api.deepseek.com'}/v1/tools`
}

async function gateChatVoice(req: AuthedRequest, res: Response, bucket: string): Promise<boolean> {
  const caller = await resolveChatCaller(req as GuestRequest, res)
  if (!caller) return false
  if (!allowChatCallerRate(res, caller, bucket, Math.min(20, env.chatRlPerMin || 20))) {
    return false
  }
  if (!openaiConfigured() || !env.openaiApiKey) {
    res.status(503).json({ message: 'Chat model is not configured.' })
    return false
  }
  return true
}

const TtsBodySchema = z.object({
  text: z.string().trim().min(1).max(10_000),
  voiceId: z.enum(['stella', 'tide']).optional().default('stella'),
  format: z.enum(['wav', 'pcm']).optional().default('wav'),
  filterMarkdown: z.boolean().optional().default(true),
})

/** POST /api/chat/tts — proxy DeepSeek TTS (supports yue / zh / en / …). */
export async function postDeepseekChatTts(req: AuthedRequest, res: Response) {
  if (!(await gateChatVoice(req, res, 'deepseekChatTts'))) return

  const parsed = TtsBodySchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ message: 'Invalid TTS payload.', code: 'chat_tts_invalid' })
    return
  }

  const url = `${toolsBase()}/tts`
  try {
    const upstream = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.openaiApiKey}`,
        'Content-Type': 'application/json',
        Accept: parsed.data.format === 'wav' ? 'audio/wav' : 'application/octet-stream',
      },
      body: JSON.stringify({
        text: parsed.data.text,
        voice_id: parsed.data.voiceId,
        format: parsed.data.format,
        filter_markdown: parsed.data.filterMarkdown,
      }),
    })
    if (!upstream.ok) {
      const detail = (await upstream.text()).slice(0, 240)
      console.warn('[deepseek-chat] tts failed', upstream.status, detail)
      res.status(upstream.status === 429 ? 429 : 502).json({
        message: 'Chat TTS failed.',
        detail,
      })
      return
    }
    const buf = Buffer.from(await upstream.arrayBuffer())
    res.status(200)
    res.setHeader(
      'Content-Type',
      parsed.data.format === 'wav' ? 'audio/wav' : 'application/octet-stream',
    )
    res.setHeader('Cache-Control', 'no-store')
    res.send(buf)
  } catch (err) {
    console.warn('[deepseek-chat] tts error', err instanceof Error ? err.message : err)
    res.status(502).json({ message: 'Chat TTS failed.' })
  }
}

const AsrBodySchema = z.object({
  filename: z.string().trim().min(1).max(200).optional().default('speech.wav'),
  mime: z.string().trim().max(120).optional(),
  dataBase64: z.string().min(1).max(8_000_000),
})

/** POST /api/chat/asr — proxy DeepSeek ASR (WAV / Ogg Opus, ≤120s). */
export async function postDeepseekChatAsr(req: AuthedRequest, res: Response) {
  if (!(await gateChatVoice(req, res, 'deepseekChatAsr'))) return

  const parsed = AsrBodySchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ message: 'Invalid ASR payload.', code: 'chat_asr_invalid' })
    return
  }

  let bytes: Buffer
  try {
    const raw = parsed.data.dataBase64.replace(/^data:[^;]+;base64,/, '')
    bytes = Buffer.from(raw, 'base64')
  } catch {
    res.status(400).json({ message: 'Invalid audio encoding.', code: 'chat_asr_invalid' })
    return
  }
  if (!bytes.length || bytes.length > 6_000_000) {
    res.status(400).json({ message: 'Audio too large (max 6 MB).', code: 'chat_asr_too_large' })
    return
  }

  const form = new FormData()
  const blob = new Blob([new Uint8Array(bytes)], {
    type: parsed.data.mime || 'audio/wav',
  })
  form.append('file', blob, parsed.data.filename || 'speech.wav')

  const url = `${toolsBase()}/asr`
  try {
    const upstream = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.openaiApiKey}`,
      },
      body: form,
    })
    const text = await upstream.text()
    if (!upstream.ok) {
      console.warn('[deepseek-chat] asr failed', upstream.status, text.slice(0, 240))
      res.status(upstream.status === 429 ? 429 : 502).json({
        message: 'Chat ASR failed.',
        detail: text.slice(0, 200),
      })
      return
    }
    let data: { text?: string; duration_ms?: number; request_id?: string }
    try {
      data = JSON.parse(text) as typeof data
    } catch {
      res.status(502).json({ message: 'Chat ASR returned invalid JSON.' })
      return
    }
    const transcript = String(data.text || '').trim()
    if (!transcript) {
      res.status(502).json({ message: 'Empty transcript.' })
      return
    }
    res.json({
      ok: true,
      text: transcript,
      durationMs: Number(data.duration_ms) || undefined,
      requestId: data.request_id,
    })
  } catch (err) {
    console.warn('[deepseek-chat] asr error', err instanceof Error ? err.message : err)
    res.status(502).json({ message: 'Chat ASR failed.' })
  }
}

/** Pure helpers for streaming TTS sentence chunking (client + smoke). */
export function splitSpeakableChunks(buffer: string): { ready: string[]; rest: string } {
  const ready: string[] = []
  let rest = buffer
  // Flush on sentence enders or double newlines once we have enough text.
  // Latin sentences need a trailing space (stream mid-word safe).
  // CJK 。！？ end the clause immediately — no space required.
  const re = /[\s\S]*?(?:[.!?…]["')\]]*\s+|[。！？]["')\]]*|\n{2,})/g
  let match: RegExpExecArray | null
  let lastIndex = 0
  while ((match = re.exec(rest)) != null) {
    const chunk = match[0].trim()
    if (!chunk) break
    if (chunk.length >= 8 || /[.!?。！？…]/.test(chunk)) {
      ready.push(chunk)
      lastIndex = match.index + match[0].length
    } else {
      break
    }
  }
  rest = rest.slice(lastIndex)
  return { ready, rest }
}
