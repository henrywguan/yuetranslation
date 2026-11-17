/**
 * Standalone DeepSeek OCR for #/chat (`POST /v1/tools/ocr`).
 * One-shot recognition — file is not stored in the Files API.
 */
import type { Response } from 'express'
import { z } from 'zod'
import type { AuthedRequest } from './auth.js'
import { requireAuth } from './auth.js'
import { canUseDeepseekChat } from './deepseekChat.js'
import { env, openaiConfigured } from './env.js'
import { resolveEntitlement } from './entitlements.js'
import { allowUserRateOrReject } from './guestRateLimit.js'

const MAX_BYTES = 6_000_000

const BodySchema = z.object({
  filename: z.string().trim().min(1).max(200),
  mime: z.string().trim().max(120).optional(),
  dataBase64: z.string().min(1).max(10_000_000),
  purpose: z.enum(['text_recognition', 'rich_layout_recognition']).optional().default('text_recognition'),
})

function toolsBase(openaiBaseUrl = env.openaiBaseUrl): string {
  const trimmed = openaiBaseUrl.trim().replace(/\/+$/, '')
  const withoutV1 = trimmed.replace(/\/v1$/i, '')
  return `${withoutV1 || 'https://api.deepseek.com'}/v1/tools`
}

/** Join OCR pages into a chat-friendly plain text block. */
export function formatOcrPages(
  pages: Array<{ index?: number; text?: string; finish_reason?: string }>,
): string {
  const parts: string[] = []
  for (const page of pages) {
    const text = String(page.text || '').trim()
    if (!text) continue
    const n = Number.isFinite(page.index) ? Number(page.index) + 1 : parts.length + 1
    parts.push(`— Page ${n} —\n${text}`)
  }
  return parts.join('\n\n').trim()
}

/** POST /api/chat/ocr — one-shot OCR → text for composer prefill. */
export async function postDeepseekChatOcr(req: AuthedRequest, res: Response) {
  const auth = requireAuth(req, res)
  if (!auth) return

  if (!allowUserRateOrReject(res, auth.userId, 'deepseekChatOcr', Math.min(10, env.chatRlPerMin || 10))) {
    return
  }

  if (!openaiConfigured() || !env.openaiApiKey) {
    res.status(503).json({ message: 'Chat model is not configured.' })
    return
  }

  const entitlement = await resolveEntitlement(auth)
  if (entitlement.disabled) {
    res.status(403).json({ message: 'Account disabled.', code: 'account_disabled' })
    return
  }
  if (!canUseDeepseekChat(entitlement.plan, entitlement.isAdmin)) {
    res.status(403).json({
      message: 'DeepSeek Chat is included with Family and Business.',
      code: 'chat_plan_required',
      upgradeUrl: entitlement.upgradeUrl,
    })
    return
  }

  const parsed = BodySchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ message: 'Invalid OCR payload.', code: 'chat_ocr_invalid' })
    return
  }

  let bytes: Buffer
  try {
    const raw = parsed.data.dataBase64.replace(/^data:[^;]+;base64,/, '')
    bytes = Buffer.from(raw, 'base64')
  } catch {
    res.status(400).json({ message: 'Invalid file encoding.', code: 'chat_ocr_invalid' })
    return
  }
  if (!bytes.length || bytes.length > MAX_BYTES) {
    res.status(400).json({
      message: `File too large (max ${Math.floor(MAX_BYTES / 1_000_000)} MB).`,
      code: 'chat_ocr_too_large',
    })
    return
  }

  const form = new FormData()
  form.append('purpose', parsed.data.purpose)
  const blob = new Blob([new Uint8Array(bytes)], {
    type: parsed.data.mime || 'application/octet-stream',
  })
  form.append('file', blob, parsed.data.filename)

  const url = `${toolsBase()}/ocr`
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
      console.warn('[deepseek-chat] ocr failed', upstream.status, text.slice(0, 300))
      res.status(upstream.status === 429 ? 429 : 502).json({
        message: 'OCR failed.',
        detail: text.slice(0, 200),
      })
      return
    }
    let data: {
      id?: string
      purpose?: string
      page_count?: number
      pages?: Array<{ index?: number; text?: string; finish_reason?: string }>
    }
    try {
      data = JSON.parse(text) as typeof data
    } catch {
      res.status(502).json({ message: 'OCR returned invalid JSON.' })
      return
    }
    const pages = Array.isArray(data.pages) ? data.pages : []
    const combined = formatOcrPages(pages)
    if (!combined) {
      res.status(502).json({ message: 'OCR returned no text.' })
      return
    }
    res.json({
      ok: true,
      id: data.id,
      purpose: data.purpose || parsed.data.purpose,
      pageCount: Number(data.page_count) || pages.length,
      text: combined.slice(0, 12_000),
      pages: pages.slice(0, 40).map((p) => ({
        index: Number(p.index) || 0,
        text: String(p.text || '').slice(0, 8_000),
        finishReason: p.finish_reason,
      })),
    })
  } catch (err) {
    console.warn('[deepseek-chat] ocr error', err instanceof Error ? err.message : err)
    res.status(502).json({ message: 'OCR failed.' })
  }
}
