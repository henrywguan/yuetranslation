import { motion, useReducedMotion } from 'framer-motion'

function GlassOrb({ className }: { className: string }) {
  return (
    <div className={`fluid-bubble ${className}`} aria-hidden="true">
      <span className="fluid-bubble-sheen" />
      <span className="fluid-bubble-rim" />
    </div>
  )
}

/** Soft jade/harbor glass orbs for the translator shell. */
export function FluidBackground() {
  const reduced = useReducedMotion()

  return (
    <div className="fluid-bg" aria-hidden="true">
      <motion.div
        className="fluid-blob blob-a"
        animate={
          reduced
            ? undefined
            : { x: [0, 40, -20, 0], y: [0, -28, 18, 0], scale: [1, 1.08, 0.96, 1] }
        }
        transition={{ duration: 24, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="fluid-blob blob-b"
        animate={
          reduced
            ? undefined
            : { x: [0, -44, 22, 0], y: [0, 32, -22, 0], scale: [1, 0.94, 1.1, 1] }
        }
        transition={{ duration: 28, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="fluid-blob blob-c"
        animate={
          reduced
            ? undefined
            : { x: [0, 24, -32, 0], y: [0, 16, -24, 0], scale: [1, 1.06, 0.97, 1] }
        }
        transition={{ duration: 32, repeat: Infinity, ease: 'easeInOut' }}
      />
      <GlassOrb className="bubble-1" />
      <GlassOrb className="bubble-2" />
      <GlassOrb className="bubble-3" />
      <div className="fluid-grain" />
    </div>
  )
}
