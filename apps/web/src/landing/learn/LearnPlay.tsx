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
  HARBOR_GEAR_TIER_LABEL,
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
  depositHarborGear,
  equipHarborGear,
  loadHarborProgress,
  markCorrect,
  markLevelCleared,
  markStepReached,
  visitSaveShack,
  withdrawHarborGear,
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

const HARBOR_SLOT_LABEL: Record<HarborGearSlot, string> = {
  hat: 'Hat',
  top: 'Top',
  bottom: 'Bottom',
  shoes: 'Shoes',
  hand: 'Hand',
  boat: 'Boat',
  lantern: 'Lantern',
}

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
  const [invOpen, setInvOpen] = useState(false)
  const [bankMsg, setBankMsg] = useState<string | null>(null)
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
    setBankMsg(null)
    setInvOpen(false)
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
    if (id) setInvOpen(false)
    if (!id) {
      setSaveFlash(null)
      setShopMsg(null)
      setBankMsg(null)
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


  const onDeposit = useCallback(
    (id: HarborGearId) => {
      const res = depositHarborGear(id)
      if (!res.ok) {
        setBankMsg(res.reason)
        return
      }
      pushProgress(res.progress)
      setBankMsg(`Banked ${harborGearById(id)?.name.en ?? id}.`)
    },
    [pushProgress],
  )

  const onWithdraw = useCallback(
    (id: HarborGearId) => {
      const res = withdrawHarborGear(id)
      if (!res.ok) {
        setBankMsg(res.reason)
        return
      }
      pushProgress(res.progress)
      setBankMsg(`Withdrew ${harborGearById(id)?.name.en ?? id}.`)
    },
    [pushProgress],
  )

  const onInvEquip = useCallback(
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
          Pier chart
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
          Chart
        </button>
        <div className="hq-play-bar-title">
          <span className="hq-play-title-en">
            <span className="hq-play-ch">Ch. {level.chapter}</span>
            <span className="hq-play-name">{level.title.en}</span>
          </span>
          <span className="hq-play-name-zh" lang="zh-HK">
            {level.title.zh}
          </span>
        </div>
        <button
          type="button"
          className={`hq-coin-chip${coinPops.length ? ' is-earning' : ''}`}
          title="Open inventory"
          aria-label={`Ferry coins ${progressSnap.coins}. Open inventory`}
          aria-live="polite"
          onClick={() => {
            setInvOpen(true)
            setVisitable(null)
            setShopMsg(null)
            setBankMsg(null)
          }}
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
        </button>
        <button
          type="button"
          className={`hq-inv-btn${invOpen ? ' is-open' : ''}`}
          aria-label="Inventory"
          aria-pressed={invOpen}
          title="Inventory"
          onClick={() => {
            setInvOpen((v) => !v)
            setVisitable(null)
            setShopMsg(null)
            setBankMsg(null)
          }}
        >
          Pack
        </button>
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
                {HARBOR_SLOT_LABEL[slot]}
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
                      {HARBOR_GEAR_TIER_LABEL[item.tier].en}
                      {' · '}
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

      {invOpen ? (
        <aside className="hq-visit-panel hq-visit-panel--inv" role="dialog" aria-label="Inventory">
          <p className="hq-visit-kicker">Inventory · 行囊</p>
          <h2 className="hq-visit-title">Your pack</h2>
          <p className="hq-visit-body">
            Gear you carry · wear it here · bank extras at the Harbor Bank portal
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
                {HARBOR_SLOT_LABEL[slot]}
              </button>
            ))}
          </div>
          <ul className="hq-shop-list">
            {harborGearForSlot(shopSlot)
              .filter((item) => progressSnap.owned.includes(item.id))
              .map((item) => {
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
                      <span className="hq-shop-price">{equipped ? 'Wearing' : 'In pack'}</span>
                    </div>
                    <div className="hq-shop-actions">
                      <button
                        type="button"
                        className="hq-btn hq-btn--ghost hq-btn--tiny"
                        disabled={equipped}
                        onClick={() => onInvEquip(shopSlot, item.id)}
                      >
                        {equipped ? 'On' : 'Wear'}
                      </button>
                    </div>
                  </li>
                )
              })}
          </ul>
          {shopMsg ? <p className="hq-visit-msg">{shopMsg}</p> : null}
          <button type="button" className="hq-btn hq-btn--ghost" onClick={() => setInvOpen(false)}>
            Close pack
          </button>
        </aside>
      ) : null}

      {visitable === 'bank' ? (
        <aside className="hq-visit-panel hq-visit-panel--bank" role="dialog" aria-label="Harbor Bank">
          <p className="hq-visit-kicker">Harbor Bank · 港灣錢莊</p>
          <h2 className="hq-visit-title">Jade vault</h2>
          <p className="hq-visit-body">
            Deposit gear through the cyan portal · starter kit stays on the Scout
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
                {HARBOR_SLOT_LABEL[slot]}
              </button>
            ))}
          </div>
          <p className="hq-bank-section">In pack</p>
          <ul className="hq-shop-list">
            {harborGearForSlot(shopSlot)
              .filter((item) => progressSnap.owned.includes(item.id) && item.price > 0)
              .map((item) => {
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
                      <span className="hq-shop-price">{equipped ? 'Wearing' : 'Carried'}</span>
                    </div>
                    <div className="hq-shop-actions">
                      <button
                        type="button"
                        className="hq-btn hq-btn--primary hq-btn--tiny"
                        onClick={() => onDeposit(item.id)}
                      >
                        Bank
                      </button>
                    </div>
                  </li>
                )
              })}
          </ul>
          <p className="hq-bank-section">In vault</p>
          <ul className="hq-shop-list">
            {harborGearForSlot(shopSlot)
              .filter((item) => (progressSnap.banked ?? []).includes(item.id))
              .map((item) => (
                <li key={item.id} className="hq-shop-item">
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
                    <span className="hq-shop-price">Banked</span>
                  </div>
                  <div className="hq-shop-actions">
                    <button
                      type="button"
                      className="hq-btn hq-btn--ghost hq-btn--tiny"
                      onClick={() => onWithdraw(item.id)}
                    >
                      Take
                    </button>
                  </div>
                </li>
              ))}
          </ul>
          {bankMsg ? <p className="hq-visit-msg">{bankMsg}</p> : null}
          <button type="button" className="hq-btn hq-btn--ghost" onClick={() => setVisitable(null)}>
            Cast off
          </button>
        </aside>
      ) : null}

      {/* OSRS-style compass — free-look / exit dialogue */}
      <button
        type="button"
        className={`hq-explore-fab${!talking ? ' is-on' : ''}`}
        aria-label="Open world exploration"
        aria-pressed={!talking}
        title="Open world exploration"
        onClick={() => setTalking(false)}
      >
        <span className="hq-compass-disc" aria-hidden="true">
          <ExploreWorldIcon />
          <span className="hq-compass-sparkle hq-compass-sparkle--a" />
          <span className="hq-compass-sparkle hq-compass-sparkle--b" />
          <span className="hq-compass-sparkle hq-compass-sparkle--c" />
        </span>
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

/** OSRS-style compass rose for the open-world explore FAB. */
function ExploreWorldIcon() {
  return (
    <svg className="hq-explore-fab-icon" viewBox="0 0 32 32" width="28" height="28" aria-hidden="true">
      <circle cx="16" cy="16" r="14.25" fill="#1a1208" stroke="#c9a227" strokeWidth="1.75" />
      <circle cx="16" cy="16" r="11.2" fill="none" stroke="#8a7020" strokeWidth="0.7" opacity="0.85" />
      {/* Cardinal ticks */}
      <path d="M16 3.6v2.4M16 26v2.4M3.6 16h2.4M26 16h2.4" stroke="#e8d48a" strokeWidth="1.1" strokeLinecap="round" />
      {/* North (gold) / south (muted) needle */}
      <path d="M16 5.2 18.35 15.2 16 13.6 13.65 15.2Z" fill="#f0d060" />
      <path d="M16 26.8 13.65 16.8 16 18.4 18.35 16.8Z" fill="#5a4a28" />
      <path d="M5.2 16 15.2 13.65 13.6 16 15.2 18.35Z" fill="#b89840" opacity="0.85" />
      <path d="M26.8 16 16.8 18.35 18.4 16 16.8 13.65Z" fill="#b89840" opacity="0.85" />
      <circle cx="16" cy="16" r="2.15" fill="#f5e6a8" stroke="#8a7020" strokeWidth="0.7" />
      <text
        x="16"
        y="9.1"
        textAnchor="middle"
        fill="#ffe9a0"
        fontSize="4.2"
        fontFamily="Syne, system-ui, sans-serif"
        fontWeight="700"
      >
        N
      </text>
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
          Pier chart
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
