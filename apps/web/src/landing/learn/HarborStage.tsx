import { motion } from 'framer-motion'
import { inkEase } from '../../lib/motion'
import { useReducedMotion } from '../../lib/useReducedMotion'
import type { HarborLook } from './harborGear'
import { HarborWorldCanvas } from './HarborWorldCanvas'
import type { HarborVisitableId } from './harborWorld'
import { JyutpingChaoText } from './JyutpingChaoText'
import { levelRealm, type HarborLevel } from './curriculum'

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
  /** Equipped River Scout look. */
  look: HarborLook
  /** Landmark visit (Save Shack / Outfitter / Bank). */
  onVisitable?: (id: HarborVisitableId | null) => void
}

/** Harbor Quest stage — continuous low-poly river voyage behind the HUD. */
export function HarborStage({
  level,
  stepIndex,
  stepCount,
  flash = null,
  spotlight,
  immersive = false,
  look,
  onVisitable,
}: HarborStageProps) {
  const reduce = useReducedMotion()
  const total = Math.max(stepCount, 1)
  const progress = Math.min(stepIndex / total, 1)

  return (
    <div
      className={`hq-stage hq-stage--${level.hue}${immersive ? ' hq-stage--immersive' : ''}${flash === 'ok' ? ' is-ok' : ''}${flash === 'no' ? ' is-no' : ''}`}
      aria-hidden="true"
    >
      <HarborWorldCanvas
        progress={progress}
        flash={flash}
        hue={level.hue}
        reducedMotion={reduce}
        look={look}
        realm={levelRealm(level)}
        onVisitable={onVisitable}
      />

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
