import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { BiText } from './BiText'
import { inkEase } from '../lib/motion'
import { biPlain, ui, type Bi } from '../lib/uiCopy'
import type { Lang } from '../lib/types'

const OPTIONS: { id: Lang; copy: Bi; mark: string }[] = [
  { id: 'en', copy: ui.english, mark: 'En' },
  { id: 'yue', copy: ui.cantonese, mark: '粵' },
  { id: 'cmn', copy: ui.dirMandarin, mark: '普' },
  { id: 'wuu', copy: ui.dirShanghainese, mark: '沪' },
  { id: 'tl', copy: ui.dirTagalog, mark: 'Tl' },
  { id: 'es', copy: ui.dirMexicanSpanish, mark: 'Mx' },
  { id: 'vi', copy: ui.dirVietnamese, mark: 'Vi' },
]

type MenuPlacement = 'top' | 'bottom'

/**
 * Pane language control.
 * - `dropdown` (Solo + Conversation): pill trigger + anchored glass menu in harbor/jade.
 * - `drawer`: full-sheet picker (fallback when a sheet is preferred).
 */
export function LangLabelButton({
  lang,
  active,
  onSelect,
  only,
  drawer = 'bottom',
  variant = 'drawer',
}: {
  lang: Lang
  active: boolean
  onSelect: (lang: Lang) => void
  only?: 'en' | 'zh'
  /** Upper Solo / open-down → `top`; lower Solo / Conversation partner → `bottom` (opens up). */
  drawer?: MenuPlacement
  /** Solo + Conversation use `dropdown`; `drawer` remains available for sheet pickers. */
  variant?: 'drawer' | 'dropdown'
}) {
  const [open, setOpen] = useState(false)
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; width: number } | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuId = useId()
  const titleId = useId()
  const visible =
    only === 'en'
      ? OPTIONS.filter((o) => o.id === 'en')
      : only === 'zh'
        ? OPTIONS.filter(
            (o) =>
              o.id === 'yue' ||
              o.id === 'cmn' ||
              o.id === 'wuu' ||
              o.id === 'tl' ||
              o.id === 'es' ||
              o.id === 'vi',
          )
        : OPTIONS
  const current = visible.find((o) => o.id === lang) ?? visible[0]!
  const canPick = visible.length > 1
  const menuOpensDown = drawer === 'top'

  useLayoutEffect(() => {
    if (!open || variant !== 'dropdown') return
    const placeMenu = () => {
      const el = triggerRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const width = Math.max(r.width, 196)
      const left = Math.min(Math.max(10, r.left), window.innerWidth - width - 10)
      const top = menuOpensDown ? r.bottom + 8 : r.top - 8
      setMenuPos({ top, left, width })
    }
    placeMenu()
    window.addEventListener('resize', placeMenu)
    window.addEventListener('scroll', placeMenu, true)
    return () => {
      window.removeEventListener('resize', placeMenu)
      window.removeEventListener('scroll', placeMenu, true)
    }
  }, [open, variant, menuOpensDown, lang])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        setOpen(false)
      }
    }
    const onPointerDown = (e: PointerEvent) => {
      if (variant !== 'dropdown') return
      const t = e.target as Node
      if (rootRef.current?.contains(t)) return
      const menu = document.getElementById(menuId)
      if (menu?.contains(t)) return
      setOpen(false)
    }
    window.addEventListener('keydown', onKey, true)
    window.addEventListener('pointerdown', onPointerDown, true)
    return () => {
      window.removeEventListener('keydown', onKey, true)
      window.removeEventListener('pointerdown', onPointerDown, true)
    }
  }, [open, variant, menuId])

  const labelOnly =
    only === 'en'
      ? 'en'
      : current.id === 'tl' || current.id === 'es' || current.id === 'vi'
        ? undefined
        : only === 'zh' || current.id === 'yue' || current.id === 'cmn' || current.id === 'wuu'
          ? 'zh'
          : undefined

  const trigger = (
    <button
      ref={triggerRef}
      type="button"
      className={variant === 'dropdown' ? 'lang-dd-trigger' : 'lang-label-btn'}
      aria-haspopup={canPick ? (variant === 'dropdown' ? 'listbox' : 'dialog') : undefined}
      aria-expanded={canPick ? open : undefined}
      aria-controls={canPick ? menuId : undefined}
      aria-label={biPlain(current.copy)}
      disabled={!canPick}
      onClick={() => {
        if (!canPick) return
        setOpen((v) => !v)
      }}
    >
      {variant === 'dropdown' ? (
        <>
          <span className="lang-dd-mark" aria-hidden="true">
            {current.mark}
          </span>
          <BiText copy={current.copy} size="sm" only={labelOnly} hideJp />
          <span className={`lang-dd-chevron${open ? ' is-open' : ''}`} aria-hidden="true">
            <ChevronIcon />
          </span>
        </>
      ) : (
        <>
          {/* hideJp: Jyutping tip steals clicks from the language menu on Solo.
              Yue/cmn: Chinese-only on the pane chrome — stacked English reads loud. */}
          <BiText copy={current.copy} size="sm" only={labelOnly} hideJp />
          {canPick ? (
            <span className="lang-label-chevron" aria-hidden="true">
              {drawer === 'top' ? (open ? '▴' : '▾') : open ? '▾' : '▴'}
            </span>
          ) : null}
        </>
      )}
    </button>
  )

  const drawerSheet =
    variant === 'drawer' && typeof document !== 'undefined'
      ? createPortal(
          <AnimatePresence>
            {open ? (
              <motion.div
                className={`lang-drawer-layer lang-drawer-layer--${drawer}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18, ease: [...inkEase] }}
              >
                <button
                  type="button"
                  className="lang-drawer-scrim"
                  aria-label={biPlain(ui.close)}
                  onClick={() => setOpen(false)}
                />
                <motion.div
                  className={`lang-drawer lang-drawer--${drawer}`}
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby={titleId}
                  initial={{ y: drawer === 'top' ? '-100%' : '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: drawer === 'top' ? '-100%' : '100%' }}
                  transition={{ type: 'spring', stiffness: 420, damping: 36, mass: 0.85 }}
                >
                  <div
                    className={`lang-drawer-handle lang-drawer-handle--${drawer}`}
                    aria-hidden
                  />
                  <div className="lang-drawer-head">
                    <h3 id={titleId} className="lang-drawer-title">
                      <BiText copy={ui.direction} size="md" hideJp />
                    </h3>
                    <button
                      type="button"
                      className="lang-drawer-close"
                      onClick={() => setOpen(false)}
                    >
                      <BiText copy={ui.close} size="sm" hideJp />
                    </button>
                  </div>
                  <ul
                    className="lang-drawer-menu"
                    id={menuId}
                    role="listbox"
                    aria-label={biPlain(ui.direction)}
                  >
                    {visible.map((opt) => (
                      <li key={opt.id} role="option" aria-selected={opt.id === lang}>
                        <button
                          type="button"
                          className={`lang-drawer-option${opt.id === lang ? ' is-selected' : ''}`}
                          onClick={() => {
                            onSelect(opt.id)
                            setOpen(false)
                          }}
                        >
                          <BiText copy={opt.copy} size="md" hideJp />
                        </button>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              </motion.div>
            ) : null}
          </AnimatePresence>,
          document.body,
        )
      : null

  const dropdownMenu =
    variant === 'dropdown' && typeof document !== 'undefined'
      ? createPortal(
          <AnimatePresence>
            {open && menuPos ? (
              <motion.div
                className="lang-dd-layer"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.16, ease: [...inkEase] }}
              >
                <button
                  type="button"
                  className="lang-dd-scrim"
                  aria-label={biPlain(ui.close)}
                  onClick={() => setOpen(false)}
                />
                <motion.ul
                  id={menuId}
                  className={`lang-dd-menu lang-dd-menu--${menuOpensDown ? 'down' : 'up'}`}
                  role="listbox"
                  aria-label={biPlain(ui.direction)}
                  style={{
                    top: menuOpensDown ? menuPos.top : undefined,
                    bottom: menuOpensDown ? undefined : window.innerHeight - menuPos.top,
                    left: menuPos.left,
                    minWidth: menuPos.width,
                  }}
                  initial={{ opacity: 0, y: menuOpensDown ? -6 : 6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: menuOpensDown ? -4 : 4, scale: 0.98 }}
                  transition={{ duration: 0.18, ease: [...inkEase] }}
                >
                  {visible.map((opt) => {
                    const selected = opt.id === lang
                    return (
                      <li key={opt.id} role="option" aria-selected={selected}>
                        <button
                          type="button"
                          className={`lang-dd-option${selected ? ' is-selected' : ''}`}
                          onClick={() => {
                            onSelect(opt.id)
                            setOpen(false)
                          }}
                        >
                          <span className="lang-dd-mark" aria-hidden="true">
                            {opt.mark}
                          </span>
                          <span className="lang-dd-option-copy">
                            <BiText copy={opt.copy} size="sm" hideJp />
                          </span>
                          {selected ? (
                            <span className="lang-dd-check" aria-hidden="true">
                              <CheckIcon />
                            </span>
                          ) : null}
                        </button>
                      </li>
                    )
                  })}
                </motion.ul>
              </motion.div>
            ) : null}
          </AnimatePresence>,
          document.body,
        )
      : null

  return (
    <div
      ref={rootRef}
      className={`lang-label${active ? ' is-active' : ''}${open ? ' is-open' : ''}${
        variant === 'dropdown' ? ' lang-label--dropdown' : ''
      }`}
    >
      {trigger}
      {drawerSheet}
      {dropdownMenu}
    </div>
  )
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true">
      <path
        d="M4 6.2 8 10l4-3.8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true">
      <path
        d="M3.5 8.3 6.4 11.2 12.5 4.8"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
