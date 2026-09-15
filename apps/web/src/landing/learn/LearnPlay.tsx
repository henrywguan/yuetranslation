import { useCallback, useEffect, useRef, useState } from 'react'
import {
  HARBOR_CAMPAIGNS,
  HARBOR_LEVELS,
  levelById,
  levelCampaign,
  levelsForCampaign,
  nextLevelId,
  openCantoneseLessonUrl,
  type HarborCampaignId,
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
import { playHarborScrollClose, playHarborScrollOpen, stopHarborScrollSfx } from './harborScrollSfx'
import {
  HARBOR_GEAR_SLOTS,
  HARBOR_GEAR_TIER_LABEL,
  harborGearById,
  harborGearForSlot,
  type HarborGearId,
  type HarborGearSlot,
} from './harborGear'
import { HarborStage } from './HarborStage'
import { HarborPlayerProfileModal } from './HarborPlayerProfileModal'
import { HarborCharacterCreate } from './HarborCharacterCreate'
import {
  harborDisplayUsername,
  startHarborPresence,
  type HarborPresenceSession,
  type HarborRemotePlayer,
} from './harborPresence'
import { getSession, getSupabaseClient } from '../../lib/auth'
import { useYueStore } from '../../lib/store'
import { HarborMinimap, type HarborMinimapPose } from './HarborMinimap'
import { MatchDefinitionModal } from './MatchDefinitionModal'
import {
  HARBOR_NPC_ROLES,
  type HarborNpcRole,
  type HarborVisitableId,
  type HarborWorldHandle,
} from './harborWorld'
import {
  HARBOR_COINS_PER_CORRECT,
  isLevelCleared,
  isLevelUnlocked,
  buyHarborGear,
  depositHarborGear,
  equipHarborGear,
  completeHarborCharacter,
  loadHarborProgress,
  markCorrect,
  markGoldEarned,
  markLevelCleared,
  markStepReached,
  visitSaveShack,
  withdrawHarborGear,
  type HarborProgress,
} from './progress'
import { QuestPanel } from './QuestPanel'
import { missionBaseXp, sailorLevelFromXp } from './xpRewards'

/** Rotate pier speakers by step so dialogue feels peopled. */
function speakerForStep(stepIndex: number): HarborNpcRole {
  return HARBOR_NPC_ROLES[stepIndex % HARBOR_NPC_ROLES.length]!
}

type LearnSessionProps = {
  levelId: string
  onExit: () => void
  onOpenLevel: (id: string) => void
  onProgress: (p: HarborProgress) => void
  /** Pier chart (or other page-level overlay) is open — pause the 3D voyage. */
  worldPaused?: boolean
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

export function LearnSession({
  levelId,
  onExit,
  onOpenLevel,
  onProgress,
  worldPaused = false,
}: LearnSessionProps) {
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
  const [teleportOpen, setTeleportOpen] = useState(false)
  const [bankMsg, setBankMsg] = useState<string | null>(null)
  const [coinPops, setCoinPops] = useState<{ id: number; amount: number }[]>([])
  const [scrollOpen, setScrollOpen] = useState(false)
  const [arenaOpen, setArenaOpen] = useState(false)
  const [barberOpen, setBarberOpen] = useState(false)
  const [minimapPose, setMinimapPose] = useState<HarborMinimapPose | null>(null)
  const [remotePlayers, setRemotePlayers] = useState<HarborRemotePlayer[]>([])
  const [profileUserId, setProfileUserId] = useState<string | null>(null)
  const [localUsername, setLocalUsername] = useState('sailor')
  const entitlement = useYueStore((s) => s.entitlement)
  const accountUsername = entitlement?.prefs?.username?.trim() || null
  const needsCharacterCreate = !progressSnap.characterCreated
  const needsUsername = !accountUsername && !progressSnap.localUsername
  const showCharacterCreate = needsCharacterCreate || needsUsername

  const worldApiRef = useRef<HarborWorldHandle | null>(null)
  const presenceRef = useRef<HarborPresenceSession | null>(null)
    const [clearReward, setClearReward] = useState<{
    xpGained: number
    repeat: boolean
    clearCount: number
  } | null>(null)


  // Signed-in only: open-world presence (see everyone + nametags)
  // Presence = who is online (slow). Broadcast = live pose (~10 Hz).
  useEffect(() => {
    let cancelled = false
    let poseTimer: number | undefined
    let presenceTimer: number | undefined
    let lastSent = { x: 0, z: 0, yaw: 0, mode: 'boat' as 'boat' | 'foot' }

    const boot = async () => {
      const session = await getSession()
      const userId = session?.user?.id
      const preferred = entitlement?.prefs?.username?.trim() || progressSnap.localUsername
      if (!userId) {
        // Guests still get a local nametag (stable fallback handle)
        const guestName = harborDisplayUsername(preferred, 'guest-local')
        if (!cancelled) {
          setLocalUsername(guestName)
          worldApiRef.current?.setLocalUsername(guestName)
          setRemotePlayers([])
        }
        return
      }
      const username = harborDisplayUsername(preferred, userId)
      if (!cancelled) {
        setLocalUsername(username)
        worldApiRef.current?.setLocalUsername(username)
      }
      const supabase = getSupabaseClient()
      if (!supabase) return
      const sessionPresence = startHarborPresence({
        supabase,
        userId,
        username,
        onRemotes: (remotes) => {
          if (!cancelled) setRemotePlayers(remotes)
        },
        onPose: (pose) => {
          // Bypass React — push straight into the WebGL lerp targets
          worldApiRef.current?.applyRemotePose(pose)
        },
      })
      presenceRef.current = sessionPresence

      const readPose = () => worldApiRef.current?.getLocalPose() ?? null

      const pushPresence = () => {
        const pose = readPose()
        if (!pose) return
        void sessionPresence.track({
          x: pose.x,
          z: pose.z,
          yaw: pose.yaw,
          mode: pose.mode,
          look: pose.look,
          gender: pose.gender,
          appearance: pose.appearance,
          username,
        })
      }

      const pushPose = () => {
        const pose = readPose()
        if (!pose) return
        const moved =
          Math.hypot(pose.x - lastSent.x, pose.z - lastSent.z) > 0.04 ||
          Math.abs(pose.yaw - lastSent.yaw) > 0.05 ||
          pose.mode !== lastSent.mode
        if (!moved) return
        lastSent = { x: pose.x, z: pose.z, yaw: pose.yaw, mode: pose.mode }
        sessionPresence.broadcastPose({
          x: pose.x,
          z: pose.z,
          yaw: pose.yaw,
          mode: pose.mode,
        })
      }

      pushPresence()
      pushPose()
      // Live movement: ~10 Hz Broadcast (Presence stays ~0.5 Hz for roster/look)
      poseTimer = window.setInterval(pushPose, 100)
      presenceTimer = window.setInterval(pushPresence, 2000)
    }

    void boot()
    return () => {
      cancelled = true
      if (poseTimer) window.clearInterval(poseTimer)
      if (presenceTimer) window.clearInterval(presenceTimer)
      const s = presenceRef.current
      presenceRef.current = null
      void s?.stop()
    }
  }, [entitlement?.prefs?.username, entitlement?.loggedIn])

  // Top-left minimap — poll local pose without re-rendering the WebGL tree
  useEffect(() => {
    let raf = 0
    let alive = true
    const tick = () => {
      if (!alive) return
      const pose = worldApiRef.current?.getLocalPose()
      if (pose) {
        setMinimapPose((prev) => {
          if (
            prev &&
            Math.abs(prev.x - pose.x) < 0.04 &&
            Math.abs(prev.z - pose.z) < 0.04 &&
            Math.abs(prev.yaw - pose.yaw) < 0.05 &&
            Math.abs(prev.viewYaw - pose.viewYaw) < 0.05
          ) {
            return prev
          }
          return { x: pose.x, z: pose.z, yaw: pose.yaw, viewYaw: pose.viewYaw }
        })
      }
      raf = window.requestAnimationFrame(tick)
    }
    raf = window.requestAnimationFrame(tick)
    return () => {
      alive = false
      window.cancelAnimationFrame(raf)
    }
  }, [])

  const closeChapterScroll = useCallback(() => {
    setScrollOpen(false)
    playHarborScrollClose()
  }, [])

  const openChapterScroll = useCallback(() => {
    setScrollOpen(true)
    setVisitable(null)
    setInvOpen(false)
    playHarborScrollOpen()
  }, [])

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
    setTeleportOpen(false)
    setCoinPops([])
    setClearReward(null)
    setScrollOpen(false)
    setBarberOpen(false)
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
      stopHarborScrollSfx()
      stopHarborBgm()
    }
  }, [])

  useEffect(() => {
    if (!scrollOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeChapterScroll()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [scrollOpen, closeChapterScroll])

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
      const result = markLevelCleared(level.id, missionBaseXp(level))
      setClearReward({
        xpGained: result.xpGained,
        repeat: result.repeat,
        clearCount: result.clearCount,
      })
      pushProgress(result.progress)
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
    if (id === 'arena') {
      setArenaOpen(true)
      setVisitable(null)
      setInvOpen(false)
      return
    }
    // Barber NPC / portal → same character-create modal (restyle, keep name)
    if (id === 'barber') {
      setBarberOpen(true)
      setVisitable(null)
      setInvOpen(false)
      return
    }
    setVisitable(id)
    if (id) setInvOpen(false)
    if (!id) {
      setSaveFlash(null)
      setShopMsg(null)
      setBankMsg(null)
    }
  }, [])

  const onEarnGold = useCallback(
    (amount: number) => {
      pushProgress(markGoldEarned(amount))
    },
    [pushProgress],
  )

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
          setTalking(false)
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

  const profilePlayer = profileUserId
    ? remotePlayers.find((p) => p.userId === profileUserId) ?? null
    : null


  if (showCharacterCreate) {
    return (
      <HarborCharacterCreate
        existingUsername={accountUsername || progressSnap.localUsername}
        signedIn={Boolean(entitlement?.loggedIn)}
        mode={needsCharacterCreate ? 'full' : 'username-only'}
        onComplete={(result) => {
          completeHarborCharacter({
            gender: result.gender,
            appearance: result.appearance,
            look: result.look,
            localUsername: result.username,
          })
          const next = loadHarborProgress()
          setProgressSnap(next)
          setLocalUsername(result.username)
          worldApiRef.current?.setLocalUsername(result.username)
          onProgress(next)
        }}
      />
    )
  }

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
          gender={progressSnap.gender}
          appearance={progressSnap.appearance}
          paused={
            worldPaused ||
            invOpen ||
            scrollOpen ||
            arenaOpen ||
            barberOpen ||
            teleportOpen ||
            visitable !== null
          }
          onVisitable={onVisitable}
          remotePlayers={remotePlayers}
          localUsername={localUsername}
          onRemotePlayerSelect={setProfileUserId}
          worldApiRef={worldApiRef}
        />
      </div>

      <HarborMinimap
        pose={minimapPose}
        remotes={remotePlayers}
        hidden={visitable !== null || invOpen || barberOpen || scrollOpen}
      />

      <header className="hq-play-hud-top">
        <button type="button" className="hq-btn hq-btn--ghost hq-btn--hud" onClick={onExit}>
          Chart
        </button>
        <button
          type="button"
          className="hq-play-bar-title hq-play-bar-title--tap"
          onClick={openChapterScroll}
          aria-haspopup="dialog"
          aria-expanded={scrollOpen}
          aria-label={`Chapter scroll: ${level.title.en}`}
          title="Open chapter scroll"
        >
          <span className="hq-play-title-en">
            <span className="hq-play-ch">Ch. {level.chapter}</span>
            <span className="hq-play-name">{level.title.en}</span>
          </span>
          <span className="hq-play-name-zh" lang="zh-HK">
            {level.title.zh}
          </span>
        </button>
        <button
          type="button"
          className="hq-xp-chip"
          title="Sailor experience"
          aria-label={`Experience ${progressSnap.xp ?? 0}, level ${sailorLevelFromXp(progressSnap.xp ?? 0)}`}
          aria-live="polite"
        >
          <span className="hq-xp-chip-icon" aria-hidden="true">
            XP
          </span>
          <span className="hq-xp-chip-val">{progressSnap.xp ?? 0}</span>
          <span className="hq-xp-chip-lv">Lv {sailorLevelFromXp(progressSnap.xp ?? 0)}</span>
        </button>
        <button
          type="button"
          className={`hq-coin-chip${coinPops.length ? ' is-earning' : ''}${invOpen ? ' is-open' : ''}`}
          title={invOpen ? 'Close inventory' : 'Open inventory'}
          aria-label={`Ferry coins ${progressSnap.coins}. ${invOpen ? 'Close' : 'Open'} inventory`}
          aria-pressed={invOpen}
          aria-live="polite"
          onClick={() => {
            setInvOpen((v) => !v)
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
          className="hq-gold-chip"
          title="Chinese arena gold — paddle to the 擂台 portal"
          aria-label={`Arena gold ${progressSnap.gold ?? 0}. Open Match the Definition`}
          onClick={() => {
            setArenaOpen(true)
            setVisitable(null)
            setInvOpen(false)
          }}
        >
          <span className="hq-gold-chip-icon" aria-hidden="true">
            金
          </span>
          <span className="hq-gold-chip-val">{progressSnap.gold ?? 0}</span>
        </button>
      </header>

      {scrollOpen ? (
        <div
          className="hq-scroll-modal"
          role="presentation"
          onClick={closeChapterScroll}
        >
          <div
            className="hq-scroll-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="hq-scroll-title-zh"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="hq-scroll-roller hq-scroll-roller--top" aria-hidden="true" />
            <div className="hq-scroll-parchment">
              <p className="hq-scroll-kicker">
                {level.chapter === 0 ? 'Introduction · 序章' : `Chapter ${level.chapter} · 第${level.chapter}章`}
              </p>
              <h2 id="hq-scroll-title-zh" className="hq-scroll-title-zh" lang="zh-HK">
                {level.title.zh}
              </h2>
              <p className="hq-scroll-title-en">{level.title.en}</p>
              <p className="hq-scroll-blurb" lang="zh-HK">
                {level.blurb.zh}
              </p>
              <p className="hq-scroll-blurb-en">{level.blurb.en}</p>
              {level.tags.length ? (
                <ul className="hq-scroll-tags" aria-label="Lesson tags">
                  {level.tags.map((tag) => (
                    <li key={tag}>{tag}</li>
                  ))}
                </ul>
              ) : null}
              <button type="button" className="hq-btn hq-btn--ghost hq-scroll-close" onClick={closeChapterScroll}>
                Roll up · 收卷
              </button>
            </div>
            <div className="hq-scroll-roller hq-scroll-roller--bottom" aria-hidden="true" />
          </div>
        </div>
      ) : null}

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
          <div className="hq-visit-actions">
            <button
              type="button"
              className="hq-btn hq-btn--ghost"
              onClick={() => {
                setInvOpen(true)
                setVisitable(null)
                setTeleportOpen(false)
                setShopMsg(null)
                setBankMsg(null)
              }}
            >
              Open inventory
            </button>
            <button
              type="button"
              className={`hq-btn hq-btn--ghost${teleportOpen ? ' is-on' : ''}`}
              aria-expanded={teleportOpen}
              onClick={() => setTeleportOpen((v) => !v)}
            >
              {teleportOpen ? 'Hide chapters' : 'Teleport to chapter'}
            </button>
          </div>
          {teleportOpen ? (
            <ul className="hq-teleport-list" aria-label="Campaign piers">
              {HARBOR_LEVELS.map((lv) => {
                const ids = HARBOR_LEVELS.map((l) => l.id)
                const unlocked = isLevelUnlocked(lv.id, ids, progressSnap)
                const here = lv.id === levelId
                return (
                  <li key={lv.id}>
                    <button
                      type="button"
                      className={`hq-teleport-btn${here ? ' is-here' : ''}${!unlocked ? ' is-locked' : ''}`}
                      disabled={!unlocked || here}
                      onClick={() => {
                        setTeleportOpen(false)
                        setVisitable(null)
                        onOpenLevel(lv.id)
                      }}
                    >
                      <span className="hq-teleport-ch">
                        {`${levelCampaign(lv) === 'life0' ? 'Life0' : 'Sounds'} · ${lv.chapter === 0 ? 'Intro' : `Ch. ${lv.chapter}`}`}
                      </span>
                      <span className="hq-teleport-title">{lv.title.en}</span>
                      <span className="hq-teleport-status">
                        {here ? 'Here' : !unlocked ? 'Locked' : 'Teleport'}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          ) : null}
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

      {barberOpen ? (
        <div className="hq-barber-overlay" role="dialog" aria-modal="true" aria-label="Harbor Barber">
          <HarborCharacterCreate
            existingUsername={accountUsername || progressSnap.localUsername || localUsername}
            signedIn={Boolean(entitlement?.loggedIn)}
            mode="barber"
            initialGender={progressSnap.gender}
            initialAppearance={progressSnap.appearance}
            initialLook={progressSnap.look}
            onCancel={() => setBarberOpen(false)}
            onComplete={(result) => {
              completeHarborCharacter({
                gender: result.gender,
                appearance: result.appearance,
                look: result.look,
                localUsername: result.username,
              })
              const next = loadHarborProgress()
              setProgressSnap(next)
              worldApiRef.current?.setCharacter({
                gender: result.gender,
                appearance: result.appearance,
              })
              worldApiRef.current?.setLook(result.look)
              onProgress(next)
              setBarberOpen(false)
            }}
          />
        </div>
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

      <MatchDefinitionModal
        open={arenaOpen}
        gold={progressSnap.gold ?? 0}
        onClose={() => setArenaOpen(false)}
        onEarnGold={onEarnGold}
      />

      <HarborPlayerProfileModal
        open={Boolean(profilePlayer)}
        username={profilePlayer?.username ?? ''}
        look={profilePlayer?.look ?? progressSnap.look}
        onClose={() => setProfileUserId(null)}
      />
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
    <div className="hq-clear hq-clear--immersive">
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
  initialCampaign,
}: {
  progress: HarborProgress
  onSelect: (id: string) => void
  /** Chart opens on the sailor’s active campaign when known. */
  initialCampaign?: HarborCampaignId
}) {
  const [campaign, setCampaign] = useState<HarborCampaignId>(initialCampaign ?? 'sounds')
  const levels = levelsForCampaign(campaign)
  const ids = levels.map((l) => l.id)
  const meta = HARBOR_CAMPAIGNS.find((c) => c.id === campaign)!
  return (
    <div className="hq-map-wrap">
      <div className="hq-campaign-tabs" role="tablist" aria-label="Harbor campaigns">
        {HARBOR_CAMPAIGNS.map((c) => (
          <button
            key={c.id}
            type="button"
            role="tab"
            aria-selected={campaign === c.id}
            className={`hq-campaign-tab${campaign === c.id ? ' is-on' : ''}`}
            onClick={() => setCampaign(c.id)}
          >
            <span className="hq-campaign-tab-en">{c.title.en}</span>
            <span className="hq-campaign-tab-zh" lang="zh-HK">
              {c.title.zh}
            </span>
          </button>
        ))}
      </div>
      <p className="hq-campaign-blurb">
        {meta.blurb.en}
        <span aria-hidden="true"> · </span>
        <span lang="zh-HK">{meta.blurb.zh}</span>
      </p>
      <ol className="hq-map" aria-label={`${meta.title.en} piers`}>
        {levels.map((level, i) => {
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
                  {level.tags.map((tag) => (
                    <span key={tag}>{tag}</span>
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
      <a className="hq-campaign-oc" href={meta.ocHome} target="_blank" rel="noreferrer">
        Open Cantonese source ↗
      </a>
    </div>
  )
}

