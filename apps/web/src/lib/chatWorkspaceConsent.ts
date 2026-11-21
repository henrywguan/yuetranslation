/**
 * Agent workspace-write consent: bind a local folder OR agree to browser localStorage.
 * Per-browser (localStorage flag); gates only harness + Agent write-capable turns.
 */
import type { ChatComposerMode } from './chatUiPrefs.js'
import { loadDirectoryHandle } from './chatLocalFolder.js'

/** Remembered “files may stay in this browser” choice. */
export const CHAT_WORKSPACE_LS_CONSENT_KEY = 'yue-deepseek-chat-workspace-ls-consent-v1'

/**
 * IDB handle key used when the consent gate itself binds a folder
 * (not necessarily an Inbox workspace row yet).
 */
export const CHAT_WORKSPACE_CONSENT_FOLDER_KEY = 'workspace-build-consent-v1'

/** Caps copy for the localStorage path (matches harness workspace limits). */
export const CHAT_WORKSPACE_CONSENT_CAPS_COPY =
  'Browser storage keeps ≤20 files, ≤100KB each. Large histories may hit ~512KB hydrate limits — prefer a local folder for bigger projects.'

export function readWorkspaceLsConsent(fallback = false): boolean {
  try {
    const v = localStorage.getItem(CHAT_WORKSPACE_LS_CONSENT_KEY)
    if (v === '0') return false
    if (v === '1') return true
  } catch {
    /* ignore */
  }
  return fallback
}

export function writeWorkspaceLsConsent(on: boolean) {
  try {
    localStorage.setItem(CHAT_WORKSPACE_LS_CONSENT_KEY, on ? '1' : '0')
  } catch {
    /* ignore */
  }
}

/** Harness ON + Agent mode → server attaches workspace_write. Ask/Plan are read-only. */
export function isWorkspaceWriteCapableTurn(opts: {
  harnessOn: boolean
  composerMode: ChatComposerMode
}): boolean {
  return Boolean(opts.harnessOn) && opts.composerMode === 'agent'
}

/** True when any listed workspace id (or the gate key) has a persisted directory handle. */
export async function hasBoundLocalFolder(
  workspaceIds: readonly string[] = [],
): Promise<boolean> {
  const ids = Array.from(
    new Set(
      [...workspaceIds, CHAT_WORKSPACE_CONSENT_FOLDER_KEY]
        .map((id) => String(id || '').trim())
        .filter(Boolean),
    ),
  )
  for (const id of ids) {
    const handle = await loadDirectoryHandle(id)
    if (handle) return true
  }
  return false
}

export type WorkspaceBuildConsentCheck = {
  ok: boolean
  /** Why ok — useful for smoke / UI. */
  via: 'not-write-capable' | 'ls-consent' | 'local-folder' | 'blocked'
}

/**
 * Sync half: LS consent / write-capability. Callers still await hasBoundLocalFolder
 * when this returns blocked.
 */
export function evaluateWorkspaceBuildConsentSync(opts: {
  harnessOn: boolean
  composerMode: ChatComposerMode
  lsConsent?: boolean
}): WorkspaceBuildConsentCheck {
  if (!isWorkspaceWriteCapableTurn(opts)) {
    return { ok: true, via: 'not-write-capable' }
  }
  const ls = opts.lsConsent ?? readWorkspaceLsConsent()
  if (ls) return { ok: true, via: 'ls-consent' }
  return { ok: false, via: 'blocked' }
}

export async function evaluateWorkspaceBuildConsent(opts: {
  harnessOn: boolean
  composerMode: ChatComposerMode
  localWorkspaceIds?: readonly string[]
}): Promise<WorkspaceBuildConsentCheck> {
  const sync = evaluateWorkspaceBuildConsentSync(opts)
  if (sync.ok) return sync
  if (await hasBoundLocalFolder(opts.localWorkspaceIds || [])) {
    return { ok: true, via: 'local-folder' }
  }
  return { ok: false, via: 'blocked' }
}
