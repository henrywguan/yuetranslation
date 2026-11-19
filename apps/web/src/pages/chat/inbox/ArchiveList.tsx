import type { ChatThread } from '../../../lib/chatHistory'
import { DeleteIcon, UnarchiveIcon } from './InboxIcons'

export function ArchiveList({
  threads,
  activeId,
  open,
  onToggle,
  onSelect,
  onRestore,
  onDelete,
}: {
  threads: ChatThread[]
  activeId: string
  open: boolean
  onToggle: () => void
  onSelect: (threadId: string) => void
  onRestore: (threadId: string) => void
  onDelete: (threadId: string) => void
}) {
  const archived = threads.filter((t) => t.archived && t.id !== 'boot')

  return (
    <section className="inbox-section" aria-label="Archive">
      <div className="inbox-section-head">
        <button type="button" className="inbox-section-toggle" onClick={onToggle} aria-expanded={open}>
          <span className={`inbox-section-chevron${open ? ' is-open' : ''}`} aria-hidden>
            ▸
          </span>
          Archive
          <span aria-hidden>· {archived.length}</span>
        </button>
      </div>
      {open ? (
        archived.length ? (
          <ul className="inbox-list">
            {archived.map((t) => {
              const active = activeId === t.id
              return (
                <li key={t.id} className={`inbox-list-item inbox-list-item--tools${active ? ' is-active' : ''}`}>
                  <button
                    type="button"
                    className="inbox-list-btn"
                    onClick={() => onSelect(t.id)}
                    title={t.title}
                  >
                    {t.title}
                  </button>
                  <button
                    type="button"
                    className="inbox-list-action"
                    aria-label={`Restore ${t.title}`}
                    title="Restore"
                    onClick={() => onRestore(t.id)}
                  >
                    <UnarchiveIcon />
                  </button>
                  <button
                    type="button"
                    className="inbox-list-del"
                    aria-label={`Delete ${t.title}`}
                    title="Delete"
                    onClick={() => onDelete(t.id)}
                  >
                    <DeleteIcon size={13} />
                  </button>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="inbox-empty">Archived chats appear here. Restore to bring them back.</p>
        )
      ) : null}
    </section>
  )
}
