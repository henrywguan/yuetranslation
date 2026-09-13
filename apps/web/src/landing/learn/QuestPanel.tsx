import { AnimatePresence, motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import { SpeakButton } from '../../components/SpeakButton'
import { inkEase } from '../../lib/motion'
import { useReducedMotion } from '../../lib/useReducedMotion'
import type { BuildStep, HearClip, PickStep, QuestStep, TeachStep } from './curriculum'

type QuestPanelProps = {
  step: QuestStep
  stepIndex: number
  stepCount: number
  onAdvance: () => void
  onResult: (ok: boolean) => void
  sourceUrl: string
}

/** Left-pane quest brief — teach / pick / build challenges. */
export function QuestPanel({
  step,
  stepIndex,
  stepCount,
  onAdvance,
  onResult,
  sourceUrl,
}: QuestPanelProps) {
  return (
    <div className="hq-quest">
      <div className="hq-quest-top">
        <span className="hq-quest-kicker">
          Quest {stepIndex + 1} / {stepCount}
        </span>
        <a className="hq-quest-source" href={sourceUrl} target="_blank" rel="noreferrer">
          Open Cantonese ↗
        </a>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.35, ease: inkEase }}
          className="hq-quest-body"
        >
          {step.kind === 'teach' ? (
            <TeachBody step={step} onAdvance={onAdvance} />
          ) : step.kind === 'pick' ? (
            <PickBody step={step} onAdvance={onAdvance} onResult={onResult} />
          ) : (
            <BuildBody step={step} onAdvance={onAdvance} onResult={onResult} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

function Line({ line, className }: { line: { en: string; zh: string }; className?: string }) {
  return (
    <span className={className ? `hq-line ${className}` : 'hq-line'}>
      <span className="hq-line-en">{line.en}</span>
      <span className="hq-line-zh" lang="zh-HK">
        {line.zh}
      </span>
    </span>
  )
}

function HearRow({ clips }: { clips?: HearClip[] }) {
  if (!clips?.length) return null
  return (
    <div className="hq-hear" role="group" aria-label="Listen">
      {clips.map((clip) => (
        <div key={`${clip.han}-${clip.label ?? ''}`} className="hq-hear-chip">
          <span className="hq-hear-han" lang="zh-HK">
            {clip.han}
          </span>
          {clip.label ? <span className="hq-hear-jp">{clip.label}</span> : null}
          <SpeakButton text={clip.han} lang="yue" className="hq-hear-speak" warm={false} />
        </div>
      ))}
    </div>
  )
}

function TeachBody({ step, onAdvance }: { step: TeachStep; onAdvance: () => void }) {
  return (
    <>
      <h2 className="hq-quest-title">
        <Line line={step.title} />
      </h2>
      <p className="hq-quest-prose">
        <Line line={step.body} />
      </p>
      {step.spotlight ? (
        <div className="hq-quest-spotlight">
          <span className="hq-quest-spotlight-glyph" aria-hidden="true">
            {step.spotlight}
          </span>
          {step.spotlightHint ? (
            <Line line={step.spotlightHint} className="hq-quest-spotlight-hint" />
          ) : null}
          <HearRow clips={step.hear} />
        </div>
      ) : (
        <HearRow clips={step.hear} />
      )}
      <button type="button" className="hq-btn hq-btn--primary" onClick={onAdvance}>
        Cast off →
      </button>
    </>
  )
}

function PickBody({
  step,
  onAdvance,
  onResult,
}: {
  step: PickStep
  onAdvance: () => void
  onResult: (ok: boolean) => void
}) {
  const [picked, setPicked] = useState<string | null>(null)
  const [resolved, setResolved] = useState(false)
  const reduce = useReducedMotion()

  const submit = (id: string) => {
    if (resolved) return
    setPicked(id)
    const ok = id === step.correctId
    setResolved(true)
    onResult(ok)
  }

  return (
    <>
      {step.tip ? (
        <p className="hq-quest-tip">
          <Line line={step.tip} />
        </p>
      ) : null}
      <h2 className="hq-quest-title">
        <Line line={step.prompt} />
      </h2>
      <HearRow clips={step.hear} />
      <div className="hq-choices" role="group" aria-label="Answers">
        {step.choices.map((c) => {
          let state: 'idle' | 'ok' | 'no' | 'reveal' = 'idle'
          if (resolved) {
            if (c.id === step.correctId) state = picked === c.id ? 'ok' : 'reveal'
            else if (picked === c.id) state = 'no'
          }
          return (
            <motion.button
              key={c.id}
              type="button"
              className={`hq-choice is-${state}`}
              disabled={resolved}
              onClick={() => submit(c.id)}
              whileTap={reduce || resolved ? undefined : { scale: 0.98 }}
            >
              <span className="hq-choice-label">{c.label}</span>
              {c.sub ? <span className="hq-choice-sub">{c.sub}</span> : null}
            </motion.button>
          )
        })}
      </div>
      {resolved ? (
        <div className={`hq-feedback${picked === step.correctId ? ' is-ok' : ' is-no'}`}>
          <Line line={step.explain} />
          {picked === step.correctId ? (
            <button type="button" className="hq-btn hq-btn--primary" onClick={onAdvance}>
              Next gate →
            </button>
          ) : (
            <button
              type="button"
              className="hq-btn hq-btn--ghost"
              onClick={() => {
                setPicked(null)
                setResolved(false)
              }}
            >
              Try again
            </button>
          )}
        </div>
      ) : null}
    </>
  )
}

function BuildBody({
  step,
  onAdvance,
  onResult,
}: {
  step: BuildStep
  onAdvance: () => void
  onResult: (ok: boolean) => void
}) {
  const [sel, setSel] = useState<Record<string, string>>({})
  const [resolved, setResolved] = useState(false)
  const [ok, setOk] = useState(false)

  const complete = useMemo(
    () => step.slots.every((s) => Boolean(sel[s.key])),
    [sel, step.slots],
  )

  const assembled = step.slots.map((s) => sel[s.key] ?? '·').join('')

  const check = () => {
    if (resolved || !complete) return
    const pass = step.slots.every((s) => sel[s.key] === step.correct[s.key])
    setOk(pass)
    setResolved(true)
    onResult(pass)
  }

  return (
    <>
      {step.tip ? (
        <p className="hq-quest-tip">
          <Line line={step.tip} />
        </p>
      ) : null}
      <h2 className="hq-quest-title">
        <Line line={step.prompt} />
      </h2>
      {!resolved ? <HearRow clips={step.hear} /> : null}
      <div className="hq-build-preview" aria-live="polite">
        <span className="hq-build-jp">{resolved && ok ? step.resultJp : assembled}</span>
        {resolved && ok && step.resultGloss ? (
          <Line line={step.resultGloss} className="hq-build-gloss" />
        ) : null}
        {resolved && ok ? <HearRow clips={step.hear} /> : null}
      </div>
      <div className="hq-build-slots">
        {step.slots.map((slot) => (
          <div key={slot.key} className="hq-build-slot">
            <span className="hq-build-slot-label">{slot.label}</span>
            <div className="hq-build-opts" role="group" aria-label={slot.label}>
              {slot.options.map((opt) => {
                const on = sel[slot.key] === opt
                const reveal =
                  resolved && step.correct[slot.key] === opt
                    ? 'ok'
                    : resolved && on
                      ? 'no'
                      : on
                        ? 'on'
                        : 'idle'
                return (
                  <button
                    key={opt}
                    type="button"
                    className={`hq-tile is-${reveal}`}
                    disabled={resolved}
                    onClick={() => setSel((prev) => ({ ...prev, [slot.key]: opt }))}
                  >
                    {opt}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
      {!resolved ? (
        <button
          type="button"
          className="hq-btn hq-btn--primary"
          disabled={!complete}
          onClick={check}
        >
          Launch ferry
        </button>
      ) : (
        <div className={`hq-feedback${ok ? ' is-ok' : ' is-no'}`}>
          <Line line={step.explain} />
          {ok ? (
            <button type="button" className="hq-btn hq-btn--primary" onClick={onAdvance}>
              Next gate →
            </button>
          ) : (
            <button
              type="button"
              className="hq-btn hq-btn--ghost"
              onClick={() => {
                setSel({})
                setResolved(false)
                setOk(false)
              }}
            >
              Try again
            </button>
          )}
        </div>
      )}
    </>
  )
}
