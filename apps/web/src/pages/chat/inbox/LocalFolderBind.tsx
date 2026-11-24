import { useRef, useState } from 'react'
import {
  collectFromDirectoryHandle,
  collectFromFileList,
  collectFromZipFile,
  localFolderCapabilities,
  pickLocalDirectory,
  saveDirectoryHandle,
} from '../../../lib/chatLocalFolder'
import { mirrorFilesToNewSandbox } from '../../../lib/chatLocalFolderMirror'

/**
 * Bind a local folder (FS Access) or Safari/webkitdirectory/zip, then mirror into a sandbox.
 */
export function LocalFolderBind({
  workspaceId,
  projectId,
  onBound,
  onCancel,
}: {
  workspaceId: string
  projectId?: string
  onBound: (result: { sessionId: string; note: string; fileCount: number }) => void
  onCancel: () => void
}) {
  const caps = localFolderCapabilities()
  const dirInputRef = useRef<HTMLInputElement>(null)
  const zipInputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  const runMirror = async (files: Awaited<ReturnType<typeof collectFromFileList>>) => {
    // Empty folders still bind — Agent/Harness must be able to write into them.
    // Soft tip only during bind; permanent note must not claim “0 files” after Agent writes.
    const emptyDuringBind = !files.length
    setBusy(true)
    setStatus(
      emptyDuringBind
        ? 'Folder is empty (or no text files to mirror) — still connecting so Agent can write here.'
        : `Mirroring ${files.length} files…`,
    )
    try {
      const result = await mirrorFilesToNewSandbox({
        files,
        title: 'Local folder mirror',
        projectId,
        onProgress: (done, total) => setStatus(`Mirroring ${done}/${total}…`),
      })
      const note = emptyDuringBind
        ? 'Connected — empty folder ready for Agent writes (files show in Diffs / Workspace).'
        : result.note || `Mirrored ${result.written} files.`
      onBound({
        sessionId: result.sessionId,
        note,
        fileCount: result.written,
      })
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Mirror failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="inbox-local-bind" role="dialog" aria-label="Bind local folder">
      <p className="inbox-empty" style={{ paddingTop: 0 }}>
        Point chat at a directory. Chromium uses the File System Access API; Safari can pick a
        folder or upload a zip — files mirror into an internal sandbox so agents can edit them.
      </p>
      <div className="inbox-project-actions">
        {caps.showDirectoryPicker ? (
          <button
            type="button"
            className="inbox-new-chat"
            disabled={busy}
            onClick={() => {
              void (async () => {
                setBusy(true)
                setStatus('Pick a folder…')
                try {
                  const handle = await pickLocalDirectory()
                  if (!handle) {
                    setStatus('Cancelled.')
                    return
                  }
                  await saveDirectoryHandle(workspaceId, handle)
                  const files = await collectFromDirectoryHandle(handle)
                  await runMirror(files)
                } catch (err) {
                  setStatus(err instanceof Error ? err.message : 'Folder pick failed')
                } finally {
                  setBusy(false)
                }
              })()
            }}
          >
            Choose folder
          </button>
        ) : null}
        {caps.webkitDirectory ? (
          <button
            type="button"
            className="inbox-new-chat"
            disabled={busy}
            onClick={() => dirInputRef.current?.click()}
          >
            Choose folder (Safari)
          </button>
        ) : null}
        <button
          type="button"
          className="inbox-new-chat"
          disabled={busy}
          onClick={() => zipInputRef.current?.click()}
        >
          Upload .zip mirror
        </button>
        <button type="button" className="inbox-new-chat" disabled={busy} onClick={onCancel}>
          Cancel
        </button>
      </div>
      <input
        ref={dirInputRef}
        type="file"
        // @ts-expect-error webkitdirectory is non-standard but widely supported
        webkitdirectory=""
        multiple
        hidden
        onChange={(e) => {
          const list = e.target.files
          if (!list?.length) return
          void (async () => {
            setBusy(true)
            try {
              const files = await collectFromFileList(list)
              await runMirror(files)
            } finally {
              setBusy(false)
              e.target.value = ''
            }
          })()
        }}
      />
      <input
        ref={zipInputRef}
        type="file"
        accept=".zip,application/zip"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (!file) return
          void (async () => {
            setBusy(true)
            setStatus('Reading zip…')
            try {
              const files = await collectFromZipFile(file)
              await runMirror(files)
            } catch (err) {
              setStatus(err instanceof Error ? err.message : 'Zip failed')
            } finally {
              setBusy(false)
              e.target.value = ''
            }
          })()
        }}
      />
      {status ? <p className="inbox-empty">{status}</p> : null}
    </div>
  )
}
