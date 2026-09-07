import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useJpPopup } from '../lib/useJpPopup'
import { ui } from '../lib/uiCopy'
import { JpPop } from '../components/JpPop'

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
  { flag: '🇨🇳', name: 'Shanghainese', native: '上海話 / 沪语' },
]

/**
 * Centered rich tooltip on the English eyebrow line (uiverse-inspired).
 * Hover / focus / tap opens; Escape or outside tap closes.
 */
function MultilangTip({ triggerLabel }: { triggerLabel: string }) {
  const tipId = useId()
  const rootRef = useRef<HTMLSpanElement>(null)
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
              <p className="ln-multilang-tip-kicker">{ui.heroMultilangTipTrigger.en}</p>
              <h3 className="ln-multilang-tip-title">{ui.heroMultilangTipTitle.en}</h3>
              <p className="ln-multilang-tip-lead">{ui.heroMultilangTipLead.en}</p>
              <ul className="ln-multilang-tip-langs">
                {SUPPORTED_LANGS.map((lang) => (
                  <li key={lang.name}>
                    <span className="ln-multilang-tip-flag" aria-hidden="true">
                      {lang.flag}
                    </span>
                    <span className="ln-multilang-tip-lang">
                      <strong>{lang.name}</strong>
                      <span>{lang.native}</span>
                    </span>
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
    <span
      ref={rootRef}
      className={`ln-multilang-tip-wrap${open ? ' is-open' : ''}`}
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
        {triggerLabel}
      </button>
      {tip}
    </span>
  )
}

/**
 * Hero pill: Cantonese Language Tool + multilang teaser on the English line.
 */
export function HeroEyebrow() {
  const e = ui.heroEyebrow
  const enabled = Boolean(e.jp.trim())
  const { tipId, show, bind, wrapRef } = useJpPopup(enabled)

  return (
    <span className="ln-eyebrow">
      <span
        {...bind}
        className={`ln-eyebrow-stack${enabled ? ' is-hint' : ''}`}
        lang="zh-HK"
      >
        <span className="ln-eyebrow-en">
          <span className="ln-eyebrow-en-label">{e.en}</span>
          <MultilangTip triggerLabel={ui.heroMultilangTipTrigger.en} />
        </span>
        <span className="ln-eyebrow-zh">{e.zh}</span>
        {enabled ? <JpPop show={show} id={tipId} han={e.zh} anchorRef={wrapRef} /> : null}
      </span>
    </span>
  )
}
