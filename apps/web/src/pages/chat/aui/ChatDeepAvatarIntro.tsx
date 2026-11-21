/**
 * Fullscreen DS Boy / Girl intro on every `#/chat` enter (AUI shell mount).
 * Tap / Esc / video end dismisses for this visit only — no persistent “seen” latch.
 * Character from Companion pick (`readChatDeepAvatarCharacter`).
 *
 * Audio follows Companion Sound (default ON). Fresh users / missing pref play with
 * sound; only an explicit Sound-off toggle stays silent. If the browser blocks
 * unmuted autoplay while Sound is on, we mute briefly then unlock on the next
 * user gesture (overlay tap or document pointer/key) — not “always muted video”.
 */
import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react'
import { createPortal } from 'react-dom'
import {
  chatDeepAvatarIntroPosterSrc,
  chatDeepAvatarIntroSrc,
  shouldPlayChatDeepAvatarIntro,
  type ChatDeepAvatarCharacterId,
} from '../../../lib/chatDeepAvatarCharacter'
import { useReducedMotion } from '../../../lib/useReducedMotion'
import { useChatDeepAvatarCharacter, useChatDeepAvatarSoundEnabled } from './ChatDeepAvatar'

const EXIT_MS = 480
const REDUCED_HOLD_MS = 320
const BUFFER_FAIL_MS = 8_000

type Phase = 'enter' | 'play' | 'exit'

export function ChatDeepAvatarIntroOverlay() {
  const [character] = useChatDeepAvatarCharacter()
  const [soundEnabled] = useChatDeepAvatarSoundEnabled()
  const reducedMotion = useReducedMotion()
  const [session, setSession] = useState<{
    character: ChatDeepAvatarCharacterId
    src: string
    poster: string | null
  } | null>(null)
  const [phase, setPhase] = useState<Phase>('enter')
  /** True only when Sound is on but autoplay forced a mute — show unlock UI. */
  const [needsGestureUnmute, setNeedsGestureUnmute] = useState(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const exitTimer = useRef<number | null>(null)
  const finishing = useRef(false)
  const played = useRef(false)
  const soundEnabledRef = useRef(soundEnabled)
  soundEnabledRef.current = soundEnabled
  const needsGestureUnmuteRef = useRef(needsGestureUnmute)
  needsGestureUnmuteRef.current = needsGestureUnmute
  const sessionRef = useRef(session)
  sessionRef.current = session

  const clearSession = () => {
    finishing.current = true
    setSession(null)
  }

  /** Fade out then dismiss for this visit (skip / ended / fail). */
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
    exitTimer.current = window.setTimeout(() => clearSession(), EXIT_MS)
  }

  const applyWantedMute = (v: HTMLVideoElement, wantSound: boolean) => {
    v.muted = !wantSound
    if (!wantSound) {
      needsGestureUnmuteRef.current = false
      setNeedsGestureUnmute(false)
    }
  }

  const tryUnmuteWithGesture = () => {
    const v = videoRef.current
    if (!v || !soundEnabledRef.current) return false
    v.muted = false
    needsGestureUnmuteRef.current = false
    setNeedsGestureUnmute(false)
    void v.play().catch(() => {
      // Gesture still blocked (rare) — stay muted and keep unlock affordance.
      v.muted = true
      needsGestureUnmuteRef.current = true
      setNeedsGestureUnmute(true)
    })
    return true
  }

  // Arm whenever `#/chat` mounts (or companion pick changes) if an intro clip ships.
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
    needsGestureUnmuteRef.current = false
    setNeedsGestureUnmute(false)
    setPhase('enter')
    setSession({
      character,
      src,
      poster: chatDeepAvatarIntroPosterSrc(character),
    })
  }, [character, reducedMotion])

  // Reduced motion: brief black wash → fade out (no video).
  useEffect(() => {
    if (!session || !reducedMotion) return
    setPhase('enter')
    const hold = window.setTimeout(() => setPhase('exit'), REDUCED_HOLD_MS)
    const done = window.setTimeout(() => clearSession(), REDUCED_HOLD_MS + EXIT_MS)
    return () => {
      window.clearTimeout(hold)
      window.clearTimeout(done)
    }
  }, [session, reducedMotion])

  // Normal path: fade in + play once the element can buffer.
  // Sound-on (default) tries unmuted first; Sound-off stays silent by product pref.
  useEffect(() => {
    if (!session || reducedMotion) return
    const v = videoRef.current
    if (!v) return

    let cancelled = false

    const start = async () => {
      if (cancelled || finishing.current) return
      setPhase('play')
      const wantSound = soundEnabledRef.current
      applyWantedMute(v, wantSound)
      if (!wantSound) {
        try {
          await v.play()
          if (!cancelled) played.current = true
        } catch {
          beginExit()
        }
        return
      }

      try {
        await v.play()
        if (cancelled) return
        played.current = true
        needsGestureUnmuteRef.current = false
        setNeedsGestureUnmute(false)
      } catch {
        if (cancelled) return
        // Autoplay with sound blocked — keep picture, unlock on next gesture.
        v.muted = true
        needsGestureUnmuteRef.current = true
        setNeedsGestureUnmute(true)
        try {
          await v.play()
          if (!cancelled) played.current = true
        } catch {
          // Autoplay blocked entirely — dismiss; next #/chat visit retries.
          beginExit()
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

    // Slow buffer: drop overlay so chat is usable; next visit retries.
    const failSafe = window.setTimeout(() => {
      if (cancelled || finishing.current || played.current) return
      beginExit()
    }, BUFFER_FAIL_MS)

    return () => {
      cancelled = true
      v.removeEventListener('canplay', onReady)
      window.clearTimeout(failSafe)
    }
  }, [session, reducedMotion])

  // Live Sound toggle while intro is up: off → silent; on → try unmuted (+ gesture unlock).
  useEffect(() => {
    if (!session || reducedMotion) return
    const v = videoRef.current
    if (!v) return
    if (!soundEnabled) {
      v.muted = true
      needsGestureUnmuteRef.current = false
      setNeedsGestureUnmute(false)
      return
    }
    if (v.muted) {
      v.muted = false
      void v.play()
        .then(() => {
          needsGestureUnmuteRef.current = false
          setNeedsGestureUnmute(false)
        })
        .catch(() => {
          v.muted = true
          needsGestureUnmuteRef.current = true
          setNeedsGestureUnmute(true)
        })
    }
  }, [session, reducedMotion, soundEnabled])

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
        // Esc always skips; Enter/Space unmute first when Sound-on was policy-muted.
        // (No window pointerdown unlock — that races React flush into the same-tap skip.)
        if (
          (e.key === 'Enter' || e.key === ' ') &&
          needsGestureUnmuteRef.current &&
          soundEnabledRef.current
        ) {
          tryUnmuteWithGesture()
          return
        }
        beginExit()
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
    tryUnmuteWithGesture()
  }

  const onOverlayClick = () => {
    // First tap with Sound on + policy mute → unlock audio (keep watching).
    // Second tap (or Sound off / already unmuted) → skip.
    if (needsGestureUnmuteRef.current && soundEnabledRef.current) {
      tryUnmuteWithGesture()
      return
    }
    beginExit()
  }

  return createPortal(
    <div
      className={`aui-deep-avatar-intro is-${phase}`}
      role="dialog"
      aria-modal="true"
      aria-label="Companion intro — tap to skip"
      onClick={onOverlayClick}
    >
      <div className="aui-deep-avatar-intro-stage" aria-hidden>
        <video
          ref={videoRef}
          className="aui-deep-avatar-intro-video"
          src={session.src}
          poster={session.poster ?? undefined}
          playsInline
          preload="auto"
          // Controlled mute: Sound-off pref, or temporary autoplay lock until gesture.
          muted={!soundEnabled || needsGestureUnmute}
          onEnded={() => beginExit()}
          onError={() => beginExit()}
        />
      </div>
      {needsGestureUnmute && soundEnabled ? (
        <button
          type="button"
          className="aui-deep-avatar-intro-unmute"
          aria-label="Unmute intro"
          onClick={unmute}
        >
          Tap for sound
        </button>
      ) : null}
      <p className="aui-deep-avatar-intro-hint">
        {needsGestureUnmute && soundEnabled ? 'Tap for sound · tap again to skip' : 'Tap to skip'}
      </p>
    </div>,
    document.body,
  )
}
