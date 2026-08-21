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

function ShareIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 3.2a.9.9 0 0 1 .9.9v8.2l2.3-2.3a.9.9 0 1 1 1.3 1.3l-3.9 3.9a.9.9 0 0 1-1.3 0l-3.9-3.9a.9.9 0 1 1 1.3-1.3l2.3 2.3V4.1a.9.9 0 0 1 .9-.9Zm-6.5 11a.9.9 0 0 1 .9.9v3.2c0 .4.3.7.7.7h10.8c.4 0 .7-.3.7-.7V15a.9.9 0 1 1 1.8 0v3.2a2.5 2.5 0 0 1-2.5 2.5H7.1A2.5 2.5 0 0 1 4.6 18.2V15a.9.9 0 0 1 .9-.9Z"
      />
    </svg>
  )
}

function HomescreenSteps({ numbered }: { numbered?: boolean }) {
  const steps = [ui.iosHomescreenStep1, ui.iosHomescreenStep2, ui.iosHomescreenStep3]
  return (
    <ol className={`ios-hs-steps${numbered ? '' : ' ios-hs-steps--plain'}`}>
      {steps.map((step, i) => (
        <li key={step.en} className="ios-hs-step">
          <span className="ios-hs-step-num" aria-hidden="true">
            {i === 0 ? <ShareIcon /> : i + 1}
          </span>
          <BiText copy={step} size="sm" />
        </li>
      ))}
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
                <BiText copy={ui.iosHomescreenGuideTitle} size="md" />
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
              <BiText copy={ui.iosHomescreenTipBody} size="sm" />
            </p>
            <HomescreenSteps numbered />
            <button type="button" className="ios-hs-dialog-done" onClick={onClose}>
              <BiText copy={ui.iosHomescreenGotIt} size="sm" />
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
                <BiText copy={ui.iosHomescreenTipTitle} size="sm" />
              </p>
              {!expanded ? (
                <p className="ios-hs-tip-body">
                  <BiText copy={ui.iosHomescreenTipBody} size="sm" />
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
          {expanded ? <HomescreenSteps numbered /> : null}
        </motion.aside>
      ) : null}
    </AnimatePresence>
  )
}

/** Quiet button that opens the guide when iOS Home Screen install is relevant. */
export function IosHomescreenHubButton({ onOpen }: { onOpen: () => void }) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    setShow(shouldOfferIosHomescreenGuide())
  }, [])

  if (!show) return null

  return (
    <button type="button" className="account-hub-btn account-hub-btn--ghost" onClick={onOpen}>
      <BiText copy={ui.addToHomeScreen} size="sm" />
    </button>
  )
}

/** Landing / footer text link — same eligibility as the hub button. */
export function IosHomescreenFooterLink() {
  const [show, setShow] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setShow(shouldOfferIosHomescreenGuide())
  }, [])

  if (!show) return null

  return (
    <>
      <button type="button" className="ln-textlink ios-hs-footer-link" onClick={() => setOpen(true)}>
        <BiText copy={ui.addToHomeScreen} size="sm" />
      </button>
      <IosHomescreenGuideDialog open={open} onClose={() => setOpen(false)} />
    </>
  )
}
