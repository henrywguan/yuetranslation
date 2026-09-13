import { motion } from 'framer-motion'
import { inkEase } from '../../lib/motion'
import { useReducedMotion } from '../../lib/useReducedMotion'
import { JyutpingChaoText } from './JyutpingChaoText'
import type { HarborLevel } from './curriculum'

type HarborStageProps = {
  level: HarborLevel
  stepIndex: number
  stepCount: number
  /** Flash feedback after an answer. */
  flash?: 'ok' | 'no' | null
  /** Optional big glyph in the sky. */
  spotlight?: string
  /** Fill the viewport behind the quest HUD. */
  immersive?: boolean
}

/** Right-pane harbor world — ferry advances along pier stones (CodeCombat-style stage). */
export function HarborStage({
  level,
  stepIndex,
  stepCount,
  flash = null,
  spotlight,
  immersive = false,
}: HarborStageProps) {
  const reduce = useReducedMotion()
  const total = Math.max(stepCount, 1)
  const progress = Math.min(stepIndex / total, 1)
  const stones = Array.from({ length: total }, (_, i) => i)

  return (
    <div
      className={`hq-stage hq-stage--${level.hue}${immersive ? ' hq-stage--immersive' : ''}${flash === 'ok' ? ' is-ok' : ''}${flash === 'no' ? ' is-no' : ''}`}
      aria-hidden="true"
    >
      <div className="hq-stage-sky" />
      <div className="hq-stage-mist hq-stage-mist--a" />
      <div className="hq-stage-mist hq-stage-mist--b" />
      <div className="hq-stage-wave" />
      <div className="hq-stage-wave hq-stage-wave--b" />

      {spotlight ? (
        <motion.div
          key={spotlight}
          className="hq-stage-spotlight"
          initial={reduce ? false : { opacity: 0, y: 12, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.45, ease: inkEase }}
        >
          <JyutpingChaoText text={spotlight} />
        </motion.div>
      ) : null}

      <svg className="hq-stage-svg" viewBox="0 0 640 360" role="presentation">
        <defs>
          <linearGradient id="hqWater" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--hq-water-top)" />
            <stop offset="100%" stopColor="var(--hq-water-bot)" />
          </linearGradient>
          <linearGradient id="hqPier" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--hq-pier-a)" />
            <stop offset="100%" stopColor="var(--hq-pier-b)" />
          </linearGradient>
        </defs>

        <rect x="0" y="200" width="640" height="160" fill="url(#hqWater)" />
        <path
          d="M0 210 Q80 198 160 212 T320 208 T480 216 T640 204 L640 360 L0 360 Z"
          fill="url(#hqWater)"
          opacity="0.85"
        />

        {/* Pier boardwalk */}
        <path
          d="M40 250 C140 230, 240 268, 320 248 S500 230, 600 255"
          fill="none"
          stroke="url(#hqPier)"
          strokeWidth="28"
          strokeLinecap="round"
        />
        <path
          d="M40 250 C140 230, 240 268, 320 248 S500 230, 600 255"
          fill="none"
          stroke="color-mix(in srgb, var(--ink) 18%, transparent)"
          strokeWidth="2"
          strokeDasharray="10 14"
          strokeLinecap="round"
        />

        {stones.map((i) => {
          const t = stones.length === 1 ? 0.5 : i / (stones.length - 1)
          const x = 60 + t * 520
          const y = 248 + Math.sin(t * Math.PI * 1.2) * 18
          const done = i < stepIndex
          const current = i === stepIndex
          return (
            <g key={i} transform={`translate(${x} ${y})`}>
              <ellipse
                cx="0"
                cy="6"
                rx="18"
                ry="7"
                fill="color-mix(in srgb, var(--ink) 22%, transparent)"
              />
              <ellipse
                cx="0"
                cy="0"
                rx="16"
                ry="10"
                className={`hq-stone${done ? ' is-done' : ''}${current ? ' is-current' : ''}`}
              />
              {done ? (
                <path
                  d="M-5 0 L-1 4 L6 -5"
                  fill="none"
                  stroke="var(--jade-bright, var(--jade))"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ) : (
                <text
                  x="0"
                  y="4"
                  textAnchor="middle"
                  className="hq-stone-num"
                  fontSize="9"
                >
                  {i + 1}
                </text>
              )}
            </g>
          )
        })}

        <Ferry
          stepIndex={stepIndex}
          total={total}
          reduce={reduce}
          shake={flash === 'no'}
        />
      </svg>

      <div className="hq-stage-meter" role="presentation">
        <div className="hq-stage-meter-fill" style={{ width: `${progress * 100}%` }} />
      </div>
      <p className="hq-stage-caption">
        {level.title.en}
        <span aria-hidden="true"> · </span>
        {stepIndex + 1}/{stepCount}
      </p>
    </div>
  )
}

function Ferry({
  stepIndex,
  total,
  reduce,
  shake,
}: {
  stepIndex: number
  total: number
  reduce: boolean
  shake: boolean
}) {
  const t = total <= 1 ? 0 : Math.min(stepIndex, total - 1) / Math.max(total - 1, 1)
  const x = 60 + t * 520
  const y = 248 + Math.sin(t * Math.PI * 1.2) * 18 - 28

  return (
    <motion.g
      animate={
        reduce
          ? { x, y }
          : shake
            ? { x: [x, x - 6, x + 6, x - 3, x], y }
            : { x, y }
      }
      transition={
        shake
          ? { duration: 0.35 }
          : { type: 'spring', stiffness: 120, damping: 18 }
      }
    >
      <ellipse cx="0" cy="22" rx="22" ry="6" fill="color-mix(in srgb, var(--ink) 25%, transparent)" />
      <path
        d="M-22 8 L22 8 L16 18 L-16 18 Z"
        fill="color-mix(in srgb, var(--harbor-mid, #1a3a4a) 70%, #0d222c)"
      />
      <path d="M-10 8 L-6 -6 L10 -6 L14 8 Z" fill="var(--jade)" />
      <rect x="-2" y="-14" width="3" height="10" rx="1" fill="var(--ink)" opacity="0.7" />
      <path d="M1 -14 L14 -10 L1 -6 Z" fill="color-mix(in srgb, var(--jade-bright, #7aebd4) 80%, white)" />
    </motion.g>
  )
}
