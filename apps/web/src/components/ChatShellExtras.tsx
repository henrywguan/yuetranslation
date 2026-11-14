import { useEffect, useRef, useState } from 'react'
import type { ChatArtifact } from '../lib/chatArtifacts'
import type { ChatFileMeta, ChatSource, ChatThread } from '../lib/chatHistory'
import { CHAT_SKILLS, type ChatSkill } from '../lib/chatSkills'

function faviconForUrl(url: string): string {
  try {
    const host = new URL(url).hostname
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=32`
  } catch {
    return ''
  }
}

export function ChatSourcesList({
  sources,
  defaultOpen = true,
}: {
  sources: ChatSource[]
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  if (!sources.length) return null
  return (
    <div className={`ds-chat-sources${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className="ds-chat-sources-toggle"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="ds-chat-sources-label">Sources · {sources.length}</span>
        <span aria-hidden="true">{open ? '▾' : '▸'}</span>
      </button>
      {open ? (
        <ol className="ds-chat-sources-list">
          {sources.map((s, i) => {
            const fav = faviconForUrl(s.url)
            return (
              <li key={s.url}>
                <a href={s.url} target="_blank" rel="noopener noreferrer">
                  {fav ? (
                    <img className="ds-chat-source-fav" src={fav} alt="" width={16} height={16} loading="lazy" />
                  ) : (
                    <span className="ds-chat-source-index">{i + 1}</span>
                  )}
                  <span className="ds-chat-source-title">{s.title}</span>
                </a>
              </li>
            )
          })}
        </ol>
      ) : null}
    </div>
  )
}

export function ChatRelatedQuestions({
  questions,
  disabled,
  onPick,
}: {
  questions: string[]
  disabled?: boolean
  onPick: (q: string) => void
}) {
  if (!questions.length) return null
  return (
    <div className="ds-chat-related">
      <div className="ds-chat-related-label">Related</div>
      <div className="ds-chat-related-list">
        {questions.map((q) => (
          <button
            key={q}
            type="button"
            className="ds-chat-related-btn"
            disabled={disabled}
            onClick={() => onPick(q)}
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  )
}

export function ChatSkillMenu({
  skills,
  onPick,
}: {
  skills: ChatSkill[]
  onPick: (skill: ChatSkill) => void
}) {
  if (!skills.length) return null
  return (
    <ul className="ds-chat-skill-menu" role="listbox" aria-label="Chat skills">
      {skills.map((s) => (
        <li key={s.id}>
          <button type="button" className="ds-chat-skill-item" onClick={() => onPick(s)}>
            <code>{s.slash}</code>
            <span>{s.label}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}

export function ChatUserFiles({ files }: { files: ChatFileMeta[] }) {
  if (!files.length) return null
  return (
    <ul className="ds-chat-user-files">
      {files.map((f) => {
        const isImage = Boolean(f.mime?.startsWith('image/'))
        const isPdf = f.mime === 'application/pdf' || /\.pdf$/i.test(f.filename)
        return (
          <li key={f.fileId} className="ds-chat-user-file">
            <span className="ds-chat-user-file-badge" aria-hidden="true">
              {isImage ? 'IMG' : isPdf ? 'PDF' : 'FILE'}
            </span>
            <span className="ds-chat-user-file-name" title={f.filename}>
              {f.filename}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

export function ChatArtifactPanel({
  artifact,
  onClose,
}: {
  artifact: ChatArtifact | null
  onClose: () => void
}) {
  const frameRef = useRef<HTMLIFrameElement>(null)
  useEffect(() => {
    if (!artifact || (artifact.kind !== 'html' && artifact.kind !== 'svg')) return
    const frame = frameRef.current
    if (!frame) return
    const doc = frame.contentDocument
    if (!doc) return
    const body =
      artifact.kind === 'svg'
        ? `<!doctype html><html><body style="margin:0;display:grid;place-items:center;min-height:100vh;background:#fff">${artifact.source}</body></html>`
        : artifact.source
    doc.open()
    doc.write(body)
    doc.close()
  }, [artifact])

  if (!artifact) return null

  return (
    <aside className="ds-chat-artifact" aria-label="Artifact preview">
      <header className="ds-chat-artifact-head">
        <div>
          <div className="ds-chat-artifact-kicker">Artifact</div>
          <div className="ds-chat-artifact-title">{artifact.title}</div>
        </div>
        <button type="button" className="ds-chat-icon-btn" aria-label="Close artifact" onClick={onClose}>
          ×
        </button>
      </header>
      <div className="ds-chat-artifact-body">
        {artifact.kind === 'html' || artifact.kind === 'svg' ? (
          <iframe ref={frameRef} className="ds-chat-artifact-frame" title={artifact.title} sandbox="" />
        ) : artifact.kind === 'mermaid' ? (
          <pre className="ds-chat-artifact-code">{artifact.source}</pre>
        ) : (
          <pre className="ds-chat-artifact-code">
            <code>{artifact.source}</code>
          </pre>
        )}
      </div>
    </aside>
  )
}

export function ChatThreadRow({
  thread,
  active,
  busy,
  onSelect,
  onDelete,
  onRename,
  onTogglePin,
  onToggleArchive,
  onExportMd,
  onExportJson,
}: {
  thread: ChatThread
  active: boolean
  busy?: boolean
  onSelect: () => void
  onDelete: () => void
  onRename: (title: string) => void
  onTogglePin: () => void
  onToggleArchive: () => void
  onExportMd: () => void
  onExportJson: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(thread.title)
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    setTitle(thread.title)
  }, [thread.title])

  return (
    <li className={`ds-chat-thread-item${thread.archived ? ' is-archived' : ''}${thread.pinned ? ' is-pinned' : ''}`}>
      {editing ? (
        <form
          className="ds-chat-thread-rename"
          onSubmit={(e) => {
            e.preventDefault()
            onRename(title)
            setEditing(false)
          }}
        >
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            aria-label="Rename chat"
            autoFocus
            onBlur={() => {
              onRename(title)
              setEditing(false)
            }}
          />
        </form>
      ) : (
        <button
          type="button"
          className={`ds-chat-thread-btn${active ? ' is-active' : ''}`}
          onClick={onSelect}
        >
          {thread.pinned ? <span className="ds-chat-thread-pin" aria-hidden="true" /> : null}
          <span className="ds-chat-thread-title">{thread.title}</span>
        </button>
      )}
      <div className="ds-chat-thread-tools">
        <button
          type="button"
          className="ds-chat-thread-more"
          aria-label={`Options for ${thread.title}`}
          aria-expanded={menuOpen}
          disabled={busy}
          onClick={() => {
            setMenuOpen((v) => !v)
            setConfirmDelete(false)
          }}
        >
          ⋯
        </button>
        {menuOpen ? (
          <div className="ds-chat-thread-menu" role="menu">
            <button type="button" role="menuitem" onClick={() => { setEditing(true); setMenuOpen(false) }}>
              Rename
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                onTogglePin()
                setMenuOpen(false)
              }}
            >
              {thread.pinned ? 'Unpin' : 'Pin'}
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                onToggleArchive()
                setMenuOpen(false)
              }}
            >
              {thread.archived ? 'Unarchive' : 'Archive'}
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                onExportMd()
                setMenuOpen(false)
              }}
            >
              Export Markdown
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                onExportJson()
                setMenuOpen(false)
              }}
            >
              Export JSON
            </button>
            {confirmDelete ? (
              <button
                type="button"
                role="menuitem"
                className="is-danger"
                onClick={() => {
                  onDelete()
                  setMenuOpen(false)
                  setConfirmDelete(false)
                }}
              >
                Confirm delete
              </button>
            ) : (
              <button
                type="button"
                role="menuitem"
                className="is-danger"
                onClick={() => setConfirmDelete(true)}
              >
                Delete…
              </button>
            )}
          </div>
        ) : null}
      </div>
    </li>
  )
}

export { CHAT_SKILLS }
