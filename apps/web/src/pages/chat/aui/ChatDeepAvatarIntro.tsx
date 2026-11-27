/**
 * Fullscreen DS Boy / Girl intro on every `#/chat` enter (AUI shell mount).
 * Tap / Esc / video end dismisses for this visit only — no persistent “seen” latch.
 * Character from Companion pick (`readChatDeepAvatarCharacter`).
 *
 * Plays **once per chat shell visit** (module visit latch + live-video handoff)
 * so React Strict Mode / effect re-runs cannot restart the clip. Rate: 3×.
 *
 * Audio follows Companion Sound (default ON). Prefer unmuted playback from the
 * start (`primeChatDeepAvatarIntro` inside `openDeepseekChat`). When the browser
 * blocks unmuted autoplay (direct `#/chat` / hard refresh), play muted motion
 * immediately — never hold a static frame / poster that looks like a broken
 * load. First tap Unmutes from the beginning (does not dismiss); second tap
 * skips. Mute control reflects actual silence (Unmute while policy-silent).
 *
 * Layout: JS pixel contain (`layoutIntroContainElement`) so the portrait clip
 * FITs every viewport — letterbox on landscape, never cover-crop head/legs.
 */
import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react'
import { createPortal } from 'react-dom'
import {
  adoptLiveChatDeepAvatarIntroVideo,
  applyChatDeepAvatarIntroPlaybackRate,
  clearChatDeepAvatarIntroArmed,
  clearLiveChatDeepAvatarIntroVideo,
  clearPrimedChatDeepAvatarIntro,
  getChatDeepAvatarIntroVisitId,
  markChatDeepAvatarIntroArmed,
  peekLiveChatDeepAvatarIntroVideo,
  setLiveChatDeepAvatarIntroVideo,
  takePrimedChatDeepAvatarIntro,
  wasChatDeepAvatarIntroArmed,
} from '../../../lib/chatDeepAvatarIntroAudio'
import { layoutIntroContainElement } from '../../../lib/chatDeepAvatarIntroLayout'
import {
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
  } | null>(null)
  const [phase, setPhase] = useState<Phase>('enter')
  /** User tapped Mute on this visit (Sound pref still on). */
  const [sessionMuted, setSessionMuted] = useState(false)
  /** Browser blocked unmuted autoplay — playing muted until unlock. */
  const [policyMuted, setPolicyMuted] = useState(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const stageRef = useRef<HTMLDivElement | null>(null)
  const exitTimer = useRef<number | null>(null)
  const finishing = useRef(false)
  const played = useRef(false)
  /** Sync gate so canplay cannot re-enter start() before play() resolves. */
  const startInFlight = useRef(false)
  /** Swallow the click that unlocked policy-muted audio so we don't dismiss. */
  const unlockConsumedClick = useRef(false)
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
    clearLiveChatDeepAvatarIntroVideo()
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

  /** Policy-blocked: keep motion with muted play (never freeze on frame 0). */
  const playMutedMotion = async (v: HTMLVideoElement) => {
    setPolicyLock(true)
    v.muted = true
    applyChatDeepAvatarIntroPlaybackRate(v)
    try {
      await v.play()
      played.current = true
      setPhase('play')
    } catch {
      beginExit()
    }
  }

  const tryUnlockUnmuted = () => {
    const v = videoRef.current
    if (!v || !wantAudible()) return false
    setPolicyLock(false)
    v.muted = false
    v.volume = 1
    applyChatDeepAvatarIntroPlaybackRate(v)
    try {
      // Restart so the full clip plays with sound (never mid-silent).
      if (v.currentTime > 0.05) v.currentTime = 0
    } catch {
      /* ignore */
    }
    void v
      .play()
      .then(() => {
        played.current = true
        setPolicyLock(false)
      })
      .catch(() => {
        void playMutedMotion(v)
      })
    return true
  }

  // Arm once per `#/chat` shell visit (+ companion pick change). Module latch
  // survives Strict Mode so setSession is not fired twice for the same visit.
  useEffect(() => {
    if (!shouldPlayChatDeepAvatarIntro(character)) {
      clearPrimedChatDeepAvatarIntro()
      clearChatDeepAvatarIntroArmed()
      setSession(null)
      return
    }
    const src = chatDeepAvatarIntroSrc(character)
    if (!src) {
      clearPrimedChatDeepAvatarIntro()
      clearChatDeepAvatarIntroArmed()
      setSession(null)
      return
    }
    // Idempotent: same character already armed this visit. Restore overlay only when
    // a live video is still active (Strict remount mid-play) — never after dismiss.
    if (wasChatDeepAvatarIntroArmed(character)) {
      setSession((prev) => {
        if (prev && prev.character === character && prev.src === src) return prev
        const live = peekLiveChatDeepAvatarIntroVideo()
        const visit = getChatDeepAvatarIntroVisitId()
        if (
          live &&
          live.visitId === visit &&
          live.character === character &&
          live.src === src
        ) {
          return { character, src }
        }
        return prev
      })
      return
    }
    markChatDeepAvatarIntroArmed(character)
    finishing.current = false
    played.current = false
    startInFlight.current = false
    unlockConsumedClick.current = false
    policyMutedRef.current = false
    setPolicyMuted(false)
    setSessionMuted(false)
    setPhase('enter')
    setSession({
      character,
      src,
    })
  }, [character, reducedMotion])

  // Reduced motion: brief black wash → fade out (no video).
  useEffect(() => {
    if (!session || !reducedMotion) return
    clearPrimedChatDeepAvatarIntro()
    markChatDeepAvatarIntroArmed(session.character)
    setPhase('enter')
    const hold = window.setTimeout(() => setPhase('exit'), REDUCED_HOLD_MS)
    const done = window.setTimeout(() => clearSession(), REDUCED_HOLD_MS + EXIT_MS)
    return () => {
      window.clearTimeout(hold)
      window.clearTimeout(done)
    }
  }, [session, reducedMotion])

  // Mount video imperatively so a gesture-primed element can be adopted without
  // React reconciling away the in-gesture play() unlock. Live handoff reuses the
  // same element across Strict Mode teardown so playback does not restart.
  useLayoutEffect(() => {
    if (!session || reducedMotion) return
    const stage = stageRef.current
    if (!stage) return

    let cancelled = false
    let v: HTMLVideoElement
    let resumeOnly = false
    const live = adoptLiveChatDeepAvatarIntroVideo(session.character, session.src)
    const primed = live ? null : takePrimedChatDeepAvatarIntro(session.character)
    const fromPrime = Boolean(primed)

    if (live) {
      v = live.video
      v.className = 'aui-deep-avatar-intro-video'
      v.setAttribute('playsinline', '')
      v.setAttribute('webkit-playsinline', '')
      v.removeAttribute('poster')
      applyChatDeepAvatarIntroPlaybackRate(v)
      resumeOnly = !v.paused || v.currentTime > 0.05 || played.current
      if (resumeOnly) {
        played.current = true
        if (v.muted && wantAudible()) setPolicyLock(true)
        else setPolicyLock(false)
      }
    } else if (primed) {
      v = primed.video
      v.className = 'aui-deep-avatar-intro-video'
      v.setAttribute('playsinline', '')
      v.setAttribute('webkit-playsinline', '')
      v.removeAttribute('poster')
      applyChatDeepAvatarIntroPlaybackRate(v)
      if (wantAudible() && primed.unmuted) {
        v.muted = false
        setPolicyLock(false)
      } else if (wantAudible()) {
        // Prime kept muted motion — adopt and wait for Unmute gesture.
        v.muted = true
        setPolicyLock(true)
      } else {
        v.muted = true
        setPolicyLock(false)
      }
      played.current = !v.paused
      setLiveChatDeepAvatarIntroVideo({
        visitId: getChatDeepAvatarIntroVisitId(),
        character: session.character,
        src: session.src,
        video: v,
      })
    } else {
      v = document.createElement('video')
      v.className = 'aui-deep-avatar-intro-video'
      v.playsInline = true
      v.setAttribute('playsinline', '')
      v.setAttribute('webkit-playsinline', '')
      v.preload = 'auto'
      v.src = session.src
      // No poster — avoid a static still that looks like a broken / tap-to-start load.
      v.removeAttribute('poster')
      applyChatDeepAvatarIntroPlaybackRate(v)
      v.muted = !wantAudible()
      setPolicyLock(false)
      setLiveChatDeepAvatarIntroVideo({
        visitId: getChatDeepAvatarIntroVisitId(),
        character: session.character,
        src: session.src,
        video: v,
      })
    }

    const onEnded = () => beginExit()
    const onError = () => beginExit()
    v.addEventListener('ended', onEnded)
    v.addEventListener('error', onError)

    stage.replaceChildren(v)
    videoRef.current = v
    layoutIntroContainElement(v, stage)

    const start = async () => {
      if (cancelled || finishing.current) return
      if (played.current || startInFlight.current) {
        setPhase('play')
        return
      }
      startInFlight.current = true
      layoutIntroContainElement(v, stage)
      setPhase('play')
      applyChatDeepAvatarIntroPlaybackRate(v)
      const audible = wantAudible()
      if (!audible) {
        setPolicyLock(false)
        v.muted = true
        try {
          await v.play()
          if (!cancelled) played.current = true
        } catch {
          beginExit()
        } finally {
          startInFlight.current = false
        }
        return
      }

      if (fromPrime && !v.paused && !v.muted) {
        played.current = true
        startInFlight.current = false
        setPolicyLock(false)
        return
      }

      // Adopted muted-but-playing prime: keep motion; Unmute on next gesture.
      if (fromPrime && !v.paused && v.muted) {
        played.current = true
        startInFlight.current = false
        setPolicyLock(true)
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
        // Autoplay with sound blocked — play muted motion (never hold frame 0).
        await playMutedMotion(v)
      } finally {
        startInFlight.current = false
      }
    }

    const onMeta = () => {
      if (!cancelled) layoutIntroContainElement(v, stage)
    }
    v.addEventListener('loadedmetadata', onMeta)
    if (v.readyState >= 1) onMeta()

    if (resumeOnly) {
      setPhase('play')
      if (v.paused && !finishing.current) {
        void v.play().catch(() => {
          /* keep timeline; failSafe may exit */
        })
      }
    } else {
      void start()
    }

    const onReady = () => {
      v.removeEventListener('canplay', onReady)
      if (!played.current && !cancelled && !startInFlight.current) void start()
    }
    if (!resumeOnly && !played.current && v.readyState < 2) {
      v.addEventListener('canplay', onReady)
    }

    const failSafe = window.setTimeout(() => {
      if (cancelled || finishing.current || played.current) return
      beginExit()
    }, BUFFER_FAIL_MS)

    const onResize = () => {
      if (!cancelled) layoutIntroContainElement(v, stage)
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
      // Detach from stage but do NOT pause/dispose — live handoff reattaches on
      // Strict Mode remount. Real dismiss clears via clearLiveChatDeepAvatarIntroVideo.
      if (videoRef.current === v) videoRef.current = null
      if (stage.contains(v)) stage.removeChild(v)
    }
  }, [session, reducedMotion])

  // Keep imperative muted flag in sync with Sound pref / user Mute / policy silence.
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    if (!soundEnabled || sessionMuted || policyMuted) {
      v.muted = true
      return
    }
    v.muted = false
  }, [soundEnabled, sessionMuted, policyMuted, session])

  // Live Sound toggle / session mute while intro is up.
  useEffect(() => {
    if (!session || reducedMotion) return
    const v = videoRef.current
    if (!v) return
    applyChatDeepAvatarIntroPlaybackRate(v)
    if (!soundEnabled || sessionMuted) {
      setPolicyLock(false)
      v.muted = true
      if (v.paused) void v.play().catch(() => {})
      return
    }
    if (policyMutedRef.current) {
      // Pref on but policy-locked — keep muted motion until gesture Unmute.
      v.muted = true
      if (v.paused) void v.play().catch(() => {})
      return
    }
    if (v.muted) {
      v.muted = false
      void v
        .play()
        .then(() => {
          setPolicyLock(false)
        })
        .catch(() => {
          void playMutedMotion(v)
        })
    }
  }, [session, reducedMotion, soundEnabled, sessionMuted])

  // Opportunistic unlock: first gesture unmutes without dismissing the intro.
  useEffect(() => {
    if (!session || reducedMotion) return
    const onGesture = () => {
      if (!policyMutedRef.current || !wantAudible()) return
      unlockConsumedClick.current = true
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
      if (e.key === 'Escape') {
        e.preventDefault()
        beginExit()
        return
      }
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        if (policyMutedRef.current && wantAudible()) {
          unlockConsumedClick.current = true
          tryUnlockUnmuted()
          return
        }
        if (unlockConsumedClick.current) {
          unlockConsumedClick.current = false
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

  const toggleMute = (e: ReactMouseEvent) => {
    e.stopPropagation()
    if (!soundEnabled) return
    // Policy-locked silence: this control is the unlock affordance (shows Unmute).
    if (policyMutedRef.current && !sessionMutedRef.current) {
      unlockConsumedClick.current = true
      tryUnlockUnmuted()
      return
    }
    const next = !sessionMutedRef.current
    sessionMutedRef.current = next
    setSessionMuted(next)
    const v = videoRef.current
    if (!v) return
    applyChatDeepAvatarIntroPlaybackRate(v)
    if (next) {
      setPolicyLock(false)
      v.muted = true
    } else {
      setPolicyLock(false)
      v.muted = false
      void v.play().catch(() => {
        void playMutedMotion(v)
      })
    }
  }

  const showMuteControl = soundEnabled
  // Honest label: Unmute while policy-locked or after user Mute — never Mute-while-silent.
  const muteLabel = sessionMuted || policyMuted ? 'Unmute' : 'Mute'

  const onOverlayClick = () => {
    if (unlockConsumedClick.current) {
      unlockConsumedClick.current = false
      return
    }
    if (policyMutedRef.current && wantAudible()) {
      unlockConsumedClick.current = true
      tryUnlockUnmuted()
      return
    }
    beginExit()
  }

  return createPortal(
    <div
      className={`aui-deep-avatar-intro is-${phase}`}
      role="dialog"
      aria-modal="true"
      aria-label={
        policyMuted
          ? 'Companion intro — tap for sound, tap again to skip'
          : 'Companion intro — tap to skip'
      }
      onClick={onOverlayClick}
    >
      {/* Video is mounted imperatively (gesture prime adopt + JS contain layout). */}
      <div ref={stageRef} className="aui-deep-avatar-intro-stage" aria-hidden />
      {showMuteControl ? (
        <button
          type="button"
          className="aui-deep-avatar-intro-mute"
          aria-label={muteLabel}
          aria-pressed={sessionMuted || policyMuted}
          onClick={toggleMute}
        >
          {muteLabel}
        </button>
      ) : null}
      <p className="aui-deep-avatar-intro-hint">
        {policyMuted ? 'Tap for sound · again to skip' : 'Tap to skip'}
      </p>
    </div>,
    document.body,
  )
}
