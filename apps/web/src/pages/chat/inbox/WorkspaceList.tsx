import { useEffect, useId, useRef, useState } from 'react'
import type { ChatInboxWorkspace, ChatInboxWorkspaceKind } from '../../../lib/chatInbox'
import {
  openLocalFolderConnection,
  probeLocalFolderConnection,
  type LocalFolderConnectionInfo,
} from '../../../lib/chatLocalFolder'

const KIND_LABEL: Record<ChatInboxWorkspaceKind, string> = {
  internal: 'Sandbox',
  local: 'Local',
  github: 'GitHub',
  files: 'Files',
}

const CREATE_OPTIONS: { kind: Exclude<ChatInboxWorkspaceKind, 'files'>; label: string }[] = [
  { kind: 'internal', label: 'Internal sandbox' },
  { kind: 'local', label: 'Local folder' },
  { kind: 'github', label: 'GitHub repo' },
]

function formatAccessedAt(ts: number): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(ts))
  } catch {
    return new Date(ts).toLocaleString()
  }
}

function permissionLabel(info: LocalFolderConnectionInfo | null, probing: boolean): string {
  if (probing && !info) return 'Checking…'
  if (!info) return 'Unknown'
  if (!info.hasHandle) return 'Mirror only (no live folder handle)'
  if (info.permission === 'granted') return 'Connected · access granted'
  if (info.permission === 'prompt') return 'Connected · permission needed'
  if (info.permission === 'denied') return 'Connected · permission denied'
  return 'Connected · handle saved'
}

export function WorkspaceList({
  workspaces,
  open,
  onToggle,
  onCreate,
  onDelete,
  onOpen,
  onTouchLocal,
}: {
  workspaces: ChatInboxWorkspace[]
  open: boolean
  onToggle: () => void
  onCreate: (kind: ChatInboxWorkspaceKind) => void
  onDelete: (workspaceId: string) => void
  /** Open a promoted Thread files workspace into the Harness panel. */
  onOpen?: (workspaceId: string) => void
  /** Bump local workspace last-access timestamp (device-local metadata). */
  onTouchLocal?: (workspaceId: string) => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const menuId = useId()
  const [expandedLocalId, setExpandedLocalId] = useState<string | null>(null)
  const [localInfo, setLocalInfo] = useState<LocalFolderConnectionInfo | null>(null)
  const [localBusy, setLocalBusy] = useState(false)
  const [localStatus, setLocalStatus] = useState<string | null>(null)
  const [probing, setProbing] = useState(false)

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

  useEffect(() => {
    if (!expandedLocalId) {
      setLocalInfo(null)
      setLocalStatus(null)
      setProbing(false)
      return
    }
    let cancelled = false
    setProbing(true)
    setLocalStatus(null)
    void probeLocalFolderConnection(expandedLocalId).then((info) => {
      if (cancelled) return
      setLocalInfo(info)
      setProbing(false)
    })
    return () => {
      cancelled = true
    }
  }, [expandedLocalId])

  const pick = (kind: ChatInboxWorkspaceKind) => {
    setMenuOpen(false)
    onCreate(kind)
  }

  const toggleLocalExpand = (workspaceId: string) => {
    setExpandedLocalId((cur) => (cur === workspaceId ? null : workspaceId))
  }

  const openLocalFolder = async (workspaceId: string) => {
    if (localBusy) return
    setLocalBusy(true)
    setLocalStatus('Opening folder…')
    try {
      const info = await openLocalFolderConnection(workspaceId)
      setLocalInfo(info)
      setExpandedLocalId(workspaceId)
      if (!info.hasHandle) {
        setLocalStatus(
          'No live File System Access handle on this device — connection is a sandbox mirror (Safari/zip path).',
        )
        return
      }
      if (info.permission === 'granted') {
        onTouchLocal?.(workspaceId)
        setLocalStatus(
          info.name
            ? `Opened “${info.name}” — access granted. (Browsers do not reveal the full disk path.)`
            : 'Folder access granted. (Browsers do not reveal the full disk path.)',
        )
        return
      }
      if (info.permission === 'denied') {
        setLocalStatus('Folder permission denied — use the site settings to allow access, then try again.')
        return
      }
      setLocalStatus('Folder handle found — grant access when the browser prompts.')
    } catch (err) {
      setLocalStatus(err instanceof Error ? err.message : 'Could not open folder')
    } finally {
      setLocalBusy(false)
    }
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
          <ul className="inbox-list inbox-ws-tree">
            {workspaces.map((w) => {
              const localConnected = w.kind === 'local' && Boolean(w.ref)
              const expanded = localConnected && expandedLocalId === w.id
              return (
                <li
                  key={w.id}
                  className={`inbox-ws-node${expanded ? ' is-expanded' : ''}${localConnected ? ' is-local' : ''}`}
                >
                  <div className="inbox-list-item">
                    {localConnected ? (
                      <button
                        type="button"
                        className={`inbox-project-expand${expanded ? ' is-open' : ''}`}
                        aria-label={expanded ? `Collapse ${w.title}` : `Expand ${w.title}`}
                        aria-expanded={expanded}
                        onClick={() => toggleLocalExpand(w.id)}
                      >
                        ▸
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="inbox-list-btn"
                      title={
                        localConnected
                          ? 'Click or double-click to show connection properties'
                          : w.kind === 'files'
                            ? `Open ${w.title}`
                            : w.ref || w.title
                      }
                      onClick={() => {
                        if (localConnected) {
                          toggleLocalExpand(w.id)
                          return
                        }
                        if (w.kind === 'files') onOpen?.(w.id)
                      }}
                      onDoubleClick={(e) => {
                        if (!localConnected) return
                        e.preventDefault()
                        e.stopPropagation()
                        setExpandedLocalId(w.id)
                        void openLocalFolder(w.id)
                      }}
                    >
                      {w.title}
                      {w.kind !== 'files' && w.ref && !localConnected
                        ? ` · ${w.ref.slice(0, 12)}…`
                        : ''}
                    </button>
                    {localConnected ? (
                      <span
                        className="inbox-ws-connected"
                        role="status"
                        aria-label="Local folder connected"
                        title="Local folder connected"
                      >
                        <span className="inbox-ws-connected-dot" aria-hidden />
                        Connected
                      </span>
                    ) : (
                      <span className="inbox-workspace-kind">{KIND_LABEL[w.kind]}</span>
                    )}
                    <button
                      type="button"
                      className="inbox-list-del"
                      aria-label={`Remove ${w.title}`}
                      onClick={() => onDelete(w.id)}
                    >
                      ×
                    </button>
                  </div>
                  {expanded ? (
                    <div
                      className="inbox-ws-local-props"
                      role="region"
                      aria-label={`${w.title} connection properties`}
                    >
                      <dl className="inbox-ws-local-props-grid">
                        <div>
                          <dt>Name</dt>
                          <dd>{localInfo?.name || w.title}</dd>
                        </div>
                        <div>
                          <dt>Status</dt>
                          <dd>{permissionLabel(localInfo, probing)}</dd>
                        </div>
                        <div>
                          <dt>Last access</dt>
                          <dd>{formatAccessedAt(w.updatedAt)}</dd>
                        </div>
                        <div>
                          <dt>Mirror</dt>
                          <dd className="inbox-ws-local-mono" title={w.ref || undefined}>
                            {w.ref ? `${w.ref.slice(0, 18)}${w.ref.length > 18 ? '…' : ''}` : '—'}
                          </dd>
                        </div>
                        <div>
                          <dt>Path</dt>
                          <dd>
                            {localInfo?.hasHandle
                              ? 'Bound on this device (full path hidden by browser)'
                              : 'Not available — zip/Safari mirror has no live path'}
                          </dd>
                        </div>
                      </dl>
                      <div className="inbox-ws-local-actions">
                        <button
                          type="button"
                          className="inbox-new-chat"
                          disabled={localBusy}
                          onClick={() => void openLocalFolder(w.id)}
                        >
                          Open folder
                        </button>
                        <button
                          type="button"
                          className="inbox-new-chat inbox-new-chat--quiet"
                          disabled={probing || localBusy}
                          onClick={() => {
                            setProbing(true)
                            void probeLocalFolderConnection(w.id).then((info) => {
                              setLocalInfo(info)
                              setProbing(false)
                              setLocalStatus(
                                info.hasHandle
                                  ? info.name
                                    ? `Properties · “${info.name}”`
                                    : 'Properties refreshed'
                                  : 'Mirror-only connection — no File System Access handle stored here',
                              )
                            })
                          }}
                        >
                          Refresh properties
                        </button>
                      </div>
                      {localStatus ? <p className="inbox-empty inbox-ws-local-status">{localStatus}</p> : null}
                    </div>
                  ) : null}
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="inbox-empty">
            Sandboxes, local folders, GitHub repos, and saved Thread files attach here. Promote a
            Harness tree with Save to Workspaces.
          </p>
        )
      ) : null}
    </section>
  )
}
