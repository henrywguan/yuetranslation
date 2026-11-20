/**
 * DeepSeek Chat companion avatar — GIF clip state machine + TTS lip approx.
 * Assets: `apps/web/public/chat-avatar/*` (Higgsfield gpt_image_2_6).
 *
 * Moods: idle / think / listen / speak / happy / celebrate / concern.
 * TTS lips: amplitude/vowel envelope overlay while Azure or DeepSeek chat TTS plays
 * (not phoneme lip-sync — GIF clip swaps + CSS mouth only).
 */
import { useAuiState } from '@assistant-ui/react'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import {
  getChatDeepAvatarLipLevel,
  isChatAvatarTtsActive,
  useChatDeepAvatarSignals,
} from '../../../lib/chatDeepAvatarSignals'
import { isTtsPlaying } from '../../../lib/tts'

export type ChatDeepAvatarMood =
  | 'idle'
  | 'happy'
  | 'think'
  | 'speak'
  | 'listen'
  | 'concern'
  | 'celebrate'

const AVATAR_SRC: Record<ChatDeepAvatarMood, string> = {
  idle: '/chat-avatar/deep-idle.gif',
  happy: '/chat-avatar/deep-happy.gif',
  think: '/chat-avatar/deep-think.gif',
  speak: '/chat-avatar/deep-speak.gif',
  listen: '/chat-avatar/deep-listen.gif',
  concern: '/chat-avatar/deep-concern.gif',
  celebrate: '/chat-avatar/deep-celebrate.gif',
}

/** Reduced-motion / decode fallback from idle frame 0. */
export const CHAT_DEEP_AVATAR_POSTER = '/chat-avatar/deep-bust.png'

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
}: Props) {
  const reduceMotion = usePrefersReducedMotion()
  const src = reduceMotion ? CHAT_DEEP_AVATAR_POSTER : AVATAR_SRC[mood]
  const sizeClass = size === 'bubble' ? 'aui-deep-avatar is-bubble' : 'aui-deep-avatar is-hero'
  const speaking = mood === 'speak'
  const lipsOn = speaking && !reduceMotion && lipLevel > 0.04
  const lipScaleY = 0.35 + lipLevel * 1.15
  const lipScaleX = 0.85 + lipLevel * 0.35

  return (
    <div
      className={`${sizeClass}${speaking ? ' is-speaking' : ''}${lipsOn ? ' is-lips' : ''} ${className}`.trim()}
      data-mood={mood}
      aria-hidden={label ? undefined : true}
      role={label ? 'img' : undefined}
      aria-label={label}
    >
      <img
        key={src}
        className="aui-deep-avatar-img"
        src={src}
        alt=""
        width={size === 'bubble' ? 64 : 240}
        height={size === 'bubble' ? 64 : 240}
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
}: {
  mood: ChatDeepAvatarMood
  lipLevel?: number
}) {
  return (
    <div className="aui-deep-avatar-dock">
      <ChatDeepAvatar mood={mood} size="bubble" lipLevel={lipLevel} label={`DeepSeek · ${mood}`} />
    </div>
  )
}

/** @deprecated Prefer CELEBRATE_MS; kept for smoke / callers that referenced the old timer. */
export const CHAT_DEEP_AVATAR_HAPPY_MS = HAPPY_MS
