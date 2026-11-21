import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import type { ChatScheduleJob } from '../lib/chatSchedule'
import {
  CHAT_WORKSPACE_MAX_TEXT_CHARS,
  downloadWorkspaceFile,
  downloadWorkspaceZip,
  type ChatWorkspace,
  type ChatWorkspaceFile,
  normalizeWorkspacePath,
  upsertWorkspaceFile,
} from '../lib/chatWorkspace'
import { suggestPromotedWorkspaceTitle } from '../lib/chatPromotedWorkspace'
import {
  CHAT_WORKSPACE_PANEL_WIDTH_DEFAULT,
  CHAT_WORKSPACE_PANEL_WIDTH_MAX,
  CHAT_WORKSPACE_PANEL_WIDTH_MIN,
  clampChatWorkspacePanelWidth,
  readChatWorkspacePanelWidth,
  writeChatWorkspacePanelWidth,
} from '../lib/chatUiPrefs'

type Props = {
  workspace: ChatWorkspace | undefined
  onChange: (ws: ChatWorkspace) => void
  onClose: () => void
  /** Narrow viewport: sheet below the chat topbar (Δ / WS stay clickable). */
  sheet?: boolean
  scheduleJobs?: ChatScheduleJob[]
  onAddSchedule?: (prompt: string, cadence: ChatScheduleJob['cadence']) => void
  onRemoveSchedule?: (id: string) => void
  onToggleSchedule?: (id: string, enabled: boolean) => void
  /**
   * Promote Thread files into Inbox → Workspaces (kind `files`).
   * Returns the saved workspace id when successful.
   */
  onPromoteToWorkspaces?: (opts: {
    title: string
    workspace: ChatWorkspace
  }) => Promise<string | void> | string | void
  /** Optional live width override from parent shell (keeps main margin in sync). */
  panelWidth?: number
  onPanelWidthChange?: (px: number, persist: boolean) => void
  /** Agent workspace-write consent gate — red shake pulse on panel chrome. */
  consentHighlight?: boolean
}

function previewMime(file: ChatWorkspaceFile): 'html' | 'text' {
  if (file.mime?.includes('html') || /\.html?$/i.test(file.path)) return 'html'
  return 'text'
}

function slugZipName(title: string): string {
  const base = title.replace(/[^\w.\u3400-\u9fff-]+/g, '_').slice(0, 48) || 'workspace-files'
  return base.endsWith('.zip') ? base : `${base}.zip`
}

export function ChatWorkspacePanel({
  workspace,
  onChange,
  onClose,
  sheet,
  scheduleJobs = [],
  onAddSchedule,
  onRemoveSchedule,
  onToggleSchedule,
  onPromoteToWorkspaces,
  panelWidth: panelWidthProp,
  onPanelWidthChange,
  consentHighlight = false,
}: Props) {
  const files = workspace?.files || []
  const [selectedPath, setSelectedPath] = useState<string | null>(files[0]?.path || null)
  const [checked, setChecked] = useState<Set<string>>(() => new Set())
  const [draftPath, setDraftPath] = useState('notes/scratch.md')
  const [scheduleDraft, setScheduleDraft] = useState('')
  const [scheduleCadence, setScheduleCadence] = useState<ChatScheduleJob['cadence']>('daily')
  const [promoteBusy, setPromoteBusy] = useState(false)
  const [promoteNote, setPromoteNote] = useState<string | null>(null)
  const [previewExpanded, setPreviewExpanded] = useState(false)
  const [localWidth, setLocalWidth] = useState(() => readChatWorkspacePanelWidth())
  const [resizing, setResizing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const resizeDrag = useRef<{ startX: number; startW: number } | null>(null)
  const widthRef = useRef(localWidth)

  const width = panelWidthProp ?? localWidth
  widthRef.current = width

  useEffect(() => {
    if (!previewExpanded) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPreviewExpanded(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [previewExpanded])

  useEffect(() => {
    if (!resizing) return
    const prev = document.body.style.cursor
    const prevSelect = document.body.style.userSelect
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    return () => {
      document.body.style.cursor = prev
      document.body.style.userSelect = prevSelect
    }
  }, [resizing])

  const selected = useMemo(
    () => files.find((f) => f.path === selectedPath) || files[0] || null,
    [files, selectedPath],
  )

  const allSelected = files.length > 0 && files.every((f) => checked.has(f.path))
  const checkedFiles = useMemo(
    () => files.filter((f) => checked.has(f.path)),
    [files, checked],
  )

  const writeFile = (path: string, text: string, mime?: string) => {
    const next = upsertWorkspaceFile(workspace, { path, text, mime })
    onChange(next)
    setSelectedPath(normalizeWorkspacePath(path) || path)
  }

  const onUploadText = async (file: File | null) => {
    if (!file) return
    const text = (await file.text()).slice(0, CHAT_WORKSPACE_MAX_TEXT_CHARS)
    const path = `uploads/${file.name.replace(/[^\w.\u3400-\u9fff-]+/g, '_').slice(0, 80) || 'file.txt'}`
    writeFile(path, text, file.type || 'text/plain')
  }

  const applyWidth = (px: number, persist: boolean) => {
    const next = clampChatWorkspacePanelWidth(
      px,
      typeof window !== 'undefined' ? window.innerWidth : undefined,
    )
    widthRef.current = next
    if (onPanelWidthChange) onPanelWidthChange(next, persist)
    else {
      setLocalWidth(next)
      if (persist) writeChatWorkspacePanelWidth(next)
    }
  }

  const onResizePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (sheet) return
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 900px)').matches) return
    if (e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()
    resizeDrag.current = { startX: e.clientX, startW: width }
    setResizing(true)
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const onResizePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = resizeDrag.current
    if (!drag) return
    // Dragging the left edge: moving left grows the panel.
    applyWidth(drag.startW + (drag.startX - e.clientX), false)
  }

  const endResize = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!resizeDrag.current) return
    resizeDrag.current = null
    setResizing(false)
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      /* already released */
    }
    writeChatWorkspacePanelWidth(widthRef.current)
    onPanelWidthChange?.(widthRef.current, true)
  }

  const toggleChecked = (path: string) => {
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  const selectAll = () => {
    if (allSelected) {
      setChecked(new Set())
      return
    }
    setChecked(new Set(files.map((f) => f.path)))
  }

  const downloadHighlighted = () => {
    if (!selected) return
    downloadWorkspaceFile(selected)
  }

  const downloadAll = () => {
    const title = suggestPromotedWorkspaceTitle(workspace)
    downloadWorkspaceZip(files, slugZipName(title))
  }

  const downloadChecked = () => {
    if (!checkedFiles.length) return
    if (checkedFiles.length === 1) {
      downloadWorkspaceFile(checkedFiles[0]!)
      return
    }
    const title = suggestPromotedWorkspaceTitle({
      files: checkedFiles,
      updatedAt: Date.now(),
    })
    downloadWorkspaceZip(checkedFiles, slugZipName(title))
  }

  const promote = async () => {
    if (!onPromoteToWorkspaces || !files.length || promoteBusy) return
    const suggested = suggestPromotedWorkspaceTitle(workspace)
    const raw =
      typeof window !== 'undefined'
        ? window.prompt('Name for Workspaces entry', suggested)
        : suggested
    if (raw == null) return
    const title = raw.trim().slice(0, 80) || suggested
    setPromoteBusy(true)
    setPromoteNote(null)
    try {
      const pruned = workspace || { files, updatedAt: Date.now() }
      await onPromoteToWorkspaces({ title, workspace: pruned })
      setPromoteNote(`Saved “${title}” to Workspaces`)
    } catch (err) {
      setPromoteNote(err instanceof Error ? err.message : 'Promote failed')
    } finally {
      setPromoteBusy(false)
    }
  }

  const panelStyle =
    sheet || (typeof window !== 'undefined' && window.matchMedia('(max-width: 900px)').matches)
      ? undefined
      : ({ ['--ds-workspace-w' as string]: `${width}px` } as CSSProperties)

  const isHtmlPreview = selected && previewMime(selected) === 'html' && selected.text

  return (
    <aside
      className={`ds-chat-workspace${sheet ? ' is-sheet' : ''}${resizing ? ' is-resizing' : ''}${previewExpanded ? ' is-preview-expanded' : ''}${consentHighlight ? ' is-ws-consent-shake' : ''}`}
      style={panelStyle}
      aria-label="Harness workspace"
    >
      {!sheet ? (
        <div
          className="ds-chat-workspace-resize"
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize workspace"
          aria-valuenow={width}
          aria-valuemin={CHAT_WORKSPACE_PANEL_WIDTH_MIN}
          aria-valuemax={CHAT_WORKSPACE_PANEL_WIDTH_MAX}
          title="Drag to resize · double-click to reset"
          tabIndex={0}
          onPointerDown={onResizePointerDown}
          onPointerMove={onResizePointerMove}
          onPointerUp={endResize}
          onPointerCancel={endResize}
          onDoubleClick={() => applyWidth(CHAT_WORKSPACE_PANEL_WIDTH_DEFAULT, true)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft') {
              e.preventDefault()
              applyWidth(width + 16, true)
            } else if (e.key === 'ArrowRight') {
              e.preventDefault()
              applyWidth(width - 16, true)
            } else if (e.key === 'Home') {
              e.preventDefault()
              applyWidth(CHAT_WORKSPACE_PANEL_WIDTH_MAX, true)
            } else if (e.key === 'End') {
              e.preventDefault()
              applyWidth(CHAT_WORKSPACE_PANEL_WIDTH_MIN, true)
            }
          }}
        />
      ) : null}

      <header className="ds-chat-workspace-head">
        <div>
          <div className="ds-chat-workspace-kicker">Workspace</div>
          <div className="ds-chat-workspace-title">Thread files</div>
        </div>
        <button type="button" className="ds-chat-icon-btn" aria-label="Close workspace" onClick={onClose}>
          ×
        </button>
      </header>

      <div className="ds-chat-workspace-body">
        <div className="ds-chat-workspace-tree">
          <div className="ds-chat-workspace-toolbar">
            <button
              type="button"
              className="ds-chat-workspace-btn"
              onClick={() => fileInputRef.current?.click()}
            >
              Upload
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="text/*,.md,.json,.csv,.html,.svg,.ts,.tsx,.js,.py"
              hidden
              onChange={(e) => {
                void onUploadText(e.target.files?.[0] || null)
                e.target.value = ''
              }}
            />
            <button
              type="button"
              className="ds-chat-workspace-btn"
              onClick={() => {
                const path = normalizeWorkspacePath(draftPath) || 'notes/scratch.md'
                writeFile(path, selected?.path === path ? selected.text || '' : '')
              }}
            >
              New file
            </button>
            <button
              type="button"
              className="ds-chat-workspace-btn"
              disabled={!files.length}
              onClick={selectAll}
            >
              {allSelected ? 'Clear' : 'Select all'}
            </button>
            <button
              type="button"
              className="ds-chat-workspace-btn"
              disabled={!files.length}
              onClick={downloadAll}
              title="Download all files as a zip"
            >
              Download all
            </button>
            <button
              type="button"
              className="ds-chat-workspace-btn"
              disabled={!checkedFiles.length}
              onClick={downloadChecked}
              title="Download checked files"
            >
              Download checked
            </button>
            <button
              type="button"
              className="ds-chat-workspace-btn"
              disabled={!selected}
              onClick={downloadHighlighted}
              title="Download the highlighted file"
            >
              Download file
            </button>
            {onPromoteToWorkspaces ? (
              <button
                type="button"
                className="ds-chat-workspace-btn is-accent"
                disabled={!files.length || promoteBusy}
                onClick={() => {
                  void promote()
                }}
                title="Save this tree as a named Workspaces entry"
              >
                {promoteBusy ? 'Saving…' : 'Save to Workspaces'}
              </button>
            ) : null}
          </div>
          {promoteNote ? <p className="ds-chat-workspace-hint">{promoteNote}</p> : null}
          <input
            className="ds-chat-workspace-path"
            value={draftPath}
            onChange={(e) => setDraftPath(e.target.value)}
            placeholder="path/to/file.md"
            aria-label="New file path"
          />
          {files.length ? (
            <ul className="ds-chat-workspace-files">
              {files.map((f) => (
                <li key={f.id} className="ds-chat-workspace-file-row">
                  <label className="ds-chat-workspace-check">
                    <input
                      type="checkbox"
                      checked={checked.has(f.path)}
                      onChange={() => toggleChecked(f.path)}
                      aria-label={`Select ${f.path}`}
                    />
                  </label>
                  <button
                    type="button"
                    className={`ds-chat-workspace-file${selected?.path === f.path ? ' is-on' : ''}`}
                    onClick={() => setSelectedPath(f.path)}
                  >
                    {f.path}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="ds-chat-workspace-empty">
              Empty workspace. Upload a note or ask the model to write a file.
            </p>
          )}
        </div>

        <div className="ds-chat-workspace-preview">
          {selected ? (
            <>
              <div className="ds-chat-workspace-preview-meta-row">
                <div className="ds-chat-workspace-preview-meta">{selected.path}</div>
                <div className="ds-chat-workspace-preview-actions">
                  {isHtmlPreview ? (
                    <button
                      type="button"
                      className="ds-chat-workspace-btn"
                      onClick={() => setPreviewExpanded((v) => !v)}
                      aria-pressed={previewExpanded}
                    >
                      {previewExpanded ? 'Exit fullscreen' : 'Expand preview'}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="ds-chat-workspace-btn"
                    onClick={downloadHighlighted}
                  >
                    Download
                  </button>
                </div>
              </div>
              {isHtmlPreview ? (
                <iframe
                  className="ds-chat-workspace-frame"
                  title={selected.path}
                  sandbox=""
                  srcDoc={selected.text}
                />
              ) : (
                <textarea
                  className="ds-chat-workspace-editor"
                  value={selected.text || ''}
                  spellCheck={false}
                  onChange={(e) => writeFile(selected.path, e.target.value, selected.mime)}
                  aria-label={`Edit ${selected.path}`}
                />
              )}
            </>
          ) : (
            <p className="ds-chat-workspace-empty">Select a file to preview.</p>
          )}
        </div>

        {previewExpanded && isHtmlPreview ? (
          <div className="ds-chat-workspace-preview-overlay" role="dialog" aria-label="HTML preview">
            <div className="ds-chat-workspace-preview-overlay-bar">
              <span>{selected!.path}</span>
              <button
                type="button"
                className="ds-chat-workspace-btn"
                onClick={() => setPreviewExpanded(false)}
              >
                Close
              </button>
            </div>
            <iframe
              className="ds-chat-workspace-frame is-fullscreen"
              title={`${selected!.path} fullscreen`}
              sandbox=""
              srcDoc={selected!.text}
            />
          </div>
        ) : null}

        <div className="ds-chat-workspace-schedule">
          <div className="ds-chat-workspace-kicker">Scheduled</div>
          <p className="ds-chat-workspace-hint">Runs in this tab while Harness chat is open.</p>
          <div className="ds-chat-workspace-schedule-form">
            <input
              className="ds-chat-workspace-path"
              value={scheduleDraft}
              onChange={(e) => setScheduleDraft(e.target.value)}
              placeholder="every Friday summarize notes"
              aria-label="Scheduled prompt"
            />
            <select
              className="ds-chat-workspace-select"
              value={scheduleCadence}
              onChange={(e) => setScheduleCadence(e.target.value as ChatScheduleJob['cadence'])}
              aria-label="Cadence"
            >
              <option value="once">Once</option>
              <option value="hourly">Hourly</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
            <button
              type="button"
              className="ds-chat-workspace-btn"
              disabled={!scheduleDraft.trim() || !onAddSchedule}
              onClick={() => {
                onAddSchedule?.(scheduleDraft.trim(), scheduleCadence)
                setScheduleDraft('')
              }}
            >
              Add
            </button>
          </div>
          {scheduleJobs.length ? (
            <ul className="ds-chat-workspace-jobs">
              {scheduleJobs.map((j) => (
                <li key={j.id} className="ds-chat-workspace-job">
                  <label className="ds-chat-workspace-job-label">
                    <input
                      type="checkbox"
                      checked={j.enabled}
                      onChange={(e) => onToggleSchedule?.(j.id, e.target.checked)}
                    />
                    <span>
                      <strong>{j.label || j.prompt.slice(0, 42)}</strong>
                      <small>
                        {j.cadence} · next {new Date(j.nextAt).toLocaleString()}
                      </small>
                    </span>
                  </label>
                  <button
                    type="button"
                    className="ds-chat-workspace-btn is-danger"
                    aria-label="Remove schedule"
                    onClick={() => onRemoveSchedule?.(j.id)}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="ds-chat-workspace-empty">No scheduled prompts yet.</p>
          )}
        </div>
      </div>
    </aside>
  )
}
