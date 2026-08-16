import { useEffect, useId, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { BiText } from './BiText'
import { HistoryPane } from './HistoryPane'
import { useYueStore } from '../lib/store'
import { biPlain, ui } from '../lib/uiCopy'
import { inkEase } from '../lib/motion'

/** Desktop right rail + mobile history button / closable sheet. */
export function TranslationHistory() {
  const history = useYueStore((s) => s.history)
  const [sheetOpen, setSheetOpen] = useState(false)
  const titleId = useId()
  const closeRef = useRef<HTMLButtonElement>(null)
  const count = history.length

  useEffect(() => {
    if (!sheetOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSheetOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [sheetOpen])

  return (
    <>
      <aside className="history-rail" aria-labelledby="history-rail-title">
        <header className="history-panel-header">
          <div>
            <p className="history-panel-kicker">
              <BiText copy={ui.historyKicker} size="sm" layout="inline" />
            </p>
            <h2 id="history-rail-title" className="history-panel-title">
              <BiText copy={ui.historyTitle} size="md" layout="inline" />
            </h2>
          </div>
          {count ? (
            <span className="history-count" aria-label={`${count}`}>
              {count}
            </span>
          ) : null}
        </header>
        <HistoryPane turns={history} />
      </aside>

      {/* In-flow above controls on mobile — avoids covering mode tabs / mic. */}
      <div className="history-mobile-row">
        <button
          type="button"
          className="history-open-btn"
          onClick={() => setSheetOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={sheetOpen}
          aria-label={biPlain(ui.historyTitle)}
        >
          <BiText copy={ui.historyTitle} size="sm" layout="inline" />
          {count ? <span className="history-open-count">{count}</span> : null}
        </button>
      </div>

      <AnimatePresence>
        {sheetOpen ? (
          <>
            <motion.div
              key="history-backdrop"
              className="history-sheet-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setSheetOpen(false)}
              aria-hidden="true"
            />
            <motion.div
              key="history-sheet"
              className="history-sheet"
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              initial={{ opacity: 0, y: 36 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              transition={{ duration: 0.28, ease: inkEase }}
            >
              <header className="history-panel-header history-sheet-header">
                <div>
                  <p className="history-panel-kicker">
                    <BiText copy={ui.historyKicker} size="sm" layout="inline" />
                  </p>
                  <h2 id={titleId} className="history-panel-title">
                    <BiText copy={ui.historyTitle} size="md" layout="inline" />
                  </h2>
                </div>
                <button
                  ref={closeRef}
                  type="button"
                  className="history-sheet-close"
                  onClick={() => setSheetOpen(false)}
                  aria-label={biPlain(ui.close)}
                >
                  ×
                </button>
              </header>
              <HistoryPane turns={history} onOpenBreakdown={() => setSheetOpen(false)} />
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </>
  )
}
