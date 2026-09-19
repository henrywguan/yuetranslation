import { useCallback, useEffect, useRef, useState } from 'react'
import {
  campaignShortLabel,
  HARBOR_LEVELS,
  isLifeBookCampaign,
  levelById,
  levelCampaign,
  levelRealm,
  levelsForCampaign,
  nextLevelId,
  openCantoneseLessonUrl,
  type HarborCampaignId,
  type HarborLevel,
  type HarborRealmId,
} from './curriculum'
import { HARBOR_LIFE_CAMPAIGNS, LIFE_BOOK_SHELF, type LifeUnitId } from './curriculumLifeBook'
import {
  HARBOR_FANFARE_DURATION_MS,
  playHarborCorrectFanfare,
  stopHarborCorrectFanfare,
} from './harborFanfare'
import {
  duckHarborBgm,
  harborBgmTheme,
  isHarborBgmPlaying,
  preloadHarborBgmSamples,
  startHarborBgm,
  startHarborOutfitterBgm,
  stopHarborBgm,
  stopHarborOutfitterBgm,
} from './harborBgm'
import { playHarborCoinChing, preloadHarborCoinSfx } from './harborCoinSfx'
import {
  playHarborArenaOpen,
  playHarborBagClose,
  playHarborBagOpen,
  playHarborBankDeposit,
  playHarborBankWithdraw,
  playHarborBarberSnip,
  playHarborCastOff,
  playHarborChatSend,
  playHarborEquip,
  playHarborExplore,
  playHarborLandmarkOpen,
  playHarborNpcGreet,
  playHarborTalkStart,
  playHarborTeleport,
  playHarborUiClick,
  preloadHarborInteractSamples,
  tickHarborMoveSfx,
} from './harborInteractSfx'
import { playHarborVo, preloadHarborVo } from './harborVo'
import { preloadHarborScoutGlbs } from './harborProtagonistGlb'
import { preloadHarborV2Assets } from './harborV2Assets'
import { preloadHarborFishSfx } from './harborFishingSfx'
import { GUAN_CAPE_LOOM, GUAN_CAPE_TRIMMER_NAME, GUAN_HARBOR_META } from './harborGuanRealm'
import { HarborFishingPanel } from './HarborFishingPanel'
import {
  emptyHarborFishingBag,
  nearestHarborFishSpot,
  type HarborFishSpotId,
} from './harborFishing'
import {
  harborAmbientWeather,
  unlockHarborAudioBeds,
  setHarborAmbientPaused,
  setHarborAmbientTalking,
  stopHarborAmbient,
} from './harborAmbient'
import { ensureSharedAudioContext } from '../../lib/audioReactive'
import { playHarborMiss, preloadHarborMissSfx, stopHarborMiss } from './harborSfx'
import { playHarborScrollClose, playHarborScrollOpen, stopHarborScrollSfx } from './harborScrollSfx'
import {
  harborGearById,
  type HarborGearId,
  type HarborGearSlot,
} from './harborGear'
import { HarborGearCodex } from './HarborGearCodex'
import { HarborInventoryBag } from './HarborInventoryBag'
import { HarborShopShelf } from './HarborShopShelf'
import { HarborStage } from './HarborStage'
import { HarborPlayerProfileModal } from './HarborPlayerProfileModal'
import { HarborDelveModal } from './HarborDelveModal'
import { isGiftableLanternId } from './harborGift'
import { HARBOR_DELVE_CLEAR_TITLE } from './harborDelve'
import { postHarborQuestGift } from '../../lib/api'
import { HarborCharacterCreate } from './HarborCharacterCreate'
import {
  harborDisplayUsername,
  sanitizeChatText,
  startHarborPresence,
  type HarborChatPacket,
  type HarborPresenceSession,
  type HarborRemotePlayer,
} from './harborPresence'
import { getSession, getSupabaseClient } from '../../lib/auth'
import { useYueStore } from '../../lib/store'
import { HarborMinimap, type HarborMinimapPose } from './HarborMinimap'
import { HarborWorldMap } from './HarborWorldMap'
import { HarborChatBox, type HarborChatLine } from './HarborChatBox'
import { MatchDefinitionModal } from './MatchDefinitionModal'
import {
  HARBOR_NPC_ROLES,
  type HarborDialogueTap,
  type HarborNpcRole,
  type HarborVisitableId,
  type HarborWorldHandle,
} from './harborWorld'
import {
  HARBOR_COINS_PER_CORRECT,
  isLevelCleared,
  isLevelUnlocked,
  buyHarborGear,
  sellHarborGear,
  depositHarborGear,
  equipHarborGear,
  completeHarborCharacter,
  loadHarborProgress,
  markCorrect,
  markGoldEarned,
  markDelveHit,
  markLevelCleared,
  markStepReached,
  awardHarborTitle,
  replaceHarborProgress,
  exchangeGoldForCoins,
  visitSaveShack,
  withdrawHarborGear,
  updateHarborFishing,
  purchaseHarborBeautySku,
  purchaseHarborBeautyForAppearance,
  equipHarborShowoff,
  claimHarborFreeEventProgress,
  type HarborProgress,
} from './progress'
import {
  HARBOR_FREE_EVENTS,
  harborShowoffForKind,
  type HarborEventId,
} from './harborShowoff'
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
  const [codexOpen, setCodexOpen] = useState(false)
  const [teleportOpen, setTeleportOpen] = useState(false)
  /** Free-sail paradise pocket — overrides campaign realm until cast off / chapter teleport. */
  const [realmOverride, setRealmOverride] = useState<HarborRealmId | null>(null)
  /** Fullscreen wuxia world map (minimap globe). */
  const [worldMapOpen, setWorldMapOpen] = useState(false)
  const [bankMsg, setBankMsg] = useState<string | null>(null)
  const [coinPops, setCoinPops] = useState<{ id: number; amount: number }[]>([])
  const [scrollOpen, setScrollOpen] = useState(false)
  const [arenaOpen, setArenaOpen] = useState(false)
  const [barberOpen, setBarberOpen] = useState(false)
  const [minimapPose, setMinimapPose] = useState<HarborMinimapPose | null>(null)
  /** Active Guan fishing spot when casting at a buoy. */
  const [activeFishSpotId, setActiveFishSpotId] = useState<HarborFishSpotId | null>(null)
  const [fishCasting, setFishCasting] = useState(false)
  /** Crew canoe vs walk land — drives Explore ↔ Boat FAB. */
  const [travelMode, setTravelMode] = useState<'boat' | 'foot'>('boat')
  const [remotePlayers, setRemotePlayers] = useState<HarborRemotePlayer[]>([])
  const [profileUserId, setProfileUserId] = useState<string | null>(null)
  const [delveOpen, setDelveOpen] = useState(false)
  const [giftBusy, setGiftBusy] = useState(false)
  const [giftMsg, setGiftMsg] = useState<string | null>(null)
  const [localUsername, setLocalUsername] = useState('sailor')
  const [chatLines, setChatLines] = useState<HarborChatLine[]>([])
  const chatSeqRef = useRef(0)
  const localUserIdRef = useRef<string | null>(null)
  const [chatReady, setChatReady] = useState(false)
  const entitlement = useYueStore((s) => s.entitlement)
  const accountUsername = entitlement?.prefs?.username?.trim() || null
  const needsCharacterCreate = !progressSnap.characterCreated
  const needsUsername = !accountUsername && !progressSnap.localUsername
  const showCharacterCreate = needsCharacterCreate || needsUsername

  const worldApiRef = useRef<HarborWorldHandle | null>(null)
  const presenceRef = useRef<HarborPresenceSession | null>(null)
  const nametagFrameRef = useRef(progressSnap.showoff?.look.nametag ?? 'tag-plain')
  nametagFrameRef.current = progressSnap.showoff?.look.nametag ?? 'tag-plain'
  const playRootRef = useRef<HTMLDivElement | null>(null)
  const talkHudRef = useRef<HTMLDivElement | null>(null)
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
          localUserIdRef.current = null
          setChatReady(false)
          setLocalUsername(guestName)
          worldApiRef.current?.setLocalUsername(
            guestName,
            nametagFrameRef.current,
          )
          setRemotePlayers([])
        }
        return
      }
      localUserIdRef.current = userId
      if (!cancelled) setChatReady(true)
      const username = harborDisplayUsername(preferred, userId)
      if (!cancelled) {
        setLocalUsername(username)
        worldApiRef.current?.setLocalUsername(
          username,
          nametagFrameRef.current,
        )
      }
      const supabase = getSupabaseClient()
      if (!supabase) return
      const pushChatLine = (msg: HarborChatPacket, self = false) => {
        chatSeqRef.current += 1
        const id = `${msg.t}-${msg.userId}-${chatSeqRef.current}`
        setChatLines((prev) => {
          const next = [...prev, { id, userId: msg.userId, username: msg.username, text: msg.text, t: msg.t, self }]
          return next.length > 40 ? next.slice(-40) : next
        })
        worldApiRef.current?.showSpeechBubble(self ? 'local' : msg.userId, msg.text)
      }

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
        onChat: (msg) => {
          if (cancelled) return
          pushChatLine(msg, false)
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
          nametagFrame: nametagFrameRef.current,
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
        setTravelMode((prev) => (prev === pose.mode ? prev : pose.mode))
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
    setCodexOpen(false)
    playHarborScrollOpen()
  }, [])

  const openGearCodex = useCallback(() => {
    setCodexOpen(true)
    setVisitable(null)
    setInvOpen(false)
    setScrollOpen(false)
    setBarberOpen(false)
    setArenaOpen(false)
    setTeleportOpen(false)
  }, [])

  useEffect(() => {
    setStepIndex(0)
    setFlash(null)
    setCleared(false)
    setLastOk(false)
    setTalking(false)
    setVisitable(null)
    setTravelMode('boat')
    setSaveFlash(null)
    setShopMsg(null)
    setBankMsg(null)
    setInvOpen(false)
    setCodexOpen(false)
    setTeleportOpen(false)
    setRealmOverride(null)
    // Only retarget BGM if beds are already unlocked/playing — never soft-start
    // from a non-gesture effect (iPhone silent forever).
    if (isHarborBgmPlaying()) startHarborBgm('river')
    setCoinPops([])
    setClearReward(null)
    setScrollOpen(false)
    setBarberOpen(false)
  }, [levelId])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    preloadHarborMissSfx()
    preloadHarborBgmSamples()
    preloadHarborCoinSfx()
    preloadHarborInteractSamples()
    preloadHarborVo()
    preloadHarborFishSfx()
    preloadHarborScoutGlbs()
    preloadHarborV2Assets()
    // Do NOT soft-start BGM/ambient on mount — iPhone creates a suspended
    // AudioContext and schedules silent graphs that never recover. Beds start
    // only from unlockHarborAudioBeds inside a real user gesture (splash Enter
    // or first tap/key in-session).

    /**
     * iOS / Safari: unlock must resume + rebuild beds synchronously in the
     * gesture — never `.then` / await (boolean return; post-gesture rebuild
     * marks beds “playing” while mute). Keep kicking on later gestures if the
     * context flips back to suspended (silent switch / Control Center).
     */
    let harborAudioUnlocked = false
    const unlockHarborAudio = () => {
      let ctxState: AudioContext['state'] | 'missing' = 'missing'
      try {
        ctxState = ensureSharedAudioContext().state
      } catch {
        ctxState = 'missing'
      }
      const needsKick =
        !harborAudioUnlocked || ctxState !== 'running' || !isHarborBgmPlaying()
      if (!needsKick) {
        // Already running — light resume only (don't tear down beds every tap).
        try {
          const c = ensureSharedAudioContext()
          if (c.state === 'suspended') void c.resume().catch(() => undefined)
        } catch {
          /* ignore */
        }
        return
      }
      const ok = unlockHarborAudioBeds({
        theme: harborBgmTheme(),
        weather: worldApiRef.current?.weather ?? harborAmbientWeather(),
      })
      if (ok) {
        harborAudioUnlocked = true
        playHarborVo('welcome')
      }
    }
    window.addEventListener('pointerdown', unlockHarborAudio, { capture: true })
    window.addEventListener('keydown', unlockHarborAudio, { capture: true })
    window.addEventListener('touchstart', unlockHarborAudio, { capture: true, passive: true })
    const onVisibility = () => {
      // Visibility is NOT a user gesture — only resume; never rebuild beds here
      // or iPhone marks “playing” while silent until the next real tap.
      if (document.visibilityState !== 'visible') return
      try {
        const c = ensureSharedAudioContext()
        if (c.state === 'suspended') void c.resume().catch(() => undefined)
      } catch {
        /* ignore */
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('pointerdown', unlockHarborAudio, true)
      window.removeEventListener('keydown', unlockHarborAudio, true)
      window.removeEventListener('touchstart', unlockHarborAudio, true)
      document.removeEventListener('visibilitychange', onVisibility)
      stopHarborCorrectFanfare()
      stopHarborMiss()
      stopHarborScrollSfx()
      stopHarborAmbient()
      stopHarborBgm()
      stopHarborOutfitterBgm()
    }
  }, [])

  useEffect(() => {
    setHarborAmbientTalking(talking)
  }, [talking])

  useEffect(() => {
    setHarborAmbientPaused(
      Boolean(
        worldPaused ||
          invOpen ||
          codexOpen ||
          scrollOpen ||
          arenaOpen ||
          barberOpen ||
          teleportOpen ||
          worldMapOpen ||
          delveOpen ||
          visitable !== null,
      ),
    )
  }, [
    worldPaused,
    invOpen,
    codexOpen,
    scrollOpen,
    arenaOpen,
    barberOpen,
    teleportOpen,
    worldMapOpen,
    delveOpen,
    visitable,
  ])

  /** Footsteps / paddle while exploring (OSRS-style local move cues). */
  useEffect(() => {
    let last = { x: 0, z: 0, primed: false }
    const id = window.setInterval(() => {
      if (talking || invOpen || codexOpen || scrollOpen || arenaOpen || barberOpen || visitable) {
        return
      }
      const pose = worldApiRef.current?.getLocalPose()
      if (!pose) return
      if (!last.primed) {
        last = { x: pose.x, z: pose.z, primed: true }
        return
      }
      const dx = pose.x - last.x
      const dz = pose.z - last.z
      const moving = dx * dx + dz * dz > 0.00035
      last = { x: pose.x, z: pose.z, primed: true }
      tickHarborMoveSfx(moving, pose.mode)
    }, 100)
    return () => window.clearInterval(id)
  }, [talking, invOpen, codexOpen, scrollOpen, arenaOpen, barberOpen, visitable])

  useEffect(() => {
    if (!scrollOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeChapterScroll()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [scrollOpen, closeChapterScroll])

  /** Keep --hq-osrs-strip = measured talk HUD height so the stage/FAB hug content
   *  (no empty black void under the parchment / pick tiles). */
  useEffect(() => {
    const play = playRootRef.current
    const hud = talkHudRef.current
    if (!play) return
    if (!talking || !hud) {
      play.style.removeProperty('--hq-osrs-strip')
      return
    }
    const apply = () => {
      const h = Math.ceil(hud.getBoundingClientRect().height)
      if (h > 0) play.style.setProperty('--hq-osrs-strip', `${h}px`)
    }
    apply()
    const ro = new ResizeObserver(apply)
    ro.observe(hud)
    return () => {
      ro.disconnect()
      play.style.removeProperty('--hq-osrs-strip')
    }
  }, [talking, stepIndex, lastOk, flash])

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
    const next = stepIndex + 1
    setStepIndex(next)
    setFlash(null)
    setLastOk(false)
    // Keep talking at the next pier host — board + teleport to that dock.
    worldApiRef.current?.snapToQuestDock(next)
  }, [level, stepIndex, pushProgress])

  const beginTalk = useCallback(() => {
    // Leave Guan paradise so the river pier snap can run on the remounted world.
    if (realmOverride) {
      setRealmOverride(null)
      startHarborBgm('river')
    }
    playHarborTalkStart()
    playHarborNpcGreet()
    setTalking(true)
    const snap = () => worldApiRef.current?.snapToQuestDock(stepIndex)
    snap()
    // If we just left Guan, the world remounts next frame — snap again then.
    if (realmOverride) requestAnimationFrame(() => requestAnimationFrame(snap))
  }, [realmOverride, stepIndex])

  const onResult = useCallback(
    (ok: boolean) => {
      setFlash(ok ? 'ok' : 'no')
      setLastOk(ok)
      if (ok) {
        stopHarborMiss()
        pushProgress(markCorrect())
        playHarborCorrectFanfare()
        playHarborCoinChing()
        playHarborVo('pierCleared')
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
      playHarborLandmarkOpen('arena')
      playHarborArenaOpen()
      setArenaOpen(true)
      setVisitable(null)
      setInvOpen(false)
      setCodexOpen(false)
      setActiveFishSpotId(null)
      return
    }
    // Barber NPC / portal → same character-create modal (restyle, keep name)
    if (id === 'barber') {
      playHarborLandmarkOpen('barber')
      setBarberOpen(true)
      setVisitable(null)
      setInvOpen(false)
      setCodexOpen(false)
      setActiveFishSpotId(null)
      return
    }
    if (id === 'fishing-spot') {
      const pose = worldApiRef.current?.getLocalPose()
      const spot = pose ? nearestHarborFishSpot(pose.x, pose.z, 2.6) : null
      setActiveFishSpotId(spot?.id ?? null)
    } else if (id === 'fishing-hut') {
      setActiveFishSpotId(null)
    } else {
      setActiveFishSpotId(null)
    }
    if (id) {
      playHarborLandmarkOpen(id)
      setInvOpen(false)
      setCodexOpen(false)
      if (id === 'outfitter') {
        startHarborOutfitterBgm()
        playHarborVo('outfitter')
      } else {
        stopHarborOutfitterBgm()
      }
      if (id === 'save-shack') playHarborVo('saveShack')
    } else {
      stopHarborOutfitterBgm()
      playHarborCastOff()
      playHarborVo('maleSail')
      setSaveFlash(null)
      setShopMsg(null)
      setBankMsg(null)
    }
    setVisitable(id)
  }, [])

  /** Tap a nearby NPC / speech bubble — open landmark UI or that pier's lesson. */
  const onDialogueNpc = useCallback(
    (tap: HarborDialogueTap) => {
      if (tap.kind === 'landmark') {
        onVisitable(tap.id)
        return
      }
      if (!level) return
      const slot = Math.max(0, Math.min(level.steps.length - 1, tap.dockSlot))
      if (realmOverride) {
        setRealmOverride(null)
        startHarborBgm('river')
      }
      setStepIndex(slot)
      playHarborTalkStart()
      playHarborNpcGreet()
      setTalking(true)
      const snap = () => worldApiRef.current?.snapToQuestDock(slot)
      snap()
      requestAnimationFrame(() => requestAnimationFrame(snap))
    },
    [level, onVisitable, realmOverride],
  )

  const onEarnGold = useCallback(
    (amount: number) => {
      playHarborCoinChing()
      pushProgress(markGoldEarned(amount))
    },
    [pushProgress],
  )

  const onExchangeGold = useCallback(
    (amount: number) => {
      const res = exchangeGoldForCoins(amount)
      if (!res.ok) return res
      playHarborCoinChing()
      pushProgress(res.progress)
      return {
        ok: true as const,
        coinsGained: res.coinsGained,
        goldSpent: res.goldSpent,
      }
    },
    [pushProgress],
  )

  const onDelveHit = useCallback(
    (coins: number) => {
      playHarborCoinChing()
      pushProgress(markDelveHit(coins))
    },
    [pushProgress],
  )

  const onDelveComplete = useCallback(
    (_hits: number) => {
      const next = awardHarborTitle(HARBOR_DELVE_CLEAR_TITLE)
      pushProgress(next)
    },
    [pushProgress],
  )

  const onGiftCosmetic = useCallback(
    async (kind: 'lantern' | 'title', itemId: string) => {
      if (!profileUserId) return
      setGiftBusy(true)
      setGiftMsg(null)
      try {
        const result = await postHarborQuestGift({
          toUserId: profileUserId,
          kind,
          itemId,
        })
        pushProgress(replaceHarborProgress(result.progress as HarborProgress))
        setGiftMsg(
          result.householdMate
            ? 'Gift sent to household mate.'
            : 'Gift sent to dock sailor.',
        )
      } catch (e) {
        setGiftMsg(e instanceof Error ? e.message : 'Gift failed')
      } finally {
        setGiftBusy(false)
      }
    },
    [profileUserId, pushProgress],
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
      playHarborCoinChing()
      pushProgress(res.progress)
      setShopMsg(`Bought ${harborGearById(id)?.name.en ?? id}.`)
    },
    [pushProgress],
  )

  const onSell = useCallback(
    (id: HarborGearId) => {
      const res = sellHarborGear(id)
      if (!res.ok) {
        setShopMsg(res.reason)
        return
      }
      playHarborCoinChing()
      pushProgress(res.progress)
      setShopMsg(`Sold ${harborGearById(id)?.name.en ?? id} for ${res.refund.toLocaleString()}¢.`)
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
      playHarborEquip()
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
      playHarborBankDeposit()
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
      playHarborBankWithdraw()
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
      playHarborEquip()
      pushProgress(res.progress)
      setShopMsg(`Equipped ${harborGearById(id)?.name.en ?? id}.`)
    },
    [pushProgress],
  )

  // Must stay above cleared / character-create early returns — otherwise React
  // throws "fewer hooks than expected" and the Next-gate clear paints blank.
  const sendChat = useCallback((raw: string) => {
    const cleaned = sanitizeChatText(raw)
    if (!cleaned) return
    try {
      playHarborChatSend()
    } catch {
      /* SFX must never block local echo / overhead say */
    }
    const userId = localUserIdRef.current ?? 'local'
    const packet: HarborChatPacket = {
      userId,
      username: localUsername,
      text: cleaned,
      t: Date.now(),
    }
    chatSeqRef.current += 1
    const id = `${packet.t}-self-${chatSeqRef.current}`
    setChatLines((prev) => {
      const next = [
        ...prev,
        {
          id,
          userId: packet.userId,
          username: packet.username,
          text: packet.text,
          t: packet.t,
          self: true,
        },
      ]
      return next.length > 40 ? next.slice(-40) : next
    })
    // Overhead before keyboard dismiss (HarborChatBox blurs after onSend) so the
    // sprite is already in the scene when the sailor is visible again.
    worldApiRef.current?.showSpeechBubble('local', cleaned)
    presenceRef.current?.broadcastChat(cleaned)
  }, [localUsername])

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
        beautyOwned={progressSnap.beautyOwned}
        coins={progressSnap.coins}
        onUnlockBeauty={(skuId) => {
          const next = purchaseHarborBeautySku(skuId)
          if (!next) return false
          setProgressSnap(next)
          onProgress(next)
          return true
        }}
        onComplete={(result) => {
          playHarborBarberSnip()
          completeHarborCharacter({
            gender: result.gender,
            appearance: result.appearance,
            look: result.look,
            localUsername: result.username,
          })
          const next = loadHarborProgress()
          setProgressSnap(next)
          setLocalUsername(result.username)
          worldApiRef.current?.setLocalUsername(
            result.username,
            next.showoff?.look.nametag ?? 'tag-plain',
          )
          onProgress(next)
        }}
      />
    )
  }


  return (
    <div
      ref={playRootRef}
      className={`hq-play hq-play--immersive${talking ? ' is-talking' : ' is-exploring'}${invOpen ? ' is-bag-open' : ''}`}
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
          realmOverride={realmOverride}
          paused={
            worldPaused ||
            invOpen ||
            codexOpen ||
            scrollOpen ||
            arenaOpen ||
            barberOpen ||
            teleportOpen ||
            worldMapOpen ||
            visitable !== null
          }
          onVisitable={onVisitable}
          onDialogueNpc={onDialogueNpc}
          remotePlayers={remotePlayers}
          localUsername={localUsername}
          nametagFrame={progressSnap.showoff?.look.nametag ?? 'tag-plain'}
          onRemotePlayerSelect={setProfileUserId}
          worldApiRef={worldApiRef}
        />
      </div>

      <HarborMinimap
        pose={minimapPose}
        remotes={remotePlayers}
        realm={realmOverride ?? (level ? levelRealm(level) : null)}
        hidden={
          visitable !== null ||
          invOpen ||
          codexOpen ||
          barberOpen ||
          scrollOpen ||
          worldMapOpen
        }
        onNavigate={(x, z) => {
          worldApiRef.current?.moveToWorld(x, z)
        }}
        onOpenWorldMap={() => {
          playHarborUiClick()
          setWorldMapOpen(true)
          setTeleportOpen(false)
          setVisitable(null)
        }}
      />

      <HarborWorldMap
        open={worldMapOpen}
        current={realmOverride === 'guan' ? 'guan' : 'voyage'}
        activeLevelId={levelId}
        progress={progressSnap}
        onClose={() => setWorldMapOpen(false)}
        onTravel={(dest) => {
          playHarborTeleport()
          if (dest === 'guan') {
            setRealmOverride('guan')
            startHarborBgm('guan')
          } else {
            setRealmOverride(null)
            startHarborBgm('river')
          }
          setWorldMapOpen(false)
          setVisitable(null)
          setTeleportOpen(false)
        }}
        onOpenChapter={(id) => {
          playHarborTeleport()
          setRealmOverride(null)
          startHarborBgm('river')
          setWorldMapOpen(false)
          setVisitable(null)
          setTeleportOpen(false)
          onOpenLevel(id)
        }}
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
            setInvOpen((v) => {
              if (v) playHarborBagClose()
              else playHarborBagOpen()
              return !v
            })
            setVisitable(null)
            setCodexOpen(false)
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
            playHarborArenaOpen()
            setArenaOpen(true)
            setVisitable(null)
            setInvOpen(false)
            setCodexOpen(false)
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
          <div className="hq-festival-block">
            <p className="hq-visit-kicker">Free festival gifts · 節慶贈禮</p>
            <ul className="hq-festival-list" aria-label="Free event cosmetics">
              {HARBOR_FREE_EVENTS.map((ev) => {
                const claimed = progressSnap.showoff?.claimedEvents?.includes(ev.id) ?? false
                return (
                  <li key={ev.id}>
                    <button
                      type="button"
                      className={`hq-festival-btn${claimed ? ' is-claimed' : ''}`}
                      disabled={claimed}
                      onClick={() => {
                        playHarborUiClick()
                        const { progress, granted, already } = claimHarborFreeEventProgress(
                          ev.id as HarborEventId,
                        )
                        setProgressSnap(progress)
                        onProgress(progress)
                        if (already || granted.length === 0) {
                          setSaveFlash(already ? 'Already claimed' : 'Nothing new to grant')
                        } else {
                          setSaveFlash(`Claimed ${granted.length} gift${granted.length === 1 ? '' : 's'}`)
                        }
                        window.setTimeout(() => setSaveFlash(null), 2200)
                      }}
                    >
                      <span className="hq-festival-en">{ev.name.en}</span>
                      <span className="hq-festival-zh" lang="zh-HK">
                        {ev.name.zh}
                      </span>
                      <span className="hq-festival-status">{claimed ? 'Claimed' : 'Claim free'}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
          <div className="hq-showoff-block">
            <p className="hq-visit-kicker">Nametag plate · 名牌</p>
            <ul className="hq-showoff-plates" aria-label="Nametag frames">
              {harborShowoffForKind('nametag').map((item) => {
                const owned = progressSnap.showoff?.owned?.includes(item.id) ?? false
                const on = progressSnap.showoff?.look.nametag === item.id
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      className={`hq-showoff-plate${on ? ' is-on' : ''}${!owned ? ' is-locked' : ''}`}
                      disabled={!owned || on}
                      title={owned ? item.name.en : `${item.name.en} · locked`}
                      onClick={() => {
                        playHarborUiClick()
                        const next = equipHarborShowoff('nametag', item.id)
                        if (!next) return
                        setProgressSnap(next)
                        onProgress(next)
                        worldApiRef.current?.setNametagFrame(item.id)
                      }}
                    >
                      <span
                        className="hq-showoff-swatch"
                        style={{
                          background: `#${item.accent.toString(16).padStart(6, '0')}`,
                        }}
                        aria-hidden="true"
                      />
                      <span className="hq-showoff-label">{item.name.en}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
          <div className="hq-visit-actions">
            <button
              type="button"
              className="hq-btn hq-btn--ghost"
              onClick={() => {
                playHarborBagOpen()
                setInvOpen(true)
                setCodexOpen(false)
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
          <button
            type="button"
            className="hq-btn hq-btn--ghost"
            onClick={() => {
              playHarborCastOff()
              setRealmOverride(null)
              startHarborBgm('river')
              setVisitable(null)
            }}
          >
            Cast off
          </button>
        </aside>
      ) : null}

      {teleportOpen ? (
        <aside
          className="hq-visit-panel hq-visit-panel--teleport"
          role="dialog"
          aria-label="Teleport to chapter"
        >
          <div className="hq-teleport-head">
            <p className="hq-visit-kicker">Chapters · 章節</p>
            <button
              type="button"
              className="hq-btn hq-btn--ghost hq-btn--tiny"
              onClick={() => setTeleportOpen(false)}
            >
              Close
            </button>
          </div>
          <h2 className="hq-visit-title">Teleport to pier</h2>
          <p className="hq-visit-body">Jump to Guan Harbor or any unlocked campaign pier.</p>
          <ul className="hq-teleport-list" aria-label="Campaign piers">
            <li>
              <button
                type="button"
                className={`hq-teleport-btn hq-teleport-btn--guan${realmOverride === 'guan' ? ' is-here' : ''}`}
                disabled={realmOverride === 'guan'}
                onClick={() => {
                  playHarborTeleport()
                  setRealmOverride('guan')
                  startHarborBgm('guan')
                  setTeleportOpen(false)
                  setVisitable(null)
                }}
              >
                <span className="hq-teleport-ch">Paradise · 樂園</span>
                <span className="hq-teleport-title">
                  {GUAN_HARBOR_META.en}
                  <span aria-hidden="true"> · </span>
                  <span lang="zh-HK">{GUAN_HARBOR_META.zh}</span>
                </span>
                <span className="hq-teleport-status">
                  {realmOverride === 'guan' ? 'Here' : 'Teleport'}
                </span>
              </button>
            </li>
            {HARBOR_LEVELS.map((lv) => {
              const ids = HARBOR_LEVELS.map((l) => l.id)
              const unlocked = isLevelUnlocked(lv.id, ids, progressSnap)
              const here = lv.id === levelId && realmOverride == null
              return (
                <li key={lv.id}>
                  <button
                    type="button"
                    className={`hq-teleport-btn${here ? ' is-here' : ''}${!unlocked ? ' is-locked' : ''}`}
                    disabled={!unlocked || here}
                    onClick={() => {
                      playHarborTeleport()
                      setRealmOverride(null)
                      startHarborBgm('river')
                      setTeleportOpen(false)
                      setVisitable(null)
                      onOpenLevel(lv.id)
                    }}
                  >
                    <span className="hq-teleport-ch">
                      {`${campaignShortLabel(levelCampaign(lv))} · ${lv.chapter === 0 ? 'Intro' : `Ch. ${lv.chapter}`}`}
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
        </aside>
      ) : null}

      {visitable === 'outfitter' ? (
        <HarborShopShelf
          kind="outfitter"
          title="River Outfitter"
          kicker="河畔衣鋪 · outfits & handhelds"
          body={`${progressSnap.coins.toLocaleString()} ferry coins · earn more with correct casts`}
          coins={progressSnap.coins}
          owned={progressSnap.owned}
          look={progressSnap.look}
          selectedSlot={shopSlot}
          onSelectSlot={(slot) => {
            playHarborUiClick()
            setShopSlot(slot)
          }}
          onBuy={onBuy}
          onSell={onSell}
          onEquip={onEquip}
          onOpenCodex={openGearCodex}
          onClose={() => {
            playHarborCastOff()
            stopHarborOutfitterBgm()
            setVisitable(null)
          }}
          message={shopMsg}
        />
      ) : null}

      {invOpen ? (
        <HarborInventoryBag
          owned={progressSnap.owned}
          look={progressSnap.look}
          coins={progressSnap.coins}
          selectedSlot={shopSlot}
          onSelectSlot={(slot) => {
            playHarborUiClick()
            setShopSlot(slot)
          }}
          onWear={onInvEquip}
          onOpenCodex={openGearCodex}
          onClose={() => {
            playHarborBagClose()
            setInvOpen(false)
          }}
          message={shopMsg}
        />
      ) : null}

      {codexOpen ? (
        <HarborGearCodex owned={progressSnap.owned} onClose={() => setCodexOpen(false)} />
      ) : null}

      {visitable === 'bank' ? (
        <HarborShopShelf
          kind="bank"
          title="Harbor Bank"
          kicker="港灣錢莊 · jade vault"
          body="Deposit gear through the cyan portal · starter kit stays on the Scout"
          coins={progressSnap.coins}
          owned={progressSnap.owned}
          banked={progressSnap.banked ?? []}
          look={progressSnap.look}
          selectedSlot={shopSlot}
          onSelectSlot={(slot) => {
            playHarborUiClick()
            setShopSlot(slot)
          }}
          onDeposit={onDeposit}
          onWithdraw={onWithdraw}
          onClose={() => {
            playHarborCastOff()
            setVisitable(null)
          }}
          message={bankMsg}
        />
      ) : null}

      {visitable === 'cape-loom' ? (
        <aside className="hq-visit-panel hq-visit-panel--loom" role="dialog" aria-label="Cape Loom">
          <p className="hq-visit-kicker">
            {GUAN_CAPE_LOOM.name.en} · <span lang="zh-HK">{GUAN_CAPE_LOOM.name.zh}</span>
          </p>
          <h2 className="hq-visit-title">{GUAN_CAPE_TRIMMER_NAME}</h2>
          <p className="hq-visit-body">
            Hit skill level 99 to claim that skill’s cape. Spend{' '}
            <strong>10,000 ferry coins</strong> here to trim it — gold/jade edge and a longer dance.
            Cosmetic only; VIP cash cannot skip the 99.
          </p>
          <p className="hq-visit-body">
            Your purse · <strong>{progressSnap.coins ?? 0}</strong> coins
          </p>
          <p className="hq-visit-msg">
            Skill trainers and capes are docking next — the loom is ready in Brimhaven when you are.
          </p>
          <button
            type="button"
            className="hq-btn hq-btn--ghost"
            onClick={() => {
              playHarborCastOff()
              setVisitable(null)
            }}
          >
            Cast off
          </button>
        </aside>
      ) : null}

      {visitable === 'fishing-hut' || visitable === 'fishing-spot' ? (
        <HarborFishingPanel
          mode={visitable === 'fishing-hut' ? 'lodge' : 'spot'}
          spotId={activeFishSpotId}
          bag={progressSnap.fishing ?? emptyHarborFishingBag()}
          coins={progressSnap.coins}
          casting={fishCasting}
          onBagChange={(bag, coinsDelta) => {
            pushProgress(updateHarborFishing(bag, coinsDelta ?? 0))
          }}
          onCastAnim={() => {
            setFishCasting(true)
            worldApiRef.current?.playFishingCast()
            window.setTimeout(() => setFishCasting(false), 2200)
          }}
          onCastResult={(ok) => {
            worldApiRef.current?.playFishingCatch(ok)
          }}
          onClose={() => {
            playHarborCastOff()
            setVisitable(null)
            setActiveFishSpotId(null)
          }}
        />
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
            beautyOwned={progressSnap.beautyOwned}
            coins={progressSnap.coins}
            onUnlockBeauty={(skuId) => {
              const next = purchaseHarborBeautySku(skuId)
              if (!next) return false
              setProgressSnap(next)
              onProgress(next)
              return true
            }}
            onUnlockBeautyBundle={(appearance) => {
              const next = purchaseHarborBeautyForAppearance(appearance)
              if (!next) return false
              setProgressSnap(next)
              onProgress(next)
              return true
            }}
            onCancel={() => setBarberOpen(false)}
            onComplete={(result) => {
              playHarborBarberSnip()
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

      {/* OSRS-style compass / boat — free-look on water; return to canoe on land */}
      <button
        type="button"
        className={`hq-explore-fab${travelMode === 'foot' ? ' is-boat' : ''}${!talking ? ' is-on' : ''}`}
        aria-label={travelMode === 'foot' ? 'Return to boat' : 'Open world exploration'}
        aria-pressed={!talking}
        title={travelMode === 'foot' ? 'Return to boat' : 'Open world exploration'}
        onClick={() => {
          playHarborExplore()
          setTalking(false)
          if (travelMode === 'foot') {
            worldApiRef.current?.returnToBoat()
          }
        }}
      >
        <span className="hq-compass-disc" aria-hidden="true">
          {travelMode === 'foot' ? <BoatFabIcon /> : <ExploreWorldIcon />}
          <span className="hq-compass-sparkle hq-compass-sparkle--a" />
          <span className="hq-compass-sparkle hq-compass-sparkle--b" />
          <span className="hq-compass-sparkle hq-compass-sparkle--c" />
        </span>
        <span className="hq-explore-fab-label">{travelMode === 'foot' ? 'Boat' : 'Explore'}</span>
      </button>

      <button
        type="button"
        className={`hq-delve-fab${remotePlayers.length === 0 ? ' is-alone' : ''}${delveOpen ? ' is-on' : ''}`}
        aria-label="Practice with 港灣 companion"
        title={
          remotePlayers.length === 0
            ? 'Dock is quiet — practice with 港灣'
            : 'Practice with 港灣'
        }
        onClick={() => {
          playHarborUiClick()
          setDelveOpen(true)
          setTalking(false)
        }}
      >
        <span className="hq-delve-fab-glyph" aria-hidden="true">
          港
        </span>
        <span className="hq-delve-fab-label">港灣</span>
      </button>

      <HarborChatBox
        lines={chatLines}
        hidden={talking || barberOpen || scrollOpen || arenaOpen || codexOpen || invOpen || delveOpen}
        disabled={!chatReady}
        onSend={sendChat}
      />

      <div
        ref={talkHudRef}
        className={`hq-play-hud${talking ? ' is-talking' : ' is-exploring'}`}
      >
        <QuestPanel
          step={step}
          stepIndex={stepIndex}
          stepCount={level.steps.length}
          sourceUrl={openCantoneseLessonUrl(level)}
          onAdvance={advance}
          onResult={onResult}
          overlay
          talking={talking}
          onTalk={beginTalk}
          onExplore={() => {
            playHarborExplore()
            setTalking(false)
          }}
          speakerRole={speakerForStep(stepIndex)}
        />
      </div>

      <MatchDefinitionModal
        open={arenaOpen}
        gold={progressSnap.gold ?? 0}
        coins={progressSnap.coins}
        onClose={() => setArenaOpen(false)}
        onEarnGold={onEarnGold}
        onExchangeGold={onExchangeGold}
      />

      <HarborDelveModal
        open={delveOpen}
        alone={remotePlayers.length === 0}
        onClose={() => setDelveOpen(false)}
        onHit={onDelveHit}
        onComplete={onDelveComplete}
      />

      <HarborPlayerProfileModal
        open={Boolean(profilePlayer)}
        username={profilePlayer?.username ?? ''}
        look={profilePlayer?.look ?? progressSnap.look}
        giftableLanterns={[
          ...(progressSnap.owned ?? []),
          ...(progressSnap.banked ?? []),
        ].filter(isGiftableLanternId)}
        giftableTitles={progressSnap.ownedTitles ?? []}
        giftBusy={giftBusy}
        giftMsg={giftMsg}
        signedIn={Boolean(entitlement?.loggedIn)}
        onGift={onGiftCosmetic}
        onClose={() => {
          setProfileUserId(null)
          setGiftMsg(null)
        }}
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

/** Simple canoe glyph for the land → boat FAB variant. */
function BoatFabIcon() {
  return (
    <svg className="hq-explore-fab-icon" viewBox="0 0 32 32" width="28" height="28" aria-hidden="true">
      <circle cx="16" cy="16" r="14.25" fill="#0c2430" stroke="#5ec8e0" strokeWidth="1.75" />
      <circle cx="16" cy="16" r="11.2" fill="none" stroke="#2a7088" strokeWidth="0.7" opacity="0.9" />
      {/* Hull */}
      <path
        d="M7.5 18.2c1.2 3.2 4.2 5.1 8.5 5.1s7.3-1.9 8.5-5.1c-2.4.9-5.4 1.35-8.5 1.35s-6.1-.45-8.5-1.35Z"
        fill="#c9a06a"
        stroke="#8a6840"
        strokeWidth="0.7"
      />
      <path d="M9.2 17.6h13.6" stroke="#e8d48a" strokeWidth="1.1" strokeLinecap="round" />
      {/* Mast + sail */}
      <path d="M16 9.2v8.2" stroke="#e8d48a" strokeWidth="1.15" strokeLinecap="round" />
      <path d="M16.2 10.2 21.5 16.4H16.2Z" fill="#f0d060" opacity="0.95" />
      <path d="M15.8 11.1 12.2 16.4h3.6Z" fill="#b89840" opacity="0.85" />
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

/** Campaign pier map for the in-game chart overlay. */
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
  type TopTab = 'sounds' | 'life0' | 'lifeBook'
  const initialTop: TopTab =
    !initialCampaign || initialCampaign === 'sounds'
      ? 'sounds'
      : initialCampaign === 'life0'
        ? 'life0'
        : 'lifeBook'
  const initialUnit: LifeUnitId | null =
    initialCampaign && isLifeBookCampaign(initialCampaign) ? (initialCampaign as LifeUnitId) : null

  const [topTab, setTopTab] = useState<TopTab>(initialTop)
  const [lifeUnit, setLifeUnit] = useState<LifeUnitId | null>(initialUnit)

  const campaign: HarborCampaignId =
    topTab === 'lifeBook' ? (lifeUnit ?? 'life1') : topTab
  const showingUnitShelf = topTab === 'lifeBook' && lifeUnit === null
  const levels = showingUnitShelf ? [] : levelsForCampaign(campaign)
  const ids = levels.map((l) => l.id)
  const unitMeta = lifeUnit ? HARBOR_LIFE_CAMPAIGNS.find((c) => c.id === lifeUnit) : undefined
  const blurb = showingUnitShelf
    ? LIFE_BOOK_SHELF.blurb
    : topTab === 'lifeBook' && unitMeta
      ? unitMeta.blurb
      : topTab === 'sounds'
        ? {
            en: 'Pronunciation Guide — initials, finals, and six tones.',
            zh: '發音導讀——聲母、韻母、六聲。',
          }
        : {
            en: 'Getting started — listen-first classroom talk, daily phrases, numbers.',
            zh: '開始——先聽課堂用語、日常說話、數字。',
          }
  const ocHome = showingUnitShelf
    ? LIFE_BOOK_SHELF.ocHome
    : topTab === 'lifeBook' && unitMeta
      ? unitMeta.ocHome
      : topTab === 'sounds'
        ? 'https://opencantonese.org/books/cantonese-life-1/pronunciation-guide'
        : 'https://opencantonese.org/books/cantonese-life-1/unit-0'
  const mapLabel = showingUnitShelf
    ? LIFE_BOOK_SHELF.title.en
    : topTab === 'lifeBook' && unitMeta
      ? unitMeta.title.en
      : topTab === 'sounds'
        ? 'Campaign 1 · Sounds'
        : 'Campaign 2 · Life Unit 0'

  return (
    <div className="hq-map-wrap">
      <div className="hq-campaign-tabs" role="tablist" aria-label="Harbor voyage books">
        <button
          type="button"
          role="tab"
          aria-selected={topTab === 'sounds'}
          className={`hq-campaign-tab${topTab === 'sounds' ? ' is-on' : ''}`}
          onClick={() => {
            setTopTab('sounds')
            setLifeUnit(null)
          }}
        >
          <span className="hq-campaign-tab-en">Campaign 1 · Sounds</span>
          <span className="hq-campaign-tab-zh" lang="zh-HK">
            航線一 · 聲韻
          </span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={topTab === 'life0'}
          className={`hq-campaign-tab${topTab === 'life0' ? ' is-on' : ''}`}
          onClick={() => {
            setTopTab('life0')
            setLifeUnit(null)
          }}
        >
          <span className="hq-campaign-tab-en">Campaign 2 · Life Unit 0</span>
          <span className="hq-campaign-tab-zh" lang="zh-HK">
            航線二 · 生活第0課
          </span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={topTab === 'lifeBook'}
          className={`hq-campaign-tab hq-campaign-tab--book${topTab === 'lifeBook' ? ' is-on' : ''}`}
          onClick={() => {
            setTopTab('lifeBook')
            setLifeUnit(null)
          }}
          aria-label="Cantonese Life 1, Units 1 to 11"
        >
          <span className="hq-book-spine" aria-hidden="true">
            <span className="hq-book-spine-mark">粵</span>
          </span>
          <span className="hq-book-cover">
            <span className="hq-book-cover-kicker">Open Cantonese</span>
            <span className="hq-campaign-tab-en">{LIFE_BOOK_SHELF.title.en}</span>
            <span className="hq-campaign-tab-zh" lang="zh-HK">
              {LIFE_BOOK_SHELF.title.zh}
            </span>
            <span className="hq-book-cover-range">{LIFE_BOOK_SHELF.spine.en}</span>
          </span>
        </button>
      </div>

      <p className="hq-campaign-blurb">
        {blurb.en}
        <span aria-hidden="true"> · </span>
        <span lang="zh-HK">{blurb.zh}</span>
      </p>

      {showingUnitShelf ? (
        <div className="hq-book-shelf" aria-label="Cantonese Life 1 units">
          <p className="hq-book-shelf-lead">Pick a unit to open its chapters.</p>
          <ol className="hq-book-units">
            {HARBOR_LIFE_CAMPAIGNS.map((unit, i) => {
              const num = i + 1
              return (
                <li key={unit.id}>
                  <button
                    type="button"
                    className={`hq-book-unit hq-book-unit--${unit.realm}`}
                    onClick={() => setLifeUnit(unit.id)}
                  >
                    <span className="hq-book-unit-num">Unit {num}</span>
                    <span className="hq-book-unit-title">{unit.title.en.replace(/^Campaign \d+ · /, '')}</span>
                    <span className="hq-book-unit-zh" lang="zh-HK">
                      {unit.title.zh.replace(/^航線[^·]+ · /, '')}
                    </span>
                    <span className="hq-book-unit-go">Open chapters →</span>
                  </button>
                </li>
              )
            })}
          </ol>
        </div>
      ) : (
        <>
          {topTab === 'lifeBook' && unitMeta ? (
            <div className="hq-book-crumb">
              <button type="button" className="hq-book-back" onClick={() => setLifeUnit(null)}>
                ← {LIFE_BOOK_SHELF.title.en}
              </button>
              <span className="hq-book-crumb-unit">{unitMeta.title.en}</span>
            </div>
          ) : null}
          <ol className="hq-map" aria-label={`${mapLabel} piers`}>
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
                    <span className="hq-map-ch">
                      {level.chapter === 0 ? 'Intro' : `Ch ${level.chapter}`}
                    </span>
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
        </>
      )}

      <a className="hq-campaign-oc" href={ocHome} target="_blank" rel="noreferrer">
        Open Cantonese source ↗
      </a>
    </div>
  )
}

