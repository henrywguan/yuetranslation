/**
 * Fly Machines sandbox driver (Phase C).
 *
 * Real Machines need Henry secrets/billing:
 *   FLY_API_TOKEN, FLY_APP (optional FLY_REGION, FLY_IMAGE)
 *
 * Until configured, createFlySandbox returns a clear NEEDS_HUMAN error and callers
 * should fall back to the stub driver.
 */
import {
  flyConfigured,
  newSandboxId,
  putSession,
  touchSession,
  type SandboxExecResult,
  type SandboxSession,
} from './chatSandbox.js'
import { env } from './env.js'

export class FlySandboxNotConfiguredError extends Error {
  readonly code = 'fly_not_configured'
  readonly fixability = 'NEEDS_HUMAN' as const
  constructor() {
    super(
      'Fly sandbox not configured. Set FLY_API_TOKEN + FLY_APP (and billing on the Fly org). Until then the API uses the in-process stub driver.',
    )
    this.name = 'FlySandboxNotConfiguredError'
  }
}

async function flyFetch(pathname: string, init?: RequestInit): Promise<Response> {
  if (!flyConfigured()) throw new FlySandboxNotConfiguredError()
  const url = `https://api.machines.dev/v1/apps/${encodeURIComponent(env.flyApp)}${pathname}`
  return fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${env.flyApiToken}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  })
}

/**
 * Attempt to create a Fly Machine. Throws FlySandboxNotConfiguredError when secrets missing.
 * On API failure, marks session error and rethrows.
 */
export async function createFlySandbox(opts: {
  userId: string
  title?: string
  projectId?: string
}): Promise<SandboxSession> {
  if (!flyConfigured()) throw new FlySandboxNotConfiguredError()

  const now = Date.now()
  const session: SandboxSession = {
    id: newSandboxId(),
    userId: opts.userId,
    driver: 'fly',
    status: 'starting',
    title: (opts.title || 'Fly sandbox').trim() || 'Fly sandbox',
    projectId: opts.projectId,
    createdAt: now,
    lastUsedAt: now,
  }
  putSession(session)

  const image = env.flyImage || 'node:22-bookworm-slim'
  const region = env.flyRegion || undefined
  const body = {
    name: session.id,
    region,
    config: {
      image,
      auto_destroy: true,
      guest: { cpu_kind: 'shared', cpus: 1, memory_mb: 1024 },
      // Guest has no host secrets; only the API talks to Machines.
      env: {
        YUE_SANDBOX: '1',
        YUE_SANDBOX_ID: session.id,
      },
      services: [],
    },
  }

  try {
    const res = await flyFetch('/machines', { method: 'POST', body: JSON.stringify(body) })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Fly Machines create failed (${res.status}): ${text.slice(0, 400)}`)
    }
    const json = (await res.json()) as { id?: string }
    if (!json.id) throw new Error('Fly Machines create returned no machine id.')
    session.flyMachineId = json.id
    session.status = 'ready'
    touchSession(session)
    return session
  } catch (err) {
    session.status = 'error'
    session.error = err instanceof Error ? err.message : 'Fly create failed'
    touchSession(session)
    throw err
  }
}

export async function flyExec(
  session: SandboxSession,
  argv: string[],
): Promise<SandboxExecResult> {
  if (!session.flyMachineId) {
    return {
      ok: false,
      code: 1,
      stdout: '',
      stderr: 'Fly machine id missing.',
      argv,
      cwd: '/workspace',
      driver: 'fly',
    }
  }
  // Exec API — Machines exec endpoint. Keep payload bounded.
  const res = await flyFetch(`/machines/${encodeURIComponent(session.flyMachineId)}/exec`, {
    method: 'POST',
    body: JSON.stringify({
      cmd: argv,
      timeout: 15,
    }),
  })
  const text = await res.text()
  let parsed: { exit_code?: number; stdout?: string; stderr?: string } = {}
  try {
    parsed = JSON.parse(text) as typeof parsed
  } catch {
    parsed = { stderr: text.slice(0, 4000) }
  }
  touchSession(session)
  const code = typeof parsed.exit_code === 'number' ? parsed.exit_code : res.ok ? 0 : 1
  return {
    ok: res.ok && code === 0,
    code,
    stdout: String(parsed.stdout || '').slice(0, 32_000),
    stderr: String(parsed.stderr || (!res.ok ? text.slice(0, 2000) : '')).slice(0, 32_000),
    argv,
    cwd: '/workspace',
    driver: 'fly',
  }
}

export async function destroyFlySandbox(session: SandboxSession): Promise<void> {
  if (session.flyMachineId && flyConfigured()) {
    try {
      await flyFetch(`/machines/${encodeURIComponent(session.flyMachineId)}`, {
        method: 'DELETE',
      })
    } catch {
      /* ignore */
    }
  }
  session.status = 'destroyed'
  session.flyMachineId = undefined
  touchSession(session)
}
