export function isOnline(): boolean {
  if (typeof navigator === 'undefined') return true
  return navigator.onLine
}

export function subscribeOnlineStatus(cb: (online: boolean) => void): () => void {
  if (typeof window === 'undefined') {
    cb(true)
    return () => {}
  }
  const onOnline = () => cb(true)
  const onOffline = () => cb(false)
  window.addEventListener('online', onOnline)
  window.addEventListener('offline', onOffline)
  cb(navigator.onLine)
  return () => {
    window.removeEventListener('online', onOnline)
    window.removeEventListener('offline', onOffline)
  }
}
