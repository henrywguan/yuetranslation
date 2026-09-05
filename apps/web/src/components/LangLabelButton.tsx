import { useEffect, useId, useRef, useState } from 'react'
import { BiText } from './BiText'
import { biPlain, ui, type Bi } from '../lib/uiCopy'
import type { Lang } from '../lib/types'

const OPTIONS: { id: Lang; copy: Bi }[] = [
  { id: 'en', copy: ui.english },
  { id: 'yue', copy: ui.cantonese },
  { id: 'cmn', copy: ui.dirMandarin },
]

/**
 * Pane language label — tap to pick mic language (Apple Translate–style).
 * Cut B: English + Cantonese + Mandarin.
 */
export function LangLabelButton({
  lang,
  active,
  onSelect,
  only,
}: {
  lang: Lang
  active: boolean
  onSelect: (lang: Lang) => void
  only?: 'en' | 'zh'
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const menuId = useId()
  const visible =
    only === 'en'
      ? OPTIONS.filter((o) => o.id === 'en')
      : only === 'zh'
        ? OPTIONS.filter((o) => o.id === 'yue' || o.id === 'cmn')
        : OPTIONS
  const current = visible.find((o) => o.id === lang) ?? visible[0]!

  useEffect(() => {
    if (!open) return
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
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
    <div className={`lang-label${active ? ' is-active' : ''}${open ? ' is-open' : ''}`} ref={rootRef}>
      <button
        type="button"
        className="lang-label-btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={biPlain(current.copy)}
        onClick={() => setOpen((v) => !v)}
      >
        <BiText copy={current.copy} size="sm" only={only} />
        <span className="lang-label-chevron" aria-hidden="true">
          ▾
        </span>
      </button>
      {open ? (
        <ul className="lang-label-menu" id={menuId} role="listbox" aria-label={biPlain(ui.direction)}>
          {visible.map((opt) => (
            <li key={opt.id} role="option" aria-selected={opt.id === lang}>
              <button
                type="button"
                className={`lang-label-option${opt.id === lang ? ' is-selected' : ''}`}
                onClick={() => {
                  onSelect(opt.id)
                  setOpen(false)
                }}
              >
                <BiText copy={opt.copy} size="sm" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
