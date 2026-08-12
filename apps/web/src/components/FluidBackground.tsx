import { motion } from 'framer-motion'

export function FluidBackground() {
  return (
    <div className="fluid-bg" aria-hidden="true">
      <motion.div
        className="fluid-blob blob-a"
        animate={{ x: [0, 40, -20, 0], y: [0, -30, 20, 0], scale: [1, 1.08, 0.96, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="fluid-blob blob-b"
        animate={{ x: [0, -50, 30, 0], y: [0, 40, -25, 0], scale: [1, 0.92, 1.1, 1] }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div className="fluid-grain" />
    </div>
  )
}
