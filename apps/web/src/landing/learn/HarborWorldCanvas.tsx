import { useEffect, useRef } from 'react'
import type { HarborLook } from './harborGear'
import type { HarborAppearance, HarborGender } from './harborAppearance'
import type { HarborRemotePlayer } from './harborPresence'
import type { HarborRpgZoneId } from './harborRpgData'
import type { HarborRpgBag } from './harborRpgProgress'
import {
  createHarborWorld,
  type HarborDialogueTap,
  type HarborHue,
  type HarborRealmId,
  type HarborVisitableId,
  type HarborWorldHandle,
} from './harborWorld'

type Props = {
  progress: number
  flash: 'ok' | 'no' | null
  hue: HarborHue
  reducedMotion: boolean
  look: HarborLook
  gender?: HarborGender
  appearance?: HarborAppearance
  realm?: HarborRealmId
  rpgZone?: HarborRpgZoneId
  rpgBag?: HarborRpgBag
  onRpgBagChange?: (bag: HarborRpgBag) => void
  localUserId?: string
  rpgPartySize?: number
  onRpgContestedLoot?: (drop: {
    monsterId: string
    loot: { id: import('./harborRpgData').HarborRpgItemId; qty: number }[]
  }) => void
  onRpgWorldTick?: (packet: import('./harborRpgWorldSync').HarborRpgWorldPacket) => void
  rpgZonePeerIds?: string[]
  onRpgBossPhase?: (ev: {
    monsterId: string
    kind: string
    phase: number
    name: { en: string; zh: string }
    toast?: { en: string; zh: string }
  }) => void
  onRpgPlayerDown?: (ev: { zone: HarborRpgZoneId; instance: boolean }) => void
  onRpgPartyHeal?: (ev: { amount: number; zone: HarborRpgZoneId }) => void
  /** Pause simulation (chart / heavy overlays) — raf stays alive for a cheap resume. */
  paused?: boolean
  onVisitable?: (id: HarborVisitableId | null) => void
  /** Tap a nearby talkable NPC / speech bubble. */
  onDialogueNpc?: (tap: HarborDialogueTap) => void
  /** Signed-in multiplayer: remote sailors to render. */
  remotePlayers?: HarborRemotePlayer[]
  /** Local nametag (all sailors show a name above their head). */
  localUsername?: string
  /** Showoff nametag frame id (harborShowoff). */
  nametagFrame?: string
  /** Tap a remote sailor → profile modal. */
  onRemotePlayerSelect?: (userId: string) => void
  /** Parent access for presence broadcast (getLocalPose). */
  worldApiRef?: React.MutableRefObject<HarborWorldHandle | null>
  className?: string
}

/** Full-bleed WebGL river voyage behind the Harbor Quest HUD. */
export function HarborWorldCanvas({
  progress,
  flash,
  hue,
  reducedMotion,
  look,
  gender,
  appearance,
  realm = 'river',
  rpgZone = 'meadow',
  rpgBag,
  onRpgBagChange,
  localUserId,
  rpgPartySize,
  onRpgContestedLoot,
  onRpgWorldTick,
  rpgZonePeerIds,
  onRpgBossPhase,
  onRpgPlayerDown,
  onRpgPartyHeal,
  paused = false,
  onVisitable,
  onDialogueNpc,
  remotePlayers,
  localUsername,
  nametagFrame,
  onRemotePlayerSelect,
  worldApiRef,
  className,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const worldRef = useRef<HarborWorldHandle | null>(null)
  const onVisitableRef = useRef(onVisitable)
  onVisitableRef.current = onVisitable
  const onDialogueNpcRef = useRef(onDialogueNpc)
  onDialogueNpcRef.current = onDialogueNpc
  const onRemoteSelectRef = useRef(onRemotePlayerSelect)
  onRemoteSelectRef.current = onRemotePlayerSelect
  const onRpgBagChangeRef = useRef(onRpgBagChange)
  onRpgBagChangeRef.current = onRpgBagChange
  const onRpgContestedLootRef = useRef(onRpgContestedLoot)
  onRpgContestedLootRef.current = onRpgContestedLoot
  const onRpgWorldTickRef = useRef(onRpgWorldTick)
  onRpgWorldTickRef.current = onRpgWorldTick
  const onRpgBossPhaseRef = useRef(onRpgBossPhase)
  onRpgBossPhaseRef.current = onRpgBossPhase
  const onRpgPlayerDownRef = useRef(onRpgPlayerDown)
  onRpgPlayerDownRef.current = onRpgPlayerDown
  const onRpgPartyHealRef = useRef(onRpgPartyHeal)
  onRpgPartyHealRef.current = onRpgPartyHeal
  const localUserIdRef = useRef(localUserId)
  localUserIdRef.current = localUserId
  const rpgPartySizeRef = useRef(rpgPartySize)
  rpgPartySizeRef.current = rpgPartySize
  const rpgZonePeerIdsRef = useRef(rpgZonePeerIds)
  rpgZonePeerIdsRef.current = rpgZonePeerIds
  const localUsernameRef = useRef(localUsername)
  localUsernameRef.current = localUsername
  const nametagFrameRef = useRef(nametagFrame)
  nametagFrameRef.current = nametagFrame
  const remotePlayersRef = useRef(remotePlayers)
  remotePlayersRef.current = remotePlayers
  const progressRef = useRef(progress)
  progressRef.current = progress
  const pausedRef = useRef(paused)
  pausedRef.current = paused
  const rpgBagRef = useRef(rpgBag)
  rpgBagRef.current = rpgBag

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let world: HarborWorldHandle
    try {
      world = createHarborWorld(canvas, {
        hue,
        reducedMotion,
        look,
        gender,
        appearance,
        realm,
        rpgZone,
        rpgBag: rpgBagRef.current,
        nametagFrame: nametagFrameRef.current,
        onVisitable: (id) => onVisitableRef.current?.(id),
        onDialogueNpc: (tap) => onDialogueNpcRef.current?.(tap),
        onRemotePlayerSelect: (userId) => onRemoteSelectRef.current?.(userId),
        onRpgBagChange: (bag) => onRpgBagChangeRef.current?.(bag),
        localUserId: localUserIdRef.current,
        rpgPartySize: rpgPartySizeRef.current ?? 1,
        onRpgContestedLoot: (drop) => onRpgContestedLootRef.current?.(drop),
        onRpgWorldTick: (packet) => onRpgWorldTickRef.current?.(packet),
        rpgZonePeerIds: rpgZonePeerIdsRef.current,
        onRpgBossPhase: (ev) => onRpgBossPhaseRef.current?.(ev),
        onRpgPlayerDown: (ev) => onRpgPlayerDownRef.current?.(ev),
        onRpgPartyHeal: (ev) => onRpgPartyHealRef.current?.(ev),
      })
    } catch (err) {
      console.error('[harbor] WebGL boot failed', err)
      canvas.dataset.harborBootFailed = '1'
      return
    }
    worldRef.current = world
    if (worldApiRef) worldApiRef.current = world

    const name = localUsernameRef.current?.trim()
    const frame = nametagFrameRef.current
    if (name) world.setLocalUsername(name, frame)
    else if (frame) world.setNametagFrame(frame)
    world.setRemotePlayers(remotePlayersRef.current ?? [])
    world.setProgress(progressRef.current)
    world.setPaused(pausedRef.current)

    let resizeRaf = 0
    const scheduleResize = () => {
      if (resizeRaf) return
      resizeRaf = requestAnimationFrame(() => {
        resizeRaf = 0
        world.resize()
      })
    }
    window.addEventListener('resize', scheduleResize)
    const box = canvas.parentElement
    const ro =
      typeof ResizeObserver !== 'undefined' && box
        ? new ResizeObserver(scheduleResize)
        : null
    ro?.observe(box ?? canvas)
    requestAnimationFrame(() => world.resize())

    return () => {
      window.removeEventListener('resize', scheduleResize)
      if (resizeRaf) cancelAnimationFrame(resizeRaf)
      ro?.disconnect()
      world.dispose()
      worldRef.current = null
      if (worldApiRef) worldApiRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [realm, rpgZone])

  useEffect(() => {
    if (rpgBag) worldRef.current?.setRpgBag(rpgBag)
  }, [rpgBag])

  useEffect(() => {
    if (rpgZonePeerIds) worldRef.current?.setRpgZonePeerIds(rpgZonePeerIds)
  }, [rpgZonePeerIds])

  useEffect(() => {
    worldRef.current?.setProgress(progress)
  }, [progress])

  useEffect(() => {
    worldRef.current?.setFlash(flash)
  }, [flash])

  useEffect(() => {
    worldRef.current?.setHue(hue)
  }, [hue])

  useEffect(() => {
    worldRef.current?.setReducedMotion(reducedMotion)
  }, [reducedMotion])

  useEffect(() => {
    worldRef.current?.setLook(look)
  }, [look])

  useEffect(() => {
    worldRef.current?.setCharacter({ gender, appearance })
  }, [gender, appearance])

  useEffect(() => {
    worldRef.current?.setPaused(paused)
  }, [paused])

  useEffect(() => {
    worldRef.current?.setRemotePlayers(remotePlayers ?? [])
  }, [remotePlayers])

  useEffect(() => {
    const name = localUsername?.trim()
    if (name) worldRef.current?.setLocalUsername(name, nametagFrame)
    else if (nametagFrame) worldRef.current?.setNametagFrame(nametagFrame)
  }, [localUsername, nametagFrame])

  return (
    <canvas
      ref={canvasRef}
      className={className ?? 'hq-world-canvas'}
      aria-hidden="true"
    />
  )
}
