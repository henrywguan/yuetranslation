import { useEffect, useId, useRef, useState } from 'react'
import { isCloudBackedProject, type ChatInboxProject } from '../../../lib/chatInbox'

/**
 * Overflow · Move project to cloud (signed-in) / Sign in (guest).
 */
export function ProjectCloudMenu({
  project,
  loggedIn,
  busy,
  onMoveToCloud,
  onSignIn,
  onRename,
  onDelete,
}: {
  project: ChatInboxProject
  loggedIn: boolean
  busy?: boolean
  onMoveToCloud: (projectId: string) => void
  onSignIn: () => void
  onRename: () => void
  onDelete: () => void
}) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const menuId = useId()
  const cloud = isCloudBackedProject(project)

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

  return (
    <div className="inbox-chat-menu-wrap inbox-project-menu-wrap" ref={wrapRef}>
      <button
        type="button"
        className="inbox-list-action inbox-chat-menu-trigger"
        title="Project actions"
        aria-label={`Actions for ${project.title}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        disabled={busy}
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
      >
        ⋯
      </button>
      {open ? (
        <div
          className="inbox-ws-menu inbox-chat-menu"
          id={menuId}
          role="menu"
          aria-label={`${project.title} actions`}
        >
          <button
            type="button"
            role="menuitem"
            className="inbox-ws-menu-item"
            onClick={(e) => {
              e.stopPropagation()
              setOpen(false)
              onRename()
            }}
          >
            Rename
          </button>
          <button
            type="button"
            role="menuitem"
            className="inbox-ws-menu-item"
            disabled={busy}
            onClick={(e) => {
              e.stopPropagation()
              setOpen(false)
              if (!loggedIn) {
                onSignIn()
                return
              }
              onMoveToCloud(project.id)
            }}
          >
            {!loggedIn
              ? 'Move to cloud (sign in)'
              : cloud
                ? 'Sync to cloud'
                : 'Move project to cloud'}
          </button>
          <button
            type="button"
            role="menuitem"
            className="inbox-ws-menu-item inbox-ws-menu-item--danger"
            onClick={(e) => {
              e.stopPropagation()
              setOpen(false)
              onDelete()
            }}
          >
            Delete
          </button>
        </div>
      ) : null}
    </div>
  )
}

export function CloudBadge({ project }: { project: ChatInboxProject }) {
  if (!isCloudBackedProject(project)) return null
  return (
    <span className="inbox-cloud-badge" title="Synced to your account">
      Cloud
    </span>
  )
}
