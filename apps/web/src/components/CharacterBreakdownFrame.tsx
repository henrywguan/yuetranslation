import { useEffect, useId, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { CharBreakdown } from '../lib/jyutping'
import { inkEase } from '../lib/motion'

export function CharacterBreakdownFrame({
  phrase,
  rows,
  loading,
  translation,
  definition,
  onClose,
}: {
  phrase: string
  rows: CharBreakdown[]
  loading?: boolean
  /** Natural translation for this phrase. */
  translation?: string | null
  /** Extra sense note — only shown when it differs from the translation. */
  definition?: string | null
  onClose: () => void
}) {
  const titleId = useId()
  const closeRef = useRef<HTMLButtonElement>(null)
  const translationText = translation?.trim() || ''
  const definitionText = definition?.trim() || ''
  const showDefinition =
    Boolean(definitionText) &&
    definitionText.toLowerCase() !== translationText.toLowerCase() &&
    definitionText.toLowerCase() !== phrase.trim().toLowerCase()

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
        transition={{ duration: 0.28, ease: inkEase }}
      >
        <header className="breakdown-header">
          <div>
            <p className="breakdown-kicker">{translationText ? 'Details' : 'Character breakdown'}</p>
            <h2 id={titleId} className="breakdown-phrase" lang="zh-HK">
              {phrase}
            </h2>
            {translationText ? (
              <p className="breakdown-translation" lang="en">
                {translationText}
              </p>
            ) : null}
            {showDefinition ? (
              <p className="breakdown-definition" lang="en">
                {definitionText}
              </p>
            ) : null}
          </div>
          <button
            ref={closeRef}
            type="button"
            className="breakdown-close"
            onClick={onClose}
            aria-label="Close details"
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
