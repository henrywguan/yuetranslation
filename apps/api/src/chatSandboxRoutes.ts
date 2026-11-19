/**
 * Chat Inbox sandbox REST — Family/Business (same gate as DeepSeek chat).
 */
import type { Response } from 'express'
import type { AuthedRequest } from './auth.js'
import { canUseDeepseekChat } from './deepseekChat.js'
import { env } from './env.js'
import { resolveEntitlement } from './entitlements.js'
import { allowUserRateOrReject } from './guestRateLimit.js'
import {
  createSandboxSession,
  describeSandboxes,
  destroySandbox,
  execSandbox,
  listSandboxFs,
  publicSessionView,
  readSandboxFs,
  requireUserSession,
  sandboxDriverInfo,
  writeSandboxFs,
} from './chatSandboxService.js'
import { getSandboxSession } from './chatSandbox.js'

async function gateChatSandbox(req: AuthedRequest, res: Response): Promise<{ userId: string } | null> {
  const auth = req.auth
  if (!auth?.userId) {
    res.status(401).json({ message: 'Sign in required.', code: 'auth_required' })
    return null
  }
  if (!allowUserRateOrReject(res, auth.userId, 'chatSandbox', env.chatRlPerMin)) return null
  const entitlement = await resolveEntitlement(auth)
  if (entitlement.disabled) {
    res.status(403).json({ message: 'Account disabled.', code: 'account_disabled' })
    return null
  }
  if (!canUseDeepseekChat(entitlement.plan, entitlement.isAdmin)) {
    res.status(403).json({
      message: 'Internal sandboxes require Family or Business.',
      code: 'chat_plan_required',
      upgradeUrl: entitlement.upgradeUrl,
    })
    return null
  }
  return { userId: auth.userId }
}

/** GET /api/chat/sandbox — list sessions + driver info */
export async function getChatSandboxes(req: AuthedRequest, res: Response) {
  const gate = await gateChatSandbox(req, res)
  if (!gate) return
  res.json({
    ok: true,
    ...sandboxDriverInfo(),
    sessions: describeSandboxes(gate.userId),
  })
}

/** POST /api/chat/sandbox — create session */
export async function postChatSandbox(req: AuthedRequest, res: Response) {
  const gate = await gateChatSandbox(req, res)
  if (!gate) return
  const body = (req.body || {}) as {
    title?: string
    projectId?: string
    driver?: string
  }
  try {
    const { session, fallbackFromFly } = await createSandboxSession({
      userId: gate.userId,
      title: typeof body.title === 'string' ? body.title : undefined,
      projectId: typeof body.projectId === 'string' ? body.projectId : undefined,
      driver: typeof body.driver === 'string' ? body.driver : undefined,
    })
    res.status(201).json({
      ok: true,
      session: publicSessionView(session),
      fallbackFromFly: Boolean(fallbackFromFly),
      note: fallbackFromFly
        ? 'Fly not configured — using in-process stub. Set FLY_API_TOKEN + FLY_APP for real Machines.'
        : undefined,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Sandbox create failed'
    res.status(502).json({ message, code: 'sandbox_create_failed' })
  }
}

/** GET /api/chat/sandbox/:id */
export async function getChatSandbox(req: AuthedRequest, res: Response) {
  const gate = await gateChatSandbox(req, res)
  if (!gate) return
  const id = String(req.params.id || '')
  const session = getSandboxSession(id, gate.userId)
  if (!session) {
    res.status(404).json({ message: 'Sandbox not found.', code: 'sandbox_not_found' })
    return
  }
  res.json({ ok: true, session: publicSessionView(session) })
}

/** DELETE /api/chat/sandbox/:id */
export async function deleteChatSandbox(req: AuthedRequest, res: Response) {
  const gate = await gateChatSandbox(req, res)
  if (!gate) return
  const id = String(req.params.id || '')
  const session = getSandboxSession(id, gate.userId)
  if (!session) {
    res.status(404).json({ message: 'Sandbox not found.', code: 'sandbox_not_found' })
    return
  }
  await destroySandbox(session)
  res.json({ ok: true })
}

/** POST /api/chat/sandbox/:id/exec */
export async function postChatSandboxExec(req: AuthedRequest, res: Response) {
  const gate = await gateChatSandbox(req, res)
  if (!gate) return
  try {
    const session = requireUserSession(String(req.params.id || ''), gate.userId)
    const argv = Array.isArray(req.body?.argv)
      ? (req.body.argv as unknown[]).map((a) => String(a)).slice(0, 32)
      : []
    if (!argv.length) {
      res.status(400).json({ message: 'argv required', code: 'invalid_argv' })
      return
    }
    const result = await execSandbox(session, argv)
    res.json({ ok: true, result })
  } catch (err) {
    const status = (err as { status?: number }).status || 500
    res.status(status).json({
      message: err instanceof Error ? err.message : 'Exec failed',
      code: 'sandbox_exec_failed',
    })
  }
}

/** POST /api/chat/sandbox/:id/fs/list */
export async function postChatSandboxFsList(req: AuthedRequest, res: Response) {
  const gate = await gateChatSandbox(req, res)
  if (!gate) return
  try {
    const session = requireUserSession(String(req.params.id || ''), gate.userId)
    const path = typeof req.body?.path === 'string' ? req.body.path : '.'
    const entries = await listSandboxFs(session, path)
    res.json({ ok: true, entries })
  } catch (err) {
    const status = (err as { status?: number }).status || 500
    res.status(status).json({
      message: err instanceof Error ? err.message : 'List failed',
      code: 'sandbox_fs_failed',
    })
  }
}

/** POST /api/chat/sandbox/:id/fs/read */
export async function postChatSandboxFsRead(req: AuthedRequest, res: Response) {
  const gate = await gateChatSandbox(req, res)
  if (!gate) return
  try {
    const session = requireUserSession(String(req.params.id || ''), gate.userId)
    const path = String(req.body?.path || '')
    if (!path) {
      res.status(400).json({ message: 'path required', code: 'invalid_path' })
      return
    }
    const text = await readSandboxFs(session, path)
    res.json({ ok: true, path, text })
  } catch (err) {
    const status = (err as { status?: number }).status || 500
    res.status(status).json({
      message: err instanceof Error ? err.message : 'Read failed',
      code: 'sandbox_fs_failed',
    })
  }
}

/** POST /api/chat/sandbox/:id/fs/write */
export async function postChatSandboxFsWrite(req: AuthedRequest, res: Response) {
  const gate = await gateChatSandbox(req, res)
  if (!gate) return
  try {
    const session = requireUserSession(String(req.params.id || ''), gate.userId)
    const path = String(req.body?.path || '')
    const text = typeof req.body?.text === 'string' ? req.body.text : ''
    if (!path) {
      res.status(400).json({ message: 'path required', code: 'invalid_path' })
      return
    }
    const written = await writeSandboxFs(session, path, text)
    res.json({ ok: true, ...written })
  } catch (err) {
    const status = (err as { status?: number }).status || 500
    res.status(status).json({
      message: err instanceof Error ? err.message : 'Write failed',
      code: 'sandbox_fs_failed',
    })
  }
}
