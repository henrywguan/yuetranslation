import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useId, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { BiText } from '../components/BiText'
import { inkEase } from '../lib/motion'
import { biPlain, type Bi, ui } from '../lib/uiCopy'

type FeatureInfoPanelProps = {
  open: boolean
  onClose: () => void
  title: Bi
  kicker?: Bi
  children: ReactNode
}

/** Bottom-sheet info panel for landing feature cards. */
export function FeatureInfoPanel({ open, onClose, title, kicker, children }: FeatureInfoPanelProps) {
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
            key="ln-feat-panel-backdrop"
            className="ln-feat-panel-backdrop"
            aria-label={biPlain(ui.close)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
          />
          <motion.div
            key="ln-feat-panel-dialog"
            className="ln-feat-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.22, ease: inkEase }}
          >
            <header className="ln-feat-panel-header">
              <div className="ln-feat-panel-heading">
                {kicker ? (
                  <span className="ln-feat-panel-kicker">
                    <BiText copy={kicker} size="sm" hideJp />
                  </span>
                ) : null}
                <h2 id={titleId} className="ln-feat-panel-title">
                  <BiText copy={title} size="md" />
                </h2>
              </div>
              <button
                type="button"
                className="ln-feat-panel-close"
                aria-label={biPlain(ui.close)}
                onClick={onClose}
              >
                ×
              </button>
            </header>
            <div className="ln-feat-panel-body">{children}</div>
            <button type="button" className="ln-feat-panel-done" onClick={onClose}>
              <BiText copy={ui.close} size="sm" hideJp />
            </button>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>,
    document.body,
  )
}
