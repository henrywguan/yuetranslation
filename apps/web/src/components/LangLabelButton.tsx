import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { BiText } from './BiText'
import { inkEase } from '../lib/motion'
import { isConversationLang, isTextOnlyLang } from '../lib/langCapabilities'
import { biPlain, ui, type Bi } from '../lib/uiCopy'
import type { Lang } from '../lib/types'

type LangOption = { id: Lang; copy: Bi; mark: string }

const OPTIONS: LangOption[] = [
  { id: 'en', copy: ui.english, mark: 'En' },
  { id: 'yue', copy: ui.cantonese, mark: '粵' },
  { id: 'cmn', copy: ui.dirMandarin, mark: '普' },
  { id: 'wuu', copy: ui.dirShanghainese, mark: '沪' },
  { id: 'sichuan', copy: ui.dirSichuanese, mark: '川' },
  { id: 'tl', copy: ui.dirTagalog, mark: 'Tl' },
  { id: 'es', copy: ui.dirMexicanSpanish, mark: 'Mx' },
  { id: 'eses', copy: ui.dirPeninsularSpanish, mark: 'Es' },
  { id: 'vi', copy: ui.dirVietnamese, mark: 'Vi' },
  { id: 'th', copy: ui.dirThai, mark: 'Th' },
  { id: 'lo', copy: ui.dirLao, mark: 'Lo' },
  { id: 'ceb', copy: ui.dirCebuano, mark: 'Cb' },
  { id: 'ilo', copy: ui.dirIlocano, mark: 'Il' },
  { id: 'bcl', copy: ui.dirBikol, mark: 'Bc' },
]

type MenuPlacement = 'top' | 'bottom'

const gridContainer = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.028, delayChildren: 0.06 },
  },
}

const gridItem = {
  hidden: { opacity: 0, y: 10, scale: 0.96 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.28, ease: inkEase },
  },
}

/**
 * Pane language control.
 * - `dropdown` (Solo + Conversation): pill trigger → centered animated modal.
 * - `drawer`: edge sheet picker (legacy fallback).
 * - `scope: 'conversation'` hides text-only langs (Cebuano / Ilocano / Bikol).
 */
export function LangLabelButton({
  lang,
  active,
  onSelect,
  only,
  drawer = 'bottom',
  variant = 'drawer',
  scope = 'solo',
}: {
  lang: Lang
  active: boolean
  onSelect: (lang: Lang) => void
  only?: 'en' | 'zh'
  /** Upper Solo / open-down → `top`; lower Solo / Conversation partner → `bottom` (drawer only). */
  drawer?: MenuPlacement
  /** Solo + Conversation use `dropdown` (modal); `drawer` remains for sheet pickers. */
  variant?: 'drawer' | 'dropdown'
  /** Conversation panes exclude text-only languages. */
  scope?: 'solo' | 'conversation'
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const selectedRef = useRef<HTMLButtonElement>(null)
  const menuId = useId()
  const titleId = useId()
  const scoped =
    scope === 'conversation' ? OPTIONS.filter((o) => isConversationLang(o.id)) : OPTIONS
  const visible =
    only === 'en'
      ? scoped.filter((o) => o.id === 'en')
      : only === 'zh'
        ? scoped.filter(
            (o) =>
              o.id === 'yue' ||
              o.id === 'cmn' ||
              o.id === 'wuu' ||
              o.id === 'sichuan' ||
              o.id === 'tl' ||
              o.id === 'es' ||
              o.id === 'eses' ||
              o.id === 'vi' ||
              o.id === 'th' ||
              o.id === 'lo' ||
              isTextOnlyLang(o.id),
          )
        : scoped
  const voiceOpts = visible.filter((o) => !isTextOnlyLang(o.id))
  const typeOpts = visible.filter((o) => isTextOnlyLang(o.id))
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
    const t = window.setTimeout(() => selectedRef.current?.focus(), 40)
    return () => {
      window.removeEventListener('keydown', onKey, true)
      window.clearTimeout(t)
    }
  }, [open])

  const labelOnly =
    only === 'en'
      ? 'en'
      : current.id === 'tl' ||
          current.id === 'es' ||
          current.id === 'eses' ||
          current.id === 'vi' ||
          current.id === 'th' ||
          current.id === 'lo'
        ? undefined
        : only === 'zh' ||
            current.id === 'yue' ||
            current.id === 'cmn' ||
            current.id === 'wuu' ||
            current.id === 'sichuan'
          ? 'zh'
          : undefined

  const pick = (id: Lang) => {
    onSelect(id)
    setOpen(false)
  }

  const trigger = (
    <button
      ref={triggerRef}
      type="button"
      className={variant === 'dropdown' ? 'lang-dd-trigger' : 'lang-label-btn'}
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

  const renderTile = (opt: LangOption) => {
    const selected = opt.id === lang
    const typeOnly = isTextOnlyLang(opt.id)
    return (
      <motion.li key={opt.id} role="option" aria-selected={selected} variants={gridItem}>
        <button
          ref={selected ? selectedRef : undefined}
          type="button"
          className={`lang-modal-tile${selected ? ' is-selected' : ''}${typeOnly ? ' is-type' : ''}`}
          onClick={() => pick(opt.id)}
        >
          <span className="lang-modal-tile-mark" aria-hidden="true">
            {opt.mark}
          </span>
          <span className="lang-modal-tile-copy">
            <BiText copy={opt.copy} size="sm" hideJp />
          </span>
          {typeOnly ? (
            <span className="lang-modal-tile-kind">
              <BiText copy={ui.langPickerType} size="sm" hideJp only="en" />
            </span>
          ) : null}
          {selected ? (
            <span className="lang-modal-tile-check" aria-hidden="true">
              <CheckIcon />
            </span>
          ) : null}
        </button>
      </motion.li>
    )
  }

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
                          onClick={() => pick(opt.id)}
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

  const langModal =
    variant === 'dropdown' && typeof document !== 'undefined'
      ? createPortal(
          <AnimatePresence>
            {open ? (
              <motion.div
                className="lang-modal-layer"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, ease: [...inkEase] }}
              >
                <button
                  type="button"
                  className="lang-modal-scrim"
                  aria-label={biPlain(ui.close)}
                  onClick={() => setOpen(false)}
                />
                <motion.div
                  id={menuId}
                  className="lang-modal"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby={titleId}
                  initial={{ opacity: 0, y: 18, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.98 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 34, mass: 0.82 }}
                >
                  <header className="lang-modal-head">
                    <div className="lang-modal-titles">
                      <p className="lang-modal-kicker">
                        <BiText copy={ui.direction} size="sm" hideJp />
                      </p>
                      <h3 id={titleId} className="lang-modal-title">
                        <BiText copy={ui.langPickerTitle} size="md" hideJp />
                      </h3>
                    </div>
                    <button
                      type="button"
                      className="lang-modal-close"
                      aria-label={biPlain(ui.close)}
                      onClick={() => setOpen(false)}
                    >
                      ×
                    </button>
                  </header>

                  <div className="lang-modal-body">
                    {voiceOpts.length ? (
                      <section className="lang-modal-section" aria-label={biPlain(ui.langPickerVoice)}>
                        {typeOpts.length ? (
                          <h4 className="lang-modal-section-label">
                            <BiText copy={ui.langPickerVoice} size="sm" hideJp />
                          </h4>
                        ) : null}
                        <motion.ul
                          className="lang-modal-grid"
                          role="listbox"
                          aria-label={biPlain(ui.langPickerVoice)}
                          variants={gridContainer}
                          initial="hidden"
                          animate="show"
                        >
                          {voiceOpts.map(renderTile)}
                        </motion.ul>
                      </section>
                    ) : null}

                    {typeOpts.length ? (
                      <section className="lang-modal-section" aria-label={biPlain(ui.langPickerType)}>
                        <h4 className="lang-modal-section-label">
                          <BiText copy={ui.langPickerType} size="sm" hideJp />
                        </h4>
                        <motion.ul
                          className="lang-modal-grid"
                          role="listbox"
                          aria-label={biPlain(ui.langPickerType)}
                          variants={gridContainer}
                          initial="hidden"
                          animate="show"
                        >
                          {typeOpts.map(renderTile)}
                        </motion.ul>
                      </section>
                    ) : null}
                  </div>
                </motion.div>
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
      {langModal}
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
