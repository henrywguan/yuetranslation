import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ensureJyutpingSegs, expandJyutping, type JyutSeg } from '../lib/jyutping'

function RubyRow({ segs }: { segs: JyutSeg[] }) {
  return (
    <span className="jp-pop-ruby">
      {segs.map((seg, i) => (
        <span key={`${seg.char}-${i}`} className="jp-pop-cell">
          <span className="jp-pop-han" lang="zh-HK">
            {seg.char}
          </span>
          <span className="jp-pop-syl" lang="en">
            {seg.jp ? expandJyutping(seg.jp) : '\u00a0'}
          </span>
        </span>
      ))}
    </span>
  )
}

/** Jyutping tooltip: Chinese above each syllable when `han` is provided. */
export function JpPop({
  show,
  id,
  text,
  han = '',
  className = '',
}: {
  show: boolean
  id: string
  text: string
  /** Chinese source so each syllable can sit under its character. */
  han?: string
  className?: string
}) {
  const reduce = useReducedMotion()
  const [segs, setSegs] = useState<JyutSeg[]>([])
  const phrase = han.trim()

  useEffect(() => {
    if (!show || !phrase) {
      setSegs([])
      return
    }
    let cancelled = false
    void ensureJyutpingSegs(phrase).then((next) => {
      if (!cancelled) setSegs(next)
    })
    return () => {
      cancelled = true
    }
  }, [show, phrase])

  const body =
    phrase && segs.length ? (
      <RubyRow segs={segs} />
    ) : phrase && !segs.length ? (
      <span className="jp-pop-fallback" lang="zh-HK">
        <span className="jp-pop-han-line">{phrase}</span>
        <span className="jp-pop-syl-line">{expandJyutping(text)}</span>
      </span>
    ) : (
      expandJyutping(text)
    )

  return (
    <AnimatePresence>
      {show ? (
        <motion.span
          id={id}
          role="tooltip"
          className={`jp-pop ${phrase ? 'jp-pop--ruby' : ''} ${className}`.trim()}
          lang="en"
          initial={reduce ? false : { opacity: 0, y: 6, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reduce ? undefined : { opacity: 0, y: 4, scale: 0.98 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        >
          {body}
        </motion.span>
      ) : null}
    </AnimatePresence>
  )
}
