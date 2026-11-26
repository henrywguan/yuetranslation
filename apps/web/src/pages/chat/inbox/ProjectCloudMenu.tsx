import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { isCloudBackedProject, type ChatInboxProject } from '../../../lib/chatInbox'

type MenuPos = { top: number; right: number; maxHeight: number }

/**
 * Overflow · Move project to cloud (signed-in) / Sign in (guest).
 * Menu portals out of the project row so sidebar / list `overflow: hidden`
 * cannot clip Rename · Move to cloud · Delete (same class of bug as
 * InboxSettingsMenu / ChatSelectionMenu).
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
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const menuId = useId()
  const [menuPos, setMenuPos] = useState<MenuPos | null>(null)
  const cloud = isCloudBackedProject(project)

  const placeMenu = () => {
    const trigger = triggerRef.current
    if (!trigger) return
    const r = trigger.getBoundingClientRect()
    const gap = 6
    const top = Math.round(r.bottom + gap)
    const right = Math.round(Math.max(8, window.innerWidth - r.right))
    const maxHeight = Math.max(120, Math.floor(window.innerHeight - top - 12))
    setMenuPos({ top, right, maxHeight })
  }

  useLayoutEffect(() => {
    if (!open) {
      setMenuPos(null)
      return
    }
    placeMenu()
    const onReposition = () => placeMenu()
    window.addEventListener('resize', onReposition)
    window.visualViewport?.addEventListener('resize', onReposition)
    window.visualViewport?.addEventListener('scroll', onReposition)
    return () => {
      window.removeEventListener('resize', onReposition)
      window.visualViewport?.removeEventListener('resize', onReposition)
      window.visualViewport?.removeEventListener('scroll', onReposition)
    }
  }, [open])

  const closeMenu = (restoreFocus = true) => {
    setOpen(false)
    if (restoreFocus) {
      window.requestAnimationFrame(() => triggerRef.current?.focus())
    }
  }

  useEffect(() => {
    if (!open) return
    const onPointer = (e: MouseEvent | PointerEvent) => {
      const t = e.target
      if (!(t instanceof Node)) return
      if (wrapRef.current?.contains(t)) return
      if (menuRef.current?.contains(t)) return
      closeMenu(true)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMenu(true)
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  useEffect(() => {
    if (!open || !menuPos) return
    const first = menuRef.current?.querySelector<HTMLButtonElement>('button[role="menuitem"]')
    first?.focus()
  }, [open, menuPos])

  const portalHost =
    typeof document !== 'undefined'
      ? ((document.querySelector('.ds-chat') as HTMLElement | null) ?? document.body)
      : null

  const run = (fn: () => void) => {
    closeMenu(false)
    fn()
  }

  const menu =
    open && menuPos && portalHost
      ? createPortal(
          <div
            ref={menuRef}
            className="inbox-ws-menu inbox-chat-menu inbox-portaled-menu is-portaled"
            id={menuId}
            role="menu"
            aria-label={`${project.title} actions`}
            style={{
              top: menuPos.top,
              right: menuPos.right,
              maxHeight: menuPos.maxHeight,
            }}
          >
            <button
              type="button"
              role="menuitem"
              className="inbox-ws-menu-item"
              onClick={(e) => {
                e.stopPropagation()
                run(onRename)
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
                run(() => {
                  if (!loggedIn) {
                    onSignIn()
                    return
                  }
                  onMoveToCloud(project.id)
                })
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
                run(onDelete)
              }}
            >
              Delete
            </button>
          </div>,
          portalHost,
        )
      : null

  return (
    <div className="inbox-chat-menu-wrap inbox-project-menu-wrap" ref={wrapRef}>
      <button
        ref={triggerRef}
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
      {menu}
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
