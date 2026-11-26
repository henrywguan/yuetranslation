/**
 * Chat Inbox local folder bind (Phase D).
 * Chromium: File System Access API + IndexedDB-persisted directory handle.
 * Safari / others: <input webkitdirectory> or .zip → mirror into internal sandbox.
 */
import { unzipSync } from 'fflate'

export const LOCAL_FOLDER_DB = 'yue-chat-local-folder-v1'
export const LOCAL_FOLDER_STORE = 'handles'
export const LOCAL_MIRROR_MAX_FILES = 80
export const LOCAL_MIRROR_MAX_FILE_BYTES = 100_000
export const LOCAL_MIRROR_MAX_TOTAL_BYTES = 1_500_000

export type LocalFolderCapability = {
  showDirectoryPicker: boolean
  webkitDirectory: boolean
}

export type MirroredFile = {
  path: string
  text: string
}

export function localFolderCapabilities(): LocalFolderCapability {
  const showDirectoryPicker =
    typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function'
  const webkitDirectory =
    typeof document !== 'undefined' &&
    'webkitdirectory' in document.createElement('input')
  return { showDirectoryPicker, webkitDirectory }
}

function openHandleDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('indexedDB unavailable'))
      return
    }
    const req = indexedDB.open(LOCAL_FOLDER_DB, 1)
    req.onerror = () => reject(req.error ?? new Error('IDB open failed'))
    req.onsuccess = () => resolve(req.result)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(LOCAL_FOLDER_STORE)) {
        db.createObjectStore(LOCAL_FOLDER_STORE)
      }
    }
  })
}

export async function saveDirectoryHandle(
  workspaceId: string,
  handle: FileSystemDirectoryHandle,
): Promise<void> {
  const db = await openHandleDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(LOCAL_FOLDER_STORE, 'readwrite')
    tx.objectStore(LOCAL_FOLDER_STORE).put(handle, workspaceId)
    tx.oncomplete = () => {
      db.close()
      resolve()
    }
    tx.onerror = () => reject(tx.error ?? new Error('save handle failed'))
  })
}

export async function loadDirectoryHandle(
  workspaceId: string,
): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await openHandleDb()
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(LOCAL_FOLDER_STORE, 'readonly')
      const req = tx.objectStore(LOCAL_FOLDER_STORE).get(workspaceId)
      req.onsuccess = () => {
        db.close()
        resolve((req.result as FileSystemDirectoryHandle) || null)
      }
      req.onerror = () => reject(req.error ?? new Error('load handle failed'))
    })
  } catch {
    return null
  }
}

export type LocalFolderPermission = PermissionState | 'unavailable'

/** Device-local probe — never syncs the FS handle to cloud. */
export type LocalFolderConnectionInfo = {
  hasHandle: boolean
  /** Folder leaf name from the File System Access handle (browsers omit full path). */
  name: string | null
  permission: LocalFolderPermission
}

async function queryHandlePermission(
  handle: FileSystemDirectoryHandle,
  mode: 'read' | 'readwrite',
): Promise<PermissionState | 'unavailable'> {
  try {
    const h = handle as FileSystemDirectoryHandle & {
      queryPermission?: (opts: { mode: 'read' | 'readwrite' }) => Promise<PermissionState>
    }
    if (typeof h.queryPermission !== 'function') return 'unavailable'
    return await h.queryPermission({ mode })
  } catch {
    return 'unavailable'
  }
}

async function requestHandlePermission(
  handle: FileSystemDirectoryHandle,
  mode: 'read' | 'readwrite',
): Promise<PermissionState | 'unavailable'> {
  try {
    const h = handle as FileSystemDirectoryHandle & {
      requestPermission?: (opts: { mode: 'read' | 'readwrite' }) => Promise<PermissionState>
    }
    if (typeof h.requestPermission !== 'function') return 'unavailable'
    return await h.requestPermission({ mode })
  } catch {
    return 'denied'
  }
}

/** Read handle name + current permission without prompting. */
export async function probeLocalFolderConnection(
  workspaceId: string,
): Promise<LocalFolderConnectionInfo> {
  const handle = await loadDirectoryHandle(workspaceId)
  if (!handle) {
    return { hasHandle: false, name: null, permission: 'unavailable' }
  }
  const permission = await queryHandlePermission(handle, 'read')
  return {
    hasHandle: true,
    name: typeof handle.name === 'string' && handle.name.trim() ? handle.name.trim() : null,
    permission,
  }
}

/**
 * Re-open / re-grant the bound directory (gesture-safe).
 * Browsers do not expose a Finder/Explorer reveal for directory handles —
 * this verifies the live connection and returns the leaf folder name.
 */
export async function openLocalFolderConnection(
  workspaceId: string,
): Promise<LocalFolderConnectionInfo> {
  const handle = await loadDirectoryHandle(workspaceId)
  if (!handle) {
    return { hasHandle: false, name: null, permission: 'unavailable' }
  }
  let permission = await queryHandlePermission(handle, 'readwrite')
  if (permission !== 'granted') {
    permission = await requestHandlePermission(handle, 'readwrite')
  }
  // Fallback: some engines only expose read.
  if (permission !== 'granted') {
    permission = await queryHandlePermission(handle, 'read')
    if (permission !== 'granted') {
      permission = await requestHandlePermission(handle, 'read')
    }
  }
  return {
    hasHandle: true,
    name: typeof handle.name === 'string' && handle.name.trim() ? handle.name.trim() : null,
    permission,
  }
}

export async function pickLocalDirectory(): Promise<FileSystemDirectoryHandle | null> {
  if (typeof window === 'undefined' || typeof window.showDirectoryPicker !== 'function') {
    return null
  }
  try {
    return await window.showDirectoryPicker({ mode: 'readwrite' })
  } catch {
    // user cancel
    return null
  }
}

function normalizeRelPath(parts: string[]): string {
  return parts
    .join('/')
    .replace(/\\/g, '/')
    .replace(/^\.\/+/, '')
    .replace(/^\/+/, '')
}

function isTextyPath(p: string): boolean {
  return /\.(md|txt|json|ts|tsx|js|jsx|mjs|cjs|css|html|svg|yml|yaml|toml|py|rs|go|java|kt|swift|sh|env|ignore|lock|csv|xml|sql)$/i.test(
    p,
  ) || /(^|\/)(Dockerfile|Makefile|LICENSE|README)(\.|$)/i.test(p)
}

async function readFileAsText(file: File): Promise<string | null> {
  if (file.size > LOCAL_MIRROR_MAX_FILE_BYTES) return null
  if (!isTextyPath(file.name) && file.type && !/^text\//.test(file.type) && file.type !== 'application/json') {
    // Still try small unknown text
    if (file.size > 8_000) return null
  }
  try {
    const buf = await file.arrayBuffer()
    const bytes = new Uint8Array(buf)
    // Reject obvious binary
    for (let i = 0; i < Math.min(bytes.length, 512); i++) {
      if (bytes[i] === 0) return null
    }
    return new TextDecoder('utf-8', { fatal: false }).decode(bytes).slice(0, LOCAL_MIRROR_MAX_FILE_BYTES)
  } catch {
    return null
  }
}

/** Walk a File System Access directory handle into mirrorable text files. */
export async function collectFromDirectoryHandle(
  root: FileSystemDirectoryHandle,
): Promise<MirroredFile[]> {
  const out: MirroredFile[] = []
  let total = 0

  async function walk(dir: FileSystemDirectoryHandle, prefix: string[]) {
    if (out.length >= LOCAL_MIRROR_MAX_FILES || total >= LOCAL_MIRROR_MAX_TOTAL_BYTES) return
    for await (const [name, handle] of dir.entries()) {
      if (out.length >= LOCAL_MIRROR_MAX_FILES || total >= LOCAL_MIRROR_MAX_TOTAL_BYTES) break
      if (name.startsWith('.') || name === 'node_modules' || name === 'dist' || name === '.git') continue
      if (handle.kind === 'directory') {
        await walk(handle as FileSystemDirectoryHandle, [...prefix, name])
      } else if (handle.kind === 'file') {
        const file = await (handle as FileSystemFileHandle).getFile()
        const text = await readFileAsText(file)
        if (text == null) continue
        const path = normalizeRelPath([...prefix, name])
        if (!path || !isTextyPath(path)) continue
        out.push({ path, text })
        total += text.length
      }
    }
  }

  await walk(root, [])
  return out
}

/** From <input webkitdirectory> FileList. */
export async function collectFromFileList(files: FileList | File[]): Promise<MirroredFile[]> {
  const list = Array.from(files)
  const out: MirroredFile[] = []
  let total = 0
  for (const file of list) {
    if (out.length >= LOCAL_MIRROR_MAX_FILES || total >= LOCAL_MIRROR_MAX_TOTAL_BYTES) break
    const rel = normalizeRelPath(
      String((file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name).split('/'),
    )
    if (!rel || rel.split('/').some((p) => p === 'node_modules' || p === '.git' || p === 'dist')) continue
    if (!isTextyPath(rel)) continue
    const text = await readFileAsText(file)
    if (text == null) continue
    out.push({ path: rel, text })
    total += text.length
  }
  return out
}

/** Unpack a zip ArrayBuffer into mirrorable text files (Safari / upload path). */
export function collectFromZipBytes(bytes: Uint8Array): MirroredFile[] {
  const unzipped = unzipSync(bytes)
  const out: MirroredFile[] = []
  let total = 0
  for (const [rawPath, data] of Object.entries(unzipped)) {
    if (out.length >= LOCAL_MIRROR_MAX_FILES || total >= LOCAL_MIRROR_MAX_TOTAL_BYTES) break
    const path = normalizeRelPath(rawPath.split('/'))
    if (!path || path.endsWith('/')) continue
    if (path.split('/').some((p) => p === 'node_modules' || p === '.git' || p === 'dist' || p.startsWith('.'))) {
      continue
    }
    if (!isTextyPath(path)) continue
    if (data.byteLength > LOCAL_MIRROR_MAX_FILE_BYTES) continue
    let binary = false
    for (let i = 0; i < Math.min(data.length, 512); i++) {
      if (data[i] === 0) {
        binary = true
        break
      }
    }
    if (binary) continue
    const text = new TextDecoder('utf-8', { fatal: false })
      .decode(data)
      .slice(0, LOCAL_MIRROR_MAX_FILE_BYTES)
    out.push({ path, text })
    total += text.length
  }
  return out
}

export async function collectFromZipFile(file: File): Promise<MirroredFile[]> {
  const buf = new Uint8Array(await file.arrayBuffer())
  return collectFromZipBytes(buf)
}
