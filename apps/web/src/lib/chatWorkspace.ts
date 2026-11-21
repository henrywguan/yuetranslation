/**
 * Per-thread Workspace files for Harness mode on `#/chat`.
 * Device-local; caps keep hydrate under existing localStorage budgets.
 */
import { zipSync } from 'fflate'
import { extractChatArtifacts } from './chatArtifacts.js'
import type { ChatFileMeta, ChatMessage, ChatThread } from './chatHistory.js'

export const CHAT_WORKSPACE_MAX_FILES = 20
export const CHAT_WORKSPACE_MAX_TEXT_CHARS = 100_000
export const CHAT_HARNESS_FLAG_KEY = 'yue-deepseek-chat-harness-v1'

export type ChatWorkspaceFile = {
  id: string
  path: string
  mime?: string
  text?: string
  updatedAt: number
}

export type ChatWorkspace = {
  files: ChatWorkspaceFile[]
  updatedAt: number
}

function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `ws_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

/** Normalize path: trim, strip leading ./, collapse slashes, ban `..`. */
export function normalizeWorkspacePath(raw: string): string {
  let p = String(raw || '')
    .trim()
    .replace(/\\/g, '/')
    .replace(/^\.\/+/, '')
  while (p.startsWith('/')) p = p.slice(1)
  p = p.replace(/\/+/g, '/')
  if (!p || p.includes('..') || p.includes('\0')) return ''
  return p.slice(0, 180)
}

export function emptyWorkspace(): ChatWorkspace {
  return { files: [], updatedAt: Date.now() }
}

export function pruneWorkspace(ws: ChatWorkspace | undefined | null): ChatWorkspace | undefined {
  if (!ws || !Array.isArray(ws.files)) return undefined
  const seen = new Set<string>()
  const files: ChatWorkspaceFile[] = []
  const sorted = ws.files
    .slice()
    .sort((a, b) => (Number(b.updatedAt) || 0) - (Number(a.updatedAt) || 0))
  for (const raw of sorted) {
    if (!raw || typeof raw !== 'object') continue
    const path = normalizeWorkspacePath(String(raw.path || ''))
    if (!path || seen.has(path)) continue
    seen.add(path)
    const text =
      typeof raw.text === 'string'
        ? raw.text.slice(0, CHAT_WORKSPACE_MAX_TEXT_CHARS)
        : undefined
    files.push({
      id: typeof raw.id === 'string' && raw.id.trim() ? raw.id : uid(),
      path,
      mime: typeof raw.mime === 'string' && raw.mime.trim() ? raw.mime.trim().slice(0, 120) : undefined,
      text,
      updatedAt: Number(raw.updatedAt) || Date.now(),
    })
    if (files.length >= CHAT_WORKSPACE_MAX_FILES) break
  }
  if (!files.length) return undefined
  return {
    files: files.sort((a, b) => a.path.localeCompare(b.path)),
    updatedAt: Number(ws.updatedAt) || Date.now(),
  }
}

export function normalizeWorkspace(raw: unknown): ChatWorkspace | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  return pruneWorkspace(raw as ChatWorkspace)
}

export function workspaceFileByPath(
  ws: ChatWorkspace | undefined,
  path: string,
): ChatWorkspaceFile | undefined {
  const p = normalizeWorkspacePath(path)
  if (!p || !ws) return undefined
  return ws.files.find((f) => f.path === p)
}

export function upsertWorkspaceFile(
  ws: ChatWorkspace | undefined,
  input: { path: string; text?: string; mime?: string; id?: string },
): ChatWorkspace {
  const path = normalizeWorkspacePath(input.path)
  if (!path) throw new Error('Invalid workspace path.')
  const base = pruneWorkspace(ws) || emptyWorkspace()
  const text =
    typeof input.text === 'string' ? input.text.slice(0, CHAT_WORKSPACE_MAX_TEXT_CHARS) : undefined
  const existing = base.files.find((f) => f.path === path)
  const nextFile: ChatWorkspaceFile = {
    id: existing?.id || input.id || uid(),
    path,
    mime: input.mime?.trim().slice(0, 120) || existing?.mime,
    text: text !== undefined ? text : existing?.text,
    updatedAt: Date.now(),
  }
  const files = [...base.files.filter((f) => f.path !== path), nextFile]
  return pruneWorkspace({ files, updatedAt: Date.now() }) || emptyWorkspace()
}

export function removeWorkspaceFile(
  ws: ChatWorkspace | undefined,
  path: string,
): ChatWorkspace | undefined {
  const p = normalizeWorkspacePath(path)
  if (!p || !ws) return ws
  const files = ws.files.filter((f) => f.path !== p)
  if (!files.length) return undefined
  return pruneWorkspace({ files, updatedAt: Date.now() })
}

/** Snapshot safe to POST with /api/chat (list + text for tool reads). */
export function workspaceWirePayload(ws: ChatWorkspace | undefined): {
  files: Array<{ id: string; path: string; mime?: string; text?: string; updatedAt: number }>
} | undefined {
  const pruned = pruneWorkspace(ws)
  if (!pruned?.files.length) return undefined
  return {
    files: pruned.files.map((f) => ({
      id: f.id,
      path: f.path,
      ...(f.mime ? { mime: f.mime } : null),
      ...(typeof f.text === 'string' ? { text: f.text.slice(0, CHAT_WORKSPACE_MAX_TEXT_CHARS) } : null),
      updatedAt: f.updatedAt,
    })),
  }
}

function slugFromFilename(name: string): string {
  const base = name.replace(/^.*[/\\]/, '').replace(/[^\w.\u3400-\u9fff-]+/g, '_').slice(0, 80)
  return base || 'upload.txt'
}

/** Seed workspace from thread uploads, OCR-ish user text dumps, and latest assistant fences. */
export function seedWorkspaceFromThread(thread: ChatThread): ChatWorkspace {
  let ws = pruneWorkspace(thread.workspace) || emptyWorkspace()
  const now = Date.now()

  const uploads: ChatFileMeta[] = []
  for (const m of thread.messages) {
    if (m.files?.length) uploads.push(...m.files)
  }
  for (const f of uploads.slice(-12)) {
    const path = `uploads/${slugFromFilename(f.filename)}`
    if (workspaceFileByPath(ws, path)) continue
    ws = upsertWorkspaceFile(ws, {
      path,
      mime: f.mime || 'application/octet-stream',
      text: `[Attached file]\nid: ${f.fileId}\nname: ${f.filename}\nmime: ${f.mime || 'unknown'}\n`,
    })
  }

  for (const m of thread.messages) {
    if (m.role !== 'user') continue
    const content = m.content || ''
    if (content.length < 400) continue
    if (!/\b(OCR|scanned|extracted text|from image|from document)\b/i.test(content.slice(0, 200))) {
      continue
    }
    const path = `ocr/note-${m.id.slice(0, 8)}.txt`
    if (!workspaceFileByPath(ws, path)) {
      ws = upsertWorkspaceFile(ws, {
        path,
        mime: 'text/plain',
        text: content.slice(0, CHAT_WORKSPACE_MAX_TEXT_CHARS),
      })
    }
  }

  const lastAssistant = [...thread.messages].reverse().find((m) => m.role === 'assistant' && m.content.trim())
  if (lastAssistant) {
    const arts = extractChatArtifacts(lastAssistant.content)
    for (let i = 0; i < arts.length; i += 1) {
      const a = arts[i]!
      const ext =
        a.kind === 'html' ? 'html' : a.kind === 'svg' ? 'svg' : a.kind === 'mermaid' ? 'mmd' : a.lang || 'txt'
      const path = `artifacts/${String(i + 1).padStart(2, '0')}-${a.kind}.${ext}`
      if (workspaceFileByPath(ws, path)) continue
      ws = upsertWorkspaceFile(ws, {
        path,
        mime: a.kind === 'html' ? 'text/html' : 'text/plain',
        text: a.source.slice(0, CHAT_WORKSPACE_MAX_TEXT_CHARS),
      })
    }
  }

  return pruneWorkspace({ ...ws, updatedAt: now }) || emptyWorkspace()
}

/** Merge server tool writes into the active thread workspace. */
export function applyWorkspaceWireUpdate(
  ws: ChatWorkspace | undefined,
  files: Array<{ id?: string; path: string; mime?: string; text?: string; updatedAt?: number }>,
): ChatWorkspace {
  let next = pruneWorkspace(ws) || emptyWorkspace()
  for (const f of files) {
    next = upsertWorkspaceFile(next, {
      path: f.path,
      text: f.text,
      mime: f.mime,
      id: f.id,
    })
  }
  return next
}

export function readHarnessFlag(fallback = false): boolean {
  try {
    const v = localStorage.getItem(CHAT_HARNESS_FLAG_KEY)
    if (v === '0') return false
    if (v === '1') return true
  } catch {
    /* ignore */
  }
  return fallback
}

export function writeHarnessFlag(on: boolean) {
  try {
    localStorage.setItem(CHAT_HARNESS_FLAG_KEY, on ? '1' : '0')
  } catch {
    /* ignore */
  }
}

/** Ensure thread has a workspace object when Harness is turned on (seed once). */
export function ensureThreadWorkspace(thread: ChatThread): ChatThread {
  if (thread.workspace?.files?.length) {
    const pruned = pruneWorkspace(thread.workspace)
    return pruned ? { ...thread, workspace: pruned } : thread
  }
  const seeded = seedWorkspaceFromThread(thread)
  if (!seeded.files.length) {
    return { ...thread, workspace: emptyWorkspace() }
  }
  return { ...thread, workspace: seeded, updatedAt: Date.now() }
}

export function patchThreadWorkspace(thread: ChatThread, workspace: ChatWorkspace | undefined): ChatThread {
  const pruned = pruneWorkspace(workspace)
  return {
    ...thread,
    workspace: pruned,
    updatedAt: Date.now(),
  }
}

function basenamePath(path: string): string {
  const parts = path.split('/')
  return parts[parts.length - 1] || path || 'file.txt'
}

function triggerBrowserDownload(blob: Blob, filename: string) {
  if (typeof document === 'undefined') return
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 2_000)
}

/** Download one workspace file as a text/blob attachment. */
export function downloadWorkspaceFile(file: ChatWorkspaceFile): void {
  const text = typeof file.text === 'string' ? file.text : ''
  const mime = file.mime || 'text/plain;charset=utf-8'
  const blob = new Blob([text], { type: mime })
  triggerBrowserDownload(blob, basenamePath(file.path))
}

/**
 * Zip selected (or all) workspace files and download.
 * Paths become zip entry names; empty selection no-ops.
 */
export function downloadWorkspaceZip(
  files: ChatWorkspaceFile[],
  zipName = 'workspace-files.zip',
): void {
  const entries: Record<string, Uint8Array> = {}
  const enc = new TextEncoder()
  for (const f of files) {
    const path = normalizeWorkspacePath(f.path)
    if (!path || entries[path]) continue
    entries[path] = enc.encode(typeof f.text === 'string' ? f.text : '')
  }
  if (!Object.keys(entries).length) return
  const zipped = zipSync(entries, { level: 6 })
  const name = zipName.replace(/[^\w.\u3400-\u9fff-]+/g, '_').slice(0, 80) || 'workspace-files.zip'
  const copy = new Uint8Array(zipped.byteLength)
  copy.set(zipped)
  triggerBrowserDownload(
    new Blob([copy], { type: 'application/zip' }),
    name.endsWith('.zip') ? name : `${name}.zip`,
  )
}

/** Latest assistant message helper for re-seed after a turn. */
export function maybeSeedArtifactsIntoWorkspace(
  thread: ChatThread,
  assistant: ChatMessage | undefined,
): ChatThread {
  if (!assistant || assistant.role !== 'assistant' || !assistant.content.trim()) return thread
  let ws = pruneWorkspace(thread.workspace) || emptyWorkspace()
  const arts = extractChatArtifacts(assistant.content)
  let changed = false
  for (let i = 0; i < arts.length; i += 1) {
    const a = arts[i]!
    const ext =
      a.kind === 'html' ? 'html' : a.kind === 'svg' ? 'svg' : a.kind === 'mermaid' ? 'mmd' : a.lang || 'txt'
    const path = `artifacts/${String(i + 1).padStart(2, '0')}-${a.kind}.${ext}`
    if (workspaceFileByPath(ws, path)) continue
    ws = upsertWorkspaceFile(ws, {
      path,
      mime: a.kind === 'html' ? 'text/html' : 'text/plain',
      text: a.source.slice(0, CHAT_WORKSPACE_MAX_TEXT_CHARS),
    })
    changed = true
  }
  return changed ? patchThreadWorkspace(thread, ws) : thread
}
