/**
 * DeepSeek Chat companion avatar — GIF clip state machine + TTS lip approx.
 * Characters: DS Boy / DS Girl under `apps/web/public/chat-avatar/{boy,girl}/`
 * (Higgsfield gpt_image_2_6, 720² transparent loops ≈ 3× hero CSS).
 *
 * Moods: idle / think / listen / speak / happy / celebrate / concern.
 * TTS lips: amplitude/vowel envelope overlay while Azure or DeepSeek chat TTS plays
 * (not phoneme lip-sync — GIF clip swaps + CSS mouth only).
 */
import { useAuiState } from '@assistant-ui/react'
import { useEffect, useId, useRef, useState, type CSSProperties } from 'react'
import {
  CHAT_DEEP_AVATAR_CHARACTER_LABEL,
  CHAT_DEEP_AVATAR_CHARACTERS,
  chatDeepAvatarMoodSrc,
  chatDeepAvatarPosterSrc,
  readChatDeepAvatarCharacter,
  writeChatDeepAvatarCharacter,
  type ChatDeepAvatarCharacterId,
  type ChatDeepAvatarMood,
} from '../../../lib/chatDeepAvatarCharacter'
import {
  getChatDeepAvatarLipLevel,
  isChatAvatarTtsActive,
  useChatDeepAvatarSignals,
} from '../../../lib/chatDeepAvatarSignals'
import { isTtsPlaying } from '../../../lib/tts'

export type { ChatDeepAvatarMood, ChatDeepAvatarCharacterId }

const CELEBRATE_MS = 2400
const HAPPY_MS = 2200

type Size = 'hero' | 'bubble'

type Props = {
  mood: ChatDeepAvatarMood
  size?: Size
  className?: string
  label?: string
  /** Drive mouth overlay (TTS). Ignored when reduced-motion. */
  lipLevel?: number
  character?: ChatDeepAvatarCharacterId
}

export type ChatDeepAvatarMoodOpts = {
  /** Thread / session error banner → concern mood. */
  error?: string | null
}

/**
 * Priority (high → low):
 * 1. concern — session error
 * 2. listen — dictate mic live
 * 3. speak — assistant streaming OR TTS playing
 * 4. celebrate — brief after a successful run finishes
 * 5. think — composer has draft (engaged thread)
 * 6. idle
 *
 * `happy` remains a clip for soft ack; celebrate is the post-run default.
 */
export function useChatDeepAvatarMood(opts?: ChatDeepAvatarMoodOpts): ChatDeepAvatarMood {
  const isRunning = useAuiState((s) => s.thread.isRunning)
  const draft = useAuiState((s) => s.composer.text)
  const isEmpty = useAuiState((s) => s.thread.isEmpty)
  const { listening, chatTtsPlaying } = useChatDeepAvatarSignals()
  const [celebrate, setCelebrate] = useState(false)
  const [azureTts, setAzureTts] = useState(false)
  const wasRunning = useRef(false)

  useEffect(() => {
    if (wasRunning.current && !isRunning) {
      setCelebrate(true)
      const t = window.setTimeout(() => setCelebrate(false), CELEBRATE_MS)
      wasRunning.current = isRunning
      return () => window.clearTimeout(t)
    }
    wasRunning.current = isRunning
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

  if (opts?.error?.trim()) return 'concern'
  if (listening) return 'listen'
  if (isRunning || ttsActive) return 'speak'
  if (celebrate) return 'celebrate'
  if (!isEmpty && draft.trim().length > 0) return 'think'
  return 'idle'
}

/** Persisted DS Boy / DS Girl pick — shared across hero + bubble. */
export function useChatDeepAvatarCharacter(): [
  ChatDeepAvatarCharacterId,
  (id: ChatDeepAvatarCharacterId) => void,
] {
  const [character, setCharacterState] = useState<ChatDeepAvatarCharacterId>(() =>
    readChatDeepAvatarCharacter(),
  )

  const setCharacter = (id: ChatDeepAvatarCharacterId) => {
    writeChatDeepAvatarCharacter(id)
    setCharacterState(id)
  }

  return [character, setCharacter]
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

export function ChatDeepAvatar({
  mood,
  size = 'hero',
  className = '',
  label,
  lipLevel = 0,
  character = 'boy',
}: Props) {
  const reduceMotion = usePrefersReducedMotion()
  const src = reduceMotion
    ? chatDeepAvatarPosterSrc(character)
    : chatDeepAvatarMoodSrc(character, mood)
  const sizeClass = size === 'bubble' ? 'aui-deep-avatar is-bubble' : 'aui-deep-avatar is-hero'
  const speaking = mood === 'speak'
  const lipsOn = speaking && !reduceMotion && lipLevel > 0.04
  const lipScaleY = 0.35 + lipLevel * 1.15
  const lipScaleX = 0.85 + lipLevel * 0.35
  const charLabel = CHAT_DEEP_AVATAR_CHARACTER_LABEL[character]

  return (
    <div
      className={`${sizeClass}${speaking ? ' is-speaking' : ''} is-char-${character}${lipsOn ? ' is-lips' : ''} ${className}`.trim()}
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
        width={size === 'bubble' ? 112 : 720}
        height={size === 'bubble' ? 112 : 720}
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

/** Compact floating chat-head when the thread has messages. */
export function ChatDeepAvatarBubble({
  mood,
  lipLevel = 0,
  character = 'boy',
}: {
  mood: ChatDeepAvatarMood
  lipLevel?: number
  character?: ChatDeepAvatarCharacterId
}) {
  const charLabel = CHAT_DEEP_AVATAR_CHARACTER_LABEL[character]
  return (
    <div className="aui-deep-avatar-dock">
      <ChatDeepAvatar
        mood={mood}
        size="bubble"
        lipLevel={lipLevel}
        character={character}
        label={`${charLabel} · ${mood}`}
      />
    </div>
  )
}

/**
 * Compact DS Boy / DS Girl picker — sits on the empty hero and as a cog
 * near the docked bubble so the mood / TTS lip machine stays character-agnostic.
 */
export function ChatDeepAvatarCharacterPicker({
  character,
  onChange,
  compact = false,
}: {
  character: ChatDeepAvatarCharacterId
  onChange: (id: ChatDeepAvatarCharacterId) => void
  compact?: boolean
}) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const menuId = useId()

  useEffect(() => {
    if (!open) return
    const onPointer = (e: MouseEvent | PointerEvent) => {
      if (!wrapRef.current) return
      if (e.target instanceof Node && wrapRef.current.contains(e.target)) return
      setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div
      className={`aui-avatar-char-picker${compact ? ' is-compact' : ''}`}
      ref={wrapRef}
    >
      <button
        type="button"
        className="aui-avatar-char-trigger"
        title="Companion character"
        aria-label="Companion character"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
      >
        {compact ? (
          <span className="aui-avatar-char-cog" aria-hidden>
            ⚙
          </span>
        ) : (
          <>
            <span className="aui-avatar-char-current">
              {CHAT_DEEP_AVATAR_CHARACTER_LABEL[character]}
            </span>
            <span className="aui-avatar-char-chevron" aria-hidden>
              ▾
            </span>
          </>
        )}
      </button>
      {open ? (
        <div
          className="aui-avatar-char-menu"
          id={menuId}
          role="menu"
          aria-label="Companion character"
        >
          {CHAT_DEEP_AVATAR_CHARACTERS.map((id) => (
            <button
              key={id}
              type="button"
              role="menuitemradio"
              aria-checked={character === id}
              className={`aui-avatar-char-item${character === id ? ' is-active' : ''}`}
              onClick={() => {
                onChange(id)
                setOpen(false)
              }}
            >
              <img
                className="aui-avatar-char-thumb"
                src={chatDeepAvatarPosterSrc(id)}
                alt=""
                width={36}
                height={36}
                decoding="async"
                draggable={false}
              />
              <span>{CHAT_DEEP_AVATAR_CHARACTER_LABEL[id]}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

/** @deprecated Prefer CELEBRATE_MS; kept for smoke / callers that referenced the old timer. */
export const CHAT_DEEP_AVATAR_HAPPY_MS = HAPPY_MS

/** @deprecated Use chatDeepAvatarPosterSrc(character). */
export const CHAT_DEEP_AVATAR_POSTER = '/chat-avatar/boy/deep-bust.png'
