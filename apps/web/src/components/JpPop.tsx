import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'

export function JpPop({
  show,
  id,
  text,
  className = '',
}: {
  show: boolean
  id: string
  text: string
  className?: string
}) {
  const reduce = useReducedMotion()
  return (
    <AnimatePresence>
      {show ? (
        <motion.span
          id={id}
          role="tooltip"
          className={`jp-pop ${className}`.trim()}
          lang="en"
          initial={reduce ? false : { opacity: 0, y: 6, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reduce ? undefined : { opacity: 0, y: 4, scale: 0.98 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        >
          {text}
        </motion.span>
      ) : null}
    </AnimatePresence>
  )
}
