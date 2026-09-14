import { useCallback, useEffect, useState } from 'react'
import {
  HARBOR_LEVELS,
  levelById,
  nextLevelId,
  openCantoneseLessonUrl,
  type HarborLevel,
} from './curriculum'
import {
  HARBOR_FANFARE_DURATION_MS,
  playHarborCorrectFanfare,
  stopHarborCorrectFanfare,
} from './harborFanfare'
import { duckHarborBgm, startHarborBgm, stopHarborBgm } from './harborBgm'
import { playHarborCoinChing } from './harborCoinSfx'
import { playHarborMiss, preloadHarborMissSfx, stopHarborMiss } from './harborSfx'
import {
  HARBOR_GEAR_SLOTS,
  harborGearById,
  harborGearForSlot,
  type HarborGearId,
  type HarborGearSlot,
} from './harborGear'
import { HarborStage } from './HarborStage'
import {
  HARBOR_NPC_ROLES,
  type HarborNpcRole,
  type HarborVisitableId,
} from './harborWorld'
import {
  HARBOR_COINS_PER_CORRECT,
  isLevelCleared,
  isLevelUnlocked,
  buyHarborGear,
  equipHarborGear,
  loadHarborProgress,
  markCorrect,
  markLevelCleared,
  markStepReached,
  visitSaveShack,
  type HarborProgress,
} from './progress'
import { QuestPanel } from './QuestPanel'

/** Rotate pier speakers by step so dialogue feels peopled. */
function speakerForStep(stepIndex: number): HarborNpcRole {
  return HARBOR_NPC_ROLES[stepIndex % HARBOR_NPC_ROLES.length]!
}

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
  /** World-first: dialogue closed until the sailor chooses Talk. */
  const [talking, setTalking] = useState(false)
  const [progressSnap, setProgressSnap] = useState<HarborProgress>(() => loadHarborProgress())
  const [visitable, setVisitable] = useState<HarborVisitableId | null>(null)
  const [shopSlot, setShopSlot] = useState<HarborGearSlot>('hat')
  const [saveFlash, setSaveFlash] = useState<string | null>(null)
  const [shopMsg, setShopMsg] = useState<string | null>(null)
  const [coinPops, setCoinPops] = useState<{ id: number; amount: number }[]>([])

  useEffect(() => {
    setStepIndex(0)
    setFlash(null)
    setCleared(false)
    setLastOk(false)
    setTalking(false)
    setVisitable(null)
    setSaveFlash(null)
    setShopMsg(null)
    setCoinPops([])
  }, [levelId])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    preloadHarborMissSfx()
    // BGM needs a user gesture on many browsers — also kicked from onResult.
    startHarborBgm()
    return () => {
      document.body.style.overflow = prev
      stopHarborCorrectFanfare()
      stopHarborMiss()
      stopHarborBgm()
    }
  }, [])

  const pushProgress = useCallback(
    (p: HarborProgress) => {
      setProgressSnap(p)
      onProgress(p)
    },
    [onProgress],
  )

  useEffect(() => {
    if (!level) return
    pushProgress(markStepReached(level.id, stepIndex))
  }, [level, stepIndex, pushProgress])

  const advance = useCallback(() => {
    if (!level) return
    if (stepIndex >= level.steps.length - 1) {
      pushProgress(markLevelCleared(level.id))
      setCleared(true)
      return
    }
    setStepIndex((i) => i + 1)
    setFlash(null)
    setLastOk(false)
  }, [level, stepIndex, pushProgress])

  const onResult = useCallback(
    (ok: boolean) => {
      setFlash(ok ? 'ok' : 'no')
      setLastOk(ok)
      if (ok) {
        stopHarborMiss()
        pushProgress(markCorrect())
        playHarborCorrectFanfare()
        playHarborCoinChing()
        duckHarborBgm(HARBOR_FANFARE_DURATION_MS)
        startHarborBgm()
        const id = Date.now() + Math.random()
        setCoinPops((prev) => [...prev, { id, amount: HARBOR_COINS_PER_CORRECT }])
        window.setTimeout(() => {
          setCoinPops((prev) => prev.filter((p) => p.id !== id))
        }, 1400)
      } else {
        stopHarborCorrectFanfare()
        // Default: RPG-style body hit. Pass 'oof' for the block-game vocal.
        playHarborMiss('thud')
      }
      window.setTimeout(() => setFlash(null), 420)
    },
    [pushProgress],
  )

  const onVisitable = useCallback((id: HarborVisitableId | null) => {
    setVisitable(id)
    if (!id) {
      setSaveFlash(null)
      setShopMsg(null)
    }
  }, [])

  const onSave = useCallback(() => {
    const p = visitSaveShack()
    pushProgress(p)
    setSaveFlash('Progress & look saved.')
  }, [pushProgress])

  const onBuy = useCallback(
    (id: HarborGearId) => {
      const res = buyHarborGear(id)
      if (!res.ok) {
        setShopMsg(res.reason)
        return
      }
      pushProgress(res.progress)
      setShopMsg(`Bought ${harborGearById(id)?.name.en ?? id}.`)
    },
    [pushProgress],
  )

  const onEquip = useCallback(
    (slot: HarborGearSlot, id: HarborGearId) => {
      const res = equipHarborGear(slot, id)
      if (!res.ok) {
        setShopMsg(res.reason)
        return
      }
      pushProgress(res.progress)
      setShopMsg(`Equipped ${harborGearById(id)?.name.en ?? id}.`)
    },
    [pushProgress],
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
    <div
      className={`hq-play hq-play--immersive${talking ? ' is-talking' : ' is-exploring'}`}
      data-flash={flash ?? undefined}
    >
      <div className="hq-play-stage">
        <HarborStage
          level={level}
          stepIndex={stepIndex}
          stepCount={level.steps.length}
          flash={flash}
          spotlight={talking ? spotlight : undefined}
          immersive
          look={progressSnap.look}
          onVisitable={onVisitable}
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
        <div
          className={`hq-coin-chip${coinPops.length ? ' is-earning' : ''}`}
          title="Ferry coins"
          aria-live="polite"
        >
          <span className="hq-coin-chip-icon" aria-hidden="true">
            ◌
          </span>
          <span className="hq-coin-chip-val">{progressSnap.coins}</span>
          {coinPops.map((pop) => (
            <span key={pop.id} className="hq-coin-pop" aria-hidden="true">
              +{pop.amount}
            </span>
          ))}
        </div>
      </header>

      {visitable === 'save-shack' ? (
        <aside className="hq-visit-panel hq-visit-panel--save" role="dialog" aria-label="Save Shack">
          <p className="hq-visit-kicker">Save Shack · 存檔小屋</p>
          <h2 className="hq-visit-title">Stamp your voyage</h2>
          <p className="hq-visit-body">
            Store pier progress, ferry coins, and your River Scout look on this device
            {progressSnap.lastSavedAt
              ? ` · last saved ${new Date(progressSnap.lastSavedAt).toLocaleString()}`
              : ' · not saved yet'}
            .
          </p>
          <button type="button" className="hq-btn hq-btn--primary" onClick={onSave}>
            Save progress & look
          </button>
          {saveFlash ? <p className="hq-visit-msg">{saveFlash}</p> : null}
          <button type="button" className="hq-btn hq-btn--ghost" onClick={() => setVisitable(null)}>
            Cast off
          </button>
        </aside>
      ) : null}

      {visitable === 'outfitter' ? (
        <aside className="hq-visit-panel hq-visit-panel--shop" role="dialog" aria-label="River Outfitter">
          <p className="hq-visit-kicker">River Outfitter · 河畔衣鋪</p>
          <h2 className="hq-visit-title">Outfits & handhelds</h2>
          <p className="hq-visit-body">
            {progressSnap.coins} ferry coins · earn more with correct casts
          </p>
          <div className="hq-shop-slots" role="tablist" aria-label="Gear slots">
            {HARBOR_GEAR_SLOTS.map((slot) => (
              <button
                key={slot}
                type="button"
                role="tab"
                aria-selected={shopSlot === slot}
                className={`hq-shop-slot${shopSlot === slot ? ' is-on' : ''}`}
                onClick={() => setShopSlot(slot)}
              >
                {slot}
              </button>
            ))}
          </div>
          <ul className="hq-shop-list">
            {harborGearForSlot(shopSlot).map((item) => {
              const owned = progressSnap.owned.includes(item.id)
              const equipped = progressSnap.look[shopSlot] === item.id
              return (
                <li key={item.id} className={`hq-shop-item${equipped ? ' is-equipped' : ''}`}>
                  <span
                    className="hq-shop-swatch"
                    style={{ background: `#${item.color.toString(16).padStart(6, '0')}` }}
                    aria-hidden="true"
                  />
                  <div className="hq-shop-meta">
                    <span className="hq-shop-name">{item.name.en}</span>
                    <span className="hq-shop-name-zh" lang="zh-HK">
                      {item.name.zh}
                    </span>
                    <span className="hq-shop-price">
                      {item.price === 0 ? 'Starter' : `${item.price} coins`}
                      {owned ? ' · owned' : ''}
                      {equipped ? ' · on' : ''}
                    </span>
                  </div>
                  <div className="hq-shop-actions">
                    {!owned ? (
                      <button
                        type="button"
                        className="hq-btn hq-btn--primary hq-btn--tiny"
                        disabled={progressSnap.coins < item.price}
                        onClick={() => onBuy(item.id)}
                      >
                        Buy
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="hq-btn hq-btn--ghost hq-btn--tiny"
                        disabled={equipped}
                        onClick={() => onEquip(shopSlot, item.id)}
                      >
                        {equipped ? 'Wearing' : 'Wear'}
                      </button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
          {shopMsg ? <p className="hq-visit-msg">{shopMsg}</p> : null}
          <button type="button" className="hq-btn hq-btn--ghost" onClick={() => setVisitable(null)}>
            Cast off
          </button>
        </aside>
      ) : null}

      {/* Persistent open-world control — always on stage, exits dialogue when talking */}
      <button
        type="button"
        className={`hq-explore-fab${!talking ? ' is-on' : ''}`}
        aria-label="Open world exploration"
        aria-pressed={!talking}
        title="Open world exploration"
        onClick={() => setTalking(false)}
      >
        <ExploreWorldIcon />
        <span className="hq-explore-fab-label">Explore</span>
      </button>

      <div className={`hq-play-hud${talking ? ' is-talking' : ' is-exploring'}`}>
        <QuestPanel
          step={step}
          stepIndex={stepIndex}
          stepCount={level.steps.length}
          sourceUrl={openCantoneseLessonUrl(level)}
          onAdvance={advance}
          onResult={onResult}
          overlay
          talking={talking}
          onTalk={() => setTalking(true)}
          onExplore={() => setTalking(false)}
          speakerRole={speakerForStep(stepIndex)}
        />
      </div>
    </div>
  )
}

/** Compass rose for the open-world explore FAB. */
function ExploreWorldIcon() {
  return (
    <svg className="hq-explore-fab-icon" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="2.2" fill="currentColor" />
      <path
        d="M12 3.2 13.6 10.4 12 9.2 10.4 10.4Z"
        fill="currentColor"
      />
      <path
        d="M12 20.8 10.4 13.6 12 14.8 13.6 13.6Z"
        fill="currentColor"
        opacity="0.55"
      />
      <path d="M3.2 12 10.4 10.4 9.2 12 10.4 13.6Z" fill="currentColor" opacity="0.7" />
      <path d="M20.8 12 13.6 13.6 14.8 12 13.6 10.4Z" fill="currentColor" opacity="0.7" />
    </svg>
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
