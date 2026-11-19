/**
 * Facade: create / exec / fs against the configured driver (stub default, fly when asked + configured).
 */
import {
  flyConfigured,
  getSandboxSession,
  listSandboxSessions,
  publicSessionView,
  resolveSandboxDriver,
  type SandboxDriver,
  type SandboxExecResult,
  type SandboxFileEntry,
  type SandboxSession,
} from './chatSandbox.js'
import { createFlySandbox, destroyFlySandbox, flyExec, FlySandboxNotConfiguredError } from './chatSandboxFly.js'
import {
  createStubSandbox,
  destroyStubSandbox,
  stubExec,
  stubList,
  stubRead,
  stubWrite,
} from './chatSandboxStub.js'
import {
  loadChatPluginCredentials,
  type ChatPluginCredentials,
} from './deepseekChatPluginKeys.js'

export async function createSandboxSession(opts: {
  userId: string
  title?: string
  projectId?: string
  driver?: string
  creds?: ChatPluginCredentials | null
}): Promise<{ session: SandboxSession; fallbackFromFly?: boolean }> {
  const creds = opts.creds ?? (await loadChatPluginCredentials(opts.userId))
  const requested = resolveSandboxDriver(opts.driver)
  if (requested === 'fly') {
    if (!flyConfigured(creds)) {
      const session = await createStubSandbox({
        userId: opts.userId,
        title: opts.title || 'Internal sandbox (stub — Fly not configured)',
        projectId: opts.projectId,
      })
      return { session, fallbackFromFly: true }
    }
    try {
      const session = await createFlySandbox({ ...opts, creds })
      return { session }
    } catch (err) {
      if (err instanceof FlySandboxNotConfiguredError) {
        const session = await createStubSandbox({
          userId: opts.userId,
          title: opts.title || 'Internal sandbox (stub)',
          projectId: opts.projectId,
        })
        return { session, fallbackFromFly: true }
      }
      throw err
    }
  }
  const session = await createStubSandbox(opts)
  return { session }
}

export function requireUserSession(id: string, userId: string): SandboxSession {
  const s = getSandboxSession(id, userId)
  if (!s) throw Object.assign(new Error('Sandbox not found.'), { status: 404 })
  if (s.status !== 'ready' && s.status !== 'starting') {
    throw Object.assign(new Error(`Sandbox not ready (${s.status}).`), { status: 409 })
  }
  return s
}

export async function execSandbox(
  session: SandboxSession,
  argv: string[],
): Promise<SandboxExecResult> {
  if (session.driver === 'fly') return flyExec(session, argv)
  return stubExec(session, argv)
}

export async function listSandboxFs(
  session: SandboxSession,
  rel?: string,
): Promise<SandboxFileEntry[]> {
  if (session.driver === 'fly') {
    // Fly FS bridge lands with durable volume — for now list via `find`.
    const result = await flyExec(session, ['find', rel || '.', '-maxdepth', '3', '-printf', '%y %p\\n'])
    if (!result.ok) throw new Error(result.stderr || 'Fly list failed')
    return result.stdout
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const kind = line.startsWith('d ') ? 'dir' : 'file'
        const p = line.replace(/^[fd] /, '').replace(/^\.\//, '')
        return { path: p || '.', kind: kind as 'file' | 'dir' }
      })
  }
  return stubList(session, rel)
}

export async function readSandboxFs(session: SandboxSession, rel: string): Promise<string> {
  if (session.driver === 'fly') {
    const result = await flyExec(session, ['cat', rel])
    if (!result.ok) throw new Error(result.stderr || 'Fly read failed')
    return result.stdout
  }
  return stubRead(session, rel)
}

export async function writeSandboxFs(
  session: SandboxSession,
  rel: string,
  text: string,
): Promise<{ path: string; bytes: number }> {
  if (session.driver === 'fly') {
    // Pipe via printf is unsafe for large bodies — use base64 in a short argv budget.
    const b64 = Buffer.from(String(text ?? ''), 'utf8').toString('base64')
    if (b64.length > 60_000) throw new Error('File too large for Fly write bridge.')
    const result = await flyExec(session, [
      'bash',
      '-lc',
      `mkdir -p "$(dirname -- ${JSON.stringify(rel)})" && echo ${JSON.stringify(b64)} | base64 -d > ${JSON.stringify(rel)}`,
    ])
    // bash not in stub allowlist — fly only
    if (!result.ok) throw new Error(result.stderr || 'Fly write failed')
    return { path: rel, bytes: Buffer.byteLength(String(text ?? ''), 'utf8') }
  }
  return stubWrite(session, rel, text)
}

export async function destroySandbox(session: SandboxSession): Promise<void> {
  if (session.driver === 'fly') await destroyFlySandbox(session)
  else await destroyStubSandbox(session)
}

export async function describeSandboxes(userId: string) {
  const creds = await loadChatPluginCredentials(userId)
  return listSandboxSessions(userId).map((s) => publicSessionView(s, creds))
}

export async function sandboxDriverInfo(userId?: string) {
  const creds = userId ? await loadChatPluginCredentials(userId) : null
  return {
    defaultDriver: resolveSandboxDriver(),
    flyConfigured: flyConfigured(creds),
    drivers: ['stub', 'fly'] as SandboxDriver[],
  }
}

export { publicSessionView, FlySandboxNotConfiguredError }
