import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { useReducedMotion } from '../lib/useReducedMotion'
import { ui } from '../lib/uiCopy'
import './TranslateThinking.css'
import { inkEase } from '../lib/motion'

type Props = {
  className?: string
  /** Compact inline variant for tight panes / buttons. */
  size?: 'md' | 'sm'
  /**
   * Always shows bilingual bounce lines (EN + 粵).
   * Kept for API compatibility — visual label is now the bounce text itself.
   */
  label?: boolean
  /** Delay before painting so instant dictionary hits don’t flash. */
  appearAfterMs?: number
}

function BounceLine({
  text,
  lang,
  reduce,
  delayOffset = 0,
}: {
  text: string
  lang: 'en' | 'zh'
  reduce: boolean
  delayOffset?: number
}) {
  const chars = useMemo(() => Array.from(text.replace(/…/g, '')), [text])
  return (
    <p
      className={`tt-bounce tt-bounce--${lang}${reduce ? ' is-reduced' : ''}`}
      lang={lang === 'zh' ? 'zh-HK' : 'en'}
      aria-hidden="true"
    >
      {chars.map((ch, i) => (
        <span
          key={`${lang}-${i}-${ch}`}
          className="tt-bounce-char"
          style={
            reduce
              ? undefined
              : { animationDelay: `${delayOffset + i * 0.08}s` }
          }
        >
          {ch === ' ' ? '\u00a0' : ch}
        </span>
      ))}
    </p>
  )
}

/**
 * Harbor/jade “wow” translate loader — luminous core + bilingual bouncing text
 * (uiverse-style letter bounce: https://uiverse.io/mobinkakei/grumpy-turtle-41).
 */
export function TranslateThinking({
  className = '',
  size = 'md',
  label: _label = true,
  /** Paint immediately so Solo / demo always show the bounce (dictionary can still finish fast). */
  appearAfterMs = 0,
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

  const en = ui.translating.en
  const zh = ui.translating.zh

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          className={`translate-thinking translate-thinking--${size} ${className}`.trim()}
          role="status"
          aria-live="polite"
          aria-busy="true"
          aria-label={`${en} ${zh}`}
          initial={{ opacity: 0, scale: 0.92, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.32, ease: inkEase }}
        >
          <div className={`tt-stage${reduce ? ' is-reduced' : ''}`} aria-hidden="true">
            <span className="tt-aura" />
            <span className="tt-glow" />
            <span className="tt-sweep" />
            <span className="tt-ring tt-ring--a" />
            <span className="tt-ring tt-ring--b" />
            <span className="tt-ring tt-ring--c" />
            <span className="tt-core">
              <span className="tt-core-flare" />
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
            <span className="tt-spark tt-spark--1" />
            <span className="tt-spark tt-spark--2" />
            <span className="tt-spark tt-spark--3" />
          </div>

          <div className="tt-copy">
            <BounceLine text={en} lang="en" reduce={reduce} />
            <BounceLine text={zh} lang="zh" reduce={reduce} delayOffset={0.12} />
          </div>
        </motion.div>
      ) : (
        <div
          className={`translate-thinking translate-thinking--${size} translate-thinking--pending ${className}`.trim()}
          role="status"
          aria-busy="true"
          aria-label={en}
        />
      )}
    </AnimatePresence>
  )
}
