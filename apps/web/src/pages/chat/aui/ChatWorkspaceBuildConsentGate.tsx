/**
 * Fullscreen companion warning when Agent needs workspace-write storage consent.
 * Choices: bind local folder · agree localStorage · dismiss (stay blocked).
 */
import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  CHAT_WORKSPACE_CONSENT_CAPS_COPY,
  CHAT_WORKSPACE_CONSENT_FOLDER_KEY,
} from '../../../lib/chatWorkspaceConsent'
import {
  collectFromDirectoryHandle,
  collectFromFileList,
  collectFromZipFile,
  localFolderCapabilities,
  pickLocalDirectory,
  saveDirectoryHandle,
} from '../../../lib/chatLocalFolder'
import { readChatDeepAvatarCharacter } from '../../../lib/chatDeepAvatarCharacter'
import {
  playChatDeepAvatarEmotionAudio,
  stopChatDeepAvatarEmotionAudio,
  unmuteChatDeepAvatarEmotionAudio,
} from '../../../lib/chatDeepAvatarAudio'
import { ChatDeepAvatar } from './ChatDeepAvatar'

export type ChatWorkspaceBuildConsentGateProps = {
  open: boolean
  onAcceptLs: () => void
  onFolderBound: () => void
  onDismiss: () => void
}

export function ChatWorkspaceBuildConsentGate({
  open,
  onAcceptLs,
  onFolderBound,
  onDismiss,
}: ChatWorkspaceBuildConsentGateProps) {
  const titleId = useId()
  const dirInputRef = useRef<HTMLInputElement>(null)
  const zipInputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [needsUnmute, setNeedsUnmute] = useState(false)
  const caps = localFolderCapabilities()
  const character = readChatDeepAvatarCharacter()

  useEffect(() => {
    if (!open) {
      setBusy(false)
      setStatus(null)
      setNeedsUnmute(false)
      stopChatDeepAvatarEmotionAudio()
      return
    }
    // First gate: warning audible even if companion sound pref is off.
    void playChatDeepAvatarEmotionAudio({
      character,
      mood: 'concern',
      soundEnabled: true,
    }).then((res) => {
      if (res.needsUnmute) setNeedsUnmute(true)
    })
    return () => {
      stopChatDeepAvatarEmotionAudio()
    }
  }, [open, character])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onDismiss])

  if (!open || typeof document === 'undefined') return null

  const finishFolder = () => {
    setBusy(false)
    setStatus(null)
    onFolderBound()
  }

  const bindDirectory = async () => {
    setBusy(true)
    setStatus('Pick a folder…')
    try {
      const handle = await pickLocalDirectory()
      if (!handle) {
        setStatus('Cancelled.')
        return
      }
      await saveDirectoryHandle(CHAT_WORKSPACE_CONSENT_FOLDER_KEY, handle)
      // Best-effort read so the picker gesture feels complete; consent only needs the handle.
      void collectFromDirectoryHandle(handle).catch(() => undefined)
      finishFolder()
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Folder pick failed')
    } finally {
      setBusy(false)
    }
  }

  const bindFromFileList = async (files: FileList | File[]) => {
    setBusy(true)
    setStatus('Binding folder…')
    try {
      const mirrored = await collectFromFileList(files)
      if (!mirrored.length) {
        setStatus('No text files found — try another folder or agree to browser storage.')
        return
      }
      // Safari / webkitdirectory: no durable FS handle — treat successful mirror collect
      // as consent to keep working copies in-browser for this session + write LS flag path
      // is separate; here we still require an explicit LS agree OR Chromium handle.
      // Persist a sentinel via LS consent when only mirror is available.
      setStatus(
        `Found ${mirrored.length} files. Without File System Access, choose “Store in this browser”.`,
      )
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Folder bind failed')
    } finally {
      setBusy(false)
    }
  }

  return createPortal(
    <div
      className="aui-ws-consent-gate"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <button
        type="button"
        className="aui-ws-consent-gate-scrim"
        aria-label="Dismiss workspace consent"
        onClick={onDismiss}
      />
      <div className="aui-ws-consent-gate-card">
        <div className="aui-ws-consent-gate-avatar" aria-hidden>
          <ChatDeepAvatar mood="concern" size="hero" character={character} className="is-fx-pop" />
        </div>
        <p className="aui-ws-consent-gate-warning" role="status">
          Warning
        </p>
        <h2 id={titleId} className="aui-ws-consent-gate-title">
          Choose where Agent builds workspace files
        </h2>
        <p className="aui-ws-consent-gate-body">
          Before Agent can write harness workspace files, bind a local folder or agree that
          files may stay in this browser&apos;s storage. Look for the highlighted{' '}
          <strong>WS</strong> control.
        </p>
        <p className="aui-ws-consent-gate-caps">{CHAT_WORKSPACE_CONSENT_CAPS_COPY}</p>
        <div className="aui-ws-consent-gate-actions">
          {caps.showDirectoryPicker ? (
            <button
              type="button"
              className="aui-ws-consent-gate-btn is-primary"
              disabled={busy}
              onClick={() => void bindDirectory()}
            >
              Select local folder
            </button>
          ) : null}
          {caps.webkitDirectory && !caps.showDirectoryPicker ? (
            <button
              type="button"
              className="aui-ws-consent-gate-btn is-primary"
              disabled={busy}
              onClick={() => dirInputRef.current?.click()}
            >
              Select local folder
            </button>
          ) : null}
          {!caps.showDirectoryPicker ? (
            <button
              type="button"
              className="aui-ws-consent-gate-btn"
              disabled={busy}
              onClick={() => zipInputRef.current?.click()}
            >
              Upload .zip (then agree to browser storage)
            </button>
          ) : null}
          <button
            type="button"
            className="aui-ws-consent-gate-btn is-accent"
            disabled={busy}
            onClick={onAcceptLs}
          >
            Store in this browser (localStorage)
          </button>
          <button
            type="button"
            className="aui-ws-consent-gate-btn is-ghost"
            disabled={busy}
            onClick={onDismiss}
          >
            Not now
          </button>
        </div>
        {status ? (
          <p className="aui-ws-consent-gate-status" role="status">
            {status}
          </p>
        ) : null}
        {needsUnmute ? (
          <button
            type="button"
            className="aui-ws-consent-gate-unmute"
            onClick={() => {
              unmuteChatDeepAvatarEmotionAudio()
              setNeedsUnmute(false)
            }}
          >
            Tap for sound
          </button>
        ) : null}
      </div>
      <input
        ref={dirInputRef}
        type="file"
        // @ts-expect-error webkitdirectory is non-standard but widely supported
        webkitdirectory=""
        multiple
        hidden
        onChange={(e) => {
          const files = e.target.files
          e.target.value = ''
          if (files?.length) void bindFromFileList(files)
        }}
      />
      <input
        ref={zipInputRef}
        type="file"
        accept=".zip,application/zip"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (!file) return
          void (async () => {
            setBusy(true)
            setStatus('Reading zip…')
            try {
              const mirrored = await collectFromZipFile(file)
              setStatus(
                mirrored.length
                  ? `Found ${mirrored.length} files. Choose “Store in this browser” to continue.`
                  : 'No text files in zip — try another archive or agree to browser storage.',
              )
            } catch (err) {
              setStatus(err instanceof Error ? err.message : 'Zip failed')
            } finally {
              setBusy(false)
            }
          })()
        }}
      />
    </div>,
    document.body,
  )
}
