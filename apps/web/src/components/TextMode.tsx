import { useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { CantoneseText } from './CantoneseText'
import { useYueStore } from '../lib/store'
import type { Lang } from '../lib/types'

const ease = [0.22, 1, 0.36, 1] as const

export function TextMode() {
  const [text, setText] = useState('')
  const [from, setFrom] = useState<Lang>('en')
  const translateTyped = useYueStore((s) => s.translateTyped)
  const history = useYueStore((s) => s.history)
  const latest = history[0]
  const reduce = useReducedMotion()

  return (
    <div className="text-mode">
      <div className="text-dirs">
        <button type="button" className={from === 'en' ? 'active' : ''} onClick={() => setFrom('en')}>
          EN → 粵
        </button>
        <button type="button" className={from === 'yue' ? 'active' : ''} onClick={() => setFrom('yue')}>
          粵 → EN
        </button>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        placeholder={from === 'en' ? 'Type English…' : '輸入粵語…'}
      />
      <button
        type="button"
        className="primary"
        onClick={() => void translateTyped(text, from)}
      >
        Translate
      </button>
      <AnimatePresence mode="wait">
        {latest ? (
          <motion.div
            key={latest.id}
            className="text-result reading-plane"
            initial={reduce ? false : { opacity: 0, y: 12, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={reduce ? undefined : { opacity: 0, y: -8 }}
            transition={{ duration: 0.45, ease }}
          >
            <p className="muted">Result</p>
            {latest.to === 'yue' ? (
              <CantoneseText text={latest.translation} className="result-text" />
            ) : (
              <p className="result-text">{latest.translation}</p>
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
