import { motion, useReducedMotion } from 'framer-motion'
import type { ReactNode } from 'react'
import { inkDuration, inkEase } from '../lib/motion'

/**
 * Fast commit animation for a finished line.
 * Interim updates keep the same key so they do not remount (no per-keystroke lag).
 */
export function InkSettle({
  id,
  children,
  className,
  interim = false,
}: {
  id: string
  children: ReactNode
  className?: string
  interim?: boolean
}) {
  const reduce = useReducedMotion()
  const skip = reduce || interim || id.endsWith('-empty')

  return (
    <motion.div
      key={id}
      className={className}
      initial={skip ? false : { opacity: 0.72, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: inkDuration, ease: inkEase }}
    >
      {children}
    </motion.div>
  )
}
