import type { InstalledPackMeta, OfflinePackPayload } from './offlinePackTypes.ts'

const DB_NAME = 'yue-offline-packs-v1'
const DB_VERSION = 1
const STORE = 'packs'
const META_KEY = '__meta'

type MetaRecord = InstalledPackMeta & { id: typeof META_KEY; activePackId: string }

type PackRecord = OfflinePackPayload

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('indexedDB unavailable'))
      return
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onerror = () => reject(req.error ?? new Error('indexedDB open failed'))
    req.onsuccess = () => resolve(req.result)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' })
      }
    }
  })
}

function runTx<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode)
        const store = tx.objectStore(STORE)
        const req = fn(store)
        req.onerror = () => reject(req.error ?? new Error('indexedDB request failed'))
        req.onsuccess = () => resolve(req.result as T)
        tx.oncomplete = () => db.close()
        tx.onerror = () => reject(tx.error ?? new Error('indexedDB transaction failed'))
      }),
  )
}

export async function getInstalledPackMeta(): Promise<InstalledPackMeta | null> {
  if (typeof indexedDB === 'undefined') return null
  try {
    const meta = await runTx<MetaRecord | undefined>('readonly', (store) =>
      store.get(META_KEY),
    )
    if (!meta?.activePackId) return null
    return {
      id: meta.activePackId,
      version: meta.version,
      builtAt: meta.builtAt,
      bytes: meta.bytes,
    }
  } catch {
    return null
  }
}

export async function savePack(pack: OfflinePackPayload, bytes: number): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    const store = tx.objectStore(STORE)
    const packRecord: PackRecord = { ...pack }
    store.put(packRecord)
    const meta: MetaRecord = {
      id: META_KEY,
      activePackId: pack.id,
      version: pack.version,
      builtAt: pack.builtAt,
      bytes,
    }
    store.put(meta)
    tx.oncomplete = () => {
      db.close()
      resolve()
    }
    tx.onerror = () => reject(tx.error ?? new Error('savePack failed'))
  })
}

export async function loadPack(): Promise<OfflinePackPayload | null> {
  if (typeof indexedDB === 'undefined') return null
  try {
    const meta = await runTx<MetaRecord | undefined>('readonly', (store) =>
      store.get(META_KEY),
    )
    if (!meta?.activePackId) return null
    const pack = await runTx<PackRecord | undefined>('readonly', (store) =>
      store.get(meta.activePackId),
    )
    return pack ?? null
  } catch {
    return null
  }
}

export async function clearPacks(): Promise<void> {
  if (typeof indexedDB === 'undefined') return
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).clear()
    tx.oncomplete = () => {
      db.close()
      resolve()
    }
    tx.onerror = () => reject(tx.error ?? new Error('clearPacks failed'))
  })
}
