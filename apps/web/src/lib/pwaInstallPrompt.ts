/** Chromium `beforeinstallprompt` (not in all DOM lib versions). */
export type DeferredInstallPrompt = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

let deferred: DeferredInstallPrompt | null = null
const listeners = new Set<(prompt: DeferredInstallPrompt | null) => void>()

function notify(): void {
  for (const cb of listeners) cb(deferred)
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (ev) => {
    ev.preventDefault()
    deferred = ev as DeferredInstallPrompt
    notify()
  })
}

export function getDeferredInstallPrompt(): DeferredInstallPrompt | null {
  return deferred
}

export function clearDeferredInstallPrompt(): void {
  deferred = null
  notify()
}

export function subscribeInstallPrompt(
  cb: (prompt: DeferredInstallPrompt | null) => void,
): () => void {
  listeners.add(cb)
  cb(deferred)
  return () => {
    listeners.delete(cb)
  }
}

export async function promptPwaInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  const prompt = deferred
  if (!prompt?.prompt) return 'unavailable'
  try {
    await prompt.prompt()
    const { outcome } = await prompt.userChoice
    clearDeferredInstallPrompt()
    return outcome
  } catch {
    clearDeferredInstallPrompt()
    return 'unavailable'
  }
}
