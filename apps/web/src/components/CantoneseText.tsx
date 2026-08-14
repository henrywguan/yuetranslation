import { useEffect, useState, type ReactNode } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ensureJyutping, hasHan, toJyutpingCached } from '../lib/jyutping'

export function CantoneseText({
  text,
  className,
  jyutpingClassName = 'jyutping',
  placeholder,
}: {
  text: string
  className?: string
  jyutpingClassName?: string
  placeholder?: ReactNode
}) {
  const trimmed = text.trim()
  const reduce = useReducedMotion()
  const [jp, setJp] = useState(() => toJyutpingCached(trimmed))
  useEffect(() => {
    let cancelled = false
    if (!trimmed || !hasHan(trimmed)) {
      setJp('')
      return
    }
    const cached = toJyutpingCached(trimmed)
    if (cached) {
      setJp(cached)
      return
    }
    void ensureJyutping(trimmed).then((v) => {
      if (!cancelled) setJp(v)
    })
    return () => {
      cancelled = true
    }
  }, [trimmed])

  if (!trimmed) return placeholder ? <>{placeholder}</> : null

  const instant = Boolean(reduce)

  return (
    <span className="cantonese-block">
      <motion.span
        key={`han-${trimmed}`}
        className={className}
        initial={instant ? false : { opacity: 0, y: 6, filter: 'blur(4px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
      >
        {trimmed}
      </motion.span>
      <AnimatePresence mode="wait">
        {jp ? (
          <motion.span
            key={`jp-${jp}`}
            className={jyutpingClassName}
            initial={instant ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.32, delay: instant ? 0 : 0.12, ease: [0.22, 1, 0.36, 1] }}
          >
            {jp}
          </motion.span>
        ) : null}
      </AnimatePresence>
    </span>
  )
}
