/**
 * Family/Business DeepSeek general chat — POST /api/chat
 *
 * DeepThink + Search streams often exceed 60s. vercel.json sets api maxDuration
 * to 300s; this route also emits SSE heartbeats so HTTP/1.1 proxies do not idle-close
 * while waiting on the first reasoning/search token.
 */
import type { Response } from 'express'
import type { AuthedRequest } from './auth.js'
import { requireAuth } from './auth.js'
import {
  addDeepseekChatTurns,
  canUseDeepseekChat,
  DeepseekChatBodySchema,
  deepseekChatTurnLimit,
  generateDeepseekChatReply,
  getDeepseekChatTurns,
  streamDeepseekChatReply,
} from './deepseekChat.js'
import {
  deepseekChatSupportsSearch,
  streamDeepseekChatWithSearch,
  type DeepseekChatSearchStreamEvent,
} from './deepseekChatSearch.js'
import { env, openaiConfigured } from './env.js'
import { resolveEntitlement } from './entitlements.js'
import { allowUserRateOrReject } from './guestRateLimit.js'

/** SSE comment cadence — keeps the function response active during long DeepSeek thinks. */
export const DEEPSEEK_CHAT_SSE_HEARTBEAT_MS = 12_000

function wantsStream(req: AuthedRequest): boolean {
  const q = String(req.query.stream || '').trim().toLowerCase()
  if (q === '1' || q === 'true') return true
  const accept = String(req.headers.accept || '')
  return /text\/event-stream/i.test(accept)
}

function writeSse(res: Response, payload: string) {
  if (res.writableEnded) return
  res.write(payload)
  // Express compression / some hosts buffer until flush.
  const flushable = res as Response & { flush?: () => void }
  flushable.flush?.()
}

async function* chatStreamEvents(
  messages: Parameters<typeof streamDeepseekChatReply>[0],
  thinkingEnabled: boolean,
  searchEnabled: boolean,
  signal?: AbortSignal,
): AsyncGenerator<DeepseekChatSearchStreamEvent, void, unknown> {
  if (searchEnabled && deepseekChatSupportsSearch()) {
    try {
      yield* streamDeepseekChatWithSearch(messages, thinkingEnabled, signal)
      return
    } catch (err) {
      if (signal?.aborted) throw err
      console.warn(
        '[deepseek-chat] Anthropic search stream failed, falling back to Chat Completions:',
        err instanceof Error ? err.message : err,
      )
      // Fall through to Chat Completions (no native search).
    }
  }
  yield* streamDeepseekChatReply(messages, thinkingEnabled, signal)
}

/** POST /api/chat — signed-in Family/Business (or admin) general assistant. */
export async function postDeepseekChat(req: AuthedRequest, res: Response) {
  const auth = requireAuth(req, res)
  if (!auth) return

  if (!allowUserRateOrReject(res, auth.userId, 'deepseekChat', env.chatRlPerMin)) return

  if (!openaiConfigured()) {
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

  const parsed = DeepseekChatBodySchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ message: 'Invalid chat payload.' })
    return
  }

  const last = parsed.data.messages[parsed.data.messages.length - 1]
  if (!last || last.role !== 'user') {
    res.status(400).json({ message: 'Last message must be from the user.' })
    return
  }

  const turnLimit = deepseekChatTurnLimit(entitlement.plan, entitlement.isAdmin)
  if (turnLimit > 0 && !env.openMode) {
    const used = await getDeepseekChatTurns(auth.userId)
    if (used >= turnLimit) {
      res.status(402).json({
        message: 'Monthly DeepSeek Chat limit reached.',
        code: 'chat_quota_exhausted',
        used,
        limit: turnLimit,
        upgradeUrl: entitlement.upgradeUrl,
      })
      return
    }
  }

  const stream = wantsStream(req)
  const thinkingEnabled = parsed.data.thinking !== false
  const searchEnabled = parsed.data.search === true

  try {
    if (!stream) {
      // Non-stream path stays on Chat Completions (Search is stream-first).
      const { reply, model, reasoning } = await generateDeepseekChatReply(
        parsed.data.messages,
        thinkingEnabled,
      )
      void addDeepseekChatTurns(auth.userId, 1)
      res.json({ ok: true, reply, model, reasoning: reasoning || undefined })
      return
    }

    const upstream = new AbortController()
    const onClientClose = () => {
      if (!upstream.signal.aborted) upstream.abort()
    }
    req.on('close', onClientClose)
    res.on('close', onClientClose)

    res.status(200)
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')
    res.flushHeaders?.()

    // Immediate keepalive so the client sees the stream open before DeepSeek tokens.
    writeSse(res, `: open\n\n`)
    writeSse(res, `data: ${JSON.stringify({ status: 'started' })}\n\n`)

    const heartbeat = setInterval(() => {
      writeSse(res, `: ping ${Date.now()}\n\n`)
    }, DEEPSEEK_CHAT_SSE_HEARTBEAT_MS)
    if (typeof heartbeat.unref === 'function') heartbeat.unref()

    let full = ''
    try {
      for await (const event of chatStreamEvents(
        parsed.data.messages,
        thinkingEnabled,
        searchEnabled,
        upstream.signal,
      )) {
        if (upstream.signal.aborted || res.writableEnded) break
        if (event.kind === 'thinking') {
          writeSse(res, `data: ${JSON.stringify({ status: 'thinking' })}\n\n`)
          continue
        }
        if (event.kind === 'searching') {
          writeSse(res, `data: ${JSON.stringify({ status: 'searching' })}\n\n`)
          continue
        }
        if (event.kind === 'reasoning') {
          writeSse(res, `data: ${JSON.stringify({ reasoning: event.text })}\n\n`)
          continue
        }
        if (event.kind === 'sources') {
          writeSse(res, `data: ${JSON.stringify({ sources: event.sources })}\n\n`)
          continue
        }
        full += event.text
        writeSse(res, `data: ${JSON.stringify({ delta: event.text })}\n\n`)
      }

      if (upstream.signal.aborted || res.writableEnded) {
        return
      }

      if (!full.trim()) {
        writeSse(res, `data: ${JSON.stringify({ error: 'Empty model reply.' })}\n\n`)
        writeSse(res, 'data: [DONE]\n\n')
        res.end()
        return
      }
      void addDeepseekChatTurns(auth.userId, 1)
      writeSse(res, `data: ${JSON.stringify({ done: true, model: env.openaiModel })}\n\n`)
      writeSse(res, 'data: [DONE]\n\n')
      res.end()
    } finally {
      clearInterval(heartbeat)
      req.off('close', onClientClose)
      res.off('close', onClientClose)
    }
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') {
      if (!res.writableEnded) res.end()
      return
    }
    const message = err instanceof Error ? err.message : 'Chat failed.'
    if (stream && res.headersSent) {
      writeSse(res, `data: ${JSON.stringify({ error: message })}\n\n`)
      writeSse(res, 'data: [DONE]\n\n')
      res.end()
      return
    }
    res.status(502).json({ message })
  }
}
