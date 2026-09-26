import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  OrbitalSphereBackground,
  ORBITAL_SPHERE_DEFAULTS,
  type OrbitalSphereOptions,
} from './ui/orbital-sphere'
import {
  DEFAULT_PRACTICE_PARTNER_CATEGORY,
  DEFAULT_PRACTICE_PARTNER_DIFFICULTY,
  PRACTICE_PARTNER_CATEGORIES,
  PRACTICE_PARTNER_DIFFICULTIES,
  postPracticePartnerChat,
  resolvePracticePartnerCategory,
  resolvePracticePartnerDifficulty,
  type PracticePartnerCategory,
  type PracticePartnerChatMessage,
  type PracticePartnerDifficulty,
  type PracticePartnerDrill,
  type PracticePartnerDrillTarget,
} from '../lib/adminApi'
import { createWebSpeechSession } from '../lib/webSpeech'
import {
  isAppleTouchDevice,
  micBlockedMessage,
  stopMediaStream,
  unlockMicrophone,
} from '../lib/mediaAccess'
import {
  bindMicBackgroundRelease,
  shouldForceReleaseMicOnBackground,
} from '../lib/micPrivacy'
import {
  hushTtsSpeakerForMic,
  isTtsPlaying,
  loadTtsAudio,
  prepareLoudTtsPlayback,
  speakText,
  stopSpeaking,
  unlockTtsPlayback,
} from '../lib/tts'
import type { LiveSession, SpeechEventHandlers } from '../lib/types'
import {
  YUE_VOICES,
  resolveYueVoice,
  type YueVoiceId,
} from '../lib/ttsVoices'
import { playPracticePartnerPassSfx } from '../lib/practicePartnerPassSfx'
import { playPracticePartnerFailSfx } from '../lib/practicePartnerFailSfx'
import {
  formatPracticePartnerScoreAt,
  readPracticePartnerScores,
  recordPracticePartnerPass,
  type PracticePartnerScores,
} from '../lib/practicePartnerScores'
import './AdminPracticePartnerLab.css'

const PARTNER_VOICE_KEY = 'yue-practice-partner-voice'
const PARTNER_CATEGORY_KEY = 'yue-practice-partner-category'
const PARTNER_DIFFICULTY_KEY = 'yue-practice-partner-difficulty'

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

function readPartnerDifficulty(): PracticePartnerDifficulty {
  if (typeof window === 'undefined') return DEFAULT_PRACTICE_PARTNER_DIFFICULTY
  try {
    return resolvePracticePartnerDifficulty(localStorage.getItem(PARTNER_DIFFICULTY_KEY))
  } catch {
    return DEFAULT_PRACTICE_PARTNER_DIFFICULTY
  }
}

function writePartnerDifficulty(id: PracticePartnerDifficulty) {
  try {
    localStorage.setItem(PARTNER_DIFFICULTY_KEY, resolvePracticePartnerDifficulty(id))
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

const SILENCE_MS = 1600

const EMPTY_CAPTION =
  'Begin drill! Follow along with the practice partner and advance!'

const PARTNER_MIC_ICON = (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M9 4C9 2.34315 10.3431 1 12 1C13.6569 1 15 2.34315 15 4V12C15 13.6569 13.6569 15 12 15C10.3431 15 9 13.6569 9 12V4ZM13 4V12C13 12.5523 12.5523 13 12 13C11.4477 13 11 12.5523 11 12V4C11 3.44772 11.4477 3 12 3C12.5523 3 13 3.44772 13 4Z"
      fill="currentColor"
    />
    <path
      d="M18 12C18 14.973 15.8377 17.441 13 17.917V21H17V23H7V21H11V17.917C8.16229 17.441 6 14.973 6 12V9H8V12C8 14.2091 9.79086 16 12 16C14.2091 16 16 14.2091 16 12V9H18V12Z"
      fill="currentColor"
    />
  </svg>
)

const CROWN_ICON = (
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" className="partner-lab-scores-crown">
    <path
      fill="currentColor"
      d="M3.5 17.5 5 8l4.2 4.6L12 5.5l2.8 7.1L19 8l1.5 9.5H3.5Zm0 1.5h17V21H3.5v-2Z"
    />
  </svg>
)

/**
 * Admin-only Practice Partner.
 * Begin drill → DEMAND card → mic / type → JUDGMENT → next phrase.
 * Mic → Web Speech STT → DeepSeek (mean-tutor + history) → Azure TTS.
 * Harbor orb + captions. No Voice Live / Foundry.
 */
export function AdminPracticePartnerLab({ entry = 'admin' }: { entry?: 'admin' | 'hub' }) {
  const [mood, setMood] = useState<PartnerMood>('idle')
  const [amp, setAmp] = useState(0)
  const [caption, setCaption] = useState<SubtitleLine>({
    role: 'system',
    text: EMPTY_CAPTION,
  })
  const [messages, setMessages] = useState<PracticePartnerChatMessage[]>([])
  const [activeDrill, setActiveDrill] = useState<PracticePartnerDrillTarget | null>(null)
  const [streak, setStreak] = useState(0)
  const [hits, setHits] = useState(0)
  const [misses, setMisses] = useState(0)
  const [verdictFlash, setVerdictFlash] = useState<'pass' | 'fail' | null>(null)
  const [scoreboard, setScoreboard] = useState<PracticePartnerScores>(() =>
    readPracticePartnerScores(),
  )
  const [scoresOpen, setScoresOpen] = useState(false)
  const [voiceMenuOpen, setVoiceMenuOpen] = useState(false)
  const [topicReady, setTopicReady] = useState(false)
  const [listening, setListening] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [draft, setDraft] = useState('')
  const [fullscreen, setFullscreen] = useState(false)
  const [fsTypeOpen, setFsTypeOpen] = useState(false)
  const [partnerVoice, setPartnerVoice] = useState<YueVoiceId>(() => readPartnerVoice())
  const [category, setCategory] = useState<PracticePartnerCategory>(() => readPartnerCategory())
  const [difficulty, setDifficulty] = useState<PracticePartnerDifficulty>(() =>
    readPartnerDifficulty(),
  )
  /** Last partner line — stays on screen until the user starts speaking. */
  const [partnerHold, setPartnerHold] = useState<string | null>(null)
  /** Live STT (interim + accumulating finals) while the mic is open. */
  const [youLive, setYouLive] = useState<{ text: string; interim: boolean } | null>(null)
  /** Bumps to replay the jade sweep on the drill 漢字. */
  const [zhFlash, setZhFlash] = useState(0)

  const draftInputRef = useRef<HTMLInputElement | null>(null)
  const sessionRef = useRef<LiveSession | null>(null)
  const ttsLiveRef = useRef(false)
  const ttsGenRef = useRef(0)
  /** True while getUserMedia / recognition.start handshake is in flight. */
  const startingMicRef = useRef(false)
  const finalsRef = useRef('')
  const silenceTimerRef = useRef(0)
  const messagesRef = useRef<PracticePartnerChatMessage[]>([])
  const activeDrillRef = useRef<PracticePartnerDrillTarget | null>(null)
  const categoryRef = useRef<PracticePartnerCategory>(category)
  const difficultyRef = useRef<PracticePartnerDifficulty>(difficulty)
  const turnLockRef = useRef(false)
  const finishRef = useRef<() => void>(() => {})
  const verdictTimerRef = useRef(0)
  const streakRef = useRef(0)

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
    difficultyRef.current = difficulty
  }, [difficulty])

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

  const stopMic = useCallback(async () => {
    window.clearTimeout(silenceTimerRef.current)
    startingMicRef.current = false
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

  const clearDrillSession = useCallback(() => {
    void stopMic()
    stopSpeaking()
    turnLockRef.current = false
    window.clearTimeout(verdictTimerRef.current)
    setBusy(false)
    setMessages([])
    setActiveDrill(null)
    streakRef.current = 0
    setStreak(0)
    setHits(0)
    setMisses(0)
    setVerdictFlash(null)
    setError('')
    setPartnerHold(null)
    setYouLive(null)
    setFsTypeOpen(false)
    setVoiceMenuOpen(false)
    ttsGenRef.current += 1
    ttsLiveRef.current = false
    setMood('idle')
    setCaption({ role: 'system', text: EMPTY_CAPTION })
  }, [stopMic])

  const applyDrill = useCallback((drill: PracticePartnerDrill | null) => {
    if (!drill) return
    const justPassed = activeDrillRef.current
    setActiveDrill({ en: drill.en, zh: drill.zh, jyutping: drill.jyutping })
    window.clearTimeout(verdictTimerRef.current)
    if (drill.verdict === 'pass') {
      const nextStreak = streakRef.current + 1
      streakRef.current = nextStreak
      setStreak(nextStreak)
      setHits((n) => n + 1)
      if (justPassed?.zh || justPassed?.en) {
        setScoreboard(
          recordPracticePartnerPass({
            streak: nextStreak,
            category: categoryRef.current,
            zh: justPassed.zh || '',
            en: justPassed.en || '',
          }),
        )
      }
      playPracticePartnerPassSfx()
      setVerdictFlash('pass')
      verdictTimerRef.current = window.setTimeout(() => setVerdictFlash(null), 1800)
    } else if (drill.verdict === 'fail') {
      streakRef.current = 0
      setStreak(0)
      setMisses((n) => n + 1)
      playPracticePartnerFailSfx()
      setVerdictFlash('fail')
      verdictTimerRef.current = window.setTimeout(() => setVerdictFlash(null), 1800)
    } else {
      setVerdictFlash(null)
    }
  }, [])

  const playPartnerReply = useCallback(
    async (reply: string) => {
      if (ttsLiveRef.current) return
      const gen = (ttsGenRef.current += 1)
      ttsLiveRef.current = true
      setMood('speaking')
      setPartnerHold(reply)
      setYouLive(null)
      setCaption({ role: 'partner', text: reply })
      // After the LLM round-trip we are outside the user gesture. Unlock must
      // have run on Talk/Send; still bound speak so a stalled play()/speechSynthesis
      // cannot leave the lab stuck on Speaking forever.
      // Release busy/turn lock before TTS so a second mic tap can barge in.
      setBusy(false)
      turnLockRef.current = false
      // Silence-auto finish and long LLM waits can leave the iPhone context
      // soft — re-arm speaker keep-alive before the loud BufferSource.
      prepareLoudTtsPlayback()
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
      if (ttsGenRef.current !== gen) return
      ttsLiveRef.current = false
      setMood('idle')
      setCaption({ role: 'partner', text: reply })
    },
    [partnerVoice],
  )

  const replayPartnerVoice = useCallback(() => {
    const line = partnerHold
    if (!line || ttsLiveRef.current || mood === 'speaking' || listening) return
    unlockTtsPlayback({ force: true })
    void playPartnerReply(line)
  }, [listening, mood, partnerHold, playPartnerReply])

  const flashDrillZh = useCallback((event: { stopPropagation: () => void }) => {
    event.stopPropagation()
    setZhFlash((n) => n + 1)
    replayPartnerVoice()
  }, [replayPartnerVoice])

  const startDrill = useCallback(async () => {
    if (turnLockRef.current || activeDrillRef.current) return
    turnLockRef.current = true
    setBusy(true)
    setError('')
    setYouLive(null)
    setFsTypeOpen(false)
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
        difficultyRef.current,
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

      try {
        const { reply, drill } = await postPracticePartnerChat(
          nextMessages,
          target,
          categoryRef.current,
          difficultyRef.current,
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
    [applyDrill, playPartnerReply, partnerVoice, startDrill],
  )

  const finishUtterance = useCallback(async () => {
    window.clearTimeout(silenceTimerRef.current)
    const spoken = finalsRef.current.trim()
    finalsRef.current = ''
    // Do not wait for recognition.stop() before judging — iOS teardown is slow
    // and sat in front of DeepSeek + Azure, which felt like a long TTS delay.
    const stopping = stopMic()
    // Silence-auto stop is outside Stop & judge — still flip iOS back to the
    // speaker route so the next loud reply is not soft.
    unlockTtsPlayback({ force: true })
    prepareLoudTtsPlayback()
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
    if (listening || startingMicRef.current) return
    const canBargeIn = mood === 'speaking' || isTtsPlaying()
    if ((busy || turnLockRef.current) && !canBargeIn) return
    setError('')
    finalsRef.current = ''
    // Must run in the Talk gesture so later Azure/browser TTS after DeepSeek is allowed.
    unlockTtsPlayback()

    const apple = isAppleTouchDevice()
    startingMicRef.current = true

    // Desktop: prime getUserMedia in this gesture so Chrome shows the site mic
    // prompt (Solo/Conversation path). Release tracks before Web Speech — an
    // exclusive gUM lock blocks SpeechRecognition from hearing.
    // Apple: skip gUM before recognition.start() — it cancels barge-in capture.
    if (!apple) {
      const blocked = micBlockedMessage()
      if (blocked) {
        startingMicRef.current = false
        setError(blocked)
        setMood('idle')
        return
      }
      const primed = await unlockMicrophone()
      if (!primed) {
        startingMicRef.current = false
        setError('Microphone permission denied. Allow mic access for this site and try again.')
        setMood('idle')
        return
      }
      stopMediaStream(primed)
    }

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

    const session = createWebSpeechSession(handlers, 'yue', { bilingualYueEn: true })
    if (!session) {
      startingMicRef.current = false
      setError('Web Speech is not available in this browser. Type a line instead.')
      setMood('idle')
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
      // Drop the near-silent speaker tap so Web Speech echo-cancel stays clean.
      // Do this before start() — it is not cancel()/load()/silent-WAV.
      hushTtsSpeakerForMic()
      // Live-mic invariant: start STT before pausing TTS on Apple barge-in.
      await session.start()
      startingMicRef.current = false
      if (isTtsPlaying()) {
        stopSpeaking({ preserveSession: apple })
      }
    } catch (e) {
      startingMicRef.current = false
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
    clearDrillSession()
  }, [clearDrillSession])

  const pickTopic = useCallback(
    (next: PracticePartnerCategory) => {
      const id = resolvePracticePartnerCategory(next)
      setCategory(id)
      writePartnerCategory(id)
      categoryRef.current = id
      const level = resolvePracticePartnerDifficulty(difficultyRef.current)
      setDifficulty(level)
      writePartnerDifficulty(level)
      difficultyRef.current = level
      clearDrillSession()
      setTopicReady(true)
      setFullscreen(false)
    },
    [clearDrillSession],
  )

  const changeTopic = useCallback(() => {
    if (busy || listening) return
    clearDrillSession()
    setFullscreen(false)
    setScoresOpen(false)
    setTopicReady(false)
  }, [busy, clearDrillSession, listening])

  const onCategoryChange = (next: PracticePartnerCategory) => {
    pickTopic(next)
  }

  const onDifficultyPick = (next: PracticePartnerDifficulty) => {
    const id = resolvePracticePartnerDifficulty(next)
    setDifficulty(id)
    writePartnerDifficulty(id)
    difficultyRef.current = id
  }

  useEffect(() => {
    return bindMicBackgroundRelease(() => {
      // Desktop mic-permission UI briefly marks the document hidden. Do not
      // abort during the getUserMedia / recognition.start handshake (Solo #605).
      if (
        !shouldForceReleaseMicOnBackground({
          apple: isAppleTouchDevice(),
          live: listening && !startingMicRef.current,
          hasSession: Boolean(sessionRef.current) && !startingMicRef.current,
        })
      ) {
        return
      }
      void stopMic()
    })
  }, [listening, stopMic])

  useEffect(() => {
    return () => {
      window.clearTimeout(silenceTimerRef.current)
      window.clearTimeout(verdictTimerRef.current)
      void stopMic()
      stopSpeaking()
    }
  }, [stopMic])

  useEffect(() => {
    if (!fullscreen) {
      setFsTypeOpen(false)
      setVoiceMenuOpen(false)
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
        if (voiceMenuOpen) {
          setVoiceMenuOpen(false)
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
  }, [fullscreen, fsTypeOpen, voiceMenuOpen])

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
      placement: 'stage',
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
    setVoiceMenuOpen(false)
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
  const difficultyMeta =
    PRACTICE_PARTNER_DIFFICULTIES.find((d) => d.id === difficulty) ||
    PRACTICE_PARTNER_DIFFICULTIES[1]

  const drillKicker = verdictFlash === 'fail'
    ? 'Try again'
    : verdictFlash === 'pass'
      ? 'Next phrase'
      : activeDrill
        ? 'Say this'
        : categoryMeta.labelEn

  const partnerSpeaker = voiceSpeakerName(partnerVoice)
  const speakerName =
    displayPrimary.role === 'you' ? 'You' : partnerSpeaker

  const onPartnerVoiceChange = (next: string) => {
    const id = resolveYueVoice(next)
    setPartnerVoice(id)
    writePartnerVoice(id)
    setVoiceMenuOpen(false)
  }

  if (!topicReady) {
    return (
      <section className="partner-lab partner-lab--topic" aria-label="Choose Practice Partner topic">
        <header className="partner-lab-head partner-lab-head--topic">
          <div>
            <p className="partner-lab-kicker">
              {entry === 'hub' ? 'Beta' : 'Internal · not in app'}
            </p>
            <h2 className="partner-lab-title">Choose difficulty & topic</h2>
            <p className="partner-lab-lede">
              Difficulty sets how much English 港灣 uses. Then pick a deck and begin.
            </p>
          </div>
          <div className="partner-lab-scores-wrap">
            <button
              type="button"
              className={`partner-lab-scores-toggle${scoresOpen ? ' is-open' : ''}`}
              aria-expanded={scoresOpen}
              aria-controls="partner-lab-high-scores"
              aria-label="High scores"
              onClick={() => setScoresOpen((open) => !open)}
            >
              {CROWN_ICON}
              <span className="partner-lab-scores-spark" aria-hidden="true" />
              <span className="partner-lab-scores-spark is-b" aria-hidden="true" />
              <span className="partner-lab-scores-spark is-c" aria-hidden="true" />
            </button>
            {scoresOpen ? (
              <div
                id="partner-lab-high-scores"
                className="partner-lab-scores"
                role="region"
                aria-label="Practice Partner high scores"
              >
                <p className="partner-lab-scores-summary">
                  <span>
                    <strong>{scoreboard.bestStreak}</strong> best streak
                  </span>
                  <span>
                    <strong>{scoreboard.totalPasses}</strong> passes logged
                  </span>
                </p>
                {scoreboard.recent.length ? (
                  <ol className="partner-lab-scores-list">
                    {scoreboard.recent.map((row, i) => {
                      const deck =
                        PRACTICE_PARTNER_CATEGORIES.find((c) => c.id === row.category) ||
                        PRACTICE_PARTNER_CATEGORIES[2]
                      return (
                        <li key={`${row.at}-${row.zh}-${i}`}>
                          <span className="partner-lab-scores-when">
                            {formatPracticePartnerScoreAt(row.at)}
                            {row.streak ? ` · streak ${row.streak}` : ''}
                            {' · '}
                            {deck.labelEn}
                          </span>
                          <span className="partner-lab-scores-zh" lang="zh-HK">
                            {row.zh || row.en}
                          </span>
                          {row.zh && row.en ? (
                            <span className="partner-lab-scores-en">{row.en}</span>
                          ) : null}
                        </li>
                      )
                    })}
                  </ol>
                ) : (
                  <p className="partner-lab-scores-empty">
                    No passes yet. Clear a phrase to start the log.
                  </p>
                )}
              </div>
            ) : null}
          </div>
        </header>

        <div className="partner-lab-chooser-block">
          <p className="partner-lab-chooser-label" id="partner-lab-diff-label">
            Difficulty
          </p>
          <ul
            className="partner-lab-diff-list"
            role="listbox"
            aria-labelledby="partner-lab-diff-label"
          >
            {PRACTICE_PARTNER_DIFFICULTIES.map((d) => (
              <li key={d.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={difficulty === d.id}
                  className={`partner-lab-diff-item partner-lab-diff-item--${d.id}${
                    difficulty === d.id ? ' is-current' : ''
                  }`}
                  onClick={() => onDifficultyPick(d.id)}
                >
                  <span className="partner-lab-diff-en">{d.labelEn}</span>
                  <span className="partner-lab-diff-zh" lang="zh-HK">
                    {d.labelZh}
                  </span>
                  <span className="partner-lab-diff-hint">{d.hint}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="partner-lab-chooser-block">
          <p className="partner-lab-chooser-label" id="partner-lab-topic-label">
            Topic
          </p>
          <ul
            className="partner-lab-topic-list"
            role="list"
            aria-labelledby="partner-lab-topic-label"
          >
            {PRACTICE_PARTNER_CATEGORIES.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  className={`partner-lab-topic-item${category === c.id ? ' is-current' : ''}`}
                  onClick={() => onCategoryChange(c.id)}
                >
                  <span className="partner-lab-topic-en">{c.labelEn}</span>
                  <span className="partner-lab-topic-zh" lang="zh-HK">
                    {c.labelZh}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </section>
    )
  }

  return (
    <section
      className={`partner-lab${fullscreen ? ' is-fullscreen' : ''}${
        verdictFlash === 'fail' ? ' is-fail-flash' : ''
      }`}
      aria-label="Practice Partner lab"
    >
      <header className="partner-lab-head">
        <div>
          <p className="partner-lab-kicker">
            {entry === 'hub' ? 'Beta' : 'Internal · not in app'}
          </p>
          <h2 className="partner-lab-title">Practice Partner</h2>
          <p className="partner-lab-lede">
            Follow along! The practice partner will start off and repeat.
          </p>
        </div>
        <div className="partner-lab-scores-wrap">
          <button
            type="button"
            className={`partner-lab-scores-toggle${scoresOpen ? ' is-open' : ''}`}
            aria-expanded={scoresOpen}
            aria-controls="partner-lab-high-scores"
            aria-label="High scores"
            onClick={() => setScoresOpen((open) => !open)}
          >
            {CROWN_ICON}
            <span className="partner-lab-scores-spark" aria-hidden="true" />
            <span className="partner-lab-scores-spark is-b" aria-hidden="true" />
            <span className="partner-lab-scores-spark is-c" aria-hidden="true" />
          </button>
          {scoresOpen ? (
            <div
              id="partner-lab-high-scores"
              className="partner-lab-scores"
              role="region"
              aria-label="Practice Partner high scores"
            >
              <p className="partner-lab-scores-summary">
                <span>
                  <strong>{scoreboard.bestStreak}</strong> best streak
                </span>
                <span>
                  <strong>{scoreboard.totalPasses}</strong> passes logged
                </span>
              </p>
              {scoreboard.recent.length ? (
                <ol className="partner-lab-scores-list">
                  {scoreboard.recent.map((row, i) => {
                    const deck =
                      PRACTICE_PARTNER_CATEGORIES.find((c) => c.id === row.category) ||
                      PRACTICE_PARTNER_CATEGORIES[2]
                    return (
                      <li key={`${row.at}-${row.zh}-${i}`}>
                        <span className="partner-lab-scores-when">
                          {formatPracticePartnerScoreAt(row.at)}
                          {row.streak ? ` · streak ${row.streak}` : ''}
                          {' · '}
                          {deck.labelEn}
                        </span>
                        <span className="partner-lab-scores-zh" lang="zh-HK">
                          {row.zh || row.en}
                        </span>
                        {row.zh && row.en ? (
                          <span className="partner-lab-scores-en">{row.en}</span>
                        ) : null}
                      </li>
                    )
                  })}
                </ol>
              ) : (
                <p className="partner-lab-scores-empty">
                  No passes yet. Clear a phrase to start the log.
                </p>
              )}
            </div>
          ) : null}
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

        {fullscreen && partnerHold ? (
          <button
            type="button"
            className={`partner-lab-replay${mood === 'speaking' ? ' is-speaking' : ''}`}
            disabled={mood === 'speaking' || listening}
            aria-label={mood === 'speaking' ? 'Partner is speaking' : 'Replay partner'}
            onClick={(event) => {
              event.stopPropagation()
              replayPartnerVoice()
            }}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className="partner-lab-replay-icon">
              <path
                fill="currentColor"
                d="M3 9v6h4l5 5V4L7 9H3zm13.5 3a4.5 4.5 0 0 0-2.5-4.03v8.06A4.5 4.5 0 0 0 16.5 12zM14 3.23v2.06a7 7 0 0 1 0 13.42v2.06a9 9 0 0 0 0-17.54z"
              />
            </svg>
            <span className="partner-lab-replay-eq" aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
              <i />
            </span>
          </button>
        ) : null}

        {verdictFlash === 'pass' ? (
          <div className="partner-lab-pass-burst" aria-hidden="true">
            <span className="partner-lab-pass-halo" />
            <svg className="partner-lab-pass-mark" viewBox="0 0 80 80">
              <circle className="partner-lab-pass-ring" cx="40" cy="40" r="28" />
              <path className="partner-lab-pass-check" d="M24 42 L35.5 53 L57 28" />
            </svg>
          </div>
        ) : null}

        {verdictFlash === 'fail' ? (
          <div className="partner-lab-fail-burst" aria-hidden="true">
            <span className="partner-lab-fail-edge" />
            <span className="partner-lab-fail-halo" />
            <svg className="partner-lab-fail-mark" viewBox="0 0 80 80">
              <circle className="partner-lab-fail-ring" cx="40" cy="40" r="28" />
              <path className="partner-lab-fail-x" d="M28 28 L52 52 M52 28 L28 52" />
            </svg>
          </div>
        ) : null}

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
            <span className="partner-lab-drill-kicker-main">
              {drillKicker}
              <span className="partner-lab-drill-cat" lang="zh-HK">
                {' '}
                · {categoryMeta.labelZh}
              </span>
              <span className="partner-lab-drill-diff">
                {' '}
                · {difficultyMeta.labelEn}
              </span>
            </span>
            {hits + misses > 0 || scoreboard.bestStreak > 0 ? (
              <span className="partner-lab-drill-streak">
                {streak} streak
                {scoreboard.bestStreak ? ` · best ${scoreboard.bestStreak}` : ''}
                {hits ? ` · ${hits} hit${hits === 1 ? '' : 's'}` : ''}
                {misses ? ` · ${misses} miss` : ''}
              </span>
            ) : null}
          </p>
          {activeDrill ? (
            <>
              <button
                type="button"
                className={`partner-lab-drill-zh${zhFlash ? ' is-jade-flash' : ''}`}
                lang="zh-HK"
                aria-label={
                  mood === 'speaking' || listening ? 'Highlight phrase' : 'Replay phrase'
                }
                onClick={flashDrillZh}
              >
                {[...activeDrill.zh].map((ch, i) => (
                  <span
                    key={`${zhFlash}-${i}`}
                    className={zhFlash ? 'is-jade' : undefined}
                    style={zhFlash ? { animationDelay: `${i * 32}ms` } : undefined}
                  >
                    {ch}
                  </span>
                ))}
              </button>
              <p className="partner-lab-drill-en">{activeDrill.en}</p>
              <p className="partner-lab-drill-jp">{activeDrill.jyutping}</p>
            </>
          ) : (
            <p className="partner-lab-drill-empty">
              {difficultyMeta.labelEn} · {categoryMeta.labelEn} · {categoryMeta.labelZh}
            </p>
          )}
        </div>

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
                className="partner-lab-fs-change-topic"
                aria-label="Change topic"
                disabled={busy || listening}
                onClick={(event) => {
                  event.stopPropagation()
                  changeTopic()
                }}
              >
                Topic
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
            <div className={`partner-lab-voice popup${voiceMenuOpen ? ' is-open' : ''}`}>
              <input
                type="checkbox"
                id="partner-lab-voice-toggle"
                checked={voiceMenuOpen}
                disabled={busy || listening}
                onChange={(e) => setVoiceMenuOpen(e.target.checked)}
                aria-label="Partner voice menu"
              />
              <label
                className="burger"
                htmlFor="partner-lab-voice-toggle"
                title="Partner voice"
              >
                {PARTNER_MIC_ICON}
              </label>
              <nav className="popup-window" aria-label="Partner voice">
                <legend>Partner voice</legend>
                <ul>
                  {YUE_VOICES.map((v) => (
                    <li key={v.id}>
                      <button
                        type="button"
                        className={partnerVoice === v.id ? 'is-active' : undefined}
                        disabled={busy || listening}
                        onClick={() => onPartnerVoiceChange(v.id)}
                      >
                        {PARTNER_MIC_ICON}
                        <span>{v.labelEn.split('·')[0]?.trim() || v.labelEn}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </nav>
            </div>
            <button
              type="button"
              className={`partner-lab-talk${listening ? ' is-live' : ''}${busy && !listening ? '' : ' is-pulse'}`}
              disabled={busy && !listening}
              onClick={toggleTalk}
            >
              <span className="partner-lab-talk-label">{talkLabel}</span>
            </button>
            <button
              type="button"
              className="partner-lab-change-topic"
              disabled={busy || listening}
              onClick={changeTopic}
            >
              Change topic
            </button>
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
    </section>
  )
}
