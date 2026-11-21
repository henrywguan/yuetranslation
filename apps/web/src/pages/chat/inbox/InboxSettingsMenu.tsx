import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ThemeToggle } from '../../../components/ThemeToggle'
import {
  CHAT_DEEP_AVATAR_CELEBRATE_MODE_HINT,
  CHAT_DEEP_AVATAR_CELEBRATE_MODE_LABEL,
  CHAT_DEEP_AVATAR_CELEBRATE_MODES,
  CHAT_DEEP_AVATAR_CHARACTER_LABEL,
  CHAT_DEEP_AVATAR_CHARACTERS,
  chatDeepAvatarPosterSrc,
} from '../../../lib/chatDeepAvatarCharacter'
import { setChatAuiEnabled } from '../../../lib/chatAuiFlag'
import { openApp } from '../../../lib/siteLinks'
import { useTheme } from '../../../lib/theme'
import {
  useChatDeepAvatarCelebrateMode,
  useChatDeepAvatarCharacter,
} from '../aui/ChatDeepAvatar'
import { SettingsIcon } from './InboxIcons'

type MenuPos = { top: number; right: number; maxHeight: number }

/**
 * Inbox header cog — Classic / Back to app / theme / Companion / Celebrate.
 * Menu portals to `document.body` so sidebar `overflow: hidden` cannot clip
 * Celebrate below Companion (was invisible on phone/short viewports).
 */
export function InboxSettingsMenu() {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const menuId = useId()
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [character, setCharacter] = useChatDeepAvatarCharacter()
  const [celebrateMode, setCelebrateMode] = useChatDeepAvatarCelebrateMode()
  const [menuPos, setMenuPos] = useState<MenuPos | null>(null)

  const placeMenu = () => {
    const trigger = triggerRef.current
    if (!trigger) return
    const r = trigger.getBoundingClientRect()
    const gap = 6
    const top = Math.round(r.bottom + gap)
    const right = Math.round(Math.max(8, window.innerWidth - r.right))
    const maxHeight = Math.max(160, Math.floor(window.innerHeight - top - 12))
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
    // Sidebar / visualViewport shifts on mobile keyboard / chrome.
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

  // Portaled menu leaves the sidebar tab order — move focus in on open (Account Hub pattern).
  useEffect(() => {
    if (!open || !menuPos) return
    const first = menuRef.current?.querySelector<HTMLButtonElement>(
      'button[role="menuitem"], button[role="menuitemradio"], button',
    )
    first?.focus()
  }, [open, menuPos])

  const menu =
    open && menuPos && typeof document !== 'undefined'
      ? createPortal(
          <div
            ref={menuRef}
            className="inbox-ws-menu inbox-settings-menu is-portaled"
            id={menuId}
            role="menu"
            aria-label="Inbox settings"
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
              onClick={() => {
                closeMenu(false)
                setChatAuiEnabled(false)
                window.location.reload()
              }}
            >
              Classic chat UI
            </button>
            <button
              type="button"
              role="menuitem"
              className="inbox-ws-menu-item"
              onClick={() => {
                closeMenu(false)
                openApp()
              }}
            >
              Back to app
            </button>
            <div className="inbox-settings-divider" role="separator" />
            <div className="inbox-settings-theme" role="menuitem">
              <span className="inbox-settings-theme-label">
                {isDark ? 'Dark mode' : 'Light mode'}
              </span>
              <ThemeToggle className="inbox-settings-theme-toggle" />
            </div>
            <div className="inbox-settings-divider" role="separator" />
            <div className="inbox-settings-companion" role="group" aria-label="Companion">
              <span className="inbox-settings-companion-label">Companion</span>
              <div className="inbox-settings-companion-row">
                {CHAT_DEEP_AVATAR_CHARACTERS.map((id) => {
                  const active = character === id
                  return (
                    <button
                      key={id}
                      type="button"
                      role="menuitemradio"
                      aria-checked={active}
                      className={`inbox-settings-companion-item${active ? ' is-active' : ''}`}
                      onClick={() => setCharacter(id)}
                    >
                      <img
                        className="inbox-settings-companion-thumb"
                        src={chatDeepAvatarPosterSrc(id)}
                        alt=""
                        width={36}
                        height={36}
                        decoding="async"
                        draggable={false}
                      />
                      <span>{CHAT_DEEP_AVATAR_CHARACTER_LABEL[id]}</span>
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="inbox-settings-celebrate" role="group" aria-label="Celebrate">
              <span className="inbox-settings-companion-label">Celebrate</span>
              <div className="inbox-settings-companion-row">
                {CHAT_DEEP_AVATAR_CELEBRATE_MODES.map((id) => {
                  const active = celebrateMode === id
                  return (
                    <button
                      key={id}
                      type="button"
                      role="menuitemradio"
                      aria-checked={active}
                      title={CHAT_DEEP_AVATAR_CELEBRATE_MODE_HINT[id]}
                      aria-label={`${CHAT_DEEP_AVATAR_CELEBRATE_MODE_LABEL[id]} — ${CHAT_DEEP_AVATAR_CELEBRATE_MODE_HINT[id]}`}
                      className={`inbox-settings-companion-item inbox-settings-celebrate-item${active ? ' is-active' : ''}`}
                      onClick={() => setCelebrateMode(id)}
                    >
                      <span className="inbox-settings-celebrate-copy">
                        <span className="inbox-settings-celebrate-name">
                          {CHAT_DEEP_AVATAR_CELEBRATE_MODE_LABEL[id]}
                        </span>
                        <span className="inbox-settings-celebrate-hint">
                          {CHAT_DEEP_AVATAR_CELEBRATE_MODE_HINT[id]}
                        </span>
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>,
          document.body,
        )
      : null

  return (
    <div className="inbox-settings-wrap" ref={wrapRef}>
      <button
        ref={triggerRef}
        type="button"
        className="inbox-header-settings"
        title="Inbox settings"
        aria-label="Inbox settings"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
      >
        <SettingsIcon size={16} />
      </button>
      {menu}
    </div>
  )
}
