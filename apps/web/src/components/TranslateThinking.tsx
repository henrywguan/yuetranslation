import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { BiText } from './BiText'
import { useReducedMotion } from '../lib/useReducedMotion'
import { ui } from '../lib/uiCopy'
import './TranslateThinking.css'
import { inkEase } from '../lib/motion'

type Props = {
  className?: string
  /** Compact inline variant for tight panes / buttons. */
  size?: 'md' | 'sm'
  label?: boolean
  /** Delay before painting so instant dictionary hits don’t flash. */
  appearAfterMs?: number
}

/**
 * Harbor/jade “AI thinking” loader — soft core, orbiting nodes, rotating rings.
 * Inspired by product AI loading motion (concentric glow + satellite dots).
 */
export function TranslateThinking({
  className = '',
  size = 'md',
  label = true,
  appearAfterMs = 120,
}: Props) {
  const reduce = useReducedMotion()
  const [visible, setVisible] = useState(appearAfterMs <= 0)

  useEffect(() => {
    if (appearAfterMs <= 0) {
      setVisible(true)
      return
    }
    const t = window.setTimeout(() => setVisible(true), appearAfterMs)
    return () => window.clearTimeout(t)
  }, [appearAfterMs])

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          className={`translate-thinking translate-thinking--${size} ${className}`.trim()}
          role="status"
          aria-live="polite"
          aria-busy="true"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.28, ease: inkEase }}
        >
          <div className={`tt-stage${reduce ? ' is-reduced' : ''}`} aria-hidden="true">
            <span className="tt-glow" />
            <span className="tt-ring tt-ring--a" />
            <span className="tt-ring tt-ring--b" />
            <span className="tt-ring tt-ring--c" />
            <span className="tt-core">
              <span className="tt-core-inner" />
            </span>
            <span className="tt-orbit tt-orbit--1">
              <span className="tt-node" />
            </span>
            <span className="tt-orbit tt-orbit--2">
              <span className="tt-node" />
            </span>
            <span className="tt-orbit tt-orbit--3">
              <span className="tt-node" />
            </span>
            <span className="tt-orbit tt-orbit--4">
              <span className="tt-node tt-node--soft" />
            </span>
          </div>
          {label ? (
            <p className="tt-label">
              <BiText copy={ui.translating} size="sm" hideJp />
            </p>
          ) : (
            <span className="visually-hidden">{ui.translating.en}</span>
          )}
        </motion.div>
      ) : (
        <div
          className={`translate-thinking translate-thinking--${size} translate-thinking--pending ${className}`.trim()}
          role="status"
          aria-busy="true"
          aria-label={ui.translating.en}
        />
      )}
    </AnimatePresence>
  )
}
