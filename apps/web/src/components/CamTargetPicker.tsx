import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { BiText } from './BiText'
import { inkEase } from '../lib/motion'
import { isTextOnlyLang } from '../lib/langCapabilities'
import type { CameraTarget } from '../lib/camera/types'
import { biPlain, ui, type Bi } from '../lib/uiCopy'

type CamOption = { id: CameraTarget; copy: Bi; mark: string }

/** AR / Cam translate-target copy (“To Cantonese”). */
const TARGET_OPTIONS: CamOption[] = [
  { id: 'auto', copy: ui.camTargetAuto, mark: 'A' },
  { id: 'en', copy: ui.camTargetEn, mark: 'En' },
  { id: 'yue', copy: ui.camTargetYue, mark: '粵' },
  { id: 'cmn', copy: ui.camTargetCmn, mark: '普' },
  { id: 'wuu', copy: ui.camTargetWuu, mark: '沪' },
  { id: 'sichuan', copy: ui.camTargetSichuan, mark: '川' },
  { id: 'tl', copy: ui.camTargetTl, mark: 'Tl' },
  { id: 'es', copy: ui.camTargetEs, mark: 'Mx' },
  { id: 'eses', copy: ui.camTargetEses, mark: 'Es' },
  { id: 'vi', copy: ui.camTargetVi, mark: 'Vi' },
  { id: 'th', copy: ui.camTargetTh, mark: 'Th' },
  { id: 'lo', copy: ui.camTargetLo, mark: 'Lo' },
  { id: 'ceb', copy: ui.camTargetCeb, mark: 'Cb' },
  { id: 'ilo', copy: ui.camTargetIlo, mark: 'Il' },
  { id: 'bcl', copy: ui.camTargetBcl, mark: 'Bc' },
]

/** Documents From/To — plain names (From/To labels already sit above). */
const PLAIN_OPTIONS: CamOption[] = [
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

type Props = {
  value: CameraTarget
  onChange: (next: CameraTarget) => void
  /** Dark glass for AR overlay; panel matches in-app Cam chrome. */
  tone?: 'ar' | 'panel'
  /** Documents from/to omit Auto detect. */
  includeAuto?: boolean
  /** `plain` = language names (Documents); `target` = “To …” (AR/Cam). */
  labels?: 'target' | 'plain'
  disabled?: boolean
}

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
 * Cam translate-target pill → centered Harbor modal (same pattern as Solo / Conversation).
 * Anchored dropdowns clipped off-screen on AR; the modal stays in viewport.
 */
export function CamTargetPicker({
  value,
  onChange,
  tone = 'ar',
  includeAuto = true,
  labels = 'target',
  disabled = false,
}: Props) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const selectedRef = useRef<HTMLButtonElement>(null)
  const menuId = useId()
  const titleId = useId()
  const catalog = labels === 'plain' ? PLAIN_OPTIONS : TARGET_OPTIONS
  const options = includeAuto ? catalog : catalog.filter((o) => o.id !== 'auto')
  const current = options.find((o) => o.id === value) ?? options[0]!
  const voiceOpts = options.filter((o) => o.id === 'auto' || !isTextOnlyLang(o.id))
  const typeOpts = options.filter((o) => o.id !== 'auto' && isTextOnlyLang(o.id))

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

  const pick = (id: CameraTarget) => {
    onChange(id)
    setOpen(false)
  }

  const renderTile = (opt: CamOption) => {
    const selected = opt.id === value
    const typeOnly = opt.id !== 'auto' && isTextOnlyLang(opt.id)
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

  const modal =
    typeof document !== 'undefined'
      ? createPortal(
          <AnimatePresence>
            {open ? (
              <motion.div
                className={`lang-modal-layer lang-modal-layer--cam lang-modal-layer--${tone}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, ease: inkEase }}
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
      className={`cam-target-dd cam-target-dd--${tone}${open ? ' is-open' : ''}`}
    >
      <button
        ref={triggerRef}
        type="button"
        className="cam-target-dd-trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={biPlain(current.copy)}
        disabled={disabled}
        onClick={() => {
          if (disabled) return
          setOpen((v) => !v)
        }}
      >
        <span className="cam-target-dd-mark" aria-hidden="true">
          {current.mark}
        </span>
        <BiText copy={current.copy} size="sm" hideJp />
        <span className={`cam-target-dd-chevron${open ? ' is-open' : ''}`} aria-hidden="true">
          <ChevronIcon />
        </span>
      </button>
      {modal}
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
