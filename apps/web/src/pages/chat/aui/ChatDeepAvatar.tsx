/**
 * DeepSeek Chat companion avatar — idle / happy / think / speak GIF states.
 * Assets: `apps/web/public/chat-avatar/*` (Higgsfield gpt_image_2_6).
 *
 * v1: discrete clip states (simple mouth open/close on speak) — not phoneme lip-sync.
 * Stretch: layered SVG mouth sprites, more moods, TTS-synced lips.
 */
import { useAuiState } from '@assistant-ui/react'
import { useEffect, useRef, useState } from 'react'

export type ChatDeepAvatarMood = 'idle' | 'happy' | 'think' | 'speak'

const AVATAR_SRC: Record<ChatDeepAvatarMood, string> = {
  idle: '/chat-avatar/deep-idle.gif',
  happy: '/chat-avatar/deep-happy.gif',
  think: '/chat-avatar/deep-think.gif',
  speak: '/chat-avatar/deep-speak.gif',
}

/** Reduced-motion / decode fallback from idle frame 0. */
export const CHAT_DEEP_AVATAR_POSTER = '/chat-avatar/deep-bust.png'

const HAPPY_MS = 2200

type Size = 'hero' | 'bubble'

type Props = {
  mood: ChatDeepAvatarMood
  size?: Size
  className?: string
  label?: string
}

/**
 * Thread → mood map:
 * - speak while assistant streams
 * - happy briefly after a turn finishes
 * - think when composer has draft text (engaged thread)
 * - idle otherwise (empty hero + resting bubble)
 */
export function useChatDeepAvatarMood(): ChatDeepAvatarMood {
  const isRunning = useAuiState((s) => s.thread.isRunning)
  const draft = useAuiState((s) => s.composer.text)
  const isEmpty = useAuiState((s) => s.thread.isEmpty)
  const [happy, setHappy] = useState(false)
  const wasRunning = useRef(false)

  useEffect(() => {
    if (wasRunning.current && !isRunning) {
      setHappy(true)
      const t = window.setTimeout(() => setHappy(false), HAPPY_MS)
      wasRunning.current = isRunning
      return () => window.clearTimeout(t)
    }
    wasRunning.current = isRunning
  }, [isRunning])

  if (isRunning) return 'speak'
  if (happy) return 'happy'
  if (!isEmpty && draft.trim().length > 0) return 'think'
  return 'idle'
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

export function ChatDeepAvatar({ mood, size = 'hero', className = '', label }: Props) {
  const reduceMotion = usePrefersReducedMotion()
  const src = reduceMotion ? CHAT_DEEP_AVATAR_POSTER : AVATAR_SRC[mood]
  const sizeClass = size === 'bubble' ? 'aui-deep-avatar is-bubble' : 'aui-deep-avatar is-hero'

  return (
    <div
      className={`${sizeClass}${mood === 'speak' ? ' is-speaking' : ''} ${className}`.trim()}
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
      {mood === 'speak' ? <span className="aui-deep-avatar-pulse" aria-hidden /> : null}
    </div>
  )
}

/** Compact floating chat-head when the thread has messages. */
export function ChatDeepAvatarBubble({ mood }: { mood: ChatDeepAvatarMood }) {
  return (
    <div className="aui-deep-avatar-dock">
      <ChatDeepAvatar mood={mood} size="bubble" label={`DeepSeek · ${mood}`} />
    </div>
  )
}
