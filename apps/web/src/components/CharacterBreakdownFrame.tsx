import { useEffect, useId, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { CharBreakdown } from '../lib/jyutping'

export function CharacterBreakdownFrame({
  phrase,
  rows,
  loading,
  onClose,
}: {
  phrase: string
  rows: CharBreakdown[]
  loading?: boolean
  onClose: () => void
}) {
  const titleId = useId()
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  return (
    <AnimatePresence>
      <motion.div
        className="breakdown-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        aria-hidden="true"
      />
      <motion.div
        className="breakdown-frame"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        initial={{ opacity: 0, y: 28, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      >
        <header className="breakdown-header">
          <div>
            <p className="breakdown-kicker">Character breakdown</p>
            <h2 id={titleId} className="breakdown-phrase">
              {phrase}
            </h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            className="breakdown-close"
            onClick={onClose}
            aria-label="Close breakdown"
          >
            ×
          </button>
        </header>

        {loading && !rows.length ? (
          <p className="breakdown-loading muted">Loading…</p>
        ) : (
          <ul className="breakdown-list">
            {rows.map((row, i) => (
              <li key={`${row.char}-${i}`} className="breakdown-row">
                <span className="breakdown-char" lang="zh-HK">
                  {row.char}
                </span>
                <span className="breakdown-meta">
                  <span className="breakdown-jp">{row.jyutping || '—'}</span>
                  <span className="breakdown-meaning">
                    {row.meaning || (loading ? '…' : '—')}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </motion.div>
    </AnimatePresence>
  )
}
