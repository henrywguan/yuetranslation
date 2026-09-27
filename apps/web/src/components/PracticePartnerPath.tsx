import type { PathCategory } from '../lib/practicePartnerPath'
import {
  PATH_LESSONS_PER_UNIT,
  PATH_UNIT_LABELS,
  PRACTICE_PARTNER_PATH_SECTIONS,
  bandForHarborScore,
  harborScore,
  pathFocusSection,
  pathSectionComplete,
  type PathCreditNote,
  type PathFresh,
  type PathUnitId,
  type PracticePartnerPathState,
} from '../lib/practicePartnerPath'

function noteText(note: PathCreditNote | null): string {
  if (!note) return ''
  if (note.kind === 'unit') return `Unit clear · ${note.label}`
  if (note.kind === 'section') return `Section clear · ${note.label}`
  return `Advanced · ${note.score}`
}

function UnitDots({
  filled,
  freshIndex,
}: {
  filled: number
  freshIndex: number | null
}) {
  return (
    <span className="partner-path-unit">
      {Array.from({ length: PATH_LESSONS_PER_UNIT }, (_, index) => {
        const on = index < filled
        const pop = on && freshIndex === index
        return (
          <span
            key={index}
            className={`partner-path-dot${on ? ' is-filled' : ''}${pop ? ' is-pop' : ''}`}
          />
        )
      })}
    </span>
  )
}

/**
 * Harbor Score plus the four-section path.
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
  const focus = pathFocusSection(progress)
  const active = PRACTICE_PARTNER_PATH_SECTIONS.find((row) => row.id === activeId)
  const shown = compact
    ? PRACTICE_PARTNER_PATH_SECTIONS.filter((row) => row.id === activeId)
    : PRACTICE_PARTNER_PATH_SECTIONS

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
      <ul className={listClassName || undefined} aria-label={compact ? undefined : 'Practice path'}>
        {shown.map((section) => {
          const units = progress.units[section.id]
          const clear = pathSectionComplete(progress, section.id)
          const here = section.id === focus && !clear
          const current = section.id === activeId
          const dots = (
            <span className="partner-path-units" aria-hidden="true">
              {PATH_UNIT_LABELS.map((label, unit) => (
                <span
                  className={`partner-path-unit-wrap${activeUnit === unit ? ' is-active' : ''}`}
                  key={label}
                >
                  {compact ? null : <span className="partner-path-unit-label">{label}</span>}
                  <UnitDots
                    filled={units[unit] ?? 0}
                    freshIndex={
                      fresh && fresh.category === section.id && fresh.unit === unit
                        ? fresh.index
                        : null
                    }
                  />
                </span>
              ))}
            </span>
          )
          const body = (
            <>
              <span className="partner-path-row-top">
                <span className="partner-path-cefr">{section.cefr}</span>
                <span className="partner-path-name">{section.labelEn}</span>
                <span className="partner-path-zh" lang="zh-HK">
                  {section.labelZh}
                </span>
                {clear ? <span className="partner-path-clear">Clear</span> : null}
                {here && !compact ? <span className="partner-path-here">Next</span> : null}
              </span>
              {dots}
            </>
          )
          return (
            <li key={section.id}>
              {onPick ? (
                <button
                  type="button"
                  className={`partner-lab-topic-item partner-path-section${current ? ' is-current' : ''}${
                    clear ? ' is-clear' : ''
                  }${here ? ' is-here' : ''}`}
                  aria-current={current ? 'true' : undefined}
                  onClick={() => onPick(section.id)}
                >
                  {body}
                </button>
              ) : (
                <div
                  className={`partner-path-section${clear ? ' is-clear' : ''}${here ? ' is-here' : ''}`}
                >
                  {compact ? null : body}
                  {compact ? dots : null}
                </div>
              )}
            </li>
          )
        })}
      </ul>
      {compact && active ? (
        <p className="partner-path-compact-unit">
          {PATH_UNIT_LABELS[0]} · {PATH_UNIT_LABELS[1]} · {PATH_UNIT_LABELS[2]}
        </p>
      ) : null}
    </div>
  )
}
