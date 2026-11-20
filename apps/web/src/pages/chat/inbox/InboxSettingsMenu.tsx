import { useEffect, useId, useRef, useState } from 'react'
import { ThemeToggle } from '../../../components/ThemeToggle'
import { setChatAuiEnabled } from '../../../lib/chatAuiFlag'
import { openApp } from '../../../lib/siteLinks'
import { useTheme } from '../../../lib/theme'
import { SettingsIcon } from './InboxIcons'

/**
 * Inbox header cog — Classic / Back to app / theme live here so the sidebar
 * foot does not burn vertical chrome.
 */
export function InboxSettingsMenu() {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const menuId = useId()
  const { theme } = useTheme()
  const isDark = theme === 'dark'

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
    <div className="inbox-settings-wrap" ref={wrapRef}>
      <button
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
      {open ? (
        <div
          className="inbox-ws-menu inbox-settings-menu"
          id={menuId}
          role="menu"
          aria-label="Inbox settings"
        >
          <button
            type="button"
            role="menuitem"
            className="inbox-ws-menu-item"
            onClick={() => {
              setOpen(false)
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
              setOpen(false)
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
        </div>
      ) : null}
    </div>
  )
}
