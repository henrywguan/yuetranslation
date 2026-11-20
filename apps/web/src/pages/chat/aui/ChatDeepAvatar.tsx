/**
 * DeepSeek Chat companion avatar — GIF clip state machine + TTS lip approx.
 * Characters: DS Boy / DS Girl under `apps/web/public/chat-avatar/{boy,girl}/`
 * (Higgsfield gpt_image_2_6, 720² transparent loops ≈ 3× hero CSS).
 *
 * Moods: idle / think / listen / speak / happy / celebrate / proud / eureka / concern.
 * `proud` / `eureka` are CSS variants on happy/celebrate GIFs (no new public sheets).
 * TTS lips: amplitude/vowel envelope overlay while Azure or DeepSeek chat TTS plays
 * (not phoneme lip-sync — GIF clip swaps + CSS mouth only).
 *
 * Layout: WC3-style portrait lives inside the full-bleed composer bar
 * (`size="portrait"`). Character + Celebrate mode pick: Inbox settings → Companion.
 * Fullscreen FLIP pop-out + canvas gold stars on successful outros (pref-gated).
 */
import { useAuiState } from '@assistant-ui/react'
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from 'react'
import { createPortal } from 'react-dom'
import {
  CHAT_DEEP_AVATAR_CHARACTER_EVENT,
  CHAT_DEEP_AVATAR_CHARACTER_LABEL,
  CHAT_DEEP_AVATAR_CELEBRATE_MODE_EVENT,
  chatDeepAvatarMoodSrc,
  chatDeepAvatarPosterSrc,
  isChatDeepAvatarDeepFinish,
  isChatDeepAvatarOutroMood,
  normalizeChatDeepAvatarCelebrateMode,
  normalizeChatDeepAvatarCharacter,
  pickChatDeepAvatarOutroMood,
  readChatDeepAvatarCelebrateMode,
  readChatDeepAvatarCharacter,
  shouldFullscreenCelebrate,
  writeChatDeepAvatarCelebrateMode,
  writeChatDeepAvatarCharacter,
  type ChatDeepAvatarCelebrateMode,
  type ChatDeepAvatarCharacterId,
  type ChatDeepAvatarMood,
} from '../../../lib/chatDeepAvatarCharacter'
import {
  consumeChatDeepAvatarPlanBuild,
  getChatDeepAvatarLipLevel,
  isChatAvatarTtsActive,
  useChatDeepAvatarSignals,
} from '../../../lib/chatDeepAvatarSignals'
import type { ChatComposerMode } from '../../../lib/chatUiPrefs'
import { isTtsPlaying } from '../../../lib/tts'

export type { ChatDeepAvatarMood, ChatDeepAvatarCharacterId, ChatDeepAvatarCelebrateMode }

const CELEBRATE_MS = 2400
const HAPPY_MS = 2200
const FULLSCREEN_MS = 2800

type Size = 'portrait' | 'hero' | 'bubble'

type Props = {
  mood: ChatDeepAvatarMood
  size?: Size
  className?: string
  label?: string
  /** Drive mouth overlay (TTS). Ignored when reduced-motion. */
  lipLevel?: number
  character?: ChatDeepAvatarCharacterId
  /** Hide in-frame portrait while the FLIP clone is flying (avoid double face). */
  dimmed?: boolean
}

export type ChatDeepAvatarMoodOpts = {
  /** Thread / session error banner → concern mood. */
  error?: string | null
  /** Composer Agent / Ask / Plan at run start (snapshotted while running). */
  composerMode?: ChatComposerMode
  /** Search tool armed for this turn. */
  searchOn?: boolean
}

export type ChatDeepAvatarMoodState = {
  /** Portrait display mood (speak/listen/concern can override the outro clip). */
  mood: ChatDeepAvatarMood
  /** Latched post-run mood for FX — stays set even while TTS forces `speak` on the portrait. */
  outroMood: ChatDeepAvatarMood | null
  /** Outro latch active (celebrate / proud / eureka / happy). */
  outroActive: boolean
  /** Qualifies for sidebar “Deep finishes”. */
  deepFinish: boolean
}

/**
 * Priority (high → low):
 * 1. concern — session error
 * 2. listen — dictate mic live
 * 3. speak — assistant streaming OR TTS playing
 * 4. celebrate / proud / eureka — brief after a successful run finishes
 * 5. think — composer has draft (engaged thread)
 * 6. idle
 *
 * `happy` GIF ships soft Ask/short wins via `proud` (CSS variant). Celebrate stays default.
 */
export function useChatDeepAvatarMood(opts?: ChatDeepAvatarMoodOpts): ChatDeepAvatarMoodState {
  const isRunning = useAuiState((s) => s.thread.isRunning)
  const draft = useAuiState((s) => s.composer.text)
  const isEmpty = useAuiState((s) => s.thread.isEmpty)
  const { listening, chatTtsPlaying } = useChatDeepAvatarSignals()
  const [outro, setOutro] = useState<ChatDeepAvatarMood | null>(null)
  const [deepFinish, setDeepFinish] = useState(false)
  const [azureTts, setAzureTts] = useState(false)
  const wasRunning = useRef(false)
  const runStartedAt = useRef(0)
  const runMeta = useRef({ composerMode: 'agent' as ChatComposerMode, searchOn: false })

  // Snapshot mode/search while the turn is live so mid-turn toggles don’t rewrite the outro.
  useEffect(() => {
    if (!isRunning) return
    runMeta.current = {
      composerMode: opts?.composerMode ?? 'agent',
      searchOn: Boolean(opts?.searchOn),
    }
  }, [isRunning, opts?.composerMode, opts?.searchOn])

  useEffect(() => {
    if (isRunning && !wasRunning.current) {
      runStartedAt.current = performance.now()
    }
    if (wasRunning.current && !isRunning) {
      const durationMs = Math.max(0, performance.now() - (runStartedAt.current || performance.now()))
      const planBuild = consumeChatDeepAvatarPlanBuild()
      const input = {
        durationMs,
        composerMode: runMeta.current.composerMode,
        searchOn: runMeta.current.searchOn,
        planBuild,
      }
      const nextMood = pickChatDeepAvatarOutroMood(input)
      const deep = isChatDeepAvatarDeepFinish(input)
      setDeepFinish(deep)
      setOutro(nextMood)
      const hold = nextMood === 'proud' || nextMood === 'happy' ? HAPPY_MS : CELEBRATE_MS
      const t = window.setTimeout(() => {
        setOutro(null)
        setDeepFinish(false)
      }, hold)
      wasRunning.current = isRunning
      return () => window.clearTimeout(t)
    }
    wasRunning.current = isRunning
    if (isRunning) {
      setOutro(null)
      setDeepFinish(false)
    }
  }, [isRunning])

  // Poll Azure / speechSynthesis playing flag (store path via isTtsPlaying).
  useEffect(() => {
    let raf = 0
    const tick = () => {
      setAzureTts(isTtsPlaying())
      raf = window.requestAnimationFrame(tick)
    }
    raf = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(raf)
  }, [])

  const ttsActive = chatTtsPlaying || azureTts || isChatAvatarTtsActive()

  // Display priority can put speak/listen over the outro clip; keep `outro` latched
  // separately so auto-speak does not cancel fullscreen celebrate.
  let mood: ChatDeepAvatarMood = 'idle'
  if (opts?.error?.trim()) mood = 'concern'
  else if (listening) mood = 'listen'
  else if (isRunning || ttsActive) mood = 'speak'
  else if (outro) mood = outro
  else if (!isEmpty && draft.trim().length > 0) mood = 'think'

  const outroActive = Boolean(outro) && isChatDeepAvatarOutroMood(outro)
  const outroMood = outroActive ? outro : null

  return {
    mood,
    outroMood,
    outroActive,
    deepFinish: outroActive && deepFinish,
  }
}

/** Persisted DS Boy / DS Girl pick — shared across composer portrait + Inbox settings. */
export function useChatDeepAvatarCharacter(): [
  ChatDeepAvatarCharacterId,
  (id: ChatDeepAvatarCharacterId) => void,
] {
  const [character, setCharacterState] = useState<ChatDeepAvatarCharacterId>(() =>
    readChatDeepAvatarCharacter(),
  )

  useEffect(() => {
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<unknown>).detail
      setCharacterState(normalizeChatDeepAvatarCharacter(detail))
    }
    window.addEventListener(CHAT_DEEP_AVATAR_CHARACTER_EVENT, onChange)
    return () => window.removeEventListener(CHAT_DEEP_AVATAR_CHARACTER_EVENT, onChange)
  }, [])

  const setCharacter = (id: ChatDeepAvatarCharacterId) => {
    writeChatDeepAvatarCharacter(id)
    setCharacterState(normalizeChatDeepAvatarCharacter(id))
  }

  return [character, setCharacter]
}

/** Persisted Celebrate fullscreen mode — Inbox settings beside Companion. */
export function useChatDeepAvatarCelebrateMode(): [
  ChatDeepAvatarCelebrateMode,
  (mode: ChatDeepAvatarCelebrateMode) => void,
] {
  const [mode, setModeState] = useState<ChatDeepAvatarCelebrateMode>(() =>
    readChatDeepAvatarCelebrateMode(),
  )

  useEffect(() => {
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<unknown>).detail
      setModeState(normalizeChatDeepAvatarCelebrateMode(detail))
    }
    window.addEventListener(CHAT_DEEP_AVATAR_CELEBRATE_MODE_EVENT, onChange)
    return () => window.removeEventListener(CHAT_DEEP_AVATAR_CELEBRATE_MODE_EVENT, onChange)
  }, [])

  const setMode = (next: ChatDeepAvatarCelebrateMode) => {
    writeChatDeepAvatarCelebrateMode(next)
    setModeState(normalizeChatDeepAvatarCelebrateMode(next))
  }

  return [mode, setMode]
}

/** rAF lip level while TTS is active; 0 otherwise. */
export function useChatDeepAvatarLipLevel(mood: ChatDeepAvatarMood): number {
  const [level, setLevel] = useState(0)
  const { chatTtsPlaying } = useChatDeepAvatarSignals()

  useEffect(() => {
    if (mood !== 'speak') {
      setLevel(0)
      return
    }
    let raf = 0
    const tick = () => {
      const active = chatTtsPlaying || isTtsPlaying()
      setLevel(active ? getChatDeepAvatarLipLevel() : 0)
      raf = window.requestAnimationFrame(tick)
    }
    raf = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(raf)
  }, [mood, chatTtsPlaying])

  return level
}

function usePrefersReducedMotion(): boolean {
  const [reduce, setReduce] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const apply = () => setReduce(mq.matches)
    apply()
    mq.addEventListener?.('change', apply)
    return () => mq.removeEventListener?.('change', apply)
  }, [])
  return reduce
}

function sizeClassName(size: Size): string {
  if (size === 'bubble') return 'aui-deep-avatar is-bubble'
  if (size === 'hero') return 'aui-deep-avatar is-hero'
  return 'aui-deep-avatar is-portrait'
}

export function ChatDeepAvatar({
  mood,
  size = 'portrait',
  className = '',
  label,
  lipLevel = 0,
  character = 'boy',
  dimmed = false,
}: Props) {
  const reduceMotion = usePrefersReducedMotion()
  const src = reduceMotion
    ? chatDeepAvatarPosterSrc(character)
    : chatDeepAvatarMoodSrc(character, mood)
  const sizeClass = sizeClassName(size)
  const speaking = mood === 'speak'
  const lipsOn = speaking && !reduceMotion && lipLevel > 0.04
  const lipScaleY = 0.35 + lipLevel * 1.15
  const lipScaleX = 0.85 + lipLevel * 0.35
  const charLabel = CHAT_DEEP_AVATAR_CHARACTER_LABEL[character]
  const imgPx = size === 'bubble' ? 112 : size === 'portrait' ? 224 : 720

  return (
    <div
      className={`${sizeClass}${speaking ? ' is-speaking' : ''}${dimmed ? ' is-fx-dimmed' : ''} is-char-${character}${lipsOn ? ' is-lips' : ''} ${className}`.trim()}
      data-mood={mood}
      data-character={character}
      aria-hidden={label ? undefined : true}
      role={label ? 'img' : undefined}
      aria-label={label ?? `${charLabel} · ${mood}`}
    >
      <img
        key={src}
        className="aui-deep-avatar-img"
        src={src}
        alt=""
        width={imgPx}
        height={imgPx}
        decoding="async"
        draggable={false}
      />
      {lipsOn ? (
        <span
          className="aui-deep-avatar-lips"
          aria-hidden
          style={
            {
              '--aui-lip-sy': String(lipScaleY),
              '--aui-lip-sx': String(lipScaleX),
              opacity: 0.35 + lipLevel * 0.55,
            } as CSSProperties
          }
        />
      ) : null}
      {speaking ? <span className="aui-deep-avatar-pulse" aria-hidden /> : null}
    </div>
  )
}

type StarParticle = {
  x: number
  y: number
  vx: number
  vy: number
  r: number
  rot: number
  vr: number
  life: number
  maxLife: number
  points: 4 | 5
  gold: boolean
}

function starParticleCount(): number {
  const cores = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 4
  if (cores <= 2) return 28
  if (cores <= 4) return 48
  return 64
}

function paintStar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  points: number,
  rot: number,
  color: string,
  alpha: number,
) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(rot)
  ctx.globalAlpha = alpha
  ctx.fillStyle = color
  ctx.beginPath()
  for (let i = 0; i < points * 2; i++) {
    const ang = (Math.PI * i) / points - Math.PI / 2
    const rad = i % 2 === 0 ? r : r * 0.42
    const px = Math.cos(ang) * rad
    const py = Math.sin(ang) * rad
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

function ChatDeepAvatarStarField({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    if (!active) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0
    let running = true
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const particles: StarParticle[] = []
    const count = starParticleCount()
    const gold = '#E8C547'
    const jade = '#3ecf8e'

    const resize = () => {
      const w = window.innerWidth
      const h = window.innerHeight
      canvas.width = Math.floor(w * dpr)
      canvas.height = Math.floor(h * dpr)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()

    const cx = window.innerWidth / 2
    const cy = window.innerHeight * 0.42
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2
      const speed = 40 + Math.random() * 160
      particles.push({
        x: cx + (Math.random() - 0.5) * 40,
        y: cy + (Math.random() - 0.5) * 40,
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed - 30,
        r: 2.2 + Math.random() * 5.5,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 4,
        life: 0,
        maxLife: 0.9 + Math.random() * 1.6,
        points: Math.random() > 0.35 ? 5 : 4,
        gold: Math.random() > 0.22,
      })
    }

    let last = performance.now()
    const tick = (now: number) => {
      if (!running) return
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const w = window.innerWidth
      const h = window.innerHeight
      ctx.clearRect(0, 0, w, h)
      for (const p of particles) {
        p.life += dt
        if (p.life > p.maxLife) continue
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.vy += 55 * dt
        p.rot += p.vr * dt
        const t = p.life / p.maxLife
        const alpha = t < 0.15 ? t / 0.15 : Math.max(0, 1 - (t - 0.15) / 0.85)
        paintStar(ctx, p.x, p.y, p.r, p.points, p.rot, p.gold ? gold : jade, alpha * 0.95)
      }
      raf = window.requestAnimationFrame(tick)
    }
    raf = window.requestAnimationFrame(tick)
    window.addEventListener('resize', resize)
    return () => {
      running = false
      window.cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [active])

  return <canvas className="aui-deep-avatar-fx-stars" ref={canvasRef} aria-hidden />
}

type CelebrateFxProps = {
  open: boolean
  /** Bumps when a new celebrate session starts while a prior overlay may still be open. */
  sessionKey?: number
  mood: ChatDeepAvatarMood
  character: ChatDeepAvatarCharacterId
  originRef: RefObject<HTMLElement | null>
  onDismiss: () => void
}

/**
 * FLIP pop-out from the dialogue-bar portrait + canvas gold stars.
 * Portal to `document.body` so composer overflow cannot clip it.
 * Does not cover the bottom composer band (pointer-events), so mic/Stop stay usable.
 */
export function ChatDeepAvatarCelebrateFx({
  open,
  sessionKey = 0,
  mood,
  character,
  originRef,
  onDismiss,
}: CelebrateFxProps) {
  const [mounted, setMounted] = useState(false)
  const [phase, setPhase] = useState<'enter' | 'hold' | 'exit'>('enter')
  const [flip, setFlip] = useState<CSSProperties>({})
  const flyRef = useRef<HTMLDivElement | null>(null)

  // Restart timers on every new session (same mood can celebrate again while open stays true).
  useEffect(() => {
    if (!open) {
      setMounted(false)
      setPhase('enter')
      return
    }
    setMounted(true)
    setPhase('enter')
    const hold = window.setTimeout(() => setPhase('exit'), FULLSCREEN_MS - 420)
    const done = window.setTimeout(() => onDismiss(), FULLSCREEN_MS)
    return () => {
      window.clearTimeout(hold)
      window.clearTimeout(done)
    }
  }, [open, sessionKey, onDismiss])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onDismiss])

  useLayoutEffect(() => {
    if (!open || !mounted) return
    const origin = originRef.current?.getBoundingClientRect()
    const fly = flyRef.current?.getBoundingClientRect()
    if (!origin || !fly || fly.width < 1) return

    const sx = origin.width / fly.width
    const sy = origin.height / fly.height
    const ox = origin.left + origin.width / 2 - (fly.left + fly.width / 2)
    const oy = origin.top + origin.height / 2 - (fly.top + fly.height / 2)

    setFlip({
      ['--aui-fx-sx' as string]: String(sx),
      ['--aui-fx-sy' as string]: String(sy),
      ['--aui-fx-tx' as string]: `${ox}px`,
      ['--aui-fx-ty' as string]: `${oy}px`,
    })

    // Next frame → animate to identity (center).
    const raf = window.requestAnimationFrame(() => setPhase('hold'))
    return () => window.cancelAnimationFrame(raf)
  }, [open, mounted, originRef, mood, character])

  if (!open || !mounted || typeof document === 'undefined') return null

  return createPortal(
    <div className={`aui-deep-avatar-fx is-${phase}`} data-mood={mood} style={flip} role="presentation">
      <div className="aui-deep-avatar-fx-wash" aria-hidden />
      <ChatDeepAvatarStarField active={phase !== 'exit'} />
      <button
        type="button"
        className="aui-deep-avatar-fx-scrim"
        aria-label="Dismiss celebration"
        onClick={onDismiss}
      />
      <div className="aui-deep-avatar-fx-stage" aria-hidden>
        <div className="aui-deep-avatar-fx-fly" ref={flyRef}>
          <ChatDeepAvatar mood={mood} size="hero" character={character} className="is-fx-pop" />
        </div>
      </div>
    </div>,
    document.body,
  )
}

/** Wire portrait + pref → fullscreen celebrate overlay. */
export function useChatDeepAvatarCelebrateFx(opts: {
  /** Latched outro mood (not the speak-overridden portrait mood). */
  outroMood: ChatDeepAvatarMood | null
  outroActive: boolean
  deepFinish: boolean
  celebrateMode: ChatDeepAvatarCelebrateMode
}): {
  showFx: boolean
  fxMood: ChatDeepAvatarMood
  fxSessionKey: number
  dismissFx: () => void
  dimPortrait: boolean
} {
  const reduceMotion = usePrefersReducedMotion()
  const prevOutro = useRef(false)
  /** Independent of outro timer — lives until dismiss or CelebrateFx FULLSCREEN_MS. */
  const [session, setSession] = useState<{
    id: number
    mood: ChatDeepAvatarMood
    deepFinish: boolean
  } | null>(null)
  const sessionId = useRef(0)

  useEffect(() => {
    const rising = opts.outroActive && !prevOutro.current
    prevOutro.current = opts.outroActive
    if (!rising || !opts.outroMood) return
    const start = shouldFullscreenCelebrate({
      celebrateMode: opts.celebrateMode,
      deepFinish: opts.deepFinish,
      reducedMotion: reduceMotion,
      outroActive: true,
    })
    if (!start) return
    sessionId.current += 1
    setSession({
      id: sessionId.current,
      mood: opts.outroMood,
      deepFinish: opts.deepFinish,
    })
  }, [
    opts.outroActive,
    opts.outroMood,
    opts.deepFinish,
    opts.celebrateMode,
    reduceMotion,
  ])

  const dismissFx = useCallback(() => setSession(null), [])
  const showFx = Boolean(session)
  return {
    showFx,
    fxMood: session?.mood ?? opts.outroMood ?? 'celebrate',
    fxSessionKey: session?.id ?? 0,
    dismissFx,
    dimPortrait: showFx,
  }
}

/** @deprecated Prefer CELEBRATE_MS; kept for smoke / callers that referenced the old timer. */
export const CHAT_DEEP_AVATAR_HAPPY_MS = HAPPY_MS

/** @deprecated Use chatDeepAvatarPosterSrc(character). */
export const CHAT_DEEP_AVATAR_POSTER = '/chat-avatar/boy/deep-bust.png'
