/**
 * Family/Business DeepSeek general chat — POST /api/chat
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
import { env, openaiConfigured } from './env.js'
import { resolveEntitlement } from './entitlements.js'
import { allowUserRateOrReject } from './guestRateLimit.js'

function wantsStream(req: AuthedRequest): boolean {
  const q = String(req.query.stream || '').trim().toLowerCase()
  if (q === '1' || q === 'true') return true
  const accept = String(req.headers.accept || '')
  return /text\/event-stream/i.test(accept)
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

  try {
    if (!stream) {
      const { reply, model } = await generateDeepseekChatReply(parsed.data.messages)
      void addDeepseekChatTurns(auth.userId, 1)
      res.json({ ok: true, reply, model })
      return
    }

    res.status(200)
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders?.()

    let full = ''
    for await (const delta of streamDeepseekChatReply(parsed.data.messages)) {
      full += delta
      res.write(`data: ${JSON.stringify({ delta })}\n\n`)
    }
    if (!full.trim()) {
      res.write(`data: ${JSON.stringify({ error: 'Empty model reply.' })}\n\n`)
      res.write('data: [DONE]\n\n')
      res.end()
      return
    }
    void addDeepseekChatTurns(auth.userId, 1)
    res.write(`data: ${JSON.stringify({ done: true, model: env.openaiModel })}\n\n`)
    res.write('data: [DONE]\n\n')
    res.end()
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Chat failed.'
    if (stream && res.headersSent) {
      res.write(`data: ${JSON.stringify({ error: message })}\n\n`)
      res.write('data: [DONE]\n\n')
      res.end()
      return
    }
    res.status(502).json({ message })
  }
}
