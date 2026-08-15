import { useReducedMotion } from '../lib/useReducedMotion'

const DOTS = [
  { left: '8%', top: '22%', size: 18, delay: '0s', duration: '5.6s' },
  { left: '22%', top: '68%', size: 10, delay: '1.1s', duration: '4.8s' },
  { left: '38%', top: '18%', size: 14, delay: '0.4s', duration: '6.2s' },
  { left: '54%', top: '58%', size: 22, delay: '1.8s', duration: '5.2s' },
  { left: '71%', top: '28%', size: 12, delay: '0.8s', duration: '4.4s' },
  { left: '86%', top: '64%', size: 16, delay: '2.2s', duration: '5.8s' },
  { left: '16%', top: '42%', size: 8, delay: '1.5s', duration: '4.2s' },
]

/** Soft breathing orbs behind a pane. Does not move the pane itself. */
export function PaneParticles() {
  const reduce = useReducedMotion()
  if (reduce) return null
  return (
    <div className="pane-particles" aria-hidden="true">
      {DOTS.map((dot, i) => (
        <span
          key={i}
          className="pane-particle"
          style={{
            left: dot.left,
            top: dot.top,
            width: dot.size,
            height: dot.size,
            animationDelay: dot.delay,
            animationDuration: dot.duration,
          }}
        />
      ))}
    </div>
  )
}
