import { useEffect, useId, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { BiText } from './BiText'
import {
  dismissIosHomescreenTip,
  isIosHomescreenTipDismissed,
  shouldOfferIosHomescreenGuide,
} from '../lib/pwaInstall'
import { biPlain, ui } from '../lib/uiCopy'
import { inkEase } from '../lib/motion'
import './iosHomescreen.css'

const TIP_DELAY_MS = 4500

/** iOS Share (square.and.arrow.up) — arrow rises out of the tray, not into it. */
function IosShareGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      {/* Arrow up */}
      <path
        fill="currentColor"
        d="M12 2.6c.28 0 .54.11.73.31l3.55 3.55a1.03 1.03 0 1 1-1.46 1.46L13.03 5.83v8.02a1.03 1.03 0 1 1-2.06 0V5.83L9.18 7.92a1.03 1.03 0 1 1-1.46-1.46l3.55-3.55c.19-.2.45-.31.73-.31Z"
      />
      {/* Open tray */}
      <path
        fill="currentColor"
        d="M5.35 12.15c.57 0 1.03.46 1.03 1.03v4.05c0 .4.33.72.72.72h9.8c.4 0 .72-.32.72-.72v-4.05a1.03 1.03 0 1 1 2.06 0v4.05A2.78 2.78 0 0 1 16.9 20H7.1a2.78 2.78 0 0 1-2.78-2.77v-4.05c0-.57.46-1.03 1.03-1.03Z"
      />
    </svg>
  )
}

/** iOS “Add to Home Screen” action icon — rounded square with plus. */
function AddToHomeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 28 28" width="22" height="22" aria-hidden="true">
      <rect
        x="3.5"
        y="3.5"
        width="21"
        height="21"
        rx="5.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <path
        fill="currentColor"
        d="M14 8.2a.9.9 0 0 1 .9.9v3.1h3.1a.9.9 0 1 1 0 1.8h-3.1v3.1a.9.9 0 1 1-1.8 0v-3.1H9.9a.9.9 0 1 1 0-1.8h3.1V9.1a.9.9 0 0 1 .9-.9Z"
      />
    </svg>
  )
}

/**
 * Compact share-sheet row mock — teaches recognition of the real iOS control
 * without embedding a full-device screenshot (theme-safe, bilingual, small).
 */
function ShareSheetAddRow() {
  return (
    <figure className="ios-hs-sheet" aria-label={biPlain(ui.iosHomescreenSheetHint)}>
      <figcaption className="ios-hs-sheet-caption">
        <BiText copy={ui.iosHomescreenSheetHint} size="sm" hideJp />
      </figcaption>
      <div className="ios-hs-sheet-stage">
        <div className="ios-hs-sheet-row" role="presentation">
          <span className="ios-hs-sheet-icon" aria-hidden="true">
            <AddToHomeIcon />
          </span>
          <span className="ios-hs-sheet-label">
            <BiText copy={ui.addToHomeScreen} size="sm" hideJp />
          </span>
        </div>
        <span className="ios-hs-sheet-pointer" aria-hidden="true">
          <svg viewBox="0 0 40 28" width="36" height="24">
            <path
              d="M34 6C22 6 14 12 10 18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
            <path d="M6 12.5 10.2 19.8 17 15.2" fill="currentColor" />
          </svg>
        </span>
      </div>
    </figure>
  )
}

function HomescreenSteps() {
  return (
    <ol className="ios-hs-steps">
      <li className="ios-hs-step">
        <span className="ios-hs-step-num" aria-hidden="true">
          <IosShareGlyph />
        </span>
        <div className="ios-hs-step-body">
          <BiText copy={ui.iosHomescreenStep1} size="sm" hideJp />
        </div>
      </li>
      <li className="ios-hs-step ios-hs-step--with-sheet">
        <span className="ios-hs-step-num" aria-hidden="true">
          2
        </span>
        <div className="ios-hs-step-body">
          <BiText copy={ui.iosHomescreenStep2} size="sm" hideJp />
          <ShareSheetAddRow />
        </div>
      </li>
      <li className="ios-hs-step">
        <span className="ios-hs-step-num" aria-hidden="true">
          3
        </span>
        <div className="ios-hs-step-body">
          <BiText copy={ui.iosHomescreenStep3} size="sm" hideJp />
        </div>
      </li>
    </ol>
  )
}

type GuideDialogProps = {
  open: boolean
  onClose: () => void
}

/** Modal instructions — used from account hub / footer. */
export function IosHomescreenGuideDialog({ open, onClose }: GuideDialogProps) {
  const titleId = useId()

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return createPortal(
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            key="ios-hs-backdrop"
            className="ios-hs-backdrop"
            aria-label={biPlain(ui.accountClose)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
          />
          <motion.div
            key="ios-hs-dialog"
            className="ios-hs-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.22, ease: inkEase }}
          >
            <header className="ios-hs-dialog-header">
              <h2 id={titleId} className="ios-hs-dialog-title">
                <BiText copy={ui.iosHomescreenGuideTitle} size="md" hideJp />
              </h2>
              <button
                type="button"
                className="ios-hs-dialog-close"
                aria-label={biPlain(ui.accountClose)}
                onClick={onClose}
              >
                ×
              </button>
            </header>
            <p className="ios-hs-dialog-lead">
              <BiText copy={ui.iosHomescreenTipBody} size="sm" hideJp />
            </p>
            <HomescreenSteps />
            <button type="button" className="ios-hs-dialog-done" onClick={onClose}>
              <BiText copy={ui.iosHomescreenGotIt} size="sm" hideJp />
            </button>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>,
    document.body,
  )
}

/**
 * Soft, delayed tip under the brand bar — iOS only, not when already installed,
 * and never again after dismiss.
 */
export function IosHomescreenTip() {
  const [eligible, setEligible] = useState(false)
  const [visible, setVisible] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const tipId = useId()

  useEffect(() => {
    if (!shouldOfferIosHomescreenGuide() || isIosHomescreenTipDismissed()) return
    setEligible(true)
    const t = window.setTimeout(() => setVisible(true), TIP_DELAY_MS)
    return () => window.clearTimeout(t)
  }, [])

  const dismiss = () => {
    dismissIosHomescreenTip()
    setVisible(false)
  }

  if (!eligible) return null

  return (
    <AnimatePresence>
      {visible ? (
        <motion.aside
          key="ios-hs-tip"
          className={`ios-hs-tip${expanded ? ' is-expanded' : ''}`}
          role="region"
          aria-labelledby={tipId}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.28, ease: inkEase }}
        >
          <div className="ios-hs-tip-main">
            <div className="ios-hs-tip-copy">
              <p id={tipId} className="ios-hs-tip-title">
                <BiText copy={ui.iosHomescreenTipTitle} size="sm" hideJp />
              </p>
              {!expanded ? (
                <p className="ios-hs-tip-body">
                  <BiText copy={ui.iosHomescreenTipBody} size="sm" hideJp />
                </p>
              ) : null}
            </div>
            <div className="ios-hs-tip-actions">
              {!expanded ? (
                <button
                  type="button"
                  className="ios-hs-tip-btn ios-hs-tip-btn--primary"
                  onClick={() => setExpanded(true)}
                >
                  <BiText copy={ui.iosHomescreenShowSteps} size="sm" hideJp />
                </button>
              ) : (
                <button type="button" className="ios-hs-tip-btn ios-hs-tip-btn--primary" onClick={dismiss}>
                  <BiText copy={ui.iosHomescreenGotIt} size="sm" hideJp />
                </button>
              )}
              <button
                type="button"
                className="ios-hs-tip-dismiss"
                aria-label={biPlain(ui.iosHomescreenDismiss)}
                onClick={dismiss}
              >
                ×
              </button>
            </div>
          </div>
          {expanded ? <HomescreenSteps /> : null}
        </motion.aside>
      ) : null}
    </AnimatePresence>
  )
}

/** Shared install chip — homepage footer + account hub. */
function IosHomescreenInstallChip({
  onClick,
  className,
}: {
  onClick: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      className={['ios-hs-footer-card', className].filter(Boolean).join(' ')}
      onClick={onClick}
      aria-label={biPlain(ui.addToHomeScreen)}
    >
      <span className="ios-hs-footer-card-glow" aria-hidden="true" />
      <span className="ios-hs-footer-card-icon" aria-hidden="true">
        <IosShareGlyph />
      </span>
      <span className="ios-hs-footer-card-copy">
        <BiText copy={ui.addToHomeScreen} size="sm" hideJp />
      </span>
      <span className="ios-hs-footer-card-chevron" aria-hidden="true">
        ›
      </span>
    </button>
  )
}

/** Account hub — same chip as the landing footer. */
export function IosHomescreenHubButton({ onOpen }: { onOpen: () => void }) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    setShow(shouldOfferIosHomescreenGuide())
  }, [])

  if (!show) return null

  return <IosHomescreenInstallChip className="ios-hs-footer-card--hub" onClick={onOpen} />
}

/**
 * Landing footer cue — quiet mini share-sheet chip (centered, no Jyutping popup).
 * Opens the same install guide as the in-app tip.
 */
export function IosHomescreenFooterLink() {
  const [show, setShow] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setShow(shouldOfferIosHomescreenGuide())
  }, [])

  if (!show) return null

  return (
    <>
      <IosHomescreenInstallChip onClick={() => setOpen(true)} />
      <IosHomescreenGuideDialog open={open} onClose={() => setOpen(false)} />
    </>
  )
}
