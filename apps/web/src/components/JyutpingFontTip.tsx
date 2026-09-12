import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { openCreators } from '../lib/siteLinks'
import { biPlain, ui } from '../lib/uiCopy'
import { BiText } from './BiText'

/**
 * Info “i” beside Details Jyutping+Chao copy — explains custom fonts
 * and links to the Creators page.
 */
export function JyutpingFontTip({ className = '' }: { className?: string }) {
  const tipId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null)

  const place = () => {
    const btn = btnRef.current
    if (!btn) return
    const r = btn.getBoundingClientRect()
    // Prefer left of the i (actions sit on the right edge of Details).
    setCoords({
      top: r.top + r.height / 2,
      left: Math.max(12, r.left - 8),
    })
  }

  useEffect(() => {
    if (!open) return
    place()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    const onDoc = (e: PointerEvent) => {
      const tip = document.getElementById(tipId)
      const t = e.target as Node
      if (rootRef.current?.contains(t) || tip?.contains(t)) return
      setOpen(false)
    }
    const onReposition = () => place()
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onDoc)
    window.addEventListener('resize', onReposition)
    window.addEventListener('scroll', onReposition, true)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onDoc)
      window.removeEventListener('resize', onReposition)
      window.removeEventListener('scroll', onReposition, true)
    }
  }, [open, tipId])

  const tip =
    open && coords && typeof document !== 'undefined'
      ? createPortal(
          <div
            id={tipId}
            role="tooltip"
            className="jyutping-font-tip-pop"
            style={{ top: coords.top, left: coords.left }}
          >
            <p className="jyutping-font-tip-body">
              <BiText copy={ui.copyJyutpingFontTip} size="sm" hideJp />
            </p>
            <button
              type="button"
              className="jyutping-font-tip-link"
              onClick={(e) => {
                e.stopPropagation()
                setOpen(false)
                openCreators()
              }}
            >
              <BiText copy={ui.copyJyutpingFontTipCta} size="sm" hideJp only="en" />
            </button>
          </div>,
          document.body,
        )
      : null

  return (
    <div
      ref={rootRef}
      className={`jyutping-font-tip${open ? ' is-open' : ''}${className ? ` ${className}` : ''}`.trim()}
    >
      <button
        ref={btnRef}
        type="button"
        className="jyutping-font-tip-btn"
        aria-label={biPlain(ui.copyJyutpingFontTipInfo)}
        aria-expanded={open}
        aria-controls={tipId}
        title={biPlain(ui.copyJyutpingFontTipInfo)}
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
      >
        <svg className="jyutping-font-tip-icon" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="9.25" fill="none" stroke="currentColor" strokeWidth="1.7" />
          <path
            d="M12 10.4v5.2"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <circle cx="12" cy="7.6" r="1.05" fill="currentColor" />
        </svg>
      </button>
      {tip}
    </div>
  )
}
