/**
 * Promoted Thread files snapshots for Inbox → Workspaces (kind: `files`).
 * Device-local IndexedDB; inbox chrome only stores the named entry + id.
 */
import {
  CHAT_WORKSPACE_MAX_FILES,
  CHAT_WORKSPACE_MAX_TEXT_CHARS,
  emptyWorkspace,
  normalizeWorkspacePath,
  pruneWorkspace,
  type ChatWorkspace,
  type ChatWorkspaceFile,
} from './chatWorkspace.js'

export const CHAT_PROMOTED_WS_DB = 'yue-chat-promoted-workspace-v1'
export const CHAT_PROMOTED_WS_STORE = 'snapshots'
/** Prefix stored on ChatInboxWorkspace.ref for kind `files`. */
export const CHAT_PROMOTED_WS_REF_PREFIX = 'files:'

export type PromotedWorkspaceSnapshot = {
  workspaceId: string
  title: string
  files: ChatWorkspaceFile[]
  updatedAt: number
  /** Source thread id when promoted from Harness. */
  threadId?: string
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('indexedDB unavailable'))
      return
    }
    const req = indexedDB.open(CHAT_PROMOTED_WS_DB, 1)
    req.onerror = () => reject(req.error ?? new Error('promoted workspace IDB open failed'))
    req.onsuccess = () => resolve(req.result)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(CHAT_PROMOTED_WS_STORE)) {
        db.createObjectStore(CHAT_PROMOTED_WS_STORE)
      }
    }
  })
}

export function promotedWorkspaceRef(workspaceId: string): string {
  return `${CHAT_PROMOTED_WS_REF_PREFIX}${workspaceId}`
}

export function parsePromotedWorkspaceRef(ref: string | undefined | null): string | null {
  const r = String(ref || '')
  if (!r.startsWith(CHAT_PROMOTED_WS_REF_PREFIX)) return null
  const id = r.slice(CHAT_PROMOTED_WS_REF_PREFIX.length).trim()
  return id || null
}

/** Infer a short name from the file tree (top folder or first stem). */
export function suggestPromotedWorkspaceTitle(
  ws: ChatWorkspace | undefined,
  fallback = 'Thread files',
): string {
  const files = pruneWorkspace(ws)?.files || []
  if (!files.length) return fallback
  const tops = new Map<string, number>()
  for (const f of files) {
    const top = f.path.split('/')[0] || f.path
    if (!top) continue
    tops.set(top, (tops.get(top) || 0) + 1)
  }
  let best = ''
  let bestN = 0
  for (const [name, n] of tops) {
    if (n > bestN || (n === bestN && name.length > best.length)) {
      best = name
      bestN = n
    }
  }
  if (best && bestN >= 2) return best.slice(0, 60)
  if (best) {
    const stem = best.replace(/\.[^.]+$/, '')
    return (stem || best).slice(0, 60)
  }
  return fallback
}

function clipSnapshot(raw: PromotedWorkspaceSnapshot): PromotedWorkspaceSnapshot {
  const seen = new Set<string>()
  const files: ChatWorkspaceFile[] = []
  for (const f of raw.files || []) {
    const path = normalizeWorkspacePath(String(f?.path || ''))
    if (!path || seen.has(path)) continue
    seen.add(path)
    files.push({
      id: typeof f.id === 'string' && f.id.trim() ? f.id : `pf_${files.length}`,
      path,
      mime: typeof f.mime === 'string' ? f.mime.slice(0, 120) : undefined,
      text: typeof f.text === 'string' ? f.text.slice(0, CHAT_WORKSPACE_MAX_TEXT_CHARS) : undefined,
      updatedAt: Number(f.updatedAt) || Date.now(),
    })
    if (files.length >= CHAT_WORKSPACE_MAX_FILES) break
  }
  return {
    workspaceId: String(raw.workspaceId || '').trim(),
    title: String(raw.title || 'Thread files').trim().slice(0, 80) || 'Thread files',
    files,
    updatedAt: Number(raw.updatedAt) || Date.now(),
    threadId: typeof raw.threadId === 'string' ? raw.threadId : undefined,
  }
}

export async function savePromotedWorkspaceSnapshot(
  snapshot: PromotedWorkspaceSnapshot,
): Promise<void> {
  const clipped = clipSnapshot(snapshot)
  if (!clipped.workspaceId) throw new Error('Missing workspace id')
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(CHAT_PROMOTED_WS_STORE, 'readwrite')
    tx.objectStore(CHAT_PROMOTED_WS_STORE).put(clipped, clipped.workspaceId)
    tx.oncomplete = () => {
      db.close()
      resolve()
    }
    tx.onerror = () => reject(tx.error ?? new Error('save promoted workspace failed'))
  })
}

export async function loadPromotedWorkspaceSnapshot(
  workspaceId: string,
): Promise<PromotedWorkspaceSnapshot | null> {
  const id = String(workspaceId || '').trim()
  if (!id) return null
  try {
    const db = await openDb()
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(CHAT_PROMOTED_WS_STORE, 'readonly')
      const req = tx.objectStore(CHAT_PROMOTED_WS_STORE).get(id)
      req.onsuccess = () => {
        db.close()
        const raw = req.result as PromotedWorkspaceSnapshot | undefined
        resolve(raw ? clipSnapshot(raw) : null)
      }
      req.onerror = () => reject(req.error ?? new Error('load promoted workspace failed'))
    })
  } catch {
    return null
  }
}

export async function deletePromotedWorkspaceSnapshot(workspaceId: string): Promise<void> {
  const id = String(workspaceId || '').trim()
  if (!id) return
  try {
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(CHAT_PROMOTED_WS_STORE, 'readwrite')
      tx.objectStore(CHAT_PROMOTED_WS_STORE).delete(id)
      tx.oncomplete = () => {
        db.close()
        resolve()
      }
      tx.onerror = () => reject(tx.error ?? new Error('delete promoted workspace failed'))
    })
  } catch {
    /* ignore */
  }
}

export function snapshotToChatWorkspace(
  snapshot: PromotedWorkspaceSnapshot | null | undefined,
): ChatWorkspace {
  if (!snapshot?.files?.length) return emptyWorkspace()
  return pruneWorkspace({ files: snapshot.files, updatedAt: snapshot.updatedAt }) || emptyWorkspace()
}
