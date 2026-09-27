import type { PathCategory } from '../lib/practicePartnerPath'
import {
  PATH_LESSONS_PER_UNIT,
  PATH_UNIT_LABELS,
  PRACTICE_PARTNER_PATH_SECTIONS,
  bandForHarborScore,
  harborScore,
  type PathCreditNote,
  type PathFresh,
  type PathUnitId,
  type PracticePartnerPathState,
} from '../lib/practicePartnerPath'
import { PracticePartnerPathMap } from './PracticePartnerPathMap'

function noteText(note: PathCreditNote | null): string {
  if (!note) return ''
  if (note.kind === 'unit') return `Unit clear · ${note.label}`
  if (note.kind === 'section') return `Section clear · ${note.label}`
  return `Advanced · ${note.score}`
}

function MiniScrolls({
  filled,
  freshIndex,
  mark,
}: {
  filled: number
  freshIndex: number | null
  mark: string
}) {
  return (
    <span className="partner-path-scrolls">
      {Array.from({ length: PATH_LESSONS_PER_UNIT }, (_, index) => {
        const colored = index < filled
        const fresh = colored && freshIndex === index
        return (
          <span
            key={index}
            className={`partner-map-scroll is-mini${colored ? ' is-colored' : ' is-sealed'}${
              fresh ? ' is-fresh' : ''
            }`}
            aria-hidden
          >
            <span className="partner-map-scroll-roller" />
            <span className="partner-map-scroll-sheet">
              <span className="partner-map-scroll-mark" lang="zh-HK">
                {mark}
              </span>
            </span>
            <span className="partner-map-scroll-roller is-foot" />
          </span>
        )
      })}
    </span>
  )
}

/**
 * Harbor Score plus the voyage map.
 * Full mode is the topic picker. Compact mode sits on the drill card.
 */
export function PracticePartnerPath({
  progress,
  activeId,
  onPick,
  fresh = null,
  note = null,
  activeUnit = null,
  compact = false,
  listClassName = '',
}: {
  progress: PracticePartnerPathState
  activeId: PathCategory
  onPick?: (id: PathCategory) => void
  fresh?: PathFresh | null
  note?: PathCreditNote | null
  activeUnit?: PathUnitId | null
  compact?: boolean
  listClassName?: string
}) {
  const score = harborScore(progress)
  const band = bandForHarborScore(score)
  const active = PRACTICE_PARTNER_PATH_SECTIONS.find((row) => row.id === activeId)

  return (
    <div className={`partner-path${compact ? ' is-compact' : ''}`}>
      {compact ? (
        <p className="partner-path-compact-score">
          <span className="partner-path-cefr">{band.cefr}</span>
          <span className="partner-path-score-num">{score}</span>
          {note ? <span className="partner-path-note">{noteText(note)}</span> : null}
        </p>
      ) : (
        <div className="partner-path-plate">
          <p className="partner-path-kicker">Harbor Score</p>
          <p className="partner-path-score-line">
            <span className="partner-path-score-num">{score}</span>
            <span className="partner-path-band">
              {band.cefr} · {band.label}
            </span>
          </p>
          <p className="partner-path-blurb">{note ? noteText(note) : band.blurb}</p>
          <p className="partner-path-disclaimer">Practice bands paced like A1–B2. Not a formal exam.</p>
        </div>
      )}
      {compact && active ? (
        <div className="partner-path-units" aria-hidden="true">
          {PATH_UNIT_LABELS.map((label, unit) => (
            <span
              className={`partner-path-unit-wrap${activeUnit === unit ? ' is-active' : ''}`}
              key={label}
            >
              <MiniScrolls
                filled={progress.units[active.id][unit as PathUnitId] ?? 0}
                freshIndex={
                  fresh && fresh.category === active.id && fresh.unit === unit ? fresh.index : null
                }
                mark={active.labelZh.slice(0, 1)}
              />
            </span>
          ))}
        </div>
      ) : (
        <PracticePartnerPathMap
          progress={progress}
          activeId={activeId}
          onPick={onPick}
          fresh={fresh}
          listClassName={listClassName}
        />
      )}
    </div>
  )
}
