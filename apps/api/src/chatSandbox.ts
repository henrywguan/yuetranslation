/**
 * Chat Inbox internal sandbox sessions (Phase C).
 *
 * Drivers:
 * - `stub` (default): in-process temp-dir FS + allowlisted spawn — works offline, no Fly billing
 * - `fly`: Fly Machines API — requires FLY_API_TOKEN + FLY_APP (NEEDS_HUMAN secrets/billing)
 *
 * Vercel serverless keeps session metadata in-memory per instance; stub roots live under
 * os.tmpdir(). Real Fly sessions are durable across instances when configured.
 */
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { env } from './env.js'

export type SandboxDriver = 'stub' | 'fly'

export type SandboxStatus = 'starting' | 'ready' | 'error' | 'destroyed'

export type SandboxSession = {
  id: string
  userId: string
  driver: SandboxDriver
  status: SandboxStatus
  title: string
  projectId?: string
  /** Absolute path for stub driver. */
  rootDir?: string
  /** Fly machine id when driver=fly. */
  flyMachineId?: string
  error?: string
  createdAt: number
  lastUsedAt: number
}

export type SandboxExecResult = {
  ok: boolean
  code: number | null
  stdout: string
  stderr: string
  timedOut?: boolean
  argv: string[]
  cwd: string
  driver: SandboxDriver
}

export type SandboxFileEntry = {
  path: string
  kind: 'file' | 'dir'
  bytes?: number
}

const sessions = new Map<string, SandboxSession>()

export const SANDBOX_MAX_TEXT = 200_000
export const SANDBOX_MAX_FILES = 200
export const SANDBOX_EXEC_TIMEOUT_MS = 15_000
export const SANDBOX_STDOUT_CAP = 32_000

/** Binaries allowed for stub spawn (no shell). */
export const SANDBOX_STUB_BINARIES = new Set([
  'node',
  'npm',
  'npx',
  'python3',
  'python',
  'ls',
  'cat',
  'pwd',
  'echo',
  'mkdir',
  'rm',
  'cp',
  'mv',
  'touch',
  'head',
  'tail',
  'wc',
  'grep',
  'find',
  'git',
  'tsc',
  'tsx',
])

export function resolveSandboxDriver(requested?: string): SandboxDriver {
  const raw = String(requested || env.sandboxDriver || 'stub')
    .trim()
    .toLowerCase()
  if (raw === 'fly') return 'fly'
  return 'stub'
}

export function flyConfigured(): boolean {
  return Boolean(env.flyApiToken && env.flyApp)
}

export function sandboxBaseDir(): string {
  return path.join(os.tmpdir(), 'yue-chat-sandbox')
}

export function getSandboxSession(id: string, userId: string): SandboxSession | null {
  const s = sessions.get(id)
  if (!s || s.userId !== userId || s.status === 'destroyed') return null
  return s
}

export function listSandboxSessions(userId: string): SandboxSession[] {
  return [...sessions.values()]
    .filter((s) => s.userId === userId && s.status !== 'destroyed')
    .sort((a, b) => b.lastUsedAt - a.lastUsedAt)
}

export function touchSession(session: SandboxSession): void {
  session.lastUsedAt = Date.now()
  sessions.set(session.id, session)
}

export function putSession(session: SandboxSession): void {
  sessions.set(session.id, session)
}

export function newSandboxId(): string {
  return `sbx_${randomUUID().replace(/-/g, '').slice(0, 20)}`
}

/** Jail a relative path under session root. Returns absolute path or null. */
export function resolveSandboxPath(rootDir: string, relRaw: string): string | null {
  const rel = String(relRaw || '')
    .replace(/\\/g, '/')
    .replace(/^\.\/+/, '')
    .replace(/^\/+/, '')
  if (!rel || rel.includes('\0') || /(^|\/)\.\.(\/|$)/.test(rel)) return null
  const abs = path.resolve(rootDir, rel)
  const root = path.resolve(rootDir)
  if (abs !== root && !abs.startsWith(root + path.sep)) return null
  return abs
}

export async function ensureStubRoot(session: SandboxSession): Promise<string> {
  const root =
    session.rootDir ||
    path.join(sandboxBaseDir(), session.userId.replace(/[^a-zA-Z0-9_-]/g, '_'), session.id)
  await fs.mkdir(root, { recursive: true })
  session.rootDir = root
  touchSession(session)
  return root
}

export function publicSessionView(session: SandboxSession) {
  return {
    id: session.id,
    driver: session.driver,
    status: session.status,
    title: session.title,
    projectId: session.projectId,
    flyMachineId: session.flyMachineId,
    error: session.error,
    createdAt: session.createdAt,
    lastUsedAt: session.lastUsedAt,
    flyReady: flyConfigured(),
  }
}

/** Test helper — wipe in-memory sessions. */
export function __resetSandboxSessionsForTests(): void {
  sessions.clear()
}
