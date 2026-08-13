import { motion, useReducedMotion } from 'framer-motion'

/** Soft iridescent orbs for the translator shell (CSS twin of the landing shader). */
export function FluidBackground() {
  const reduced = useReducedMotion()

  return (
    <div className="fluid-bg" aria-hidden="true">
      <motion.div
        className="fluid-blob blob-a"
        animate={
          reduced
            ? undefined
            : { x: [0, 48, -24, 0], y: [0, -36, 22, 0], scale: [1, 1.12, 0.94, 1] }
        }
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="fluid-blob blob-b"
        animate={
          reduced
            ? undefined
            : { x: [0, -56, 28, 0], y: [0, 42, -28, 0], scale: [1, 0.9, 1.14, 1] }
        }
        transition={{ duration: 24, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="fluid-blob blob-c"
        animate={
          reduced
            ? undefined
            : { x: [0, 30, -40, 0], y: [0, 20, -30, 0], scale: [1, 1.08, 0.96, 1] }
        }
        transition={{ duration: 28, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div className="fluid-bubble bubble-1" />
      <div className="fluid-bubble bubble-2" />
      <div className="fluid-bubble bubble-3" />
      <div className="fluid-grain" />
    </div>
  )
}
