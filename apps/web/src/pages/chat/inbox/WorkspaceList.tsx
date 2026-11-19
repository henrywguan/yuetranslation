import { useEffect, useId, useRef, useState } from 'react'
import type { ChatInboxWorkspace, ChatInboxWorkspaceKind } from '../../../lib/chatInbox'

const KIND_LABEL: Record<ChatInboxWorkspaceKind, string> = {
  internal: 'Sandbox',
  local: 'Local',
  github: 'GitHub',
}

const CREATE_OPTIONS: { kind: ChatInboxWorkspaceKind; label: string }[] = [
  { kind: 'internal', label: 'Internal sandbox' },
  { kind: 'local', label: 'Local folder' },
  { kind: 'github', label: 'GitHub repo' },
]

export function WorkspaceList({
  workspaces,
  open,
  onToggle,
  onCreate,
  onDelete,
}: {
  workspaces: ChatInboxWorkspace[]
  open: boolean
  onToggle: () => void
  onCreate: (kind: ChatInboxWorkspaceKind) => void
  onDelete: (workspaceId: string) => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const menuId = useId()

  useEffect(() => {
    if (!menuOpen) return
    const onPointer = (e: MouseEvent | PointerEvent) => {
      if (!menuRef.current) return
      if (e.target instanceof Node && menuRef.current.contains(e.target)) return
      setMenuOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  const pick = (kind: ChatInboxWorkspaceKind) => {
    setMenuOpen(false)
    onCreate(kind)
  }

  return (
    <section className="inbox-section" aria-label="Workspaces">
      <div className="inbox-section-head">
        <button type="button" className="inbox-section-toggle" onClick={onToggle} aria-expanded={open}>
          <span className={`inbox-section-chevron${open ? ' is-open' : ''}`} aria-hidden>
            ▸
          </span>
          Workspaces
          <span aria-hidden>· {workspaces.length}</span>
        </button>
        <div className="inbox-section-add-wrap" ref={menuRef}>
          <button
            type="button"
            className="inbox-section-add"
            aria-label="Add workspace"
            title="Add workspace"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-controls={menuId}
            onClick={() => setMenuOpen((v) => !v)}
          >
            +
          </button>
          {menuOpen ? (
            <div className="inbox-ws-menu" id={menuId} role="menu" aria-label="Add workspace">
              {CREATE_OPTIONS.map((opt) => (
                <button
                  key={opt.kind}
                  type="button"
                  role="menuitem"
                  className="inbox-ws-menu-item"
                  onClick={() => pick(opt.kind)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
      {open ? (
        workspaces.length ? (
          <ul className="inbox-list">
            {workspaces.map((w) => (
              <li key={w.id} className="inbox-list-item">
                <button type="button" className="inbox-list-btn" title={w.ref || w.title}>
                  {w.title}
                  {w.ref ? ` · ${w.ref.slice(0, 12)}…` : ''}
                </button>
                <span className="inbox-workspace-kind">{KIND_LABEL[w.kind]}</span>
                <button
                  type="button"
                  className="inbox-list-del"
                  aria-label={`Remove ${w.title}`}
                  onClick={() => onDelete(w.id)}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="inbox-empty">
            Sandboxes, local folders, and GitHub repos attach here. Coding runners land in later
            phases.
          </p>
        )
      ) : null}
    </section>
  )
}
