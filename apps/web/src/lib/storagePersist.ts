export async function requestPersistentStorage(): Promise<boolean> {
  if (typeof navigator === 'undefined') return false
  const storage = navigator.storage
  if (!storage?.persist) return false
  try {
    return await storage.persist()
  } catch {
    return false
  }
}
