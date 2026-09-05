import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useId, useState } from 'react'
import { createPortal } from 'react-dom'
import { BiText } from './BiText'
import { inkEase } from '../lib/motion'
import { biPlain, ui, type Bi } from '../lib/uiCopy'
import type { Lang } from '../lib/types'

const OPTIONS: { id: Lang; copy: Bi }[] = [
  { id: 'en', copy: ui.english },
  { id: 'yue', copy: ui.cantonese },
  { id: 'cmn', copy: ui.dirMandarin },
  { id: 'tl', copy: ui.dirTagalog },
]

/**
 * Pane language label — tap opens a top or bottom drawer (not an inline popover),
 * so mobile taps cannot miss the menu and hit the Solo mic-direction pane behind it.
 * Solo: full en|yue|cmn|tl. Conversation Chinese face: only="zh".
 */
export function LangLabelButton({
  lang,
  active,
  onSelect,
  only,
  drawer = 'bottom',
}: {
  lang: Lang
  active: boolean
  onSelect: (lang: Lang) => void
  only?: 'en' | 'zh'
  /** Upper Solo pane → top drawer; lower Solo pane → bottom drawer. */
  drawer?: 'top' | 'bottom'
}) {
  const [open, setOpen] = useState(false)
  const menuId = useId()
  const titleId = useId()
  const visible =
    only === 'en'
      ? OPTIONS.filter((o) => o.id === 'en')
      : only === 'zh'
        ? OPTIONS.filter((o) => o.id === 'yue' || o.id === 'cmn')
        : OPTIONS
  const current = visible.find((o) => o.id === lang) ?? visible[0]!
  const canPick = visible.length > 1

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        setOpen(false)
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [open])

  const sheet =
    typeof document !== 'undefined'
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
                  <ul className="lang-drawer-menu" id={menuId} role="listbox" aria-label={biPlain(ui.direction)}>
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

  return (
    <div className={`lang-label${active ? ' is-active' : ''}${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className="lang-label-btn"
        aria-haspopup={canPick ? 'dialog' : undefined}
        aria-expanded={canPick ? open : undefined}
        aria-controls={canPick ? menuId : undefined}
        aria-label={biPlain(current.copy)}
        disabled={!canPick}
        onClick={() => {
          if (!canPick) return
          setOpen((v) => !v)
        }}
      >
        {/* hideJp: Jyutping tip steals clicks from the language menu on Solo.
            Yue/cmn: Chinese-only on the pane chrome — stacked English (CANTONESE/MANDARIN)
            reads loud and redundant next to 粵語/普通話. Drawer options stay bilingual. */}
        <BiText
          copy={current.copy}
          size="sm"
          only={
            only === 'en'
              ? 'en'
              : only === 'zh' || current.id === 'yue' || current.id === 'cmn'
                ? 'zh'
                : undefined
          }
          hideJp
        />
        {canPick ? (
          <span className="lang-label-chevron" aria-hidden="true">
            {drawer === 'top' ? (open ? '▴' : '▾') : open ? '▾' : '▴'}
          </span>
        ) : null}
      </button>
      {sheet}
    </div>
  )
}
