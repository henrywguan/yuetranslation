import { useState } from 'react'
import {
  cultureNoteFor,
  situationsFor,
  type MxSituation,
  type MxSituationId,
} from '../lib/mexicanSpanishPedagogy'
import { speakText } from '../lib/tts'
import { biPlain, ui } from '../lib/uiCopy'
import { BiText } from './BiText'
import { MexicanSpanishPractice } from './MexicanSpanishPractice'

/**
 * Details-only Mexican Spanish pedagogy: culture note + situation chips + practice.
 * Never renders on the compact translation line.
 */
export function MexicanSpanishLearnPanel({
  text,
  showPractice = true,
}: {
  text: string
  showPractice?: boolean
}) {
  const trimmed = text.trim()
  const note = cultureNoteFor(trimmed)
  const situations = situationsFor(trimmed)
  const [active, setActive] = useState<MxSituationId | null>(situations[0]?.id ?? null)
  const [practiceTarget, setPracticeTarget] = useState(trimmed)

  if (!trimmed) return null

  const current: MxSituation | undefined =
    situations.find((s) => s.id === active) || situations[0]

  return (
    <section className="mx-learn" aria-label={biPlain(ui.mxLearnTitle)}>
      <h3 className="mx-learn-title">
        <BiText copy={ui.mxLearnTitle} size="sm" />
      </h3>

      {note ? (
        <div className="mx-culture" lang="en">
          <p className="mx-culture-term" lang="es-MX">
            {note.term}
          </p>
          <p className="mx-culture-note">{note.noteEn}</p>
          <p className="mx-culture-note mx-culture-note--zh" lang="zh-HK">
            {note.noteZh}
          </p>
        </div>
      ) : (
        <p className="mx-culture-empty muted">
          <BiText copy={ui.mxCultureEmpty} size="sm" hideJp />
        </p>
      )}

      <div className="mx-situations">
        <p className="mx-situations-label">
          <BiText copy={ui.mxSituations} size="sm" hideJp />
        </p>
        <div className="mx-situation-chips" role="list">
          {situations.map((s) => (
            <button
              key={s.id}
              type="button"
              role="listitem"
              className={`mx-situation-chip${s.id === current?.id ? ' is-active' : ''}`}
              onClick={() => setActive(s.id)}
            >
              <span className="mx-situation-chip-en">{s.labelEn}</span>
              <span className="mx-situation-chip-zh" lang="zh-HK">
                {s.labelZh}
              </span>
            </button>
          ))}
        </div>
        {current ? (
          <ul className="mx-chunks">
            {current.chunks.map((chunk) => (
              <li key={chunk}>
                <button
                  type="button"
                  className="mx-chunk"
                  lang="es-MX"
                  onClick={() => {
                    setPracticeTarget(chunk)
                    void speakText(chunk, 'es')
                  }}
                >
                  {chunk}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {showPractice ? <MexicanSpanishPractice target={practiceTarget} /> : null}
    </section>
  )
}
