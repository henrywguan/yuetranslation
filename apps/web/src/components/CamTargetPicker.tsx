import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { BiText } from './BiText'
import { inkEase } from '../lib/motion'
import type { CameraTarget } from '../lib/camera/types'
import { biPlain, ui, type Bi } from '../lib/uiCopy'

const OPTIONS: { id: CameraTarget; copy: Bi; mark: string }[] = [
  { id: 'auto', copy: ui.camTargetAuto, mark: 'A' },
  { id: 'en', copy: ui.camTargetEn, mark: 'En' },
  { id: 'yue', copy: ui.camTargetYue, mark: '粵' },
  { id: 'cmn', copy: ui.camTargetCmn, mark: '普' },
  { id: 'wuu', copy: ui.camTargetWuu, mark: '沪' },
  { id: 'tl', copy: ui.camTargetTl, mark: 'Tl' },
  { id: 'es', copy: ui.camTargetEs, mark: 'Mx' },
]

type Props = {
  value: CameraTarget
  onChange: (next: CameraTarget) => void
  /** Dark glass for AR overlay; panel matches in-app Cam chrome. */
  tone?: 'ar' | 'panel'
}

/**
 * Single Cam translate-target pill + chevron menu.
 * Replaces the always-visible stack of language pills on AR / Upload.
 */
export function CamTargetPicker({ value, onChange, tone = 'ar' }: Props) {
  const [open, setOpen] = useState(false)
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; width: number } | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuId = useId()
  const current = OPTIONS.find((o) => o.id === value) ?? OPTIONS[0]!

  useLayoutEffect(() => {
    if (!open) return
    const place = () => {
      const el = triggerRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const width = Math.max(r.width, 220)
      const left = Math.min(Math.max(12, r.left + r.width / 2 - width / 2), window.innerWidth - width - 12)
      setMenuPos({ top: r.bottom + 8, left, width })
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open, value])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        setOpen(false)
      }
    }
    const onPointerDown = (e: PointerEvent) => {
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
  }, [open, menuId])

  const menu =
    typeof document !== 'undefined'
      ? createPortal(
          <AnimatePresence>
            {open && menuPos ? (
              <motion.div
                className={`cam-target-dd-layer cam-target-dd-layer--${tone}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.16, ease: [...inkEase] }}
              >
                <button
                  type="button"
                  className="cam-target-dd-scrim"
                  aria-label={biPlain(ui.close)}
                  onClick={() => setOpen(false)}
                />
                <motion.ul
                  id={menuId}
                  className="cam-target-dd-menu"
                  role="listbox"
                  aria-label="Translate target"
                  style={{
                    top: menuPos.top,
                    left: menuPos.left,
                    minWidth: menuPos.width,
                  }}
                  initial={{ opacity: 0, y: -6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.98 }}
                  transition={{ duration: 0.18, ease: [...inkEase] }}
                >
                  {OPTIONS.map((opt) => {
                    const selected = opt.id === value
                    return (
                      <li key={opt.id} role="option" aria-selected={selected}>
                        <button
                          type="button"
                          className={`cam-target-dd-option${selected ? ' is-selected' : ''}`}
                          onClick={() => {
                            onChange(opt.id)
                            setOpen(false)
                          }}
                        >
                          <span className="cam-target-dd-mark" aria-hidden="true">
                            {opt.mark}
                          </span>
                          <span className="cam-target-dd-copy">
                            <BiText copy={opt.copy} size="sm" hideJp />
                          </span>
                          {selected ? (
                            <span className="cam-target-dd-check" aria-hidden="true">
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
      className={`cam-target-dd cam-target-dd--${tone}${open ? ' is-open' : ''}`}
    >
      <button
        ref={triggerRef}
        type="button"
        className="cam-target-dd-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={biPlain(current.copy)}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="cam-target-dd-mark" aria-hidden="true">
          {current.mark}
        </span>
        <BiText copy={current.copy} size="sm" hideJp />
        <span className={`cam-target-dd-chevron${open ? ' is-open' : ''}`} aria-hidden="true">
          <ChevronIcon />
        </span>
      </button>
      {menu}
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
