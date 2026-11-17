/**
 * DeepSeek Chat composer mic — tap/hold dictation into the draft.
 * Prefers Web Speech; falls back to DeepSeek ASR (MediaRecorder) when unavailable.
 * Does not use Solo live translate / startHold.
 */
import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { mediaBlobToWav, transcribeDeepseekChatAudio } from '../lib/chatDeepseekVoice'
import { chatDictateLang, mergeDictateText } from '../lib/chatVoice'
import { isAppleTouchDevice } from '../lib/mediaAccess'
import { useYueStore } from '../lib/store'
import { stopSpeaking, unlockTtsPlayback } from '../lib/tts'
import { createWebSpeechSession } from '../lib/webSpeech'
import type { LiveSession } from '../lib/types'

const HOLD_THRESHOLD_MS = 520
/** Sticky tap: stop ~2s after last final speech (same feel as Solo). */
const SILENCE_AFTER_SPEECH_MS = 2000

const MIC_ICON = (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
    <path
      d="M12 3.5a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0v-5a3 3 0 0 0-3-3Z"
      fill="currentColor"
    />
    <path
      d="M7 11a5 5 0 0 0 10 0M12 16v3.5M9 19.5h6"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
    />
  </svg>
)

type Props = {
  disabled?: boolean
  draft: string
  onDraft: (next: string) => void
  onError?: (message: string) => void
  /** Stop streaming DeepSeek auto-speak before capture (barge-in). */
  onBargeIn?: () => void
}

export function ChatDictateButton({ disabled, draft, onDraft, onError, onBargeIn }: Props) {
  const status = useYueStore((s) => s.status)
  const [listening, setListening] = useState(false)
  const [asrBusy, setAsrBusy] = useState(false)
  const sessionRef = useRef<LiveSession | null>(null)
  const mediaRef = useRef<{
    stream: MediaStream
    recorder: MediaRecorder
    chunks: BlobPart[]
  } | null>(null)
  const draftBaseRef = useRef('')
  const stickyRef = useRef(false)
  const downAtRef = useRef(0)
  const silenceTimerRef = useRef<number | null>(null)
  const activePointerRef = useRef<number | null>(null)
  const listeningRef = useRef(false)
  const asrModeRef = useRef(false)

  const clearSilence = () => {
    if (silenceTimerRef.current != null) {
      window.clearTimeout(silenceTimerRef.current)
      silenceTimerRef.current = null
    }
  }

  const stopMediaTracks = (stream: MediaStream) => {
    for (const track of stream.getTracks()) {
      try {
        track.stop()
      } catch {
        /* ignore */
      }
    }
  }

  const finishAsrRecording = async () => {
    const media = mediaRef.current
    mediaRef.current = null
    asrModeRef.current = false
    if (!media) return
    const { stream, recorder, chunks } = media
    await new Promise<void>((resolve) => {
      if (recorder.state === 'inactive') {
        resolve()
        return
      }
      recorder.onstop = () => resolve()
      try {
        recorder.stop()
      } catch {
        resolve()
      }
    })
    stopMediaTracks(stream)
    const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' })
    if (blob.size < 256) return
    setAsrBusy(true)
    try {
      // DeepSeek ASR accepts WAV or Ogg Opus — convert WebM → WAV.
      const wav = await mediaBlobToWav(blob)
      const text = await transcribeDeepseekChatAudio(wav, {
        filename: 'speech.wav',
      })
      const next = mergeDictateText(draftBaseRef.current, text)
      draftBaseRef.current = next
      onDraft(next)
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'Dictation failed.')
    } finally {
      setAsrBusy(false)
    }
  }

  const stopSession = async () => {
    clearSilence()
    stickyRef.current = false
    listeningRef.current = false
    setListening(false)
    const session = sessionRef.current
    sessionRef.current = null
    if (session) {
      try {
        await session.stop()
      } catch {
        /* ignore */
      }
    }
    if (asrModeRef.current || mediaRef.current) {
      await finishAsrRecording()
    }
  }

  useEffect(() => {
    return () => {
      void stopSession()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- unmount cleanup only
  }, [])

  // Background privacy — drop mic when app is hidden (orange Safari pill leak).
  // Discard ASR recordings instead of uploading after the user left.
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState !== 'hidden' || !listeningRef.current) return
      clearSilence()
      stickyRef.current = false
      listeningRef.current = false
      setListening(false)
      const session = sessionRef.current
      sessionRef.current = null
      if (session) {
        void session.stop().catch(() => {
          /* ignore */
        })
      }
      const media = mediaRef.current
      mediaRef.current = null
      asrModeRef.current = false
      if (media) {
        try {
          if (media.recorder.state !== 'inactive') media.recorder.stop()
        } catch {
          /* ignore */
        }
        stopMediaTracks(media.stream)
      }
    }
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('pagehide', onVis)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('pagehide', onVis)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (disabled && listeningRef.current) void stopSession()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled])

  const armSilenceStop = () => {
    if (!stickyRef.current) return
    clearSilence()
    silenceTimerRef.current = window.setTimeout(() => {
      void stopSession()
    }, SILENCE_AFTER_SPEECH_MS)
  }

  const startAsrFallback = async () => {
    if (mediaRef.current || disabled) return
    unlockTtsPlayback()
    draftBaseRef.current = draft
    onBargeIn?.()
    if (status === 'speaking') stopSpeaking()
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')
          ? 'audio/ogg;codecs=opus'
          : ''
      const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream)
      const chunks: BlobPart[] = []
      recorder.ondataavailable = (ev) => {
        if (ev.data.size) chunks.push(ev.data)
      }
      mediaRef.current = { stream, recorder, chunks }
      asrModeRef.current = true
      listeningRef.current = true
      setListening(true)
      recorder.start(250)
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'Microphone failed.')
      asrModeRef.current = false
      listeningRef.current = false
      setListening(false)
    }
  }

  const startSession = async () => {
    if (sessionRef.current || mediaRef.current || disabled || asrBusy) return
    unlockTtsPlayback()
    draftBaseRef.current = draft
    const apple = isAppleTouchDevice()
    const ttsPlaying = status === 'speaking'
    // iPhone barge-in: start Web Speech first, then pause TTS (preserveSession).
    // Also stop streaming DeepSeek auto-speak (not tracked in store status).
    const deferTts = apple && ttsPlaying
    if (!deferTts) onBargeIn?.()

    const session = createWebSpeechSession(
      {
        onInterim: (_lang, text) => {
          onDraft(mergeDictateText(draftBaseRef.current, text))
          if (stickyRef.current) clearSilence()
        },
        onFinal: (_lang, text) => {
          const next = mergeDictateText(draftBaseRef.current, text)
          draftBaseRef.current = next
          onDraft(next)
          armSilenceStop()
        },
        onError: () => {
          // Fall back to DeepSeek ASR recording instead of hard-failing.
          void (async () => {
            const session = sessionRef.current
            sessionRef.current = null
            if (session) {
              try {
                await session.stop()
              } catch {
                /* ignore */
              }
            }
            await startAsrFallback()
            if (!mediaRef.current) {
              onError?.('Speech recognition failed.')
              listeningRef.current = false
              setListening(false)
            }
          })()
        },
        onStatus: (s) => {
          if (s === 'listening') {
            listeningRef.current = true
            setListening(true)
          }
          if (s === 'idle' && !stickyRef.current) {
            listeningRef.current = false
            setListening(false)
          }
        },
      },
      chatDictateLang(),
    )
    if (!session) {
      await startAsrFallback()
      if (!mediaRef.current) {
        onError?.('Speech recognition is not available in this browser.')
      }
      return
    }
    sessionRef.current = session
    listeningRef.current = true
    setListening(true)
    try {
      await session.start()
      if (deferTts) {
        onBargeIn?.()
        stopSpeaking({ preserveSession: true })
      } else if (ttsPlaying) {
        stopSpeaking()
      }
    } catch (err) {
      await stopSession()
      await startAsrFallback()
      if (!mediaRef.current) {
        onError?.(err instanceof Error ? err.message : 'Microphone failed.')
      }
    }
  }

  const onPointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    if (disabled) return
    e.preventDefault()
    activePointerRef.current = e.pointerId
    downAtRef.current = Date.now()
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }

    if (listeningRef.current && stickyRef.current) {
      // Second tap stops sticky listen.
      void stopSession()
      return
    }

    stickyRef.current = false
    void startSession()
  }

  const onPointerUp = (e: PointerEvent<HTMLButtonElement>) => {
    if (activePointerRef.current !== e.pointerId) return
    activePointerRef.current = null
    const heldMs = Date.now() - downAtRef.current
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId)
      }
    } catch {
      /* ignore */
    }

    if (!listeningRef.current) return

    if (heldMs < HOLD_THRESHOLD_MS) {
      // Tap → sticky until silence / second tap
      stickyRef.current = true
      return
    }
    // Hold → release ends
    void stopSession()
  }

  const onPointerCancel = () => {
    activePointerRef.current = null
    if (!stickyRef.current) void stopSession()
  }

  return (
    <button
      type="button"
      className={`ds-chat-dictate${listening || asrBusy ? ' is-listening' : ''}`}
      aria-label={
        asrBusy ? 'Transcribing…' : listening ? 'Stop dictation' : 'Dictate with microphone'
      }
      title={
        asrBusy
          ? 'Transcribing with DeepSeek ASR…'
          : listening
            ? 'Stop dictation'
            : 'Hold or tap to dictate'
      }
      aria-pressed={listening}
      disabled={disabled || asrBusy}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      {MIC_ICON}
    </button>
  )
}
