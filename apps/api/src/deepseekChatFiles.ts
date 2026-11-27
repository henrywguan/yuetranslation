/**
 * Proxy DeepSeek Files API for #/chat attachments (PDF / Office / images).
 * Keeps the API key server-side; client only receives file-api-* ids.
 */
import type { Response } from 'express'
import { z } from 'zod'
import type { AuthedRequest } from './auth.js'
import { allowChatCallerRate, resolveChatCaller } from './chatGateUnlock.js'
import { env, openaiConfigured } from './env.js'
import type { GuestRequest } from './guest.js'

const MAX_BYTES = 6_000_000

const BodySchema = z.object({
  filename: z.string().trim().min(1).max(200),
  mime: z.string().trim().max(120).optional(),
  dataBase64: z.string().min(1).max(10_000_000),
  purpose: z
    .enum(['text_recognition', 'rich_layout_recognition', 'user_data'])
    .optional()
    .default('text_recognition'),
})

function filesApiBase(openaiBaseUrl = env.openaiBaseUrl): string {
  const trimmed = openaiBaseUrl.trim().replace(/\/+$/, '')
  const withoutV1 = trimmed.replace(/\/v1$/i, '')
  return withoutV1 || 'https://api.deepseek.com'
}

/** POST /api/chat/files — upload+parse a document for chat context. */
export async function postDeepseekChatFile(req: AuthedRequest, res: Response) {
  const caller = await resolveChatCaller(req as GuestRequest, res)
  if (!caller) return

  if (!allowChatCallerRate(res, caller, 'deepseekChatFile', Math.min(10, env.chatRlPerMin || 10))) {
    return
  }

  if (!openaiConfigured() || !env.openaiApiKey) {
    res.status(503).json({ message: 'Chat model is not configured.' })
    return
  }

  const parsed = BodySchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ message: 'Invalid chat file payload.', code: 'chat_file_invalid' })
    return
  }

  let bytes: Buffer
  try {
    const raw = parsed.data.dataBase64.replace(/^data:[^;]+;base64,/, '')
    bytes = Buffer.from(raw, 'base64')
  } catch {
    res.status(400).json({ message: 'Invalid file encoding.', code: 'chat_file_invalid' })
    return
  }
  if (!bytes.length || bytes.length > MAX_BYTES) {
    res.status(400).json({
      message: `File too large (max ${Math.floor(MAX_BYTES / 1_000_000)} MB).`,
      code: 'chat_file_too_large',
    })
    return
  }

  const form = new FormData()
  form.append('purpose', parsed.data.purpose)
  const blob = new Blob([new Uint8Array(bytes)], {
    type: parsed.data.mime || 'application/octet-stream',
  })
  form.append('file', blob, parsed.data.filename)

  const url = `${filesApiBase()}/files`
  try {
    const resUp = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.openaiApiKey}`,
      },
      body: form,
    })
    const text = await resUp.text()
    if (!resUp.ok) {
      console.warn('[deepseek-chat] files upload failed', resUp.status, text.slice(0, 300))
      res.status(502).json({ message: 'File upload failed.', detail: text.slice(0, 200) })
      return
    }
    let data: { id?: string; filename?: string }
    try {
      data = JSON.parse(text) as { id?: string; filename?: string }
    } catch {
      res.status(502).json({ message: 'File upload returned invalid JSON.' })
      return
    }
    const fileId = String(data.id || '')
    if (!/^file-api-/.test(fileId)) {
      res.status(502).json({ message: 'File upload missing file id.' })
      return
    }
    res.json({
      ok: true,
      fileId,
      filename: data.filename || parsed.data.filename,
    })
  } catch (err) {
    console.warn('[deepseek-chat] files upload error', err instanceof Error ? err.message : err)
    res.status(502).json({ message: 'File upload failed.' })
  }
}
