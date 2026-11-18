import { useMemo, useRef, useState } from 'react'
import type { ChatScheduleJob } from '../lib/chatSchedule'
import {
  CHAT_WORKSPACE_MAX_TEXT_CHARS,
  type ChatWorkspace,
  type ChatWorkspaceFile,
  normalizeWorkspacePath,
  upsertWorkspaceFile,
} from '../lib/chatWorkspace'

type Props = {
  workspace: ChatWorkspace | undefined
  onChange: (ws: ChatWorkspace) => void
  onClose: () => void
  /** Mobile: full-screen sheet. */
  sheet?: boolean
  scheduleJobs?: ChatScheduleJob[]
  onAddSchedule?: (prompt: string, cadence: ChatScheduleJob['cadence']) => void
  onRemoveSchedule?: (id: string) => void
  onToggleSchedule?: (id: string, enabled: boolean) => void
}

function previewMime(file: ChatWorkspaceFile): 'html' | 'text' {
  if (file.mime?.includes('html') || /\.html?$/i.test(file.path)) return 'html'
  return 'text'
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
}: Props) {
  const files = workspace?.files || []
  const [selectedPath, setSelectedPath] = useState<string | null>(files[0]?.path || null)
  const [draftPath, setDraftPath] = useState('notes/scratch.md')
  const [scheduleDraft, setScheduleDraft] = useState('')
  const [scheduleCadence, setScheduleCadence] = useState<ChatScheduleJob['cadence']>('daily')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const selected = useMemo(
    () => files.find((f) => f.path === selectedPath) || files[0] || null,
    [files, selectedPath],
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

  return (
    <aside
      className={`ds-chat-workspace${sheet ? ' is-sheet' : ''}`}
      aria-label="Harness workspace"
    >
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
          </div>
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
                <li key={f.id}>
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
              <div className="ds-chat-workspace-preview-meta">{selected.path}</div>
              {previewMime(selected) === 'html' && selected.text ? (
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
