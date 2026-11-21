/**
 * Fullscreen DS Boy / Girl intro on `#/chat` enter.
 * Once per character until seen (localStorage); tap or video end dismisses.
 * Character from Companion pick (`readChatDeepAvatarCharacter`).
 */
import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react'
import { createPortal } from 'react-dom'
import {
  chatDeepAvatarIntroPosterSrc,
  chatDeepAvatarIntroSrc,
  markChatDeepAvatarIntroSeen,
  shouldPlayChatDeepAvatarIntro,
  type ChatDeepAvatarCharacterId,
} from '../../../lib/chatDeepAvatarCharacter'
import { useReducedMotion } from '../../../lib/useReducedMotion'
import { useChatDeepAvatarCharacter } from './ChatDeepAvatar'

const EXIT_MS = 480
const REDUCED_HOLD_MS = 320
const BUFFER_FAIL_MS = 8_000

type Phase = 'enter' | 'play' | 'exit'

export function ChatDeepAvatarIntroOverlay() {
  const [character] = useChatDeepAvatarCharacter()
  const reducedMotion = useReducedMotion()
  const [session, setSession] = useState<{
    character: ChatDeepAvatarCharacterId
    src: string
    poster: string | null
  } | null>(null)
  const [phase, setPhase] = useState<Phase>('enter')
  const [muted, setMuted] = useState(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const exitTimer = useRef<number | null>(null)
  const finishing = useRef(false)
  const played = useRef(false)
  const sessionRef = useRef(session)
  sessionRef.current = session

  const clearSession = () => {
    finishing.current = true
    setSession(null)
  }

  const finishSeen = (id: ChatDeepAvatarCharacterId) => {
    if (finishing.current) return
    finishing.current = true
    markChatDeepAvatarIntroSeen(id)
    setSession(null)
  }

  /** Fade out then optionally mark seen (skip / ended). Abort path omits mark. */
  const beginExit = (opts: { markSeen: boolean }) => {
    const cur = sessionRef.current
    if (!cur || finishing.current) return
    setPhase('exit')
    const v = videoRef.current
    if (v) {
      try {
        v.pause()
      } catch {
        /* ignore */
      }
    }
    if (exitTimer.current != null) window.clearTimeout(exitTimer.current)
    const id = cur.character
    exitTimer.current = window.setTimeout(() => {
      if (opts.markSeen) finishSeen(id)
      else clearSession()
    }, EXIT_MS)
  }

  // Arm once per character that still has an unseen shipped intro.
  useEffect(() => {
    if (!shouldPlayChatDeepAvatarIntro(character)) {
      setSession(null)
      return
    }
    const src = chatDeepAvatarIntroSrc(character)
    if (!src) {
      setSession(null)
      return
    }
    finishing.current = false
    played.current = false
    setMuted(false)
    setPhase('enter')
    setSession({
      character,
      src,
      poster: chatDeepAvatarIntroPosterSrc(character),
    })
  }, [character, reducedMotion])

  // Reduced motion: visible black wash → fade out → mark seen (no video).
  useEffect(() => {
    if (!session || !reducedMotion) return
    const id = session.character
    setPhase('enter')
    const hold = window.setTimeout(() => setPhase('exit'), REDUCED_HOLD_MS)
    const done = window.setTimeout(() => finishSeen(id), REDUCED_HOLD_MS + EXIT_MS)
    return () => {
      window.clearTimeout(hold)
      window.clearTimeout(done)
    }
  }, [session, reducedMotion])

  // Normal path: fade in + play once the element can buffer.
  useEffect(() => {
    if (!session || reducedMotion) return
    const v = videoRef.current
    if (!v) return

    let cancelled = false

    const start = async () => {
      if (cancelled || finishing.current) return
      setPhase('play')
      v.muted = false
      try {
        await v.play()
        if (cancelled) return
        played.current = true
        setMuted(false)
      } catch {
        if (cancelled) return
        v.muted = true
        setMuted(true)
        try {
          await v.play()
          if (!cancelled) played.current = true
        } catch {
          // Autoplay blocked entirely — dismiss without burning the "seen" latch.
          beginExit({ markSeen: false })
        }
      }
    }

    const onReady = () => {
      v.removeEventListener('canplay', onReady)
      void start()
    }

    if (v.readyState >= 2) {
      void start()
    } else {
      v.addEventListener('canplay', onReady)
    }

    // Slow buffer: drop overlay without marking seen so the next visit retries.
    const failSafe = window.setTimeout(() => {
      if (cancelled || finishing.current || played.current) return
      beginExit({ markSeen: false })
    }, BUFFER_FAIL_MS)

    return () => {
      cancelled = true
      v.removeEventListener('canplay', onReady)
      window.clearTimeout(failSafe)
    }
  }, [session, reducedMotion])

  useEffect(() => {
    return () => {
      if (exitTimer.current != null) window.clearTimeout(exitTimer.current)
    }
  }, [])

  useEffect(() => {
    if (!session || reducedMotion) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        beginExit({ markSeen: true })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [session, reducedMotion])

  if (!session || typeof document === 'undefined') return null

  if (reducedMotion) {
    return createPortal(
      <div
        className={`aui-deep-avatar-intro is-${phase} is-reduced`}
        role="presentation"
        aria-hidden
      />,
      document.body,
    )
  }

  const unmute = (e: ReactMouseEvent) => {
    e.stopPropagation()
    const v = videoRef.current
    if (!v) return
    v.muted = false
    setMuted(false)
    void v.play().catch(() => {
      setMuted(true)
      v.muted = true
    })
  }

  return createPortal(
    <div
      className={`aui-deep-avatar-intro is-${phase}`}
      role="dialog"
      aria-modal="true"
      aria-label="Companion intro — tap to skip"
      onClick={() => beginExit({ markSeen: true })}
    >
      <div className="aui-deep-avatar-intro-stage" aria-hidden>
        <video
          ref={videoRef}
          className="aui-deep-avatar-intro-video"
          src={session.src}
          poster={session.poster ?? undefined}
          playsInline
          preload="auto"
          onEnded={() => beginExit({ markSeen: true })}
          onError={() => beginExit({ markSeen: false })}
        />
      </div>
      {muted ? (
        <button
          type="button"
          className="aui-deep-avatar-intro-unmute"
          aria-label="Unmute intro"
          onClick={unmute}
        >
          Tap for sound
        </button>
      ) : null}
      <p className="aui-deep-avatar-intro-hint">Tap to skip</p>
    </div>,
    document.body,
  )
}
