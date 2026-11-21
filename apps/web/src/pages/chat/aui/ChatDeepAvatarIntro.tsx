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
  const sessionRef = useRef(session)
  sessionRef.current = session

  const finish = (id: ChatDeepAvatarCharacterId) => {
    if (finishing.current) return
    finishing.current = true
    markChatDeepAvatarIntroSeen(id)
    setSession(null)
  }

  const beginExit = () => {
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
    exitTimer.current = window.setTimeout(() => finish(id), EXIT_MS)
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
    setMuted(false)
    setPhase(reducedMotion ? 'exit' : 'enter')
    setSession({
      character,
      src,
      poster: chatDeepAvatarIntroPosterSrc(character),
    })
  }, [character, reducedMotion])

  // Reduced motion: brief black wash only — no video.
  useEffect(() => {
    if (!session || !reducedMotion) return
    const id = session.character
    markChatDeepAvatarIntroSeen(id)
    const t = window.setTimeout(() => {
      finishing.current = true
      setSession(null)
    }, REDUCED_HOLD_MS)
    return () => window.clearTimeout(t)
  }, [session, reducedMotion])

  // Normal path: fade in + play once the element mounts.
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
        if (!cancelled) setMuted(false)
      } catch {
        if (cancelled) return
        v.muted = true
        setMuted(true)
        try {
          await v.play()
        } catch {
          beginExit()
        }
      }
    }

    if (v.readyState >= 2) {
      void start()
    } else {
      const onReady = () => {
        v.removeEventListener('canplay', onReady)
        void start()
      }
      v.addEventListener('canplay', onReady)
      // If canplay never fires (bad file), bail after a beat.
      const failSafe = window.setTimeout(() => {
        if (!cancelled && v.paused) beginExit()
      }, 8_000)
      return () => {
        cancelled = true
        v.removeEventListener('canplay', onReady)
        window.clearTimeout(failSafe)
      }
    }

    return () => {
      cancelled = true
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
        beginExit()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [session, reducedMotion])

  if (!session || typeof document === 'undefined') return null

  if (reducedMotion) {
    return createPortal(
      <div className="aui-deep-avatar-intro is-exit is-reduced" role="presentation" aria-hidden />,
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
      onClick={beginExit}
    >
      <div className="aui-deep-avatar-intro-stage" aria-hidden>
        <video
          ref={videoRef}
          className="aui-deep-avatar-intro-video"
          src={session.src}
          poster={session.poster ?? undefined}
          playsInline
          preload="auto"
          onEnded={beginExit}
          onError={beginExit}
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
