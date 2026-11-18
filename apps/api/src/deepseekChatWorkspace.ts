/**
 * Server-side thread Workspace store for Harness mode tool calls.
 * Snapshot arrives on the chat request body; writes emit SSE updates.
 */

export const CHAT_WORKSPACE_MAX_FILES = 20
export const CHAT_WORKSPACE_MAX_TEXT_CHARS = 100_000

export type ChatWorkspaceFileWire = {
  id: string
  path: string
  mime?: string
  text?: string
  updatedAt: number
}

export type ChatWorkspaceStore = {
  files: ChatWorkspaceFileWire[]
}

function uid(): string {
  return `ws_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

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

export function createWorkspaceStore(files?: ChatWorkspaceFileWire[]): ChatWorkspaceStore {
  const store: ChatWorkspaceStore = { files: [] }
  if (!Array.isArray(files)) return store
  for (const f of files) {
    const path = normalizeWorkspacePath(String(f?.path || ''))
    if (!path) continue
    if (store.files.some((x) => x.path === path)) continue
    store.files.push({
      id: typeof f.id === 'string' && f.id.trim() ? f.id : uid(),
      path,
      mime: typeof f.mime === 'string' ? f.mime.slice(0, 120) : undefined,
      text: typeof f.text === 'string' ? f.text.slice(0, CHAT_WORKSPACE_MAX_TEXT_CHARS) : undefined,
      updatedAt: Number(f.updatedAt) || Date.now(),
    })
    if (store.files.length >= CHAT_WORKSPACE_MAX_FILES) break
  }
  return store
}

export function workspaceListJson(store: ChatWorkspaceStore): string {
  return JSON.stringify({
    files: store.files.map((f) => ({
      id: f.id,
      path: f.path,
      mime: f.mime,
      bytes: typeof f.text === 'string' ? f.text.length : 0,
      updatedAt: f.updatedAt,
    })),
    count: store.files.length,
    maxFiles: CHAT_WORKSPACE_MAX_FILES,
  })
}

export function workspaceReadJson(store: ChatWorkspaceStore, pathRaw: string): string {
  const path = normalizeWorkspacePath(pathRaw)
  if (!path) return JSON.stringify({ error: 'Invalid path.' })
  const file = store.files.find((f) => f.path === path)
  if (!file) return JSON.stringify({ error: `File not found: ${path}` })
  return JSON.stringify({
    id: file.id,
    path: file.path,
    mime: file.mime,
    text: file.text ?? '',
    updatedAt: file.updatedAt,
  })
}

export function workspaceWrite(
  store: ChatWorkspaceStore,
  pathRaw: string,
  text: string,
  mime?: string,
): { ok: true; file: ChatWorkspaceFileWire } | { ok: false; error: string } {
  const path = normalizeWorkspacePath(pathRaw)
  if (!path) return { ok: false, error: 'Invalid path.' }
  const clipped = String(text ?? '').slice(0, CHAT_WORKSPACE_MAX_TEXT_CHARS)
  const existing = store.files.find((f) => f.path === path)
  const file: ChatWorkspaceFileWire = {
    id: existing?.id || uid(),
    path,
    mime: (mime || existing?.mime || 'text/plain').slice(0, 120),
    text: clipped,
    updatedAt: Date.now(),
  }
  if (existing) {
    Object.assign(existing, file)
  } else {
    if (store.files.length >= CHAT_WORKSPACE_MAX_FILES) {
      return { ok: false, error: `Workspace full (max ${CHAT_WORKSPACE_MAX_FILES} files).` }
    }
    store.files.push(file)
  }
  return { ok: true, file }
}
