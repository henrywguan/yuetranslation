import { AnimatePresence, motion } from 'framer-motion'
import { useMemo, useState, type ReactNode } from 'react'
import { SpeakButton } from '../../components/SpeakButton'
import { inkEase } from '../../lib/motion'
import { useReducedMotion } from '../../lib/useReducedMotion'
import type { BuildStep, HearClip, PickStep, QuestStep, TeachStep } from './curriculum'
import type { HarborNpcRole } from './harborWorld'
import {
  JyutpingChaoPhrase,
  JyutpingChaoText,
  ToneDigitWithChao,
} from './JyutpingChaoText'

type QuestPanelProps = {
  step: QuestStep
  stepIndex: number
  stepCount: number
  onAdvance: () => void
  onResult: (ok: boolean) => void
  sourceUrl: string
  /** Glass HUD over the fullscreen harbor stage. */
  overlay?: boolean
  /** When false, world stays free to explore — dialogue is closed. */
  talking: boolean
  onTalk: () => void
  onExplore: () => void
  /** NPC clothing role for portrait + nameplate. */
  speakerRole?: HarborNpcRole
}

const SPEAKER: Record<HarborNpcRole, { en: string; zh: string }> = {
  villager: { en: 'Villager', zh: '村民' },
  scholar: { en: 'Scholar', zh: '書生' },
  fisherman: { en: 'Fisherman', zh: '漁夫' },
  merchant: { en: 'Merchant', zh: '商人' },
  child: { en: 'Child', zh: '小孩' },
  ferryman: { en: 'Ferryman', zh: '船家' },
}

/** Quest brief — collapsed by default; OSRS-style NPC dialogue when talking. */
export function QuestPanel({
  step,
  stepIndex,
  stepCount,
  onAdvance,
  onResult,
  sourceUrl,
  overlay = false,
  talking,
  onTalk,
  onExplore,
  speakerRole = 'ferryman',
}: QuestPanelProps) {
  const speaker = SPEAKER[speakerRole]

  return (
    <div
      className={`hq-quest${overlay ? ' hq-quest--overlay' : ''}${talking ? ' is-talking' : ' is-exploring'}`}
    >
      {!talking ? (
        <div className="hq-explore-bar">
          <p className="hq-explore-hint">
            <span className="hq-explore-step">
              {stepIndex + 1}/{stepCount}
            </span>
            <span className="hq-explore-hint-text">Drag to look around the harbor</span>
          </p>
          <div className="hq-explore-actions">
            <button type="button" className="hq-btn hq-btn--primary hq-btn--talk" onClick={onTalk}>
              Talk to {speaker.en}
            </button>
            <a className="hq-explore-source" href={sourceUrl} target="_blank" rel="noreferrer">
              Textbook ↗
            </a>
          </div>
        </div>
      ) : (
        <>
          <div className="hq-quest-chrome">
            <span className="hq-quest-kicker">
              Quest {stepIndex + 1} / {stepCount}
            </span>
            <button type="button" className="hq-btn hq-btn--ghost hq-btn--chrome" onClick={onExplore}>
              Explore world
            </button>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={step.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.28, ease: inkEase }}
              className="hq-quest-body"
            >
              {step.kind === 'teach' ? (
                <TeachBody step={step} speaker={speaker} speakerRole={speakerRole} onAdvance={onAdvance} />
              ) : step.kind === 'pick' ? (
                <PickBody
                  step={step}
                  speaker={speaker}
                  speakerRole={speakerRole}
                  onAdvance={onAdvance}
                  onResult={onResult}
                />
              ) : (
                <BuildBody
                  step={step}
                  speaker={speaker}
                  speakerRole={speakerRole}
                  onAdvance={onAdvance}
                  onResult={onResult}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </>
      )}
    </div>
  )
}

function Line({ line, className }: { line: { en: string; zh: string }; className?: string }) {
  return (
    <span className={className ? `hq-line ${className}` : 'hq-line'}>
      <span className="hq-line-en">
        <JyutpingChaoText text={line.en} />
      </span>
      <span className="hq-line-zh" lang="zh-HK">
        <JyutpingChaoText text={line.zh} />
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
          {clip.label ? <JyutpingChaoPhrase jp={clip.label} className="hq-hear-jp" /> : null}
          <SpeakButton text={clip.han} lang="yue" className="hq-hear-speak" warm={false} />
        </div>
      ))}
    </div>
  )
}

/** Low-poly CSS bust for the dialogue portrait frame. */
function NpcPortrait({ role }: { role: HarborNpcRole }) {
  return (
    <div className={`hq-dialog-portrait hq-dialog-portrait--${role}`} aria-hidden="true">
      <span className="hq-dialog-portrait-hat" />
      <span className="hq-dialog-portrait-head" />
      <span className="hq-dialog-portrait-eye hq-dialog-portrait-eye--l" />
      <span className="hq-dialog-portrait-eye hq-dialog-portrait-eye--r" />
      <span className="hq-dialog-portrait-robe" />
    </div>
  )
}

function DialogBox({
  speaker,
  speakerRole,
  children,
  continueLabel,
  onContinue,
}: {
  speaker: { en: string; zh: string }
  speakerRole: HarborNpcRole
  children: ReactNode
  continueLabel?: string
  onContinue?: () => void
}) {
  const inner = (
    <>
      <NpcPortrait role={speakerRole} />
      <div className="hq-dialog-copy">
        <p className="hq-dialog-name">
          {speaker.en}
          <span lang="zh-HK"> · {speaker.zh}</span>
        </p>
        <div className="hq-dialog-text">{children}</div>
        {continueLabel ? <p className="hq-dialog-continue">{continueLabel}</p> : null}
      </div>
    </>
  )

  if (onContinue) {
    return (
      <button type="button" className="hq-dialog" onClick={onContinue} aria-label={continueLabel}>
        {inner}
      </button>
    )
  }

  return (
    <div className="hq-dialog" role="group" aria-label={`${speaker.en} dialogue`}>
      {inner}
    </div>
  )
}

function TeachBody({
  step,
  speaker,
  speakerRole,
  onAdvance,
}: {
  step: TeachStep
  speaker: { en: string; zh: string }
  speakerRole: HarborNpcRole
  onAdvance: () => void
}) {
  return (
    <>
      <DialogBox
        speaker={speaker}
        speakerRole={speakerRole}
        continueLabel="Click here to continue"
        onContinue={onAdvance}
      >
        <p className="hq-dialog-lead">
          <Line line={step.title} />
        </p>
        <p>
          <Line line={step.body} />
        </p>
        {step.spotlightHint ? (
          <p className="hq-dialog-hint">
            <Line line={step.spotlightHint} />
          </p>
        ) : null}
        {step.spotlight ? (
          <p className="hq-dialog-spotlight" aria-hidden="true">
            <JyutpingChaoText text={step.spotlight} />
          </p>
        ) : null}
        <HearRow clips={step.hear} />
      </DialogBox>
      {/* Teach advances via the parchment click — no second Cast-off row (OSRS). */}
    </>
  )
}

function PickBody({
  step,
  speaker,
  speakerRole,
  onAdvance,
  onResult,
}: {
  step: PickStep
  speaker: { en: string; zh: string }
  speakerRole: HarborNpcRole
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
      <DialogBox speaker={speaker} speakerRole={speakerRole}>
        {step.tip ? (
          <p className="hq-dialog-hint">
            <Line line={step.tip} />
          </p>
        ) : null}
        <p className="hq-dialog-lead">
          <Line line={step.prompt} />
        </p>
        <HearRow clips={step.hear} />
        {resolved ? (
          <p className={`hq-feedback-text${picked === step.correctId ? ' is-ok' : ' is-no'}`}>
            <Line line={step.explain} />
          </p>
        ) : null}
        {resolved && picked === step.correctId ? (
          <div className="hq-dock-actions hq-dock-actions--next-first">
            <button type="button" className="hq-btn hq-btn--primary hq-btn--dock" onClick={onAdvance}>
              Next gate →
            </button>
          </div>
        ) : null}
      </DialogBox>

      <div className="hq-dialog-options">
        {/* Wrong picks keep the full choice list + Try again; correct collapses away. */}
        {!(resolved && picked === step.correctId) ? (
          <motion.div
            className="hq-choices"
            role="group"
            aria-label="Answers"
            initial="hidden"
            animate="show"
            variants={{
              hidden: {},
              show: { transition: { staggerChildren: 0.05, delayChildren: 0.04 } },
            }}
          >
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
                  variants={{
                    hidden: { opacity: 0, y: 10 },
                    show: { opacity: 1, y: 0 },
                  }}
                  transition={{ duration: 0.24, ease: inkEase }}
                  whileTap={reduce || resolved ? undefined : { scale: 0.98 }}
                >
                  <span className="hq-choice-label">
                    <JyutpingChaoText text={c.label} />
                  </span>
                  {c.sub ? (
                    <span className="hq-choice-sub">
                      <JyutpingChaoText text={c.sub} />
                    </span>
                  ) : null}
                </motion.button>
              )
            })}
          </motion.div>
        ) : null}
        {resolved && picked !== step.correctId ? (
          <div className="hq-dock-actions">
            <button
              type="button"
              className="hq-btn hq-btn--ghost hq-btn--dock"
              onClick={() => {
                setPicked(null)
                setResolved(false)
              }}
            >
              Try again
            </button>
          </div>
        ) : null}
      </div>
    </>
  )
}

function BuildBody({
  step,
  speaker,
  speakerRole,
  onAdvance,
  onResult,
}: {
  step: BuildStep
  speaker: { en: string; zh: string }
  speakerRole: HarborNpcRole
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
      <DialogBox speaker={speaker} speakerRole={speakerRole}>
        {step.tip ? (
          <p className="hq-dialog-hint">
            <Line line={step.tip} />
          </p>
        ) : null}
        <p className="hq-dialog-lead">
          <Line line={step.prompt} />
        </p>
        {!resolved ? <HearRow clips={step.hear} /> : null}
        <div className="hq-build-preview" aria-live="polite">
          <span className="hq-build-jp">
            {resolved && ok ? (
              <JyutpingChaoPhrase jp={step.resultJp} />
            ) : (
              <JyutpingChaoText text={assembled} />
            )}
          </span>
          {resolved && ok && step.resultGloss ? (
            <Line line={step.resultGloss} className="hq-build-gloss" />
          ) : null}
          {resolved && ok ? <HearRow clips={step.hear} /> : null}
        </div>
        {resolved ? (
          <p className={`hq-feedback-text${ok ? ' is-ok' : ' is-no'}`}>
            <Line line={step.explain} />
          </p>
        ) : null}
        {resolved && ok ? (
          <div className="hq-dock-actions hq-dock-actions--next-first">
            <button type="button" className="hq-btn hq-btn--primary hq-btn--dock" onClick={onAdvance}>
              Next gate →
            </button>
          </div>
        ) : null}
      </DialogBox>

      <div className="hq-dialog-options">
        {!(resolved && ok) ? (
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
                        {slot.key === 'tone' ? (
                          <ToneDigitWithChao digit={opt} />
                        ) : (
                          <JyutpingChaoText text={opt} />
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : null}
        <div className="hq-dock-actions">
          {!resolved ? (
            <button
              type="button"
              className="hq-btn hq-btn--primary hq-btn--dock"
              disabled={!complete}
              onClick={check}
            >
              Launch ferry
            </button>
          ) : ok ? null : (
            <button
              type="button"
              className="hq-btn hq-btn--ghost hq-btn--dock"
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
      </div>
    </>
  )
}
