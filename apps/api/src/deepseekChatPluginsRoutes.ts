/**
 * Chat plugins catalog + hosted generated-image bytes.
 */
import type { Response } from 'express'
import type { AuthedRequest } from './auth.js'
import { requireAuth } from './auth.js'
import { canUseDeepseekChat } from './deepseekChat.js'
import { getGeneratedChatImage } from './deepseekChatImage.js'
import { listChatPlugins, listMcpServerTools } from './deepseekChatMcp.js'
import { resolveEntitlement } from './entitlements.js'

/** GET /api/chat/plugins — marketplace catalog for #/chat. */
export async function getDeepseekChatPlugins(req: AuthedRequest, res: Response) {
  const auth = await requireAuth(req, res)
  if (!auth) return
  const entitlement = await resolveEntitlement(auth)
  if (!canUseDeepseekChat(entitlement.plan, entitlement.isAdmin)) {
    res.status(403).json({ message: 'DeepSeek Chat requires Family or Business.' })
    return
  }

  const plugins = listChatPlugins()
  const enriched = []
  for (const p of plugins) {
    if (p.kind === 'mcp' && p.configured) {
      const serverId = p.id.replace(/^mcp:/, '')
      try {
        const tools = await listMcpServerTools(serverId)
        enriched.push({ ...p, toolCount: tools.length, tools: tools.map((t) => t.name) })
      } catch (err) {
        enriched.push({
          ...p,
          toolCount: 0,
          error: err instanceof Error ? err.message : 'tools/list failed',
        })
      }
    } else {
      enriched.push(p)
    }
  }
  res.json({ ok: true, plugins: enriched })
}

/**
 * GET /api/chat/generated-images/:id — short-lived hosted image bytes.
 * Public by design: `<img>` cannot send Bearer auth; IDs are UUIDs with 24h TTL.
 */
export async function getDeepseekChatGeneratedImage(req: AuthedRequest, res: Response) {
  const id = String(req.params.id || '').trim()
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    res.status(400).json({ message: 'Invalid image id.' })
    return
  }
  const row = getGeneratedChatImage(id)
  if (!row?.bytes) {
    res.status(404).json({ message: 'Image not found or expired.' })
    return
  }
  res.setHeader('Content-Type', row.mime || 'image/png')
  res.setHeader('Cache-Control', 'private, max-age=3600')
  res.send(row.bytes)
}
