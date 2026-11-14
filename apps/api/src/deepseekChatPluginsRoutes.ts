/**
 * Chat plugins catalog + BYOK keys + hosted generated-image bytes.
 */
import type { Response } from 'express'
import type { AuthedRequest } from './auth.js'
import { requireAuth } from './auth.js'
import { canUseDeepseekChat } from './deepseekChat.js'
import { getGeneratedChatImage } from './deepseekChatImage.js'
import { listChatPlugins, listMcpServerTools } from './deepseekChatMcp.js'
import {
  credentialsToHints,
  loadChatPluginCredentials,
  parseChatPluginCredentialsBody,
  saveChatPluginCredentials,
} from './deepseekChatPluginKeys.js'
import { resolveEntitlement } from './entitlements.js'
import { allowUserRateOrReject } from './guestRateLimit.js'

/** GET /api/chat/plugins — marketplace catalog for #/chat. */
export async function getDeepseekChatPlugins(req: AuthedRequest, res: Response) {
  const auth = await requireAuth(req, res)
  if (!auth) return
  const entitlement = await resolveEntitlement(auth)
  if (!canUseDeepseekChat(entitlement.plan, entitlement.isAdmin)) {
    res.status(403).json({ message: 'DeepSeek Chat requires Family or Business.' })
    return
  }

  const creds = await loadChatPluginCredentials(auth.userId)
  const plugins = listChatPlugins(creds)
  const enriched = []
  for (const p of plugins) {
    if (p.kind === 'mcp' && p.configured) {
      const serverId = p.id.replace(/^mcp:/, '')
      try {
        const tools = await listMcpServerTools(serverId, undefined, creds)
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
  res.json({
    ok: true,
    plugins: enriched,
    keyHints: credentialsToHints(creds),
  })
}

/**
 * GET /api/chat/plugin-keys — masked hints only (never raw secrets).
 */
export async function getDeepseekChatPluginKeys(req: AuthedRequest, res: Response) {
  const auth = await requireAuth(req, res)
  if (!auth) return
  const entitlement = await resolveEntitlement(auth)
  if (!canUseDeepseekChat(entitlement.plan, entitlement.isAdmin)) {
    res.status(403).json({ message: 'DeepSeek Chat requires Family or Business.' })
    return
  }
  const creds = await loadChatPluginCredentials(auth.userId)
  res.json({ ok: true, keys: credentialsToHints(creds) })
}

/**
 * PUT /api/chat/plugin-keys — save / clear BYOK secrets.
 * Body: { keys?: { image?, higgsfield?, adobe?, cursor? }, clear?: string[] }
 */
export async function putDeepseekChatPluginKeys(req: AuthedRequest, res: Response) {
  const auth = await requireAuth(req, res)
  if (!auth) return
  const entitlement = await resolveEntitlement(auth)
  if (!canUseDeepseekChat(entitlement.plan, entitlement.isAdmin)) {
    res.status(403).json({ message: 'DeepSeek Chat requires Family or Business.' })
    return
  }
  if (!allowUserRateOrReject(res, auth.userId, 'chatPluginKeys', 30)) return

  const parsed = parseChatPluginCredentialsBody(req.body)
  if (!parsed.ok) {
    res.status(400).json({ message: parsed.message })
    return
  }

  const saved = await saveChatPluginCredentials(auth.userId, parsed.creds, parsed.clear)
  res.json({ ok: true, keys: credentialsToHints(saved) })
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
