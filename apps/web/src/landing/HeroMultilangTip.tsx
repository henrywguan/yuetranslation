import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ui } from '../lib/uiCopy'

const LANG_REQUEST_MAIL =
  'mailto:help@jyuttranslate.com?subject=' +
  encodeURIComponent('Multi-Language Support: Language Request')

type SupportedLang = {
  flag: string
  name: string
  native: string
}

const SUPPORTED_LANGS: SupportedLang[] = [
  { flag: '🇺🇸', name: 'English', native: 'English' },
  { flag: '🇭🇰', name: 'Cantonese', native: '粵語 / 廣東話' },
  { flag: '🇨🇳', name: 'Mandarin', native: '普通話 / 国语' },
  { flag: '🇵🇭', name: 'Tagalog', native: 'Tagalog / Filipino' },
  { flag: '🇲🇽', name: 'Mexican Spanish', native: 'Español mexicano' },
  { flag: '🇻🇳', name: 'Vietnamese', native: 'Tiếng Việt' },
  { flag: '🇨🇳', name: 'Shanghainese', native: '上海話 / 沪语' },
]

/** Duplicate first item so the vertical spin can loop seamlessly (uiverse lizard pattern). */
const SPIN_LANGS = [...SUPPORTED_LANGS, SUPPORTED_LANGS[0]]

/**
 * Centered rich tip under hero CTAs (uiverse-inspired card + lizard word spin).
 * Hover / focus / tap opens; Escape or outside tap closes.
 */
export function HeroMultilangTip() {
  const tipId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null)

  const place = () => {
    const el = rootRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    setCoords({
      top: r.bottom + 10,
      left: r.left + r.width / 2,
    })
  }

  const cancelClose = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
  }

  const scheduleClose = () => {
    cancelClose()
    closeTimer.current = setTimeout(() => setOpen(false), 140)
  }

  const openTip = () => {
    cancelClose()
    place()
    setOpen(true)
  }

  useEffect(() => {
    if (!open) return
    place()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    const onDoc = (e: PointerEvent) => {
      if (!rootRef.current) return
      const tip = document.getElementById(tipId)
      const t = e.target as Node
      if (rootRef.current.contains(t) || tip?.contains(t)) return
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
            className="ln-multilang-tip"
            style={{ top: coords.top, left: coords.left }}
            onMouseEnter={cancelClose}
            onMouseLeave={scheduleClose}
          >
            <div className="ln-multilang-tip-card">
              <h3 className="ln-multilang-tip-title">{ui.heroMultilangTipTitle.en}</h3>
              <p className="ln-multilang-tip-lead">{ui.heroMultilangTipLead.en}</p>

              {/* kennyotsu/fresh-lizard-20–style vertical word spin */}
              <div className="ln-multilang-lizard" aria-hidden="true">
                <span className="ln-multilang-lizard-label">{ui.heroMultilangTipLoading.en}</span>
                <span className="ln-multilang-lizard-words">
                  {SPIN_LANGS.map((lang, i) => (
                    <span className="ln-multilang-lizard-word" key={`${lang.name}-${i}`}>
                      <span className="ln-multilang-tip-flag">{lang.flag}</span>
                      <span className="ln-multilang-lizard-name">
                        <strong>{lang.name}</strong>
                        <em>{lang.native}</em>
                      </span>
                    </span>
                  ))}
                </span>
              </div>

              <ul className="ln-multilang-tip-langs ln-multilang-tip-langs--sr">
                {SUPPORTED_LANGS.map((lang) => (
                  <li key={lang.name}>
                    {lang.flag} {lang.name} — {lang.native}
                  </li>
                ))}
              </ul>

              <p className="ln-multilang-tip-ask">
                {ui.heroMultilangTipAsk.en}{' '}
                <a className="ln-multilang-tip-mail" href={LANG_REQUEST_MAIL}>
                  {ui.heroMultilangTipMail.en}
                </a>
              </p>
            </div>
          </div>,
          document.body,
        )
      : null

  return (
    <div
      ref={rootRef}
      className={`ln-multilang-tip-wrap ln-multilang-tip-wrap--cta${open ? ' is-open' : ''}`}
      onMouseEnter={openTip}
      onMouseLeave={scheduleClose}
    >
      <button
        type="button"
        className="ln-multilang-tip-trigger"
        aria-expanded={open}
        aria-controls={tipId}
        onClick={() => {
          if (open) setOpen(false)
          else openTip()
        }}
        onFocus={openTip}
      >
        {ui.heroMultilangTipTrigger.en}
      </button>
      {tip}
    </div>
  )
}
