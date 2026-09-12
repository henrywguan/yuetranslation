import { useEffect, useId, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import {
  PRIMARY_LANGS,
  primaryLangShortCopy,
  type PrimaryLang,
} from '../lib/primaryLanguagePref'

type Props = {
  value: PrimaryLang
  onChange: (next: PrimaryLang) => void
  labelledBy: string
}

function optionLabel(id: PrimaryLang, chineseFirst: boolean): string {
  const copy = primaryLangShortCopy(id)
  return chineseFirst ? `${copy.zh} · ${copy.en}` : `${copy.en} · ${copy.zh}`
}

/**
 * Custom primary-language picker — native &lt;select&gt; option menus on Windows
 * Chromium ignore page theme and show light ink on a light/jade panel.
 */
export function AccountHubPrimarySelect({ value, onChange, labelledBy }: Props) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLUListElement>(null)
  const menuId = useId()
  const chineseFirst = value === 'yue'
  const [menuStyle, setMenuStyle] = useState<CSSProperties | null>(null)

  const placeMenu = () => {
    const el = triggerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const maxH = Math.min(280, Math.max(160, window.innerHeight - rect.bottom - 12))
    const opensUp = rect.bottom + Math.min(maxH, 220) > window.innerHeight - 8 && rect.top > 200
    setMenuStyle({
      left: rect.left,
      width: Math.max(rect.width, 200),
      maxHeight: maxH,
      ...(opensUp
        ? { bottom: window.innerHeight - rect.top + 6 }
        : { top: rect.bottom + 6 }),
    })
  }

  useEffect(() => {
    if (!open) return
    placeMenu()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    const onReposition = (e?: Event) => {
      // Don't re-anchor while the list itself is scrolling — that fights the gesture
      // and (with hub outside-dismiss) feels like the menu "breaks" mid-scroll.
      const t = e?.target
      if (t instanceof Node && menuRef.current?.contains(t)) return
      placeMenu()
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('resize', onReposition)
    window.addEventListener('scroll', onReposition, true)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', onReposition)
      window.removeEventListener('scroll', onReposition, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const first = menuRef.current?.querySelector<HTMLButtonElement>('button.is-selected, button')
    first?.focus()
  }, [open])

  return (
    <div className={`account-hub-dd${open ? ' is-open' : ''}`} ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className="account-hub-dd-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={menuId}
        aria-labelledby={labelledBy}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="account-hub-dd-value">{optionLabel(value, chineseFirst)}</span>
        <span className={`account-hub-dd-chevron${open ? ' is-open' : ''}`} aria-hidden="true">
          ▾
        </span>
      </button>
      {open && typeof document !== 'undefined'
        ? createPortal(
            <div className="account-hub-dd-layer">
              <button
                type="button"
                className="account-hub-dd-scrim"
                aria-label="Close"
                onClick={() => setOpen(false)}
              />
              <ul
                ref={menuRef}
                id={menuId}
                className="account-hub-dd-menu"
                role="listbox"
                aria-labelledby={labelledBy}
                style={menuStyle ?? undefined}
              >
                {PRIMARY_LANGS.map((id) => {
                  const selected = id === value
                  return (
                    <li key={id} role="presentation">
                      <button
                        type="button"
                        role="option"
                        aria-selected={selected}
                        className={`account-hub-dd-option${selected ? ' is-selected' : ''}`}
                        onClick={() => {
                          onChange(id)
                          setOpen(false)
                          triggerRef.current?.focus()
                        }}
                      >
                        {optionLabel(id, chineseFirst)}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}
