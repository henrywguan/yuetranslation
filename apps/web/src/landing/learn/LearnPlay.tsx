import { useCallback, useEffect, useState } from 'react'
import {
  HARBOR_LEVELS,
  levelById,
  nextLevelId,
  openCantoneseLessonUrl,
  type HarborLevel,
} from './curriculum'
import { HarborStage } from './HarborStage'
import {
  isLevelCleared,
  isLevelUnlocked,
  markCorrect,
  markLevelCleared,
  markStepReached,
  type HarborProgress,
} from './progress'
import { QuestPanel } from './QuestPanel'

type LearnSessionProps = {
  levelId: string
  onExit: () => void
  onOpenLevel: (id: string) => void
  onProgress: (p: HarborProgress) => void
}

/** Fullscreen harbor session — stage fills the viewport; quest HUD overlays. */
export function LearnSession({ levelId, onExit, onOpenLevel, onProgress }: LearnSessionProps) {
  const level = levelById(levelId)
  const [stepIndex, setStepIndex] = useState(0)
  const [flash, setFlash] = useState<'ok' | 'no' | null>(null)
  const [cleared, setCleared] = useState(false)
  const [lastOk, setLastOk] = useState(false)

  useEffect(() => {
    setStepIndex(0)
    setFlash(null)
    setCleared(false)
    setLastOk(false)
  }, [levelId])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  useEffect(() => {
    if (!level) return
    onProgress(markStepReached(level.id, stepIndex))
  }, [level, stepIndex, onProgress])

  const advance = useCallback(() => {
    if (!level) return
    if (stepIndex >= level.steps.length - 1) {
      onProgress(markLevelCleared(level.id))
      setCleared(true)
      return
    }
    setStepIndex((i) => i + 1)
    setFlash(null)
    setLastOk(false)
  }, [level, stepIndex, onProgress])

  const onResult = useCallback(
    (ok: boolean) => {
      setFlash(ok ? 'ok' : 'no')
      setLastOk(ok)
      if (ok) onProgress(markCorrect())
      window.setTimeout(() => setFlash(null), 420)
    },
    [onProgress],
  )

  if (!level) {
    return (
      <div className="hq-play hq-play--missing">
        <p>That pier isn’t on the chart.</p>
        <button type="button" className="hq-btn hq-btn--primary" onClick={onExit}>
          Back to map
        </button>
      </div>
    )
  }

  if (cleared) {
    return <LevelClear level={level} onExit={onExit} onOpenLevel={onOpenLevel} />
  }

  const step = level.steps[stepIndex]!
  const spotlight =
    step.kind === 'teach'
      ? step.spotlight
      : step.kind === 'build' && lastOk
        ? step.resultJp
        : undefined

  return (
    <div className="hq-play hq-play--immersive" data-flash={flash ?? undefined}>
      <div className="hq-play-stage" aria-hidden="true">
        <HarborStage
          level={level}
          stepIndex={stepIndex}
          stepCount={level.steps.length}
          flash={flash}
          spotlight={spotlight}
          immersive
        />
      </div>

      <header className="hq-play-hud-top">
        <button type="button" className="hq-btn hq-btn--ghost hq-btn--hud" onClick={onExit}>
          ← Map
        </button>
        <div className="hq-play-bar-title">
          <span className="hq-play-ch">Ch. {level.chapter}</span>
          <span className="hq-play-name">{level.title.en}</span>
          <span className="hq-play-name-zh" lang="zh-HK">
            {level.title.zh}
          </span>
        </div>
        <a
          className="hq-btn hq-btn--ghost hq-btn--link hq-btn--hud"
          href={openCantoneseLessonUrl(level)}
          target="_blank"
          rel="noreferrer"
        >
          Textbook
        </a>
      </header>

      <div className="hq-play-hud">
        <QuestPanel
          step={step}
          stepIndex={stepIndex}
          stepCount={level.steps.length}
          sourceUrl={openCantoneseLessonUrl(level)}
          onAdvance={advance}
          onResult={onResult}
          overlay
        />
      </div>
    </div>
  )
}

function LevelClear({
  level,
  onExit,
  onOpenLevel,
}: {
  level: HarborLevel
  onExit: () => void
  onOpenLevel: (id: string) => void
}) {
  const next = nextLevelId(level.id)
  return (
    <div className="hq-clear hq-clear--immersive">
      <p className="hq-clear-kicker">Pier cleared</p>
      <h2 className="hq-clear-title">{level.title.en}</h2>
      <p className="hq-clear-zh" lang="zh-HK">
        {level.title.zh}
      </p>
      <p className="hq-clear-body">
        Syllables logged. The ferry holds at the next lantern
        {next ? ' — cast toward the following pier.' : ' — the chart is complete.'}
      </p>
      <div className="hq-clear-actions">
        {next ? (
          <button type="button" className="hq-btn hq-btn--primary" onClick={() => onOpenLevel(next)}>
            Next pier →
          </button>
        ) : null}
        <button type="button" className="hq-btn hq-btn--ghost" onClick={onExit}>
          Return to map
        </button>
      </div>
    </div>
  )
}

/** Campaign pier map for the Learn hub. */
export function HarborMap({
  progress,
  onSelect,
}: {
  progress: HarborProgress
  onSelect: (id: string) => void
}) {
  const ids = HARBOR_LEVELS.map((l) => l.id)
  return (
    <ol className="hq-map" aria-label="Pronunciation guide piers">
      {HARBOR_LEVELS.map((level, i) => {
        const unlocked = isLevelUnlocked(level.id, ids, progress)
        const cleared = isLevelCleared(level.id, progress)
        return (
          <li key={level.id} className={`hq-map-node hq-map-node--${level.hue}`}>
            {i > 0 ? <span className="hq-map-bridge" aria-hidden="true" /> : null}
            <button
              type="button"
              className={`hq-map-btn${cleared ? ' is-cleared' : ''}${!unlocked ? ' is-locked' : ''}`}
              disabled={!unlocked}
              onClick={() => onSelect(level.id)}
            >
              <span className="hq-map-ch">{level.chapter === 0 ? 'Intro' : `Ch ${level.chapter}`}</span>
              <span className="hq-map-title">{level.title.en}</span>
              <span className="hq-map-title-zh" lang="zh-HK">
                {level.title.zh}
              </span>
              <span className="hq-map-tags">
                {level.tags.map((t) => (
                  <span key={t}>{t}</span>
                ))}
              </span>
              <span className="hq-map-status">
                {!unlocked ? 'Locked' : cleared ? 'Cleared' : 'Sail'}
              </span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}
