/**
 * In-process stub sandbox: temp-dir FS + allowlisted spawn (no Fly billing).
 */
import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import {
  ensureStubRoot,
  newSandboxId,
  publicSessionView,
  putSession,
  resolveSandboxPath,
  SANDBOX_EXEC_TIMEOUT_MS,
  SANDBOX_MAX_FILES,
  SANDBOX_MAX_TEXT,
  SANDBOX_STUB_BINARIES,
  SANDBOX_STDOUT_CAP,
  touchSession,
  type SandboxExecResult,
  type SandboxFileEntry,
  type SandboxSession,
} from './chatSandbox.js'

export async function createStubSandbox(opts: {
  userId: string
  title?: string
  projectId?: string
}): Promise<SandboxSession> {
  const now = Date.now()
  const session: SandboxSession = {
    id: newSandboxId(),
    userId: opts.userId,
    driver: 'stub',
    status: 'starting',
    title: (opts.title || 'Internal sandbox').trim() || 'Internal sandbox',
    projectId: opts.projectId,
    createdAt: now,
    lastUsedAt: now,
  }
  putSession(session)
  try {
    const root = await ensureStubRoot(session)
    await fs.writeFile(
      path.join(root, 'README.md'),
      [
        '# JyutTranslate internal sandbox (stub)',
        '',
        'This session runs on the API host temp directory — not a Fly Machine.',
        'Set `YUE_SANDBOX_DRIVER=fly` + `FLY_API_TOKEN` + `FLY_APP` for real cloud VMs.',
        '',
      ].join('\n'),
      'utf8',
    )
    session.status = 'ready'
    touchSession(session)
    return session
  } catch (err) {
    session.status = 'error'
    session.error = err instanceof Error ? err.message : 'Failed to create stub sandbox'
    touchSession(session)
    throw err
  }
}

export async function stubList(
  session: SandboxSession,
  rel = '.',
): Promise<SandboxFileEntry[]> {
  const root = await ensureStubRoot(session)
  const abs = resolveSandboxPath(root, rel === '.' || !rel ? '.' : rel)
  if (!abs) throw new Error('Invalid path.')
  const out: SandboxFileEntry[] = []
  async function walk(dir: string, prefix: string) {
    if (out.length >= SANDBOX_MAX_FILES) return
    const entries = await fs.readdir(dir, { withFileTypes: true })
    for (const ent of entries) {
      if (out.length >= SANDBOX_MAX_FILES) break
      const childRel = prefix ? `${prefix}/${ent.name}` : ent.name
      const childAbs = path.join(dir, ent.name)
      if (ent.isDirectory()) {
        out.push({ path: childRel, kind: 'dir' })
        await walk(childAbs, childRel)
      } else if (ent.isFile()) {
        const st = await fs.stat(childAbs)
        out.push({ path: childRel, kind: 'file', bytes: st.size })
      }
    }
  }
  const st = await fs.stat(abs)
  if (st.isFile()) {
    const relPath = path.relative(root, abs).replace(/\\/g, '/')
    return [{ path: relPath || path.basename(abs), kind: 'file', bytes: st.size }]
  }
  await walk(abs, rel === '.' || !rel ? '' : rel.replace(/\\/g, '/').replace(/\/+$/, ''))
  return out
}

export async function stubRead(session: SandboxSession, rel: string): Promise<string> {
  const root = await ensureStubRoot(session)
  const abs = resolveSandboxPath(root, rel)
  if (!abs) throw new Error('Invalid path.')
  const text = await fs.readFile(abs, 'utf8')
  return text.slice(0, SANDBOX_MAX_TEXT)
}

export async function stubWrite(
  session: SandboxSession,
  rel: string,
  text: string,
): Promise<{ path: string; bytes: number }> {
  const root = await ensureStubRoot(session)
  const abs = resolveSandboxPath(root, rel)
  if (!abs) throw new Error('Invalid path.')
  await fs.mkdir(path.dirname(abs), { recursive: true })
  const clipped = String(text ?? '').slice(0, SANDBOX_MAX_TEXT)
  await fs.writeFile(abs, clipped, 'utf8')
  touchSession(session)
  return { path: rel.replace(/\\/g, '/'), bytes: clipped.length }
}

export async function stubExec(
  session: SandboxSession,
  argv: string[],
  timeoutMs = SANDBOX_EXEC_TIMEOUT_MS,
): Promise<SandboxExecResult> {
  const root = await ensureStubRoot(session)
  const clean = (Array.isArray(argv) ? argv : []).map((a) => String(a)).filter(Boolean)
  if (!clean.length) {
    return {
      ok: false,
      code: 1,
      stdout: '',
      stderr: 'Empty argv.',
      argv: clean,
      cwd: root,
      driver: 'stub',
    }
  }
  const bin = clean[0]!
  if (!SANDBOX_STUB_BINARIES.has(bin)) {
    return {
      ok: false,
      code: 127,
      stdout: '',
      stderr: `Binary not allowlisted in stub sandbox: ${bin}`,
      argv: clean,
      cwd: root,
      driver: 'stub',
    }
  }

  return new Promise((resolve) => {
    const child = spawn(bin, clean.slice(1), {
      cwd: root,
      shell: false,
      env: {
        PATH: process.env.PATH || '/usr/bin:/bin',
        HOME: root,
        LANG: 'C.UTF-8',
        YUE_SANDBOX: '1',
        YUE_SANDBOX_DRIVER: 'stub',
      },
    })
    let stdout = ''
    let stderr = ''
    let timedOut = false
    const timer = setTimeout(() => {
      timedOut = true
      child.kill('SIGKILL')
    }, Math.min(Math.max(timeoutMs, 500), 60_000))

    child.stdout?.on('data', (buf: Buffer) => {
      if (stdout.length < SANDBOX_STDOUT_CAP) {
        stdout += buf.toString('utf8').slice(0, SANDBOX_STDOUT_CAP - stdout.length)
      }
    })
    child.stderr?.on('data', (buf: Buffer) => {
      if (stderr.length < SANDBOX_STDOUT_CAP) {
        stderr += buf.toString('utf8').slice(0, SANDBOX_STDOUT_CAP - stderr.length)
      }
    })
    child.on('error', (err) => {
      clearTimeout(timer)
      resolve({
        ok: false,
        code: 1,
        stdout,
        stderr: err.message,
        argv: clean,
        cwd: root,
        driver: 'stub',
      })
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      touchSession(session)
      resolve({
        ok: !timedOut && code === 0,
        code,
        stdout,
        stderr: timedOut ? `${stderr}\n(timed out)`.trim() : stderr,
        timedOut,
        argv: clean,
        cwd: root,
        driver: 'stub',
      })
    })
  })
}

export async function destroyStubSandbox(session: SandboxSession): Promise<void> {
  if (session.rootDir) {
    try {
      await fs.rm(session.rootDir, { recursive: true, force: true })
    } catch {
      /* ignore */
    }
  }
  session.status = 'destroyed'
  session.rootDir = undefined
  touchSession(session)
}

export { publicSessionView }
