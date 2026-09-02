import { motion } from 'framer-motion'
import { useMemo } from 'react'
import { useReducedMotion } from '../lib/useReducedMotion'
import { ui } from '../lib/uiCopy'
import './TranslateThinking.css'
import { inkEase } from '../lib/motion'

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

/** Harbor/jade translate loader — bilingual bouncing text. */
export function TranslateThinking({
  className = '',
  en: enProp,
  zh: zhProp,
}: {
  className?: string
  /** Override default “Translating” stage copy (e.g. document page progress). */
  en?: string
  zh?: string
}) {
  const reduce = useReducedMotion()
  const en = enProp ?? ui.translating.en
  const zh = zhProp ?? ui.translating.zh
  const copyKey = `${en}\0${zh}`

  return (
    <motion.div
      className={`translate-thinking ${className}`.trim()}
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

      <div className="tt-copy" key={copyKey}>
        <BounceLine text={en} lang="en" reduce={reduce} />
        <BounceLine text={zh} lang="zh" reduce={reduce} delayOffset={0.12} />
      </div>
    </motion.div>
  )
}
