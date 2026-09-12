import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  OrbitalSphereBackground,
  ORBITAL_SPHERE_DEFAULTS,
  type OrbitalSphereOptions,
} from './ui/orbital-sphere'
import { postPracticePartnerChat, type PracticePartnerChatMessage } from '../lib/adminApi'
import { createWebSpeechSession } from '../lib/webSpeech'
import { isAppleTouchDevice } from '../lib/mediaAccess'
import { isTtsPlaying, speakText, stopSpeaking } from '../lib/tts'
import type { LiveSession, SpeechEventHandlers } from '../lib/types'
import './AdminPracticePartnerLab.css'

export type PartnerMood = 'idle' | 'listening' | 'thinking' | 'speaking'

type SubtitleRole = 'you' | 'partner' | 'system'

type SubtitleLine = {
  role: SubtitleRole
  text: string
  interim?: boolean
}

const MOODS: { id: PartnerMood; label: string; hint: string }[] = [
  { id: 'idle', label: 'Idle', hint: 'Waiting — soft drift' },
  { id: 'listening', label: 'Listening', hint: 'Mic / your words' },
  { id: 'thinking', label: 'Thinking', hint: 'LLM reply' },
  { id: 'speaking', label: 'Speaking', hint: 'Azure TTS' },
]

const MOOD_ORBIT: Record<PartnerMood, Partial<OrbitalSphereOptions>> = {
  idle: {
    speed: 0.85,
    scale: 1,
    particleOpacity: 0.55,
    orbitOpacity: 0.22,
    haloOpacity: 0.18,
    hue: 0,
  },
  listening: {
    speed: 1.2,
    scale: 1.1,
    particleOpacity: 0.82,
    orbitOpacity: 0.4,
    haloOpacity: 0.36,
    hue: -6,
  },
  thinking: {
    speed: 0.5,
    scale: 0.94,
    particleOpacity: 0.42,
    orbitOpacity: 0.18,
    haloOpacity: 0.28,
    hue: 18,
  },
  speaking: {
    speed: 1.65,
    scale: 1.14,
    particleOpacity: 0.92,
    orbitOpacity: 0.48,
    haloOpacity: 0.44,
    hue: -12,
  },
}

const ROLE_LABEL: Record<SubtitleRole, string> = {
  you: 'You',
  partner: 'Partner',
  system: 'Lab',
}

const SILENCE_MS = 1600

/**
 * Admin-only Practice Partner.
 * Mic → Web Speech STT → DeepSeek (persona + history) → Azure TTS,
 * with Harbor orb + captions. No Voice Live / Foundry.
 */
export function AdminPracticePartnerLab() {
  const [mood, setMood] = useState<PartnerMood>('idle')
  const [amp, setAmp] = useState(0)
  const [caption, setCaption] = useState<SubtitleLine>({
    role: 'system',
    text: 'Tap Talk to speak, or type a line. 港灣 replies from a fixed persona + chat history, then Azure TTS speaks.',
  })
  const [reel, setReel] = useState<SubtitleLine[]>([])
  const [messages, setMessages] = useState<PracticePartnerChatMessage[]>([])
  const [listening, setListening] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [draft, setDraft] = useState('')
  const [lastModel, setLastModel] = useState('')

  const sessionRef = useRef<LiveSession | null>(null)
  const finalsRef = useRef('')
  const silenceTimerRef = useRef(0)
  const messagesRef = useRef<PracticePartnerChatMessage[]>([])
  const turnLockRef = useRef(false)
  const finishRef = useRef<() => void>(() => {})

  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  useEffect(() => {
    if (mood !== 'speaking' && mood !== 'listening') {
      setAmp(0)
      return undefined
    }
    let frame = 0
    const start = performance.now()
    const tick = (now: number) => {
      const t = (now - start) / 1000
      const wave =
        mood === 'speaking'
          ? 0.35 + 0.55 * Math.abs(Math.sin(t * 6.2)) * (0.6 + 0.4 * Math.sin(t * 2.1))
          : 0.2 + 0.35 * Math.abs(Math.sin(t * 3.4))
      setAmp(wave)
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [mood])

  const pushReel = useCallback((line: SubtitleLine) => {
    if (line.role === 'system') return
    setReel((prev) => {
      const last = prev[prev.length - 1]
      if (last && last.role === line.role && last.text === line.text) return prev
      return [...prev.slice(-8), { ...line, interim: false }]
    })
  }, [])

  const stopMic = useCallback(async () => {
    window.clearTimeout(silenceTimerRef.current)
    const session = sessionRef.current
    sessionRef.current = null
    setListening(false)
    if (session) {
      try {
        await session.stop()
      } catch {
        /* ignore */
      }
    }
  }, [])

  const runPartnerTurn = useCallback(
    async (userText: string) => {
      const text = userText.trim()
      if (!text || turnLockRef.current) return
      turnLockRef.current = true
      setBusy(true)
      setError('')
      setMood('thinking')
      setCaption({ role: 'system', text: '港灣 is thinking…' })

      const nextMessages: PracticePartnerChatMessage[] = [
        ...messagesRef.current,
        { role: 'user', content: text },
      ]
      setMessages(nextMessages)
      pushReel({ role: 'you', text })

      try {
        const { reply, model } = await postPracticePartnerChat(nextMessages)
        const withReply: PracticePartnerChatMessage[] = [
          ...nextMessages,
          { role: 'assistant', content: reply },
        ]
        setMessages(withReply)
        setLastModel(model)
        setMood('speaking')
        setCaption({ role: 'partner', text: reply })
        pushReel({ role: 'partner', text: reply })
        await speakText(reply, 'yue')
        setMood('idle')
        setCaption({
          role: 'system',
          text: 'Ready — tap Talk or type another line.',
        })
      } catch (e) {
        setMood('idle')
        const msg = e instanceof Error ? e.message : 'Partner turn failed'
        setError(msg)
        setCaption({ role: 'system', text: msg })
      } finally {
        setBusy(false)
        turnLockRef.current = false
      }
    },
    [pushReel],
  )

  const finishUtterance = useCallback(async () => {
    window.clearTimeout(silenceTimerRef.current)
    const spoken = finalsRef.current.trim()
    finalsRef.current = ''
    await stopMic()
    if (!spoken) {
      setMood('idle')
      setCaption({
        role: 'system',
        text: 'No speech captured — try again, or type a line below.',
      })
      return
    }
    await runPartnerTurn(spoken)
  }, [runPartnerTurn, stopMic])

  useEffect(() => {
    finishRef.current = () => {
      void finishUtterance()
    }
  }, [finishUtterance])

  const startListening = useCallback(async () => {
    if (busy || listening || turnLockRef.current) return
    setError('')
    finalsRef.current = ''

    const handlers: SpeechEventHandlers = {
      onInterim: (_lang, text) => {
        const t = text.trim()
        if (!t) return
        setMood('listening')
        setCaption({ role: 'you', text: t, interim: true })
      },
      onFinal: (_lang, text) => {
        const t = text.trim()
        if (!t) return
        finalsRef.current = `${finalsRef.current} ${t}`.trim()
        setMood('listening')
        setCaption({ role: 'you', text: finalsRef.current })
        window.clearTimeout(silenceTimerRef.current)
        silenceTimerRef.current = window.setTimeout(() => {
          finishRef.current()
        }, SILENCE_MS)
      },
      onError: (message) => {
        setError(message)
        setCaption({ role: 'system', text: message })
        void stopMic()
        setMood('idle')
      },
      onStatus: (status) => {
        if (status === 'listening') setListening(true)
        if (status === 'idle') setListening(false)
      },
    }

    const session = createWebSpeechSession(handlers, 'yue')
    if (!session) {
      setError('Web Speech is not available in this browser. Type a line instead.')
      return
    }

    sessionRef.current = session
    setMood('listening')
    setCaption({ role: 'system', text: 'Listening… speak in Cantonese or English.' })
    setListening(true)
    try {
      // Live-mic invariant: start STT before pausing TTS on Apple barge-in.
      await session.start()
      if (isTtsPlaying()) {
        stopSpeaking({ preserveSession: isAppleTouchDevice() })
      }
    } catch (e) {
      sessionRef.current = null
      setListening(false)
      setMood('idle')
      setError(e instanceof Error ? e.message : 'Could not start mic')
    }
  }, [busy, listening, stopMic])

  const toggleTalk = useCallback(() => {
    if (listening) {
      void finishUtterance()
      return
    }
    void startListening()
  }, [listening, finishUtterance, startListening])

  const sendDraft = useCallback(() => {
    const text = draft.trim()
    if (!text || busy) return
    setDraft('')
    void runPartnerTurn(text)
  }, [draft, busy, runPartnerTurn])

  const resetChat = useCallback(() => {
    void stopMic()
    stopSpeaking()
    turnLockRef.current = false
    setBusy(false)
    setMessages([])
    setReel([])
    setLastModel('')
    setError('')
    setMood('idle')
    setCaption({
      role: 'system',
      text: 'Chat cleared. Tap Talk or type to start again.',
    })
  }, [stopMic])

  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') {
        void stopMic()
      }
    }
    document.addEventListener('visibilitychange', onHide)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      window.clearTimeout(silenceTimerRef.current)
      void stopMic()
      stopSpeaking()
    }
  }, [stopMic])

  const orbitProps = useMemo((): Partial<OrbitalSphereOptions> => {
    const base = { ...ORBITAL_SPHERE_DEFAULTS, ...MOOD_ORBIT[mood] }
    const breathe = mood === 'speaking' || mood === 'listening' ? amp * 0.12 : 0
    return {
      ...base,
      scale: (base.scale ?? 1) * (1 + breathe),
      speed: (base.speed ?? 1) * (1 + amp * 0.35),
      particleOpacity: Math.min(1, (base.particleOpacity ?? 0.72) + amp * 0.12),
      haloOpacity: Math.min(1, (base.haloOpacity ?? 0.22) + amp * 0.2),
    }
  }, [mood, amp])

  const moodMeta = MOODS.find((m) => m.id === mood)!

  return (
    <section className="partner-lab" aria-label="Practice Partner lab">
      <header className="partner-lab-head">
        <div>
          <p className="partner-lab-kicker">Internal · not in app</p>
          <h2 className="partner-lab-title">Practice Partner</h2>
          <p className="partner-lab-lede">
            Live loop (admin only): mic → Web Speech STT → DeepSeek (persona + history) → your
            existing Azure TTS. Harbor orb + captions on top. No Voice Live / Foundry.
          </p>
        </div>
      </header>

      <div className={`partner-lab-stage partner-lab-stage--${mood}`} data-mood={mood}>
        <div className="partner-lab-glow" aria-hidden="true" />
        <OrbitalSphereBackground className="partner-lab-orb" {...orbitProps} />

        <div
          className={`partner-lab-subtitles partner-lab-subtitles--${caption.role}${
            caption.interim ? ' is-interim' : ''
          }`}
          aria-live="polite"
        >
          <span className="partner-lab-subtitles-role">{ROLE_LABEL[caption.role]}</span>
          <p className="partner-lab-subtitles-text">{caption.text}</p>
        </div>

        <p className="partner-lab-status" aria-live="polite">
          <span className="partner-lab-status-mood">{moodMeta.label}</span>
          <span className="partner-lab-status-hint">{moodMeta.hint}</span>
          {lastModel ? <span className="partner-lab-status-hint"> · {lastModel}</span> : null}
        </p>
      </div>

      <div className="partner-lab-live" role="group" aria-label="Practice Partner live controls">
        <button
          type="button"
          className={`partner-lab-talk${listening ? ' is-live' : ''}`}
          disabled={busy && !listening}
          onClick={toggleTalk}
        >
          {listening ? 'Stop & reply' : busy ? 'Working…' : 'Talk'}
        </button>
        <div className="partner-lab-compose">
          <input
            type="text"
            value={draft}
            disabled={busy || listening}
            placeholder="Or type Cantonese / English…"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                sendDraft()
              }
            }}
          />
          <button
            type="button"
            className="partner-lab-send"
            disabled={busy || listening || !draft.trim()}
            onClick={sendDraft}
          >
            Send
          </button>
        </div>
        <button
          type="button"
          className="partner-lab-reset"
          disabled={busy || listening}
          onClick={resetChat}
        >
          Clear chat
        </button>
      </div>

      {error ? <p className="partner-lab-error">{error}</p> : null}

      <aside className="partner-lab-transcript" aria-label="Caption history">
        <h3>Caption reel</h3>
        {reel.length ? (
          <ul>
            {reel.map((line, i) => (
              <li key={`${line.role}-${i}-${line.text.slice(0, 12)}`}>
                <span className={`partner-lab-transcript-role is-${line.role}`}>
                  {ROLE_LABEL[line.role]}
                </span>
                <span className="partner-lab-transcript-text">{line.text}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="partner-lab-transcript-empty">
            Turns appear here as you talk — You from STT, Partner from the LLM.
          </p>
        )}
      </aside>

      <aside className="partner-lab-notes">
        <h3>How it knows what to reply</h3>
        <ul>
          <li>
            <strong>Persona:</strong> fixed system prompt — “港灣”, a Cantonese practice partner
          </li>
          <li>
            <strong>Memory:</strong> this session’s chat history (your lines + its replies)
          </li>
          <li>
            <strong>Voice:</strong> same Azure TTS path as the translator (`yue` / zh-HK)
          </li>
          <li>
            <strong>Not used:</strong> Azure Voice Live or Foundry Agent
          </li>
        </ul>
        <p>Admin-only until entitlement + mic polish are ready for the consumer app.</p>
      </aside>
    </section>
  )
}
