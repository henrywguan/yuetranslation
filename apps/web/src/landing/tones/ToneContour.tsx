import { motion } from 'framer-motion'
import { useId, useMemo } from 'react'
import { inkEase } from '../../lib/motion'
import { contourPath, type TonePoint } from './tonesData'

type ToneContourProps = {
  points: TonePoint[]
  active?: boolean
  compact?: boolean
  className?: string
}

/** Animated pitch ribbon for one Cantonese tone. */
export function ToneContour({ points, active = true, compact = false, className = '' }: ToneContourProps) {
  const uid = useId().replace(/:/g, '')
  const width = compact ? 168 : 360
  const height = compact ? 78 : 156
  const d = useMemo(() => contourPath(points, width, height), [points, width, height])
  const end = points[points.length - 1]
  const endX = end ? 16 + end.x * (width - 32) : width - 16
  const endY = end ? 18 + (1 - end.y) * (height - 36) : height / 2
  const strokeId = `toneStroke-${uid}`

  return (
    <svg
      className={`tone-contour${active ? ' is-active' : ''} ${className}`.trim()}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={strokeId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="var(--jade-deep, #2a9f8c)" />
          <stop offset="50%" stopColor="var(--jade, #3dcfb6)" />
          <stop offset="100%" stopColor="var(--jade-bright, #7aebd4)" />
        </linearGradient>
      </defs>
      <g className="tone-contour-rails">
        <line x1="14" y1={height * 0.2} x2={width - 14} y2={height * 0.2} />
        <line x1="14" y1={height * 0.5} x2={width - 14} y2={height * 0.5} />
        <line x1="14" y1={height * 0.8} x2={width - 14} y2={height * 0.8} />
      </g>
      <motion.path
        key={d}
        d={d}
        fill="none"
        stroke={`url(#${strokeId})`}
        strokeWidth={compact ? 3.4 : 4.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0, opacity: 0.4 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: active ? 0.9 : 0.45, ease: inkEase }}
      />
      <motion.circle
        key={`end-${d}`}
        cx={endX}
        cy={endY}
        r={compact ? 4 : 5.5}
        fill="var(--jade-bright, #7aebd4)"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.55, duration: 0.28, ease: inkEase }}
      />
    </svg>
  )
}
