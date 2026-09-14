import { useCallback, useEffect, useState } from 'react'
import {
  HARBOR_LEVELS,
  levelById,
  nextLevelId,
  openCantoneseLessonUrl,
  type HarborLevel,
} from './curriculum'
import { HarborStage } from './HarborStage'
import { MatchDefinitionModal } from './MatchDefinitionModal'
import {
  isLevelCleared,
  isLevelUnlocked,
  loadHarborProgress,
  markCorrect,
  markGoldEarned,
  markLevelCleared,
  markStepReached,
  type HarborProgress,
} from './progress'
import { QuestPanel } from './QuestPanel'
import { missionBaseXp, sailorLevelFromXp } from './xpRewards'

type LearnSessionProps = {
  levelId: string
  onExit: () => void
  onOpenLevel: (id: string) => void
  onProgress: (p: HarborProgress) => void
}

/** Dual-pane CodeCombat-style session for one Harbor Quest level. */
export function LearnSession({ levelId, onExit, onOpenLevel, onProgress }: LearnSessionProps) {
  const level = levelById(levelId)
  const [stepIndex, setStepIndex] = useState(0)
  const [flash, setFlash] = useState<'ok' | 'no' | null>(null)
  const [cleared, setCleared] = useState(false)
  const [lastOk, setLastOk] = useState(false)
  const [arenaOpen, setArenaOpen] = useState(false)
  const [gold, setGold] = useState(() => loadHarborProgress().gold)
  const [xp, setXp] = useState(() => loadHarborProgress().xp)
  const [clearReward, setClearReward] = useState<{
    xpGained: number
    repeat: boolean
    clearCount: number
  } | null>(null)

  useEffect(() => {
    setStepIndex(0)
    setFlash(null)
    setCleared(false)
    setLastOk(false)
    setClearReward(null)
  }, [levelId])

  useEffect(() => {
    if (!level) return
    onProgress(markStepReached(level.id, stepIndex))
  }, [level, stepIndex, onProgress])

  const advance = useCallback(() => {
    if (!level) return
    if (stepIndex >= level.steps.length - 1) {
      const result = markLevelCleared(level.id, missionBaseXp(level))
      setXp(result.progress.xp)
      setClearReward({
        xpGained: result.xpGained,
        repeat: result.repeat,
        clearCount: result.clearCount,
      })
      onProgress(result.progress)
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

  const onEarnGold = useCallback(
    (amount: number) => {
      const next = markGoldEarned(amount)
      setGold(next.gold)
      onProgress(next)
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
    return (
      <LevelClear
        level={level}
        reward={clearReward}
        onExit={onExit}
        onOpenLevel={onOpenLevel}
        onReplay={() => {
          setClearReward(null)
          setCleared(false)
          setStepIndex(0)
          setFlash(null)
          setLastOk(false)
        }}
      />
    )
  }

  const step = level.steps[stepIndex]!
  const spotlight =
    step.kind === 'teach'
      ? step.spotlight
      : step.kind === 'build' && lastOk
        ? step.resultJp
        : undefined

  return (
    <div className="hq-play">
      <div className="hq-play-bar">
        <button type="button" className="hq-btn hq-btn--ghost" onClick={onExit}>
          ← Map
        </button>
        <div className="hq-play-bar-title">
          <span className="hq-play-ch">Ch. {level.chapter}</span>
          <span className="hq-play-name">{level.title.en}</span>
          <span className="hq-play-name-zh" lang="zh-HK">
            {level.title.zh}
          </span>
        </div>
        <div className="hq-play-bar-right">
          <span className="hq-play-xp" title="Experience" aria-live="polite">
            <span className="hq-play-xp-icon" aria-hidden="true">
              XP
            </span>
            {xp}
            <span className="hq-play-xp-lv">Lv {sailorLevelFromXp(xp)}</span>
          </span>
          <span className="hq-play-gold" title="Arena gold" aria-live="polite">
            <span className="hq-play-gold-icon" aria-hidden="true">
              金
            </span>
            {gold}
          </span>
          <a
            className="hq-btn hq-btn--ghost hq-btn--link"
            href={openCantoneseLessonUrl(level)}
            target="_blank"
            rel="noreferrer"
          >
            Textbook
          </a>
        </div>
      </div>

      <div className="hq-play-grid">
        <QuestPanel
          step={step}
          stepIndex={stepIndex}
          stepCount={level.steps.length}
          sourceUrl={openCantoneseLessonUrl(level)}
          onAdvance={advance}
          onResult={onResult}
        />
        <HarborStage
          level={level}
          stepIndex={stepIndex}
          stepCount={level.steps.length}
          flash={flash}
          spotlight={spotlight}
          onOpenArena={() => setArenaOpen(true)}
        />
      </div>

      <MatchDefinitionModal
        open={arenaOpen}
        gold={gold}
        onClose={() => setArenaOpen(false)}
        onEarnGold={onEarnGold}
      />
    </div>
  )
}

function LevelClear({
  level,
  reward,
  onExit,
  onOpenLevel,
  onReplay,
}: {
  level: HarborLevel
  reward: { xpGained: number; repeat: boolean; clearCount: number } | null
  onExit: () => void
  onOpenLevel: (id: string) => void
  onReplay: () => void
}) {
  const next = nextLevelId(level.id)
  const base = missionBaseXp(level)
  const repeatXp = Math.floor(base * 0.5)
  return (
    <div className="hq-clear">
      <p className="hq-clear-kicker">{reward?.repeat ? 'Mission replayed' : 'Pier cleared'}</p>
      <h2 className="hq-clear-title">{level.title.en}</h2>
      <p className="hq-clear-zh" lang="zh-HK">
        {level.title.zh}
      </p>
      {reward ? (
        <p className="hq-clear-xp" aria-live="polite">
          +{reward.xpGained} XP
          {reward.repeat ? (
            <span className="hq-clear-xp-note"> · repeat reward (50% of {base})</span>
          ) : (
            <span className="hq-clear-xp-note"> · first clear</span>
          )}
          {reward.clearCount > 1 ? (
            <span className="hq-clear-xp-note"> · ×{reward.clearCount} clears</span>
          ) : null}
        </p>
      ) : null}
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
        <button type="button" className="hq-btn hq-btn--ghost" onClick={onReplay}>
          Replay · {repeatXp} XP
        </button>
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
        const base = missionBaseXp(level)
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
                {!unlocked
                  ? 'Locked'
                  : cleared
                    ? `Replay · ${Math.floor(base * 0.5)} XP`
                    : `Sail · ${base} XP`}
              </span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}
