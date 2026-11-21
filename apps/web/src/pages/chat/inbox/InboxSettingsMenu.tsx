import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ThemeToggle } from '../../../components/ThemeToggle'
import {
  CHAT_DEEP_AVATAR_CELEBRATE_MODE_HINT,
  CHAT_DEEP_AVATAR_CELEBRATE_MODE_LABEL,
  CHAT_DEEP_AVATAR_CELEBRATE_MODES,
  CHAT_DEEP_AVATAR_CHARACTERS,
  chatDeepAvatarPosterSrc,
} from '../../../lib/chatDeepAvatarCharacter'
import {
  CHAT_DEEP_AVATAR_NAME_MAX,
  CHAT_DEEP_AVATAR_NOTES_MAX,
  CHAT_DEEP_AVATAR_TRAIT_HINT,
  CHAT_DEEP_AVATAR_TRAIT_LABEL,
  CHAT_DEEP_AVATAR_TRAITS,
} from '../../../lib/chatDeepAvatarPersona'
import { setChatAuiEnabled } from '../../../lib/chatAuiFlag'
import {
  CHAT_INBOX_COMPANION_OPEN_KEY,
  readChatFlag,
  writeChatFlag,
} from '../../../lib/chatUiPrefs'
import { openApp } from '../../../lib/siteLinks'
import { useTheme } from '../../../lib/theme'
import {
  useChatDeepAvatarCelebrateMode,
  useChatDeepAvatarCharacter,
  useChatDeepAvatarNameEditor,
  useChatDeepAvatarNotes,
  useChatDeepAvatarSoundEnabled,
  useChatDeepAvatarTrait,
} from '../aui/ChatDeepAvatar'
import { CheckIcon, CloseIcon, PencilIcon, SettingsIcon } from './InboxIcons'

type MenuPos = { top: number; right: number; maxHeight: number }

/**
 * Inbox header cog — Classic / Back to app / theme / Companion / Celebrate.
 * Menu portals out of the sidebar so `overflow: hidden` cannot clip Celebrate
 * below Companion (was invisible on phone/short viewports). Host prefers
 * `.ds-chat` for token inheritance; CSS also redeclares panel tokens for the
 * `body` fallback.
 */
export function InboxSettingsMenu() {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const nameInputRef = useRef<HTMLInputElement | null>(null)
  const renamingRef = useRef(false)
  const menuId = useId()
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [character, setCharacter] = useChatDeepAvatarCharacter()
  const [celebrateMode, setCelebrateMode] = useChatDeepAvatarCelebrateMode()
  const [names, setName] = useChatDeepAvatarNameEditor()
  const [trait, setTrait] = useChatDeepAvatarTrait()
  const [notes, setNotes] = useChatDeepAvatarNotes()
  const [soundOn, setSoundOn] = useChatDeepAvatarSoundEnabled()
  const [menuPos, setMenuPos] = useState<MenuPos | null>(null)
  const [companionOpen, setCompanionOpen] = useState(() =>
    readChatFlag(CHAT_INBOX_COMPANION_OPEN_KEY, true),
  )
  const [renaming, setRenaming] = useState(false)
  const [nameDraft, setNameDraft] = useState('')

  renamingRef.current = renaming

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
    window.visualViewport?.addEventListener('resize', onReposition)
    window.visualViewport?.addEventListener('scroll', onReposition)
    return () => {
      window.removeEventListener('resize', onReposition)
      window.visualViewport?.removeEventListener('resize', onReposition)
      window.visualViewport?.removeEventListener('scroll', onReposition)
    }
  }, [open, companionOpen, renaming])

  const closeMenu = (restoreFocus = true) => {
    setRenaming(false)
    setOpen(false)
    if (restoreFocus) {
      window.requestAnimationFrame(() => triggerRef.current?.focus())
    }
  }

  const beginRename = () => {
    setNameDraft(names[character])
    setRenaming(true)
  }

  const cancelRename = () => {
    setNameDraft(names[character])
    setRenaming(false)
  }

  const commitRename = () => {
    setName(character, nameDraft)
    setRenaming(false)
  }

  const toggleCompanion = () => {
    setCompanionOpen((prev) => {
      const next = !prev
      writeChatFlag(CHAT_INBOX_COMPANION_OPEN_KEY, next)
      if (!next) setRenaming(false)
      return next
    })
  }

  useEffect(() => {
    if (!renaming) return
    setNameDraft(names[character])
  }, [character, names, renaming])

  useEffect(() => {
    if (!renaming) return
    const id = window.requestAnimationFrame(() => {
      nameInputRef.current?.focus()
      nameInputRef.current?.select()
    })
    return () => window.cancelAnimationFrame(id)
  }, [renaming])

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
      if (e.key !== 'Escape') return
      if (renamingRef.current) {
        e.preventDefault()
        cancelRename()
        return
      }
      closeMenu(true)
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, names, character])

  useEffect(() => {
    if (!open || !menuPos) return
    // Initial open only — do not steal focus when rename edit ends (Save/Esc).
    const first = menuRef.current?.querySelector<HTMLButtonElement>(
      'button[role="menuitem"], button[role="menuitemradio"], button',
    )
    first?.focus()
  }, [open, menuPos])

  const portalHost =
    typeof document !== 'undefined'
      ? ((document.querySelector('.ds-chat') as HTMLElement | null) ?? document.body)
      : null

  const menu =
    open && menuPos && portalHost
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
              <button
                type="button"
                className="inbox-settings-companion-toggle"
                aria-expanded={companionOpen}
                aria-controls={`${menuId}-companion-body`}
                onClick={toggleCompanion}
              >
                <span
                  className={`inbox-section-chevron${companionOpen ? ' is-open' : ''}`}
                  aria-hidden
                >
                  ▸
                </span>
                <span className="inbox-settings-companion-label">Companion</span>
              </button>
              {companionOpen ? (
                <div id={`${menuId}-companion-body`} className="inbox-settings-companion-body">
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
                          onClick={() => {
                            if (id !== character) setRenaming(false)
                            setCharacter(id)
                          }}
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
                          <span>{names[id]}</span>
                        </button>
                      )
                    })}
                  </div>
                  <div className="inbox-settings-rename">
                    <span className="inbox-settings-companion-label">Name</span>
                    {renaming ? (
                      <div className="inbox-settings-rename-edit">
                        <input
                          ref={nameInputRef}
                          type="text"
                          className="inbox-settings-rename-input"
                          maxLength={CHAT_DEEP_AVATAR_NAME_MAX}
                          value={nameDraft}
                          aria-label={`Rename ${names[character]}`}
                          onChange={(e) =>
                            setNameDraft(e.target.value.slice(0, CHAT_DEEP_AVATAR_NAME_MAX))
                          }
                          onKeyDown={(e) => {
                            e.stopPropagation()
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              commitRename()
                            } else if (e.key === 'Escape') {
                              e.preventDefault()
                              cancelRename()
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <button
                          type="button"
                          className="inbox-settings-rename-btn"
                          title="Save name"
                          aria-label="Save name"
                          onClick={commitRename}
                        >
                          <CheckIcon size={14} />
                        </button>
                        <button
                          type="button"
                          className="inbox-settings-rename-btn"
                          title="Cancel"
                          aria-label="Cancel rename"
                          onClick={cancelRename}
                        >
                          <CloseIcon size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className="inbox-settings-rename-view">
                        <span className="inbox-settings-rename-text">{names[character]}</span>
                        <button
                          type="button"
                          className="inbox-settings-rename-btn"
                          title="Edit name"
                          aria-label={`Edit name ${names[character]}`}
                          onClick={beginRename}
                        >
                          <PencilIcon size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="inbox-settings-trait" role="group" aria-label="Trait">
                    <span className="inbox-settings-companion-label">Trait</span>
                    <div className="inbox-settings-companion-row">
                      {CHAT_DEEP_AVATAR_TRAITS.map((id) => {
                        const active = trait === id
                        return (
                          <button
                            key={id}
                            type="button"
                            role="menuitemradio"
                            aria-checked={active}
                            title={CHAT_DEEP_AVATAR_TRAIT_HINT[id]}
                            className={`inbox-settings-companion-item inbox-settings-celebrate-item${active ? ' is-active' : ''}`}
                            onClick={() => setTrait(id)}
                          >
                            <span className="inbox-settings-celebrate-copy">
                              <span className="inbox-settings-celebrate-name">
                                {CHAT_DEEP_AVATAR_TRAIT_LABEL[id]}
                              </span>
                              <span className="inbox-settings-celebrate-hint">
                                {CHAT_DEEP_AVATAR_TRAIT_HINT[id]}
                              </span>
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                  <label className="inbox-settings-notes">
                    <span className="inbox-settings-companion-label">Notes</span>
                    <textarea
                      className="inbox-settings-notes-input"
                      maxLength={CHAT_DEEP_AVATAR_NOTES_MAX}
                      rows={2}
                      value={notes}
                      placeholder="Things to remember about how I should be with you"
                      aria-label="Companion notes"
                      onChange={(e) => setNotes(e.target.value)}
                      onKeyDown={(e) => e.stopPropagation()}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </label>
                  <button
                    type="button"
                    role="menuitemcheckbox"
                    aria-checked={soundOn}
                    className={`inbox-settings-companion-item inbox-settings-sound${soundOn ? ' is-active' : ''}`}
                    onClick={() => setSoundOn(!soundOn)}
                  >
                    Sound {soundOn ? 'on' : 'off'}
                  </button>
                </div>
              ) : null}
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
          portalHost,
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
        onClick={() =>
          setOpen((v) => {
            if (v) setRenaming(false)
            return !v
          })
        }
      >
        <SettingsIcon size={16} />
      </button>
      {menu}
    </div>
  )
}
