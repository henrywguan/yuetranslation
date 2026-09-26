import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  OrbitalSphereBackground,
  ORBITAL_SPHERE_DEFAULTS,
  type OrbitalSphereOptions,
} from './ui/orbital-sphere'
import {
  DEFAULT_PRACTICE_PARTNER_CATEGORY,
  PRACTICE_PARTNER_CATEGORIES,
  postPracticePartnerChat,
  resolvePracticePartnerCategory,
  type PracticePartnerCategory,
  type PracticePartnerChatMessage,
  type PracticePartnerDrill,
  type PracticePartnerDrillTarget,
} from '../lib/adminApi'
import { createWebSpeechSession } from '../lib/webSpeech'
import { isAppleTouchDevice } from '../lib/mediaAccess'
import { isTtsPlaying, loadTtsAudio, speakText, stopSpeaking, unlockTtsPlayback } from '../lib/tts'
import type { LiveSession, SpeechEventHandlers } from '../lib/types'
import {
  YUE_VOICES,
  resolveYueVoice,
  type YueVoiceId,
} from '../lib/ttsVoices'
import './AdminPracticePartnerLab.css'

const PARTNER_VOICE_KEY = 'yue-practice-partner-voice'
const PARTNER_CATEGORY_KEY = 'yue-practice-partner-category'

function readPartnerCategory(): PracticePartnerCategory {
  if (typeof window === 'undefined') return DEFAULT_PRACTICE_PARTNER_CATEGORY
  try {
    return resolvePracticePartnerCategory(localStorage.getItem(PARTNER_CATEGORY_KEY))
  } catch {
    return DEFAULT_PRACTICE_PARTNER_CATEGORY
  }
}

function writePartnerCategory(id: PracticePartnerCategory) {
  try {
    localStorage.setItem(PARTNER_CATEGORY_KEY, resolvePracticePartnerCategory(id))
  } catch {
    /* ignore */
  }
}

function readPartnerVoice(): YueVoiceId {
  if (typeof window === 'undefined') return resolveYueVoice(null)
  try {
    return resolveYueVoice(localStorage.getItem(PARTNER_VOICE_KEY))
  } catch {
    return resolveYueVoice(null)
  }
}

function writePartnerVoice(id: YueVoiceId) {
  try {
    localStorage.setItem(PARTNER_VOICE_KEY, resolveYueVoice(id))
  } catch {
    /* ignore */
  }
}

/** Fallout-style speaker plate: Azure profile name before the · gender tag. */
function voiceSpeakerName(id: YueVoiceId): string {
  const meta = YUE_VOICES.find((v) => v.id === id)
  if (!meta) return 'Partner'
  return meta.labelEn.split('·')[0]?.trim() || meta.labelEn
}

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

const EMPTY_CAPTION =
  'Tap Begin drill. 港灣 demands a phrase. You say it. The model judges — then advances, or makes you try again.'

/**
 * Admin-only Practice Partner.
 * Begin drill → DEMAND card → mic / type → JUDGMENT → next phrase.
 * Mic → Web Speech STT → DeepSeek (mean-tutor + history) → Azure TTS.
 * Harbor orb + captions. No Voice Live / Foundry.
 */
export function AdminPracticePartnerLab() {
  const [mood, setMood] = useState<PartnerMood>('idle')
  const [amp, setAmp] = useState(0)
  const [caption, setCaption] = useState<SubtitleLine>({
    role: 'system',
    text: EMPTY_CAPTION,
  })
  const [reel, setReel] = useState<SubtitleLine[]>([])
  const [messages, setMessages] = useState<PracticePartnerChatMessage[]>([])
  const [activeDrill, setActiveDrill] = useState<PracticePartnerDrillTarget | null>(null)
  const [streak, setStreak] = useState(0)
  const [hits, setHits] = useState(0)
  const [misses, setMisses] = useState(0)
  const [verdictFlash, setVerdictFlash] = useState<'pass' | 'fail' | null>(null)
  const [listening, setListening] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [draft, setDraft] = useState('')
  const [fullscreen, setFullscreen] = useState(false)
  const [fsTypeOpen, setFsTypeOpen] = useState(false)
  const [fsCatsOpen, setFsCatsOpen] = useState(false)
  const [partnerVoice, setPartnerVoice] = useState<YueVoiceId>(() => readPartnerVoice())
  const [category, setCategory] = useState<PracticePartnerCategory>(() => readPartnerCategory())
  /** Last partner line — stays on screen until the user starts speaking. */
  const [partnerHold, setPartnerHold] = useState<string | null>(null)
  /** Live STT (interim + accumulating finals) while the mic is open. */
  const [youLive, setYouLive] = useState<{ text: string; interim: boolean } | null>(null)

  const draftInputRef = useRef<HTMLInputElement | null>(null)
  const sessionRef = useRef<LiveSession | null>(null)
  const finalsRef = useRef('')
  const silenceTimerRef = useRef(0)
  const messagesRef = useRef<PracticePartnerChatMessage[]>([])
  const activeDrillRef = useRef<PracticePartnerDrillTarget | null>(null)
  const categoryRef = useRef<PracticePartnerCategory>(category)
  const turnLockRef = useRef(false)
  const finishRef = useRef<() => void>(() => {})
  const verdictTimerRef = useRef(0)

  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  useEffect(() => {
    activeDrillRef.current = activeDrill
  }, [activeDrill])

  useEffect(() => {
    categoryRef.current = category
  }, [category])

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

  const applyDrill = useCallback((drill: PracticePartnerDrill | null) => {
    if (!drill) return
    setActiveDrill({ en: drill.en, zh: drill.zh, jyutping: drill.jyutping })
    window.clearTimeout(verdictTimerRef.current)
    if (drill.verdict === 'pass') {
      setStreak((n) => n + 1)
      setHits((n) => n + 1)
      setVerdictFlash('pass')
      verdictTimerRef.current = window.setTimeout(() => setVerdictFlash(null), 1600)
    } else if (drill.verdict === 'fail') {
      setStreak(0)
      setMisses((n) => n + 1)
      setVerdictFlash('fail')
      verdictTimerRef.current = window.setTimeout(() => setVerdictFlash(null), 1600)
    } else {
      setVerdictFlash(null)
    }
  }, [])

  const playPartnerReply = useCallback(
    async (reply: string) => {
      setMood('speaking')
      setPartnerHold(reply)
      setYouLive(null)
      setCaption({ role: 'partner', text: reply })
      pushReel({ role: 'partner', text: reply })
      // After the LLM round-trip we are outside the user gesture. Unlock must
      // have run on Talk/Send; still bound speak so a stalled play()/speechSynthesis
      // cannot leave the lab stuck on Speaking forever.
      // Release busy/turn lock before TTS so a second mic tap can barge in.
      setBusy(false)
      turnLockRef.current = false
      try {
        await Promise.race([
          speakText(reply, 'yue', partnerVoice, { loud: true }),
          new Promise<never>((_, reject) => {
            window.setTimeout(
              () => reject(new Error('Voice playback timed out — tap Say it again.')),
              25_000,
            )
          }),
        ])
      } catch (ttsErr) {
        stopSpeaking()
        const ttsMsg =
          ttsErr instanceof Error ? ttsErr.message : 'Voice playback failed.'
        setError(ttsMsg)
      }
      setMood('idle')
      setCaption({ role: 'partner', text: reply })
    },
    [partnerVoice, pushReel],
  )

  const startDrill = useCallback(async () => {
    if (turnLockRef.current || activeDrillRef.current) return
    turnLockRef.current = true
    setBusy(true)
    setError('')
    setYouLive(null)
    setFsTypeOpen(false)
    setFsCatsOpen(false)
    setMood('thinking')
    const deck = PRACTICE_PARTNER_CATEGORIES.find((c) => c.id === categoryRef.current)
    setCaption({
      role: 'system',
      text: `港灣 is picking a ${deck?.labelEn.toLowerCase() || 'common'} line…`,
    })
    try {
      const { reply, drill } = await postPracticePartnerChat(
        messagesRef.current,
        null,
        categoryRef.current,
      )
      void loadTtsAudio(reply, 'yue', partnerVoice, { loud: true }).catch(() => undefined)
      const withReply: PracticePartnerChatMessage[] = [
        ...messagesRef.current,
        { role: 'assistant', content: reply },
      ]
      setMessages(withReply)
      applyDrill(drill)
      await playPartnerReply(reply)
    } catch (e) {
      setMood('idle')
      const msg = e instanceof Error ? e.message : 'Could not start drill'
      setError(msg)
      setCaption({ role: 'system', text: msg })
    } finally {
      setBusy(false)
      turnLockRef.current = false
    }
  }, [applyDrill, playPartnerReply, partnerVoice])

  const runPartnerTurn = useCallback(
    async (userText: string) => {
      const text = userText.trim()
      if (!text || turnLockRef.current) return
      const target = activeDrillRef.current
      if (!target) {
        await startDrill()
        return
      }
      turnLockRef.current = true
      setBusy(true)
      setError('')
      setYouLive(null)
      setFsTypeOpen(false)
      setMood('thinking')
      setCaption({ role: 'system', text: '港灣 is judging…' })

      const nextMessages: PracticePartnerChatMessage[] = [
        ...messagesRef.current,
        { role: 'user', content: text },
      ]
      setMessages(nextMessages)
      pushReel({ role: 'you', text })

      try {
        const { reply, drill } = await postPracticePartnerChat(
          nextMessages,
          target,
          categoryRef.current,
        )
        void loadTtsAudio(reply, 'yue', partnerVoice, { loud: true }).catch(() => undefined)
        const withReply: PracticePartnerChatMessage[] = [
          ...nextMessages,
          { role: 'assistant', content: reply },
        ]
        setMessages(withReply)
        applyDrill(drill)
        await playPartnerReply(reply)
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
    [applyDrill, playPartnerReply, partnerVoice, pushReel, startDrill],
  )

  const finishUtterance = useCallback(async () => {
    window.clearTimeout(silenceTimerRef.current)
    const spoken = finalsRef.current.trim()
    finalsRef.current = ''
    // Do not wait for recognition.stop() before judging — iOS teardown is slow
    // and sat in front of DeepSeek + Azure, which felt like a long TTS delay.
    const stopping = stopMic()
    if (!spoken) {
      await stopping
      setMood('idle')
      setYouLive(null)
      setCaption(
        partnerHold
          ? { role: 'partner', text: partnerHold }
          : {
              role: 'system',
              text: 'No speech captured — try again, or type a line below.',
            },
      )
      return
    }
    await Promise.all([stopping, runPartnerTurn(spoken)])
  }, [partnerHold, runPartnerTurn, stopMic])

  useEffect(() => {
    finishRef.current = () => {
      void finishUtterance()
    }
  }, [finishUtterance])

  const startListening = useCallback(async () => {
    if (listening) return
    const canBargeIn = mood === 'speaking' || isTtsPlaying()
    if ((busy || turnLockRef.current) && !canBargeIn) return
    setError('')
    finalsRef.current = ''
    setFsCatsOpen(false)
    // Must run in the Talk gesture so later Azure/browser TTS after DeepSeek is allowed.
    unlockTtsPlayback()

    const handlers: SpeechEventHandlers = {
      onInterim: (_lang, text) => {
        const t = text.trim()
        if (!t) return
        setMood('listening')
        setYouLive({ text: t, interim: true })
        setCaption({ role: 'you', text: t, interim: true })
      },
      onFinal: (_lang, text) => {
        const t = text.trim()
        if (!t) return
        finalsRef.current = `${finalsRef.current} ${t}`.trim()
        setMood('listening')
        setYouLive({ text: finalsRef.current, interim: false })
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
    setYouLive(null)
    setMood('listening')
    // Keep partner subtitles visible until STT produces text.
    if (partnerHold) {
      setCaption({ role: 'partner', text: partnerHold })
    } else {
      setCaption({ role: 'system', text: 'Listening… speak in Cantonese or English.' })
    }
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
  }, [busy, listening, mood, partnerHold, stopMic])

  const toggleTalk = useCallback(() => {
    if (listening) {
      // Flip iOS out of the mic session in this gesture, then judge.
      // A plain unlock is a no-op after the first tap — that left later
      // Azure clips late and quiet (voice-chat / receiver route).
      void stopMic()
      unlockTtsPlayback({ force: true })
      void finishUtterance()
      return
    }
    if (!activeDrill) {
      unlockTtsPlayback({ force: true })
      void startDrill()
      return
    }
    // Do not force-unlock immediately before recognition.start() — silent
    // WAV / speechSynthesis.cancel aborts iPhone capture.
    unlockTtsPlayback()
    void startListening()
  }, [activeDrill, listening, finishUtterance, startDrill, startListening, stopMic])

  const sendDraft = useCallback(() => {
    const text = draft.trim()
    if (!text || busy || !activeDrill) return
    // Same gesture unlock as Talk — typed turns also auto-speak after the LLM.
    unlockTtsPlayback({ force: true })
    setDraft('')
    setFsTypeOpen(false)
    void runPartnerTurn(text)
  }, [activeDrill, draft, busy, runPartnerTurn])

  const resetChat = useCallback(() => {
    void stopMic()
    stopSpeaking()
    turnLockRef.current = false
    window.clearTimeout(verdictTimerRef.current)
    setBusy(false)
    setMessages([])
    setReel([])
    setActiveDrill(null)
    setStreak(0)
    setHits(0)
    setMisses(0)
    setVerdictFlash(null)
    setError('')
    setPartnerHold(null)
    setYouLive(null)
    setFsTypeOpen(false)
    setMood('idle')
    setCaption({
      role: 'system',
      text: 'Drill cleared. Tap Begin drill when you are ready to be yelled at.',
    })
  }, [stopMic])

  const onCategoryChange = (next: PracticePartnerCategory) => {
    const id = resolvePracticePartnerCategory(next)
    if (id === category) return
    if (busy || listening) return
    setCategory(id)
    writePartnerCategory(id)
    setFsCatsOpen(false)
    const meta = PRACTICE_PARTNER_CATEGORIES.find((c) => c.id === id)
    if (activeDrill || messages.length) {
      void stopMic()
      stopSpeaking()
      turnLockRef.current = false
      setMessages([])
      setReel([])
      setActiveDrill(null)
      setPartnerHold(null)
      setYouLive(null)
      setVerdictFlash(null)
      setMood('idle')
      setCaption({
        role: 'system',
        text: `Switched to ${meta?.labelEn || id} · ${meta?.labelZh || ''}. Tap Begin drill.`,
      })
    }
  }

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
      window.clearTimeout(verdictTimerRef.current)
      void stopMic()
      stopSpeaking()
    }
  }, [stopMic])

  useEffect(() => {
    if (!fullscreen) {
      setFsTypeOpen(false)
      setFsCatsOpen(false)
      return undefined
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (fsTypeOpen) {
          setFsTypeOpen(false)
          return
        }
        if (fsCatsOpen) {
          setFsCatsOpen(false)
          return
        }
        setFullscreen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [fullscreen, fsTypeOpen, fsCatsOpen])

  useEffect(() => {
    if (!fullscreen || !fsTypeOpen) return
    const id = window.requestAnimationFrame(() => {
      draftInputRef.current?.focus()
    })
    return () => window.cancelAnimationFrame(id)
  }, [fullscreen, fsTypeOpen])

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

  const displayPrimary: SubtitleLine = youLive
    ? { role: 'you', text: youLive.text, interim: youLive.interim }
    : caption
  // When you are speaking, keep the last partner line visible above your STT.
  const displaySecondary =
    youLive && partnerHold ? { role: 'partner' as const, text: partnerHold } : null

  const openFsKeyboard = () => {
    if (busy || listening || !activeDrill) return
    setFsCatsOpen(false)
    setFsTypeOpen(true)
  }

  const talkLabel = listening
    ? 'Stop & judge'
    : !activeDrill
      ? busy
        ? 'Working…'
        : 'Begin drill'
      : busy
        ? 'Working…'
        : 'Say it'

  const categoryMeta =
    PRACTICE_PARTNER_CATEGORIES.find((c) => c.id === category) || PRACTICE_PARTNER_CATEGORIES[2]

  const drillKicker = verdictFlash === 'fail'
    ? 'Try again'
    : verdictFlash === 'pass'
      ? 'Next phrase'
      : activeDrill
        ? 'Say this'
        : categoryMeta.labelEn

  const categoryPicker = (
    <div className="partner-lab-categories" role="radiogroup" aria-label="Drill category">
      {PRACTICE_PARTNER_CATEGORIES.map((c) => (
        <button
          key={c.id}
          type="button"
          role="radio"
          aria-checked={category === c.id}
          className={`partner-lab-category${category === c.id ? ' is-active' : ''}`}
          disabled={busy || listening}
          onClick={(event) => {
            event.stopPropagation()
            onCategoryChange(c.id)
          }}
        >
          <span className="partner-lab-category-en">{c.labelEn}</span>
          <span className="partner-lab-category-zh" lang="zh-HK">
            {c.labelZh}
          </span>
        </button>
      ))}
    </div>
  )

  const partnerSpeaker = voiceSpeakerName(partnerVoice)
  const speakerName =
    displayPrimary.role === 'partner'
      ? partnerSpeaker
      : displayPrimary.role === 'you'
        ? 'You'
        : 'Lab'

  const onPartnerVoiceChange = (next: string) => {
    const id = resolveYueVoice(next)
    setPartnerVoice(id)
    writePartnerVoice(id)
  }

  return (
    <section className={`partner-lab${fullscreen ? ' is-fullscreen' : ''}`} aria-label="Practice Partner lab">
      <header className="partner-lab-head">
        <div>
          <p className="partner-lab-kicker">Internal · not in app</p>
          <h2 className="partner-lab-title">Practice Partner</h2>
          <p className="partner-lab-lede">
            Say-this drill (admin only): pick a deck — animals, foods, common phrases, or expert —
            then 港灣 demands a line in that category. You speak it; the model judges and advances.
            Mic → Web Speech → DeepSeek → Azure TTS. Tap the orb for fullscreen.
          </p>
        </div>
      </header>

      <div
        className={`partner-lab-stage partner-lab-stage--${mood}${
          fullscreen ? ' is-fullscreen' : ''
        }${verdictFlash ? ` is-verdict-${verdictFlash}` : ''}`}
        data-mood={mood}
        data-verdict={verdictFlash || 'none'}
        data-fullscreen={fullscreen ? 'true' : 'false'}
        role={fullscreen ? undefined : 'button'}
        tabIndex={fullscreen ? undefined : 0}
        aria-label={fullscreen ? undefined : 'Enter fullscreen practice view'}
        onClick={() => {
          if (!fullscreen) setFullscreen(true)
        }}
        onKeyDown={(event) => {
          if (fullscreen) return
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            setFullscreen(true)
          }
        }}
      >
        <div className="partner-lab-glow" aria-hidden="true" />
        <OrbitalSphereBackground className="partner-lab-orb" {...orbitProps} />

        {!fullscreen ? (
          <p className="partner-lab-fs-hint" aria-hidden="true">
            Tap for fullscreen
          </p>
        ) : (
          <button
            type="button"
            className="partner-lab-fs-exit"
            onClick={(event) => {
              event.stopPropagation()
              setFullscreen(false)
            }}
          >
            Exit fullscreen
          </button>
        )}

        <div
          className={`partner-lab-drill${activeDrill ? '' : ' is-empty'}${
            verdictFlash ? ` is-${verdictFlash}` : ''
          }`}
          aria-live="polite"
        >
          <p className="partner-lab-drill-kicker">
            <span>
              {drillKicker}
              <span className="partner-lab-drill-cat" lang="zh-HK">
                {' '}
                · {categoryMeta.labelZh}
              </span>
            </span>
            {hits + misses > 0 ? (
              <span className="partner-lab-drill-streak">
                {streak} streak · {hits} hit{hits === 1 ? '' : 's'}
                {misses ? ` · ${misses} miss` : ''}
              </span>
            ) : null}
          </p>
          {activeDrill ? (
            <>
              <p className="partner-lab-drill-zh" lang="zh-HK">
                {activeDrill.zh}
              </p>
              <p className="partner-lab-drill-en">{activeDrill.en}</p>
              <p className="partner-lab-drill-jp">{activeDrill.jyutping}</p>
            </>
          ) : (
            <p className="partner-lab-drill-empty">
              {categoryMeta.labelEn} · {categoryMeta.labelZh}. Tap Begin drill. No trophies.
            </p>
          )}
        </div>

        {fullscreen && fsCatsOpen ? (
          <div
            className="partner-lab-fs-cats-pop"
            role="dialog"
            aria-label="Drill category"
            onClick={(event) => event.stopPropagation()}
          >
            {categoryPicker}
          </div>
        ) : null}

        <div className="partner-lab-subtitle-band" aria-hidden="true" />

        <div
          className={`partner-lab-subtitles partner-lab-subtitles--fallout partner-lab-subtitles--${displayPrimary.role}${
            displayPrimary.interim ? ' is-interim' : ''
          }${displaySecondary ? ' has-secondary' : ''}`}
          aria-live="polite"
          onClick={(event) => event.stopPropagation()}
        >
          {displaySecondary ? (
            <p className="partner-lab-subtitles-secondary">
              <span className="partner-lab-subtitles-speaker">{partnerSpeaker}</span>
              <span className="partner-lab-subtitles-secondary-text">{displaySecondary.text}</span>
            </p>
          ) : null}
          <p className="partner-lab-subtitles-speaker">{speakerName}</p>
          <p className="partner-lab-subtitles-text">{displayPrimary.text}</p>
          {listening && !youLive ? (
            <p className="partner-lab-subtitles-listening">Listening… your words appear here</p>
          ) : null}
        </div>

        <p className="partner-lab-status" aria-live="polite">
          <span className="partner-lab-status-mood">{moodMeta.label}</span>
          <span className="partner-lab-status-hint">{moodMeta.hint}</span>
        </p>
      </div>

      <div
        className={`partner-lab-live${fullscreen ? ' is-fs-dock' : ''}`}
        role="group"
        aria-label="Practice Partner live controls"
      >
        {fullscreen ? (
          <>
            <div className="partner-lab-fs-dock">
              <button
                type="button"
                className={`partner-lab-fs-cats-toggle${fsCatsOpen ? ' is-open' : ''}`}
                aria-label={fsCatsOpen ? 'Hide categories' : 'Show categories'}
                aria-expanded={fsCatsOpen}
                onClick={(event) => {
                  event.stopPropagation()
                  setFsTypeOpen(false)
                  setFsCatsOpen((open) => !open)
                }}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" className="partner-lab-fs-cats-icon">
                  <path
                    fill="currentColor"
                    d="M7.4 15.4 6 14l6-6 6 6-1.4 1.4L12 10.8z"
                  />
                </svg>
              </button>
              <button
                type="button"
                className={`partner-lab-fs-mic${listening ? ' is-live' : ''}`}
                disabled={busy && !listening}
                aria-label={talkLabel}
                onClick={toggleTalk}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" className="partner-lab-fs-mic-icon">
                  <path
                    fill="currentColor"
                    d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.93V21h2v-3.07A7 7 0 0 0 19 11h-2z"
                  />
                </svg>
              </button>
              <button
                type="button"
                className={`partner-lab-fs-keyboard${fsTypeOpen ? ' is-open' : ''}`}
                disabled={busy || listening || !activeDrill}
                aria-label="Type instead"
                aria-expanded={fsTypeOpen}
                onClick={openFsKeyboard}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" className="partner-lab-fs-keyboard-icon">
                  <path
                    fill="currentColor"
                    d="M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zm1 3v2h2V8H5zm3 0v2h2V8H8zm3 0v2h2V8h-2zm3 0v2h2V8h-2zm3 0v2h2V8h-2zM5 11v2h2v-2H5zm3 0v2h2v-2H8zm3 0v2h5v-2h-5zm6 0v2h2v-2h-2zM5 14v2h11v-2H5zm12 0v2h2v-2h-2z"
                  />
                </svg>
              </button>
            </div>
            {fsTypeOpen ? (
              <div className="partner-lab-fs-type" onClick={(e) => e.stopPropagation()}>
                <input
                  ref={draftInputRef}
                  type="text"
                  inputMode="text"
                  enterKeyHint="send"
                  value={draft}
                  disabled={busy || listening || !activeDrill}
                  placeholder="Type your attempt…"
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      sendDraft()
                      setFsTypeOpen(false)
                    }
                  }}
                />
                <button
                  type="button"
                  className="partner-lab-send"
                  disabled={busy || listening || !activeDrill || !draft.trim()}
                  onClick={() => {
                    sendDraft()
                    setFsTypeOpen(false)
                  }}
                >
                  Send
                </button>
                <button
                  type="button"
                  className="partner-lab-fs-type-close"
                  onClick={() => setFsTypeOpen(false)}
                >
                  Close
                </button>
              </div>
            ) : null}
          </>
        ) : (
          <>
            {categoryPicker}
            <label className="partner-lab-voice">
              <span className="partner-lab-voice-label">Partner voice</span>
              <select
                value={partnerVoice}
                disabled={busy || listening}
                aria-label="Practice Partner Azure voice"
                onChange={(e) => onPartnerVoiceChange(e.target.value)}
              >
                {YUE_VOICES.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.labelEn}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className={`partner-lab-talk${listening ? ' is-live' : ''}`}
              disabled={busy && !listening}
              onClick={toggleTalk}
            >
              {talkLabel}
            </button>
            <div className="partner-lab-compose">
              <input
                type="text"
                value={draft}
                disabled={busy || listening || !activeDrill}
                placeholder="Or type your attempt…"
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
                disabled={busy || listening || !activeDrill || !draft.trim()}
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
              New drill
            </button>
          </>
        )}
      </div>

      {error ? <p className="partner-lab-error">{error}</p> : null}

      <div className="partner-lab-bottom">
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
              Turns appear here as you talk — You from STT, 港灣 from the drill.
            </p>
          )}
        </aside>

        <aside className="partner-lab-notes">
          <h3>How the drill works</h3>
          <ul>
            <li>
              <strong>Persona:</strong> 港灣 — intense, impatient drill sergeant (mean-tutor mode)
            </li>
            <li>
              <strong>Decks:</strong> Animals 動物 · Foods 食物 · Common 常用 · Expert 進階 — lock
              stays on after a pass
            </li>
            <li>
              <strong>Loop:</strong> DEMAND (say this) → you speak → JUDGMENT → next phrase or retry
            </li>
            <li>
              <strong>Memory:</strong> this session’s lines plus the active English / 漢字 / Jyutping
              target
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
      </div>
    </section>
  )
}
