/**
 * Download / hydrate Cantonese offline packs into IndexedDB + in-memory lexicon.
 */
import { resolveApiBase } from './api'
import { clearPacks, getInstalledPackMeta, loadPack, savePack } from './offlinePackDb'
import { hasOfflinePack, setOfflinePack } from './offlineLexicon'
import type { InstalledPackMeta, OfflinePackId, OfflinePackPayload } from './offlinePackTypes'
import { maybeOfferPushNudge } from './pushNudge'
import { requestPersistentStorage } from './storagePersist'

export type OfflinePackManifest = {
  version: number
  packs: Array<{
    id: OfflinePackId
    version: number
    approxBytes: number
    label: string
    description: string
    includesCcCanto: boolean
  }>
  note: string
}

let hydratePromise: Promise<boolean> | null = null

export async function fetchOfflinePackManifest(): Promise<OfflinePackManifest> {
  const base = resolveApiBase()
  const res = await fetch(`${base}/offline-pack/manifest`, { credentials: 'include' })
  if (!res.ok) throw new Error('Could not load offline pack list')
  return res.json() as Promise<OfflinePackManifest>
}

export async function downloadOfflinePack(
  id: OfflinePackId,
  onProgress?: (ratio: number) => void,
): Promise<InstalledPackMeta> {
  const base = resolveApiBase()
  const res = await fetch(`${base}/offline-pack/${id}`, { credentials: 'include' })
  if (!res.ok) throw new Error('Offline pack download failed')

  const total = Number(res.headers.get('content-length') || 0)
  let bytes = 0
  let text: string
  if (res.body && typeof res.body.getReader === 'function' && total > 0) {
    const reader = res.body.getReader()
    const chunks: Uint8Array[] = []
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      if (value) {
        chunks.push(value)
        bytes += value.byteLength
        onProgress?.(Math.min(1, bytes / total))
      }
    }
    const merged = new Uint8Array(bytes)
    let offset = 0
    for (const chunk of chunks) {
      merged.set(chunk, offset)
      offset += chunk.byteLength
    }
    text = new TextDecoder().decode(merged)
  } else {
    text = await res.text()
    bytes = new TextEncoder().encode(text).byteLength
    onProgress?.(1)
  }

  const pack = JSON.parse(text) as OfflinePackPayload
  if (pack.id !== id) throw new Error('Pack id mismatch')
  await savePack(pack, bytes)
  setOfflinePack(pack)
  void requestPersistentStorage()
  maybeOfferPushNudge()
  return {
    id: pack.id,
    version: pack.version,
    builtAt: pack.builtAt,
    bytes,
  }
}

/** Load pack from IndexedDB into the in-memory lexicon (call once at app start). */
export function hydrateOfflinePack(): Promise<boolean> {
  if (hydratePromise) return hydratePromise
  hydratePromise = (async () => {
    try {
      const pack = await loadPack()
      if (!pack) {
        setOfflinePack(null)
        return false
      }
      setOfflinePack(pack)
      void requestPersistentStorage()
      return true
    } catch {
      setOfflinePack(null)
      return false
    }
  })()
  return hydratePromise
}

export async function removeOfflinePack(): Promise<void> {
  await clearPacks()
  setOfflinePack(null)
  hydratePromise = null
}

export async function installedOfflinePackMeta(): Promise<InstalledPackMeta | null> {
  return getInstalledPackMeta()
}

export function offlineLexiconReady(): boolean {
  return hasOfflinePack()
}
