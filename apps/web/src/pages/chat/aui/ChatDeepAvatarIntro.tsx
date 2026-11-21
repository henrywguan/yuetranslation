/**
 * Fullscreen DS Boy / Girl intro on every `#/chat` enter (AUI shell mount).
 * Tap / Esc / video end dismisses for this visit only — no persistent “seen” latch.
 * Character from Companion pick (`readChatDeepAvatarCharacter`).
 *
 * Audio follows Companion Sound (default ON). Fresh users / missing pref play with
 * sound; only an explicit Sound-off toggle stays silent. Prefer unmuted playback
 * from the start (chat-open gesture primes via `primeChatDeepAvatarIntro`). Tap the
 * Mute control to silence — never an unmute-first chip as the primary path.
 *
 * Layout: JS pixel cover (`layoutIntroCoverElement`) so the stage is always filled
 * on every viewport (incl. 1920×1080) — no letterbox / half-screen gaps.
 */
import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react'
import { createPortal } from 'react-dom'
import {
  clearPrimedChatDeepAvatarIntro,
  takePrimedChatDeepAvatarIntro,
} from '../../../lib/chatDeepAvatarIntroAudio'
import { layoutIntroCoverElement } from '../../../lib/chatDeepAvatarIntroLayout'
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
  /** User tapped Mute on this visit (Sound pref still on). */
  const [sessionMuted, setSessionMuted] = useState(false)
  /** Browser blocked unmuted autoplay — unlock on next gesture (no unmute chip). */
  const [policyMuted, setPolicyMuted] = useState(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const stageRef = useRef<HTMLDivElement | null>(null)
  const exitTimer = useRef<number | null>(null)
  const finishing = useRef(false)
  const played = useRef(false)
  const soundEnabledRef = useRef(soundEnabled)
  soundEnabledRef.current = soundEnabled
  const sessionMutedRef = useRef(sessionMuted)
  sessionMutedRef.current = sessionMuted
  const policyMutedRef = useRef(policyMuted)
  policyMutedRef.current = policyMuted
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

  const wantAudible = () => soundEnabledRef.current && !sessionMutedRef.current

  const setPolicyLock = (on: boolean) => {
    policyMutedRef.current = on
    setPolicyMuted(on)
  }

  const tryUnlockUnmuted = () => {
    const v = videoRef.current
    if (!v || !wantAudible()) return false
    setPolicyLock(false)
    v.muted = false
    void v.play().catch(() => {
      setPolicyLock(true)
      v.muted = true
    })
    return true
  }

  // Arm whenever `#/chat` mounts (or companion pick changes) if an intro clip ships.
  useEffect(() => {
    if (!shouldPlayChatDeepAvatarIntro(character)) {
      clearPrimedChatDeepAvatarIntro()
      setSession(null)
      return
    }
    const src = chatDeepAvatarIntroSrc(character)
    if (!src) {
      clearPrimedChatDeepAvatarIntro()
      setSession(null)
      return
    }
    finishing.current = false
    played.current = false
    policyMutedRef.current = false
    setPolicyMuted(false)
    setSessionMuted(false)
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
    clearPrimedChatDeepAvatarIntro()
    setPhase('enter')
    const hold = window.setTimeout(() => setPhase('exit'), REDUCED_HOLD_MS)
    const done = window.setTimeout(() => clearSession(), REDUCED_HOLD_MS + EXIT_MS)
    return () => {
      window.clearTimeout(hold)
      window.clearTimeout(done)
    }
  }, [session, reducedMotion])

  // Mount video imperatively so a gesture-primed element can be adopted without
  // React reconciling away the in-gesture play() unlock.
  useLayoutEffect(() => {
    if (!session || reducedMotion) return
    const stage = stageRef.current
    if (!stage) return

    let cancelled = false
    let v: HTMLVideoElement
    const primed = takePrimedChatDeepAvatarIntro(session.character)
    const fromPrime = Boolean(primed)

    if (primed) {
      v = primed.video
      v.className = 'aui-deep-avatar-intro-video'
      v.setAttribute('playsinline', '')
      v.setAttribute('webkit-playsinline', '')
      if (session.poster) v.poster = session.poster
      if (wantAudible() && primed.unmuted) {
        v.muted = false
        setPolicyLock(false)
      } else if (wantAudible()) {
        v.muted = true
        setPolicyLock(true)
      } else {
        v.muted = true
        setPolicyLock(false)
      }
      played.current = !v.paused
    } else {
      v = document.createElement('video')
      v.className = 'aui-deep-avatar-intro-video'
      v.playsInline = true
      v.setAttribute('playsinline', '')
      v.setAttribute('webkit-playsinline', '')
      v.preload = 'auto'
      v.src = session.src
      if (session.poster) v.poster = session.poster
      v.muted = !wantAudible()
      setPolicyLock(false)
    }

    const onEnded = () => beginExit()
    const onError = () => beginExit()
    v.addEventListener('ended', onEnded)
    v.addEventListener('error', onError)

    stage.replaceChildren(v)
    videoRef.current = v
    layoutIntroCoverElement(v, stage)

    const start = async () => {
      if (cancelled || finishing.current) return
      layoutIntroCoverElement(v, stage)
      setPhase('play')
      const audible = wantAudible()
      if (!audible) {
        setPolicyLock(false)
        v.muted = true
        try {
          await v.play()
          if (!cancelled) played.current = true
        } catch {
          beginExit()
        }
        return
      }

      if (fromPrime && !v.paused && !v.muted) {
        played.current = true
        setPolicyLock(false)
        return
      }

      setPolicyLock(false)
      v.muted = false
      try {
        await v.play()
        if (cancelled) return
        played.current = true
        setPolicyLock(false)
      } catch {
        if (cancelled) return
        // Autoplay with sound blocked — keep picture; unlock on next gesture (no chip).
        setPolicyLock(true)
        v.muted = true
        try {
          await v.play()
          if (!cancelled) played.current = true
        } catch {
          beginExit()
        }
      }
    }

    const onMeta = () => {
      if (!cancelled) layoutIntroCoverElement(v, stage)
    }
    v.addEventListener('loadedmetadata', onMeta)
    if (v.readyState >= 1) onMeta()

    void start()

    const onReady = () => {
      v.removeEventListener('canplay', onReady)
      if (!played.current && !cancelled) void start()
    }
    if (!played.current && v.readyState < 2) {
      v.addEventListener('canplay', onReady)
    }

    const failSafe = window.setTimeout(() => {
      if (cancelled || finishing.current || played.current) return
      beginExit()
    }, BUFFER_FAIL_MS)

    const onResize = () => {
      if (!cancelled) layoutIntroCoverElement(v, stage)
    }
    window.addEventListener('resize', onResize)
    window.visualViewport?.addEventListener('resize', onResize)
    const ro =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => onResize()) : null
    ro?.observe(stage)

    return () => {
      cancelled = true
      v.removeEventListener('ended', onEnded)
      v.removeEventListener('error', onError)
      v.removeEventListener('canplay', onReady)
      v.removeEventListener('loadedmetadata', onMeta)
      window.clearTimeout(failSafe)
      window.removeEventListener('resize', onResize)
      window.visualViewport?.removeEventListener('resize', onResize)
      ro?.disconnect()
      try {
        v.pause()
      } catch {
        /* ignore */
      }
      if (videoRef.current === v) videoRef.current = null
      if (stage.contains(v)) stage.removeChild(v)
    }
  }, [session, reducedMotion])

  // Keep imperative muted flag in sync with Sound pref / Mute / policy lock.
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    v.muted = !soundEnabled || sessionMuted || policyMuted
  }, [soundEnabled, sessionMuted, policyMuted, session])

  // Live Sound toggle / session mute while intro is up.
  useEffect(() => {
    if (!session || reducedMotion) return
    const v = videoRef.current
    if (!v) return
    if (!soundEnabled || sessionMuted) {
      setPolicyLock(false)
      v.muted = true
      return
    }
    if (v.muted || policyMutedRef.current) {
      setPolicyLock(false)
      v.muted = false
      void v
        .play()
        .then(() => {
          setPolicyLock(false)
        })
        .catch(() => {
          setPolicyLock(true)
          v.muted = true
        })
    }
  }, [session, reducedMotion, soundEnabled, sessionMuted])

  // Opportunistic unlock: any gesture unmutes without a dedicated “turn sound on” control.
  useEffect(() => {
    if (!session || reducedMotion) return
    const onGesture = () => {
      if (!policyMutedRef.current || !wantAudible()) return
      tryUnlockUnmuted()
    }
    window.addEventListener('pointerdown', onGesture, true)
    window.addEventListener('keydown', onGesture, true)
    return () => {
      window.removeEventListener('pointerdown', onGesture, true)
      window.removeEventListener('keydown', onGesture, true)
    }
  }, [session, reducedMotion])

  useEffect(() => {
    return () => {
      if (exitTimer.current != null) window.clearTimeout(exitTimer.current)
      clearPrimedChatDeepAvatarIntro()
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
      <div
        className={`aui-deep-avatar-intro is-${phase} is-reduced`}
        role="presentation"
        aria-hidden
      />,
      document.body,
    )
  }

  const toggleMute = (e: ReactMouseEvent) => {
    e.stopPropagation()
    if (!soundEnabled) return
    const next = !sessionMutedRef.current
    sessionMutedRef.current = next
    setSessionMuted(next)
    const v = videoRef.current
    if (!v) return
    if (next) {
      setPolicyLock(false)
      v.muted = true
    } else {
      setPolicyLock(false)
      v.muted = false
      void v.play().catch(() => {
        setPolicyLock(true)
        v.muted = true
      })
    }
  }

  const showMuteControl = soundEnabled
  // Primary path is Mute; Unmute only after the user chose Mute (not policy lock).
  const muteLabel = sessionMuted ? 'Unmute' : 'Mute'

  return createPortal(
    <div
      className={`aui-deep-avatar-intro is-${phase}`}
      role="dialog"
      aria-modal="true"
      aria-label="Companion intro — tap to skip"
      onClick={() => beginExit()}
    >
      {/* Video is mounted imperatively (gesture prime adopt + JS cover layout). */}
      <div ref={stageRef} className="aui-deep-avatar-intro-stage" aria-hidden />
      {showMuteControl ? (
        <button
          type="button"
          className="aui-deep-avatar-intro-mute"
          aria-label={muteLabel}
          aria-pressed={sessionMuted}
          onClick={toggleMute}
        >
          {muteLabel}
        </button>
      ) : null}
      <p className="aui-deep-avatar-intro-hint">Tap to skip</p>
    </div>,
    document.body,
  )
}
