import { useEffect, useId, useRef, useState } from 'react'
import type { ChatInboxProject } from '../../../lib/chatInbox'

/**
 * Overflow menu to Add / Remove a chat ↔ Project (Cursor-style re-home).
 * Drag-drop is optional Phase 1 polish — menu is the required path.
 */
export function ChatProjectMenu({
  projects,
  currentProjectId,
  canRemove,
  onAddToProject,
  onRemoveFromProject,
}: {
  projects: ChatInboxProject[]
  currentProjectId: string | null
  /** False for Overseer / workers — they stay project-owned. */
  canRemove: boolean
  onAddToProject: (projectId: string) => void
  onRemoveFromProject: () => void
}) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const menuId = useId()

  const addTargets = projects.filter((p) => p.id !== currentProjectId)
  const showRemove = Boolean(canRemove && currentProjectId)
  const hasActions = addTargets.length > 0 || showRemove

  useEffect(() => {
    if (!open) return
    const onPointer = (e: MouseEvent | PointerEvent) => {
      if (!wrapRef.current) return
      if (e.target instanceof Node && wrapRef.current.contains(e.target)) return
      setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (!hasActions) return null

  return (
    <div className="inbox-chat-menu-wrap" ref={wrapRef}>
      <button
        type="button"
        className="inbox-list-action inbox-chat-menu-trigger"
        title="Move chat"
        aria-label="Move chat"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
      >
        ⋯
      </button>
      {open ? (
        <div className="inbox-ws-menu inbox-chat-menu" id={menuId} role="menu" aria-label="Move chat">
          {addTargets.map((p) => (
            <button
              key={p.id}
              type="button"
              role="menuitem"
              className="inbox-ws-menu-item"
              onClick={(e) => {
                e.stopPropagation()
                setOpen(false)
                onAddToProject(p.id)
              }}
            >
              Add to {p.title}
            </button>
          ))}
          {showRemove ? (
            <button
              type="button"
              role="menuitem"
              className="inbox-ws-menu-item"
              onClick={(e) => {
                e.stopPropagation()
                setOpen(false)
                onRemoveFromProject()
              }}
            >
              Remove from Project
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
