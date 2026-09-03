import { navigate } from './useHashRoute'
import { useYueStore } from './store'

let pendingShareText: string | null = null
let pendingLaunchFile: File | null = null

/** Text shared into the app via manifest share_target (GET). */
export function consumePendingShareText(): string | null {
  const value = pendingShareText
  pendingShareText = null
  return value
}

/** Image/PDF opened via manifest file_handlers + LaunchQueue. */
export function consumePendingLaunchFile(): File | null {
  const file = pendingLaunchFile
  pendingLaunchFile = null
  return file
}

function pickSharedText(params: URLSearchParams): string | null {
  const text = params.get('text')?.trim()
  if (text) return text
  const title = params.get('title')?.trim()
  if (title) return title
  const url = params.get('url')?.trim()
  if (url) return url
  return null
}

function stripShareParams(params: URLSearchParams): void {
  params.delete('title')
  params.delete('text')
  params.delete('url')
}

/** Decode `web+jyuttranslate:…` / `?q=` payloads from protocol_handlers. */
function pickProtocolText(params: URLSearchParams): string | null {
  const raw = params.get('q')?.trim()
  if (!raw) return null
  let decoded = raw
  try {
    decoded = decodeURIComponent(raw)
  } catch {
    /* keep raw */
  }
  return decoded.replace(/^web\+jyuttranslate:/i, '').trim() || null
}

function applySharedText(text: string): void {
  pendingShareText = text
  navigate('app')
  useYueStore.getState().setMode('text')
}

function applyLaunchFile(file: File): void {
  pendingLaunchFile = file
  navigate('app')
  useYueStore.getState().setMode('camera')
}

/** Route shared text / OS file opens before the UI mounts. */
export function bootstrapPwaLaunch(): void {
  if (typeof window === 'undefined') return

  const url = new URL(window.location.href)

  const protocolText = pickProtocolText(url.searchParams)
  if (protocolText) {
    url.searchParams.delete('q')
    window.history.replaceState({}, '', url.toString())
    applySharedText(protocolText)
  } else {
    const shared = pickSharedText(url.searchParams)
    if (shared) {
      stripShareParams(url.searchParams)
      window.history.replaceState({}, '', url.toString())
      applySharedText(shared)
    }
  }

  const camShortcut = url.searchParams.get('cam') === '1' || hashHasCamShortcut()
  if (camShortcut) {
    url.searchParams.delete('cam')
    window.history.replaceState({}, '', url.toString())
    navigate('app')
    useYueStore.getState().setMode('camera')
  }

  const launchQueue = (window as Window & { launchQueue?: LaunchQueue }).launchQueue
  if (!launchQueue?.setConsumer) return

  launchQueue.setConsumer(async (launchParams) => {
    const files = launchParams.files
    if (!files?.length) return
    applyLaunchFile(files[0])
  })
}

function hashHasCamShortcut(): boolean {
  const hash = window.location.hash.replace(/^#/, '')
  const q = hash.includes('?') ? hash.slice(hash.indexOf('?') + 1) : ''
  return new URLSearchParams(q).get('cam') === '1'
}

interface LaunchQueue {
  setConsumer: (consumer: (params: LaunchParams) => Promise<void>) => void
}

interface LaunchParams {
  files: File[]
}
