import type { ChatInboxWorkspace, ChatInboxWorkspaceKind } from '../../../lib/chatInbox'

const KIND_LABEL: Record<ChatInboxWorkspaceKind, string> = {
  internal: 'Sandbox',
  local: 'Local',
  github: 'GitHub',
}

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
        <button
          type="button"
          className="inbox-section-add"
          aria-label="New internal sandbox"
          title="New internal sandbox"
          onClick={() => onCreate('internal')}
        >
          +
        </button>
      </div>
      {open ? (
        <>
          {workspaces.length ? (
            <ul className="inbox-list">
              {workspaces.map((w) => (
                <li key={w.id} className="inbox-list-item">
                  <button type="button" className="inbox-list-btn" title={w.title}>
                    {w.title}
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
          )}
          <div className="inbox-list" style={{ marginTop: '0.15rem' }}>
            <button type="button" className="inbox-new-chat" onClick={() => onCreate('local')}>
              + Local folder
            </button>
            <button type="button" className="inbox-new-chat" onClick={() => onCreate('github')}>
              + GitHub repo
            </button>
          </div>
        </>
      ) : null}
    </section>
  )
}
