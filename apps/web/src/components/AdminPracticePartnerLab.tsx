import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from 'react'
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
import {
  betterLineMarks,
  deliveryForPartnerTurn,
  litHanCount,
  partnerCaption,
  partnerCaptionLayout,
  phraseHoldMs,
  reactionHoldMs,
  retryChunk,
  withLockedPhrase,
  type PartnerPerformance,
} from '../lib/practicePartnerPerformance'
import { glossForChar, isHanChar } from '../lib/charGloss'
import { readLastTalk, writeLastTalk } from '../lib/practicePartnerLastTalk'
import { missReasonFallback } from '../lib/practicePartnerMissReason'
import {
  noteBetterLine,
  notePartnerLine,
  noteYouSaid,
  type PartnerThreadTurn,
} from '../lib/practicePartnerThread'
import { keptSceneBundle, sceneLineAt, scenePlaceFor, sceneTurnCount } from '../lib/practicePartnerScene'
import {
  PRACTICE_PARTNER_GOALS,
  PRACTICE_PARTNER_PERSONALITIES,
  PRACTICE_PARTNER_SITUATION_GROUPS,
  situationsInGroup,
  practicePartnerGoal,
  practicePartnerPersonality,
  practicePartnerSituation,
  type PracticePartnerGoalId,
  type PracticePartnerPersonalityId,
  type PracticePartnerSituationId,
} from '../lib/practicePartnerSituation'
import {
  beginPartnerSitting,
  linesForCategory,
  readPartnerSitting,
  rememberPartnerLine,
  rememberPartnerMiss,
  reviewBankForCategory,
  writePartnerSitting,
  type PartnerKeptLine,
  type PartnerSitting,
  type PartnerSittingMiss,
} from '../lib/practicePartnerSitting'
import { toneNoteForSyllable, type PartnerToneNote } from '../lib/practicePartnerToneNote'
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
  adoptPracticePartnerCloudScore,
  formatPracticePartnerScoreAt,
  readPracticePartnerScores,
  recordPracticePartnerPass,
  type PracticePartnerScores,
} from '../lib/practicePartnerScores'
import {
  fetchPracticePartnerLeaderboard,
  putPracticePartnerLeaderboard,
  type PracticePartnerLeaderboardPayload,
} from '../lib/api'
import { getSession } from '../lib/auth'
import { PracticePartnerPodium } from './PracticePartnerPodium'
import { PracticePartnerPath } from './PracticePartnerPath'
import {
  creditPracticePartnerPath,
  practicePartnerUnitForMove,
  readPracticePartnerPath,
  writePracticePartnerPath,
  type PathCreditNote,
  type PathFresh,
} from '../lib/practicePartnerPath'
import { JyutpingChaoText } from '../landing/learn/JyutpingChaoText'
import { PartnerVhsTransition } from './vhs/PartnerVhsTransition'
import { prefersReducedMotion } from './vhs/vhsEase'
import {
  PRACTICE_PARTNER_MOVE_LABEL,
  finishLineCloze,
  planPracticePartnerAdvance,
  practicePartnerCardShows,
  practicePartnerXpForPass,
  type PracticePartnerMove,
} from '../lib/practicePartnerLadder'
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

export type PartnerMood = 'idle' | 'listening' | 'thinking' | 'reacting' | 'speaking'

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
  { id: 'reacting', label: 'Reacting', hint: 'Judgment before the phrase' },
  { id: 'speaking', label: 'Speaking', hint: 'The phrase, loud and steady' },
]

const MOOD_ORBIT: Record<PartnerMood, Partial<OrbitalSphereOptions>> = {
  idle: {
    speed: 1.08,
    scale: 1.06,
    particleOpacity: 0.72,
    orbitOpacity: 0.4,
    haloOpacity: 0.3,
    hue: 0,
  },
  listening: {
    speed: 1.2,
    scale: 1.12,
    particleOpacity: 0.88,
    orbitOpacity: 0.46,
    haloOpacity: 0.42,
    hue: 0,
  },
  thinking: {
    speed: 0.5,
    scale: 0.94,
    particleOpacity: 0.42,
    orbitOpacity: 0.18,
    haloOpacity: 0.28,
    hue: 0,
  },
  reacting: {
    speed: 1.35,
    scale: 1.06,
    particleOpacity: 0.78,
    orbitOpacity: 0.36,
    haloOpacity: 0.4,
    hue: 0,
  },
  speaking: {
    speed: 1.65,
    scale: 1.16,
    particleOpacity: 0.94,
    orbitOpacity: 0.52,
    haloOpacity: 0.5,
    hue: 0,
  },
}

const SILENCE_MS = 1600

function formatSitting(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds))
  const min = Math.floor(safe / 60)
  const sec = safe % 60
  return `${min}:${String(sec).padStart(2, '0')}`
}

type PartnerSessionKind = 'drill' | 'open' | 'scene' | 'situation'

type PartnerOrbitSheet = 'level' | 'path' | 'scenes' | 'saved'

function isTalk(kind: PartnerSessionKind) {
  return kind === 'open' || kind === 'situation'
}

function performedLine(
  reply: string,
  beats: PartnerPerformance | null,
  phrase: string,
  verdict: 'none' | 'pass' | 'fail',
  streak: number,
  missStreak: number,
): { caption: string; beats: PartnerPerformance | null } {
  const locked = phrase.trim()
  const base =
    beats ??
    (locked
      ? {
          reaction: reply.trim(),
          phrase: locked,
          cue: '',
          delivery: deliveryForPartnerTurn(verdict, { streak, missStreak }),
        }
      : null)
  if (!base?.phrase && !locked) return { caption: reply, beats: null }
  const next = base
    ? withLockedPhrase(base, locked || base.phrase)
    : {
        reaction: '',
        phrase: locked,
        cue: '',
        delivery: deliveryForPartnerTurn(verdict, { streak, missStreak }),
      }
  return { caption: partnerCaption(next) || reply, beats: next.phrase ? next : null }
}

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
function PartnerSituationMix({
  personality,
  goal,
  onPersonality,
  onGoal,
}: {
  personality: PracticePartnerPersonalityId
  goal: PracticePartnerGoalId
  onPersonality: (id: PracticePartnerPersonalityId) => void
  onGoal: (id: PracticePartnerGoalId) => void
}) {
  return (
    <div className="partner-lab-mix-block">
      <p className="partner-lab-chooser-label" id="partner-lab-cast-label">
        Who you meet
      </p>
      <div className="partner-lab-mix" role="group" aria-labelledby="partner-lab-cast-label">
        {PRACTICE_PARTNER_PERSONALITIES.map((row) => (
          <button
            key={row.id}
            type="button"
            className={personality === row.id ? 'is-on' : undefined}
            aria-pressed={personality === row.id}
            onClick={() => onPersonality(row.id)}
          >
            {row.labelEn}
            <span lang="zh-HK">{row.labelZh}</span>
          </button>
        ))}
      </div>
      <p className="partner-lab-chooser-label" id="partner-lab-aim-label">
        What you want
      </p>
      <div className="partner-lab-mix" role="group" aria-labelledby="partner-lab-aim-label">
        {PRACTICE_PARTNER_GOALS.map((row) => (
          <button
            key={row.id}
            type="button"
            className={goal === row.id ? 'is-on' : undefined}
            aria-pressed={goal === row.id}
            onClick={() => onGoal(row.id)}
          >
            {row.labelEn}
            <span lang="zh-HK">{row.labelZh}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

type YouLineHandle = {
  show: (text: string, interim: boolean) => void
  clear: () => void
}

/** Interim STT lives here so the rest of the lab does not render on every partial. */
const PartnerYouLine = forwardRef<
  YouLineHandle,
  {
    listening: boolean
    partnerHold: string | null
    speaker: string
    hostRef: RefObject<HTMLDivElement | null>
    phrase: { zh: string; jyutping: string } | null
    onSyllable: (jp: string) => void
  }
>(function PartnerYouLine({ listening, partnerHold, speaker, hostRef, phrase, onSyllable }, ref) {
  const [line, setLine] = useState<{ text: string; interim: boolean } | null>(null)
  useImperativeHandle(
    ref,
    () => ({
      show(text, interim) {
        setLine((prev) =>
          prev && prev.text === text && prev.interim === interim ? prev : { text, interim },
        )
      },
      clear() {
        setLine(null)
      },
    }),
    [],
  )
  useEffect(() => {
    hostRef.current?.classList.toggle('is-you-live', Boolean(line))
    return () => hostRef.current?.classList.remove('is-you-live')
  }, [hostRef, line])
  if (!line) {
    if (!listening) return null
    return <p className="partner-lab-subtitles-listening">Listening… your words appear here</p>
  }
  return (
    <>
      {phrase ? (
        <div className="partner-lab-subtitles-secondary is-reading">
          <p className="partner-lab-subtitles-script">
            <span lang="zh-HK">{phrase.zh}</span>
            {phrase.jyutping ? (
              <span className="partner-lab-subtitles-jp">
                <JyutpingChaoText text={phrase.jyutping} onSyllable={onSyllable} />
              </span>
            ) : null}
          </p>
        </div>
      ) : partnerHold ? (
        <p className="partner-lab-subtitles-secondary">
          <span className="partner-lab-subtitles-speaker">{speaker}</span>
          <span className="partner-lab-subtitles-secondary-text">{partnerHold}</span>
        </p>
      ) : null}
      <p className={`partner-lab-subtitles-youline${line.interim ? ' is-interim' : ''}`}>
        <span className="partner-lab-subtitles-speaker">You</span>
        <span className="partner-lab-subtitles-youline-text">{line.text}</span>
      </p>
    </>
  )
})

export function AdminPracticePartnerLab({ entry = 'admin' }: { entry?: 'admin' | 'hub' }) {
  const [mood, setMood] = useState<PartnerMood>('idle')
  const moodRef = useRef(mood)
  moodRef.current = mood
  const sittingLabelRef = useRef<HTMLSpanElement>(null)
  const youLineRef = useRef<YouLineHandle>(null)
  const subtitleHostRef = useRef<HTMLDivElement>(null)
  const [caption, setCaption] = useState<SubtitleLine>({
    role: 'system',
    text: EMPTY_CAPTION,
  })
  const [messages, setMessages] = useState<PracticePartnerChatMessage[]>([])
  const [activeDrill, setActiveDrill] = useState<PracticePartnerDrillTarget | null>(null)
  const [streak, setStreak] = useState(0)
  const [hits, setHits] = useState(0)
  const [misses, setMisses] = useState(0)
  const [move, setMove] = useState<PracticePartnerMove>('repeat')
  const [xp, setXp] = useState(0)
  const [verdictFlash, setVerdictFlash] = useState<'pass' | 'fail' | null>(null)
  const [scoreboard, setScoreboard] = useState<PracticePartnerScores>(() =>
    readPracticePartnerScores(),
  )
  const [path, setPath] = useState(() => readPracticePartnerPath())
  const [pathNote, setPathNote] = useState<PathCreditNote | null>(null)
  const [pathFresh, setPathFresh] = useState<PathFresh | null>(null)
  const [board, setBoard] = useState<PracticePartnerLeaderboardPayload | null>(null)
  const [boardLoading, setBoardLoading] = useState(false)
  const boardRequestedRef = useRef(false)
  const [boardError, setBoardError] = useState('')
  const [boardSignedIn, setBoardSignedIn] = useState(false)
  const [scoresOpen, setScoresOpen] = useState(false)
  const [voiceMenuOpen, setVoiceMenuOpen] = useState(false)
  const [topicReady, setTopicReady] = useState(false)
  const [orbitSheet, setOrbitSheet] = useState<PartnerOrbitSheet | null>(null)
  const [listening, setListening] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [draft, setDraft] = useState('')
  const [fullscreen, setFullscreen] = useState(false)
  const [vhsCue, setVhsCue] = useState(0)
  const [fsTypeOpen, setFsTypeOpen] = useState(false)
  const [partnerVoice, setPartnerVoice] = useState<YueVoiceId>(() => readPartnerVoice())
  const [category, setCategory] = useState<PracticePartnerCategory>(() => readPartnerCategory())
  const [difficulty, setDifficulty] = useState<PracticePartnerDifficulty>(() =>
    readPartnerDifficulty(),
  )
  /** Last partner line — stays on screen until the user starts speaking. */
  const [partnerHold, setPartnerHold] = useState<string | null>(null)
  const [spokenBeat, setSpokenBeat] = useState<'reaction' | 'phrase' | 'cue' | null>(null)
  const [sealOpen, setSealOpen] = useState(false)
  const [thread, setThread] = useState<PartnerThreadTurn[]>([])
  const threadRef = useRef<PartnerThreadTurn[]>([])
  threadRef.current = thread
  const [partnerBeats, setPartnerBeats] = useState<PartnerPerformance | null>(null)
  /** Fail correction: what was heard, plus the piece to retry. */
  const [missCard, setMissCard] = useState<{ said: string; chunk: string } | null>(null)
  const [litCount, setLitCount] = useState(0)
  /** Bumps to replay the jade sweep on the drill 漢字. */
  const [zhFlash, setZhFlash] = useState(0)
  const [sessionKind, setSessionKind] = useState<PartnerSessionKind>('drill')
  const [sceneOffer, setSceneOffer] = useState<{
    category: PracticePartnerCategory
    placeEn: string
    placeZh: string
  } | null>(null)
  const [sceneStep, setSceneStep] = useState({ index: 0, total: 0 })
  const [sceneDone, setSceneDone] = useState(false)
  const [recap, setRecap] = useState<{
    lines: PartnerKeptLine[]
    misses: PartnerSittingMiss[]
  } | null>(null)
  const [keptLines, setKeptLines] = useState<PartnerKeptLine[]>(() => readPartnerSitting().lines)
  const [gloss, setGloss] = useState<{ char: string; meaning: string } | null>(null)
  const [tonePop, setTonePop] = useState<PartnerToneNote | null>(null)
  const [whyNote, setWhyNote] = useState('')
  const [correction, setCorrection] = useState<{
    said: string
    en: string
    zh: string
    jyutping: string
    why: string
  } | null>(null)
  const [hintLine, setHintLine] = useState<PracticePartnerDrillTarget | null>(null)
  const [situationId, setSituationId] = useState<PracticePartnerSituationId | null>(null)
  const [personality, setPersonality] = useState<PracticePartnerPersonalityId>('friendly')
  const [goal, setGoal] = useState<PracticePartnerGoalId>('task')

  const draftInputRef = useRef<HTMLInputElement | null>(null)
  const sessionRef = useRef<LiveSession | null>(null)
  const ttsLiveRef = useRef(false)
  const ttsGenRef = useRef(0)
  const beatTimerRef = useRef(0)
  const phraseBeatTimerRef = useRef(0)
  const partnerBeatsRef = useRef<PartnerPerformance | null>(null)
  const lastMissRef = useRef<{ said: string; zh: string; en: string } | null>(null)
  const zhFlashTimerRef = useRef(0)
  /** True while getUserMedia / recognition.start handshake is in flight. */
  const startingMicRef = useRef(false)
  const finalsRef = useRef('')
  const silenceTimerRef = useRef(0)
  const messagesRef = useRef<PracticePartnerChatMessage[]>([])
  const activeDrillRef = useRef<PracticePartnerDrillTarget | null>(null)
  const paintYouLine = (text: string, interim: boolean) => {
    if (moodRef.current !== 'listening') {
      moodRef.current = 'listening'
      setMood('listening')
    }
    youLineRef.current?.show(text, interim)
    const drill = activeDrillRef.current
    const next = drill ? litHanCount(drill.zh, text) : 0
    setLitCount((prev) => (prev === next ? prev : next))
  }
  const categoryRef = useRef<PracticePartnerCategory>(category)
  const difficultyRef = useRef<PracticePartnerDifficulty>(difficulty)
  const turnLockRef = useRef(false)
  const finishRef = useRef<() => void>(() => {})
  const verdictTimerRef = useRef(0)
  const streakRef = useRef(0)
  const missStreakRef = useRef(0)
  const hitsRef = useRef(0)
  const moveRef = useRef<PracticePartnerMove>('repeat')
  const passedRef = useRef<PracticePartnerDrillTarget[]>([])
  const cardIsReviewRef = useRef(false)
  const pendingNextMoveRef = useRef<PracticePartnerMove>('repeat')
  const pendingReviewRef = useRef<PracticePartnerDrillTarget | null>(null)
  const pendingActiveMoveRef = useRef<PracticePartnerMove>('repeat')
  const incomingReviewRef = useRef(false)
  const publishScoreRef = useRef<(scores: PracticePartnerScores) => void>(() => {})
  const pathRef = useRef(path)
  const pathNoteTimerRef = useRef(0)
  const sessionKindRef = useRef<PartnerSessionKind>('drill')
  const situationRef = useRef<PracticePartnerSituationId | null>(null)
  const personalityRef = useRef<PracticePartnerPersonalityId>('friendly')
  const goalRef = useRef<PracticePartnerGoalId>('task')
  const sittingRef = useRef<PartnerSitting>(readPartnerSitting())
  const sceneStepRef = useRef({ index: 0, total: 0 })
  const sceneLinesRef = useRef<PartnerKeptLine[]>([])
  const scenePlaceRef = useRef('')
  const sceneDoneRef = useRef(false)

  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  useEffect(() => () => window.clearTimeout(pathNoteTimerRef.current), [])

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
    let cancelled = false
    void getSession().then((session) => {
      if (!cancelled) setBoardSignedIn(Boolean(session))
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!scoresOpen && orbitSheet !== 'saved') return
    if (boardRequestedRef.current) return
    boardRequestedRef.current = true
    let cancelled = false
    void (async () => {
      setBoardLoading(true)
      try {
        const session = await getSession()
        if (cancelled) return
        setBoardSignedIn(Boolean(session))
        const data = await fetchPracticePartnerLeaderboard(25)
        if (cancelled) return
        setBoard(data)
        setBoardError('')
        if (data.me) {
          setScoreboard((local) => adoptPracticePartnerCloudScore(local, data.me!))
        }
        if (session) {
          const local = readPracticePartnerScores()
          const xp = Math.max(local.xp, data.me?.xp ?? 0)
          const bestStreak = Math.max(local.bestStreak, data.me?.bestStreak ?? 0)
          const totalPasses = Math.max(local.totalPasses, data.me?.totalPasses ?? 0)
          if (xp > 0 || bestStreak > 0 || totalPasses > 0) {
            await putPracticePartnerLeaderboard({ xp, bestStreak, totalPasses })
            const again = await fetchPracticePartnerLeaderboard(25)
            if (cancelled) return
            setBoard(again)
            if (again.me) {
              setScoreboard((prev) => adoptPracticePartnerCloudScore(prev, again.me!))
            }
          }
        }
      } catch (e) {
        if (!cancelled) {
          boardRequestedRef.current = false
          setBoardError(e instanceof Error ? e.message : 'Leaderboard unavailable')
        }
      } finally {
        if (!cancelled) setBoardLoading(false)
      }
    })()
    return () => {
      cancelled = true
      boardRequestedRef.current = false
    }
  }, [scoresOpen, orbitSheet])

  publishScoreRef.current = (scores) => {
    if (!boardSignedIn) return
    void (async () => {
      try {
        await putPracticePartnerLeaderboard({
          xp: scores.xp,
          bestStreak: scores.bestStreak,
          totalPasses: scores.totalPasses,
        })
        const data = await fetchPracticePartnerLeaderboard(25)
        setBoard(data)
        setBoardError('')
        if (data.me) {
          setScoreboard((local) => adoptPracticePartnerCloudScore(local, data.me!))
        }
      } catch {
        /* Local high-score log still stands when the board is offline. */
      }
    })()
  }

  useEffect(() => {
    const label = sittingLabelRef.current
    if (!topicReady) {
      if (label) label.textContent = '0:00'
      return undefined
    }
    const started = Date.now()
    const paint = () => {
      const el = sittingLabelRef.current
      if (!el) return
      el.textContent = formatSitting(Math.floor((Date.now() - started) / 1000))
    }
    paint()
    const id = window.setInterval(paint, 1000)
    return () => window.clearInterval(id)
  }, [topicReady])

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
    missStreakRef.current = 0
    hitsRef.current = 0
    moveRef.current = 'repeat'
    passedRef.current = []
    cardIsReviewRef.current = false
    pendingNextMoveRef.current = 'repeat'
    pendingReviewRef.current = null
    pendingActiveMoveRef.current = 'repeat'
    incomingReviewRef.current = false
    setMove('repeat')
    setXp(0)
    setStreak(0)
    setHits(0)
    setMisses(0)
    setVerdictFlash(null)
    setError('')
    setPartnerHold(null)
    setPartnerBeats(null)
    youLineRef.current?.clear()
    setFsTypeOpen(false)
    setVoiceMenuOpen(false)
    window.clearTimeout(beatTimerRef.current)
    window.clearTimeout(phraseBeatTimerRef.current)
    ttsGenRef.current += 1
    ttsLiveRef.current = false
    partnerBeatsRef.current = null
    lastMissRef.current = null
    setMissCard(null)
    setWhyNote('')
    setCorrection(null)
    setHintLine(null)
    setMood('idle')
    setCaption({ role: 'system', text: EMPTY_CAPTION })
    setVhsCue(0)
  }, [stopMic])

  const commitSitting = useCallback((next: PartnerSitting) => {
    sittingRef.current = next
    writePartnerSitting(next)
    setKeptLines(next.lines)
  }, [])

  const applyDrill = useCallback((drill: PracticePartnerDrill | null) => {
    if (!drill) return
    const kind = sessionKindRef.current
    const justPassed = activeDrillRef.current
    setGloss(null)
    setTonePop(null)
    setActiveDrill({ en: drill.en, zh: drill.zh, jyutping: drill.jyutping })
    window.clearTimeout(verdictTimerRef.current)
    if (drill.verdict === 'pass') {
      const nextStreak = streakRef.current + 1
      streakRef.current = nextStreak
      missStreakRef.current = 0
      hitsRef.current += 1
      const passedAReview = cardIsReviewRef.current
      if (kind === 'drill' && justPassed?.zh) {
        if (passedAReview) {
          passedRef.current = passedRef.current.filter((row) => row.zh !== justPassed.zh)
        } else if (!passedRef.current.some((row) => row.zh === justPassed.zh)) {
          passedRef.current = [...passedRef.current, justPassed].slice(-8)
        }
        commitSitting(
          rememberPartnerLine(sittingRef.current, {
            en: justPassed.en,
            zh: justPassed.zh,
            jyutping: justPassed.jyutping,
            category: categoryRef.current,
          }),
        )
      }
      if (kind === 'drill') {
        const gained = practicePartnerXpForPass(pendingActiveMoveRef.current, passedAReview)
        setXp((n) => n + gained)
        moveRef.current = pendingNextMoveRef.current
        setMove(moveRef.current)
        cardIsReviewRef.current = incomingReviewRef.current
        incomingReviewRef.current = false
        if (justPassed?.zh || justPassed?.en) {
          const nextScores = recordPracticePartnerPass({
            streak: nextStreak,
            category: categoryRef.current,
            zh: justPassed.zh || '',
            en: justPassed.en || '',
            xpGain: gained,
          })
          setScoreboard(nextScores)
          publishScoreRef.current(nextScores)
        }
        const credited = creditPracticePartnerPath(
          pathRef.current,
          categoryRef.current,
          pendingActiveMoveRef.current,
        )
        pathRef.current = credited.next
        writePracticePartnerPath(credited.next)
        setPath(credited.next)
        setPathFresh(credited.fresh)
        if (credited.note) {
          setPathNote(credited.note)
          window.clearTimeout(pathNoteTimerRef.current)
          pathNoteTimerRef.current = window.setTimeout(() => setPathNote(null), 2600)
          if (credited.note.kind === 'section') {
            const place = scenePlaceFor(categoryRef.current)
            const kept = linesForCategory(sittingRef.current.lines, categoryRef.current)
            if (place && kept.length) {
              setSceneOffer({
                category: categoryRef.current,
                placeEn: place.placeEn,
                placeZh: place.placeZh,
              })
            }
          }
        }
      }
      setStreak(nextStreak)
      setHits(hitsRef.current)
      playPracticePartnerPassSfx()
      setVerdictFlash('pass')
      verdictTimerRef.current = window.setTimeout(() => setVerdictFlash(null), 1800)
    } else if (drill.verdict === 'fail') {
      streakRef.current = 0
      missStreakRef.current += 1
      if (kind === 'drill') {
        moveRef.current = 'repeat'
        setMove('repeat')
      }
      setStreak(0)
      setMisses((n) => n + 1)
      if (justPassed?.zh) {
        commitSitting(
          rememberPartnerMiss(sittingRef.current, {
            said: lastMissRef.current?.said || justPassed.zh,
            zh: justPassed.zh,
            en: justPassed.en,
          }),
        )
      }
      playPracticePartnerFailSfx()
      setVerdictFlash('fail')
      verdictTimerRef.current = window.setTimeout(() => setVerdictFlash(null), 1800)
    } else {
      setVerdictFlash(null)
      if (isTalk(kind) && drill.zh && drill.en) {
        commitSitting(
          rememberPartnerLine(sittingRef.current, {
            en: drill.en,
            zh: drill.zh,
            jyutping: drill.jyutping,
            category: kind === 'situation' ? situationRef.current || 'open' : 'open',
          }),
        )
      }
    }
  }, [commitSitting])

  const playPartnerReply = useCallback(
    async (reply: string, beats?: PartnerPerformance | null) => {
      if (ttsLiveRef.current) return
      const gen = (ttsGenRef.current += 1)
      ttsLiveRef.current = true
      partnerBeatsRef.current = beats ?? null
      const reacting = Boolean(beats?.reaction.trim())
      setMood(reacting ? 'reacting' : 'speaking')
      setPartnerHold(reply)
      setPartnerBeats(beats ?? null)
      youLineRef.current?.clear()
      setCaption({ role: 'partner', text: reply })
      window.clearTimeout(beatTimerRef.current)
      window.clearTimeout(phraseBeatTimerRef.current)
      const reactionMs = reacting && beats ? reactionHoldMs(beats.reaction) : 0
      const phraseMs = beats?.phrase ? phraseHoldMs(beats.phrase) : 0
      const hasCue = Boolean(beats?.cue.trim())
      setSpokenBeat(reactionMs ? 'reaction' : beats?.phrase ? 'phrase' : null)
      if (reactionMs) {
        beatTimerRef.current = window.setTimeout(() => {
          if (ttsGenRef.current !== gen || !ttsLiveRef.current) return
          setMood('speaking')
          setSpokenBeat('phrase')
        }, reactionMs)
      }
      if (hasCue) {
        phraseBeatTimerRef.current = window.setTimeout(() => {
          if (ttsGenRef.current !== gen || !ttsLiveRef.current) return
          setSpokenBeat('cue')
        }, reactionMs + phraseMs)
      }
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
          speakText(reply, 'yue', partnerVoice, { loud: true, performance: beats }),
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
      } finally {
        window.clearTimeout(beatTimerRef.current)
        window.clearTimeout(phraseBeatTimerRef.current)
      }
      if (ttsGenRef.current !== gen) return
      ttsLiveRef.current = false
      setSpokenBeat(null)
      setMood((current) => (current === 'listening' ? current : 'idle'))
      setCaption({ role: 'partner', text: reply })
    },
    [partnerVoice],
  )

  const playPhrase = useCallback(
    async (zh: string) => {
      if (ttsLiveRef.current) return
      const gen = (ttsGenRef.current += 1)
      ttsLiveRef.current = true
      window.clearTimeout(beatTimerRef.current)
      window.clearTimeout(phraseBeatTimerRef.current)
      setSpokenBeat('phrase')
      setMood('speaking')
      prepareLoudTtsPlayback()
      try {
        await Promise.race([
          speakText(zh, 'yue', partnerVoice, { loud: true }),
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
      setSpokenBeat(null)
      setMood((current) => (current === 'listening' ? current : 'idle'))
    },
    [partnerVoice],
  )

  const replayPartnerVoice = useCallback(() => {
    const line = partnerHold
    if (!line || ttsLiveRef.current || mood === 'speaking' || mood === 'reacting' || listening) return
    unlockTtsPlayback({ force: true })
    void playPartnerReply(line, partnerBeatsRef.current)
  }, [listening, mood, partnerHold, playPartnerReply])

  const replayPhrase = useCallback(() => {
    const zh = activeDrillRef.current?.zh.trim()
    if (!zh || ttsLiveRef.current || mood === 'speaking' || mood === 'reacting' || listening) return
    unlockTtsPlayback({ force: true })
    void playPhrase(zh)
  }, [listening, mood, playPhrase])

  const flashDrillZh = useCallback((event: { stopPropagation: () => void }) => {
    event.stopPropagation()
    setZhFlash((n) => n + 1)
    window.clearTimeout(zhFlashTimerRef.current)
    zhFlashTimerRef.current = window.setTimeout(() => setZhFlash(0), 980)
    replayPhrase()
  }, [replayPhrase])

  const startDrill = useCallback(async () => {
    if (turnLockRef.current || activeDrillRef.current) return
    turnLockRef.current = true
    setBusy(true)
    setError('')
    youLineRef.current?.clear()
    setFsTypeOpen(false)
    setMood('thinking')
    const kind = sessionKindRef.current
    const situation = practicePartnerSituation(situationRef.current)
    const deck = PRACTICE_PARTNER_CATEGORIES.find((c) => c.id === categoryRef.current)
    const sceneLine =
      kind === 'scene' ? sceneLineAt(sceneLinesRef.current, sceneStepRef.current.index) : null
    setCaption({
      role: 'system',
      text:
        isTalk(kind)
          ? kind === 'situation'
            ? `港灣 is setting ${situation?.placeEn || 'the situation'}…`
            : '港灣 is opening the conversation…'
          : kind === 'scene'
            ? `港灣 is setting ${scenePlaceRef.current || 'the scene'}…`
            : `港灣 is picking a ${deck?.labelEn.toLowerCase() || 'common'} line…`,
    })
    try {
      lastMissRef.current = null
      const { reply, drill, beats } = await postPracticePartnerChat(
        messagesRef.current,
        sceneLine
          ? { en: sceneLine.en, zh: sceneLine.zh, jyutping: sceneLine.jyutping }
          : null,
        categoryRef.current,
        difficultyRef.current,
        {
          streak: 0,
          missStreak: 0,
          move: 'repeat',
          nextMove: 'repeat',
          mode: kind,
          place:
            kind === 'scene'
              ? scenePlaceRef.current
              : situation
                ? `${situation.placeEn} (${situation.placeZh})`
                : null,
          sceneTurn: kind === 'scene' ? sceneStepRef.current.index + 1 : null,
          sceneTurns: kind === 'scene' ? sceneStepRef.current.total : null,
          situation: situationRef.current,
          personality: personalityRef.current,
          goal: goalRef.current,
          kept: sittingRef.current.lines.slice(-8).map((line) => ({
            en: line.en,
            zh: line.zh,
            jyutping: line.jyutping,
          })),
        },
      )
      const performed = performedLine(
        reply,
        beats,
        drill?.zh || beats?.phrase || '',
        drill?.verdict ?? 'none',
        0,
        0,
      )
      void loadTtsAudio(performed.caption, 'yue', partnerVoice, {
        loud: true,
        performance: performed.beats,
      }).catch(() => undefined)
      const withReply: PracticePartnerChatMessage[] = [
        ...messagesRef.current,
        { role: 'assistant', content: performed.caption },
      ]
      setMessages(withReply)
      setMissCard(null)
      if (drill?.zh) {
        setThread((current) => notePartnerLine(current, { zh: drill.zh, en: drill.en }))
      }
      applyDrill(drill)
      await playPartnerReply(performed.caption, performed.beats)
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
      if (!text || turnLockRef.current || sceneDoneRef.current) return
      const target = activeDrillRef.current
      if (!target) {
        await startDrill()
        return
      }
      const kind = sessionKindRef.current
      turnLockRef.current = true
      setBusy(true)
      setError('')
      youLineRef.current?.clear()
      setFsTypeOpen(false)
      setMood('thinking')
      setCaption({
        role: 'system',
        text: isTalk(kind) ? '港灣 is answering…' : '港灣 is judging…',
      })

      const nextMessages: PracticePartnerChatMessage[] = [
        ...messagesRef.current,
        { role: 'user', content: text },
      ]
      setMessages(nextMessages)
      setThread((current) => noteYouSaid(current, text))

      const plan =
        kind === 'drill'
          ? planPracticePartnerAdvance(hitsRef.current, passedRef.current)
          : { nextMove: moveRef.current, review: null as PracticePartnerDrillTarget | null }
      pendingActiveMoveRef.current = moveRef.current
      pendingNextMoveRef.current = plan.nextMove
      pendingReviewRef.current = plan.review

      const lastMiss = isTalk(kind) ? null : lastMissRef.current
      lastMissRef.current = null
      const situation = practicePartnerSituation(situationRef.current)
      try {
        const { reply, drill: rawDrill, beats, aside } = await postPracticePartnerChat(
          nextMessages,
          isTalk(kind) ? null : target,
          categoryRef.current,
          difficultyRef.current,
          {
            streak: streakRef.current,
            missStreak: missStreakRef.current,
            move: moveRef.current,
            nextMove: plan.nextMove,
            review: kind === 'drill' ? plan.review : null,
            lastMiss,
            mode: kind,
            place:
              kind === 'scene'
                ? scenePlaceRef.current
                : situation
                  ? `${situation.placeEn} (${situation.placeZh})`
                  : null,
            sceneTurn: kind === 'scene' ? sceneStepRef.current.index + 1 : null,
            sceneTurns: kind === 'scene' ? sceneStepRef.current.total : null,
            situation: situationRef.current,
            personality: personalityRef.current,
            goal: goalRef.current,
            kept: sittingRef.current.lines.slice(-8).map((line) => ({
              en: line.en,
              zh: line.zh,
              jyutping: line.jyutping,
            })),
          },
        )
        incomingReviewRef.current = false
        let drill =
          kind !== 'drill'
            ? rawDrill?.verdict === 'fail' && kind === 'scene'
              ? {
                  ...rawDrill,
                  en: target.en,
                  zh: target.zh,
                  jyutping: target.jyutping,
                  verdict: 'fail' as const,
                  advance: false,
                }
              : rawDrill
                ? {
                    ...rawDrill,
                    verdict: isTalk(kind) ? ('none' as const) : rawDrill.verdict,
                    advance: isTalk(kind) ? false : rawDrill.advance,
                  }
                : rawDrill
            : rawDrill?.verdict === 'fail'
              ? {
                  ...rawDrill,
                  en: target.en,
                  zh: target.zh,
                  jyutping: target.jyutping,
                  verdict: 'fail' as const,
                  advance: false,
                }
              : rawDrill?.verdict === 'pass' && plan.review
                ? { ...rawDrill, ...plan.review, verdict: 'pass' as const, advance: true }
                : rawDrill
        if (kind === 'drill' && drill?.verdict === 'pass' && plan.review) incomingReviewRef.current = true
        let phrase =
          isTalk(kind)
            ? drill?.zh || beats?.phrase || ''
            : drill?.verdict === 'fail'
              ? target.zh
              : drill?.verdict === 'pass' && plan.review
                ? plan.review.zh
                : drill?.zh || beats?.phrase || ''
        let closing = false
        if (kind === 'scene' && drill?.verdict === 'pass') {
          const nextIndex = sceneStepRef.current.index + 1
          if (nextIndex >= sceneStepRef.current.total) {
            closing = true
            phrase = target.zh
            drill = {
              ...drill,
              en: target.en,
              zh: target.zh,
              jyutping: target.jyutping,
              verdict: 'pass',
              advance: true,
            }
          } else {
            const next = sceneLineAt(sceneLinesRef.current, nextIndex)
            if (next) {
              sceneStepRef.current = { index: nextIndex, total: sceneStepRef.current.total }
              setSceneStep(sceneStepRef.current)
              drill = {
                ...drill,
                en: next.en,
                zh: next.zh,
                jyutping: next.jyutping,
                verdict: 'pass',
                advance: true,
              }
              phrase = next.zh
            }
          }
        }
        const performed = performedLine(
          reply,
          beats,
          phrase,
          drill?.verdict ?? 'none',
          streakRef.current,
          missStreakRef.current,
        )
        if (closing && performed.beats) {
          performed.beats = { ...performed.beats, cue: 'The road is still there.' }
          performed.caption = partnerCaption(performed.beats)
        }
        void loadTtsAudio(performed.caption, 'yue', partnerVoice, {
          loud: true,
          performance: performed.beats,
        }).catch(() => undefined)
        const withReply: PracticePartnerChatMessage[] = [
          ...nextMessages,
          { role: 'assistant', content: performed.caption },
        ]
        setMessages(withReply)
        setThread((current) => {
          const withBetter =
            isTalk(kind) && aside.correction
              ? noteBetterLine(current, aside.correction.zh)
              : current
          return phrase
            ? notePartnerLine(withBetter, { zh: phrase, en: drill?.en || target.en })
            : withBetter
        })
        if (drill?.verdict === 'fail') {
          setMissCard({ said: text, chunk: retryChunk(target.zh) })
          lastMissRef.current = { said: text, zh: target.zh, en: target.en }
          setWhyNote(aside.why || missReasonFallback(text, target.jyutping))
          setCorrection(null)
        } else if (isTalk(kind) && aside.correction) {
          setMissCard(null)
          setWhyNote('')
          setCorrection({
            said: text,
            en: aside.correction.en,
            zh: aside.correction.zh,
            jyutping: aside.correction.jyutping,
            why: aside.why,
          })
        } else {
          setMissCard(null)
          setWhyNote('')
          setCorrection(null)
        }
        applyDrill(drill)
        if (closing) {
          sceneDoneRef.current = true
          setSceneDone(true)
        }
        await playPartnerReply(performed.caption, performed.beats)
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
      youLineRef.current?.clear()
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
    const canBargeIn = mood === 'speaking' || mood === 'reacting' || isTtsPlaying()
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
        paintYouLine(t, true)
      },
      onFinal: (_lang, text) => {
        const t = text.trim()
        if (!t) return
        finalsRef.current = `${finalsRef.current} ${t}`.trim()
        paintYouLine(finalsRef.current, false)
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
    window.clearTimeout(beatTimerRef.current)
    window.clearTimeout(phraseBeatTimerRef.current)
    if (ttsLiveRef.current || isTtsPlaying()) {
      // In-flight reply must not snap the orb to idle after the mic is live.
      ttsGenRef.current += 1
      ttsLiveRef.current = false
    }
    youLineRef.current?.clear()
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
    if (!listening && sceneDoneRef.current) return
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
      setFullscreen(true)
      if (!prefersReducedMotion()) setVhsCue((n) => n + 1)
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
    sceneDoneRef.current = false
    setSceneDone(false)
    commitSitting(beginPartnerSitting(sittingRef.current))
    if (sessionKindRef.current === 'drill') {
      passedRef.current = reviewBankForCategory(sittingRef.current.lines, categoryRef.current).map(
        (line) => ({ en: line.en, zh: line.zh, jyutping: line.jyutping }),
      )
    }
  }, [clearDrillSession, commitSitting])

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
      sessionKindRef.current = 'drill'
      setSessionKind('drill')
      situationRef.current = null
      setSituationId(null)
      setSceneOffer(null)
      setRecap(null)
      sceneDoneRef.current = false
      setSceneDone(false)
      passedRef.current = reviewBankForCategory(sittingRef.current.lines, id).map((line) => ({
        en: line.en,
        zh: line.zh,
        jyutping: line.jyutping,
      }))
      commitSitting(beginPartnerSitting(sittingRef.current))
      setThread([])
      setTopicReady(true)
      setFullscreen(true)
      setOrbitSheet(null)
    },
    [clearDrillSession, commitSitting],
  )

  const beginOpenChat = useCallback(() => {
    clearDrillSession()
    sessionKindRef.current = 'open'
    setSessionKind('open')
    situationRef.current = null
    setSituationId(null)
    setSceneOffer(null)
    setRecap(null)
    sceneDoneRef.current = false
    setSceneDone(false)
    commitSitting(beginPartnerSitting(sittingRef.current))
    setThread([])
    writeLastTalk({ kind: 'open' })
    setTopicReady(true)
    setFullscreen(true)
    setOrbitSheet(null)
  }, [clearDrillSession, commitSitting])

  const changeTopic = useCallback(() => {
    if (busy || listening) return
    const sitting = sittingRef.current
    const lines = sitting.sessionLines
    const misses = sitting.misses
    clearDrillSession()
    sessionKindRef.current = 'drill'
    setSessionKind('drill')
    situationRef.current = null
    setSituationId(null)
    setSceneOffer(null)
    setGloss(null)
    setTonePop(null)
    sceneDoneRef.current = false
    setSceneDone(false)
    if (lines.length || misses.length) setRecap({ lines, misses })
    commitSitting(beginPartnerSitting(sitting))
    setFullscreen(false)
    setScoresOpen(false)
    setOrbitSheet(lines.length || misses.length || threadRef.current.length ? 'saved' : null)
    setTopicReady(false)
  }, [busy, clearDrillSession, commitSitting, listening])

  const armScene = useCallback(
    (lines: PartnerKeptLine[], placeEn: string, placeZh: string) => {
      const total = sceneTurnCount(lines.length)
      const first = sceneLineAt(lines, 0)
      if (!first || !total || busy || listening) return
      ttsGenRef.current += 1
      ttsLiveRef.current = false
      stopSpeaking()
      sceneLinesRef.current = lines
      sceneStepRef.current = { index: 0, total }
      setSceneStep(sceneStepRef.current)
      scenePlaceRef.current = `${placeEn} (${placeZh})`
      sceneDoneRef.current = false
      setSceneDone(false)
      situationRef.current = null
      setSituationId(null)
      sessionKindRef.current = 'scene'
      setSessionKind('scene')
      setSceneOffer(null)
      setMessages([])
      messagesRef.current = []
      setActiveDrill(null)
      activeDrillRef.current = null
      setMissCard(null)
      setThread([])
      setTopicReady(true)
      setFullscreen(true)
      void startDrill()
    },
    [busy, listening, startDrill],
  )

  const enterScene = useCallback(() => {
    const id = sceneOffer?.category || categoryRef.current
    const lines = linesForCategory(sittingRef.current.lines, id)
    const place = scenePlaceFor(id)
    if (!place) return
    armScene(lines, place.placeEn, place.placeZh)
  }, [armScene, sceneOffer])

  const startKeptScene = useCallback(() => {
    const bundle = keptSceneBundle(sittingRef.current.lines)
    if (!bundle) return
    armScene(bundle.lines, bundle.placeEn, bundle.placeZh)
  }, [armScene])

  const choosePersonality = (id: PracticePartnerPersonalityId) => {
    personalityRef.current = id
    setPersonality(id)
  }

  const chooseGoal = (id: PracticePartnerGoalId) => {
    goalRef.current = id
    setGoal(id)
  }

  const beginSituation = useCallback(
    (id: PracticePartnerSituationId) => {
      const place = practicePartnerSituation(id)
      if (!place) return
      clearDrillSession()
      sessionKindRef.current = 'situation'
      setSessionKind('situation')
      situationRef.current = id
      setSituationId(id)
      scenePlaceRef.current = `${place.placeEn} (${place.placeZh})`
      setSceneOffer(null)
      setRecap(null)
      sceneDoneRef.current = false
      setSceneDone(false)
      commitSitting(beginPartnerSitting(sittingRef.current))
      setThread([])
      writeLastTalk({ kind: 'situation', situation: id })
      setTopicReady(true)
      setFullscreen(true)
      setOrbitSheet(null)
    },
    [clearDrillSession, commitSitting],
  )

  const speakWithHarbor = useCallback(() => {
    const last = readLastTalk()
    if (last?.kind === 'situation') {
      beginSituation(last.situation)
      return
    }
    beginOpenChat()
  }, [beginOpenChat, beginSituation])

  const retryCorrection = useCallback(() => {
    const zh = correction?.zh.trim()
    if (!zh || busy || listening || mood === 'speaking' || mood === 'reacting') return
    unlockTtsPlayback({ force: true })
    void playPhrase(zh)
  }, [busy, correction, listening, mood, playPhrase])

  const askForLine = useCallback(() => {
    if (busy || listening || mood === 'speaking' || mood === 'reacting' || sceneDoneRef.current) return
    const kind = sessionKindRef.current
    const known = kind === 'drill' || kind === 'scene' ? activeDrillRef.current : null
    if (known?.zh) {
      unlockTtsPlayback({ force: true })
      setHintLine(known)
      void playPhrase(known.zh)
      return
    }
    if (!isTalk(kind)) return
    unlockTtsPlayback({ force: true })
    const situation = practicePartnerSituation(situationRef.current)
    turnLockRef.current = true
    setBusy(true)
    setError('')
    void postPracticePartnerChat(
      messagesRef.current,
      null,
      categoryRef.current,
      difficultyRef.current,
      {
        streak: 0,
        missStreak: 0,
        move: 'repeat',
        nextMove: 'repeat',
        mode: kind,
        hint: true,
        situation: situationRef.current,
        personality: personalityRef.current,
        goal: goalRef.current,
        place: situation ? `${situation.placeEn} (${situation.placeZh})` : scenePlaceRef.current,
        kept: sittingRef.current.lines.slice(-8).map((line) => ({
          en: line.en,
          zh: line.zh,
          jyutping: line.jyutping,
        })),
      },
    )
      .then(({ reply, drill, beats }) => {
        if (!drill?.zh) return
        setHintLine({ en: drill.en, zh: drill.zh, jyutping: drill.jyutping })
        const performed = performedLine(reply, beats, drill.zh, 'none', 0, 0)
        const withReply: PracticePartnerChatMessage[] = [
          ...messagesRef.current,
          { role: 'assistant', content: performed.caption },
        ]
        setMessages(withReply)
        void playPartnerReply(performed.caption, performed.beats)
      })
      .catch((e) => {
        const msg = e instanceof Error ? e.message : 'Could not give a line'
        setError(msg)
      })
      .finally(() => {
        setBusy(false)
        turnLockRef.current = false
      })
  }, [busy, listening, mood, playPartnerReply, playPhrase])

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
    if (!listening) setLitCount(0)
  }, [listening])

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
      window.clearTimeout(zhFlashTimerRef.current)
      window.clearTimeout(beatTimerRef.current)
      window.clearTimeout(phraseBeatTimerRef.current)
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
    const base = MOOD_ORBIT[mood]
    const cast =
      personality === 'busy'
        ? { speed: (base.speed ?? 1) * 1.28 }
        : personality === 'elder'
          ? { speed: (base.speed ?? 1) * 0.62 }
          : personality === 'formal'
            ? { scale: (base.scale ?? 1) * 0.94, orbitOpacity: 0.18 }
            : {}
    return {
      ...ORBITAL_SPHERE_DEFAULTS,
      ...base,
      ...cast,
      placement: 'stage',
      hue: 0,
    }
  }, [mood, personality])

  const moodMeta = MOODS.find((m) => m.id === mood)!

  const displayPrimary: SubtitleLine = caption
  const learningCaption =
    activeDrill && difficulty !== 'mainlander' && caption.role !== 'system'
      ? partnerCaptionLayout({
          difficulty,
          en: activeDrill.en,
          zh: activeDrill.zh,
          jyutping: activeDrill.jyutping,
          spoken: partnerHold,
          reaction: partnerBeats?.reaction,
          cue: partnerBeats?.cue,
          beat: spokenBeat,
        })
      : null

  const openFsKeyboard = () => {
    if (busy || listening || !activeDrill) return
    setVoiceMenuOpen(false)
    setFsTypeOpen(true)
  }

  const talking = isTalk(sessionKind)
  const situationMeta = practicePartnerSituation(situationId)
  const talkLabel = listening
    ? talking
      ? 'Stop'
      : 'Stop & judge'
    : sceneDone
      ? 'Scene done'
      : !activeDrill
        ? busy
          ? 'Working…'
          : sessionKind === 'open'
            ? 'Begin chat'
            : sessionKind === 'situation'
              ? 'Begin'
              : sessionKind === 'scene'
                ? 'Begin scene'
                : 'Begin drill'
        : busy
          ? 'Working…'
          : talking
            ? 'Talk'
            : 'Say it'

  const categoryMeta =
    sessionKind === 'situation' && situationMeta
      ? { labelEn: situationMeta.placeEn, labelZh: situationMeta.placeZh }
      : sessionKind === 'open'
        ? { labelEn: 'Open chat', labelZh: '自由講' }
        : PRACTICE_PARTNER_CATEGORIES.find((c) => c.id === category) || PRACTICE_PARTNER_CATEGORIES[2]
  const difficultyMeta =
    PRACTICE_PARTNER_DIFFICULTIES.find((d) => d.id === difficulty) ||
    PRACTICE_PARTNER_DIFFICULTIES[1]

  const lineMarks = correction ? betterLineMarks(correction.zh, correction.said) : []
  const drillCloze = activeDrill ? finishLineCloze(activeDrill.zh) : null
  const cardFace = practicePartnerCardShows(move, difficulty, Boolean(drillCloze))
  const freeLine = sessionKind !== 'drill'
  const scenePlaceLabel = scenePlaceRef.current
  const drillKicker =
    sessionKind === 'situation'
      ? situationMeta?.placeEn || 'Situation'
      : sessionKind === 'open'
        ? 'Open chat'
      : sessionKind === 'scene'
        ? sceneDone
          ? 'Scene done'
          : `${scenePlaceLabel || 'Scene'} · ${Math.min(sceneStep.total, sceneStep.index + 1)} of ${sceneStep.total || 1}`
        : verdictFlash === 'fail'
          ? 'Try again'
          : verdictFlash === 'pass'
            ? 'Next phrase'
            : activeDrill
              ? PRACTICE_PARTNER_MOVE_LABEL[move]
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

  const openSheet = (id: PartnerOrbitSheet) => {
    setOrbitSheet((current) => (current === id ? null : id))
  }

  if (!topicReady) {
    return (
      <section
        className={`partner-lab partner-lab--companion partner-lab--topic${entry === 'hub' ? ' is-hub' : ''}${
          orbitSheet ? ' is-sheet' : ''
        }`}
        aria-label="Choose Practice Partner topic"
      >
        <div className="partner-universe" aria-hidden="true" />
        <div className="partner-lab-stars" aria-hidden="true" />
        <OrbitalSphereBackground className="partner-lab-orb" {...orbitProps} />
        <div className="partner-orbit-field" aria-hidden="true">
          <i className="partner-orbit-track is-a" />
          <i className="partner-orbit-track is-b" />
          <i className="partner-orbit-track is-c" />
          <i className="partner-orbit-comet" />
          <i className="partner-orbit-comet is-b" />
          <i className="partner-orbit-bead" />
          <i className="partner-orbit-bead is-b" />
          <i className="partner-orbit-bead is-c" />
        </div>
        <div className="partner-lab-aura" aria-hidden="true" />
        <div className="partner-lab-orbit-ring" aria-hidden="true">
          <i className="partner-lab-orbit-arc" />
          <i className="partner-lab-orbit-arc is-b" />
          <i className="partner-lab-orbit-arc is-c" />
        </div>
        <dl className="partner-companion-readout">
          <div>
            <dt>Status</dt>
            <dd>Ready</dd>
          </div>
          <div>
            <dt>Path</dt>
            <dd>
              {categoryMeta.labelEn}
              <span lang="zh-HK">{categoryMeta.labelZh}</span>
            </dd>
          </div>
          <div>
            <dt>Level</dt>
            <dd>
              {difficultyMeta.labelEn}
              <span lang="zh-HK">{difficultyMeta.labelZh}</span>
            </dd>
          </div>
          <div>
            <dt>Kept</dt>
            <dd>{keptLines.length}</dd>
          </div>
        </dl>
        <div className="partner-lab-presence" aria-hidden="true">
          <span />
        </div>
        <h2 className="partner-companion-whisper" lang="zh-HK">
          港灣
        </h2>
        <nav className="partner-outer-ring" aria-label="Around 港灣">
          <button type="button" className={orbitSheet === 'level' ? 'is-on' : undefined} onClick={() => openSheet('level')}>
            <span>Level</span>
            <span lang="zh-HK">程度</span>
          </button>
          <button type="button" className={orbitSheet === 'path' ? 'is-on' : undefined} onClick={() => openSheet('path')}>
            <span>Path</span>
            <span lang="zh-HK">路</span>
          </button>
          <button type="button" className={orbitSheet === 'scenes' ? 'is-on' : undefined} onClick={() => openSheet('scenes')}>
            <span>Scenarios</span>
            <span lang="zh-HK">情境</span>
          </button>
          <button type="button" className={orbitSheet === 'saved' ? 'is-on' : undefined} onClick={() => openSheet('saved')}>
            <span>Saved</span>
            <span lang="zh-HK">記住</span>
          </button>
          <button type="button" className="partner-lab-open" onClick={beginOpenChat}>
            <span className="partner-lab-open-en">Open chat</span>
            <span className="partner-lab-open-zh" lang="zh-HK">
              自由講
            </span>
          </button>
        </nav>
        <button type="button" className="partner-companion-mic" onClick={speakWithHarbor}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="currentColor"
              d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.93V21h2v-3.07A7 7 0 0 0 19 11h-2z"
            />
          </svg>
          <span>Speak</span>
        </button>
        <header className="partner-lab-head partner-lab-head--topic">
          <div>
            <div className="partner-lab-presence" aria-hidden="true">
              <span />
            </div>
            <p className="partner-lab-kicker">
              {entry === 'hub' ? 'Beta' : 'Internal · not in app'}
            </p>
            <h2 className="partner-lab-title">Choose difficulty & topic</h2>
            <p className="partner-lab-lede">
              Difficulty sets how much English 港灣 uses. The path is the course. Open chat
              is a conversation beside it.
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
                    <strong>{scoreboard.xp}</strong> XP
                  </span>
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

        <div className={`partner-holo-sheet${orbitSheet ? ' is-open' : ''}`}>
        {orbitSheet === 'saved' ? (
          <PracticePartnerPodium
            entries={board?.entries ?? []}
            me={board?.me}
            loading={boardLoading}
            error={boardError}
            signedIn={boardSignedIn}
          />
        ) : null}

        {orbitSheet === 'level' ? (
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
        ) : null}

        {orbitSheet === 'path' ? (
        <div className="partner-lab-chooser-block">
          <p className="partner-lab-chooser-label" id="partner-lab-topic-label">
            Path
          </p>
          <PracticePartnerPath
            progress={path}
            activeId={category}
            onPick={onCategoryChange}
            fresh={pathFresh}
            note={pathNote}
            listClassName="partner-lab-topic-list"
          />
        </div>
        ) : null}

        {orbitSheet === 'saved' && recap ? (
          <div className="partner-lab-recap" role="region" aria-label="This sitting">
            <p className="partner-lab-chooser-label">This sitting</p>
            {recap.lines.length ? (
              <ul className="partner-lab-recap-list">
                {recap.lines.map((line) => (
                  <li key={`clear-${line.zh}`}>
                    <span lang="zh-HK">{line.zh}</span>
                    <span>{line.en}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="partner-lab-recap-empty">No lines cleared.</p>
            )}
            {recap.misses.length ? (
              <ul className="partner-lab-recap-list is-miss">
                {recap.misses.map((miss, i) => (
                  <li key={`miss-${miss.at}-${i}`}>
                    <span>Heard {miss.said}</span>
                    <span lang="zh-HK">Target {miss.zh}</span>
                  </li>
                ))}
              </ul>
            ) : null}
            <button type="button" className="partner-lab-recap-dismiss" onClick={() => setRecap(null)}>
              Close recap
            </button>
          </div>
        ) : null}

        {orbitSheet === 'scenes' ? (
        <>
        <div className="partner-lab-chooser-block">
          <p className="partner-lab-chooser-label" id="partner-lab-open-label">
            Also
          </p>
          <button type="button" className="partner-lab-open" onClick={beginOpenChat}>
            <span className="partner-lab-open-en">Open chat</span>
            <span className="partner-lab-open-zh" lang="zh-HK">
              自由講
            </span>
            <span className="partner-lab-open-hint">Talk with 港灣. No card to clear, no score.</span>
          </button>
        </div>

        <div className="partner-lab-chooser-block">
          <p className="partner-lab-chooser-label" id="partner-lab-situation-label">
            Situation
          </p>
          <PartnerSituationMix
            personality={personality}
            goal={goal}
            onPersonality={choosePersonality}
            onGoal={chooseGoal}
          />
          {PRACTICE_PARTNER_SITUATION_GROUPS.map((group) => (
            <div key={group.id} className="partner-lab-situation-group">
              <p className="partner-lab-chooser-label">
                {group.labelEn}
                <span lang="zh-HK"> {group.labelZh}</span>
              </p>
              <ul className="partner-lab-place-rail">
                {situationsInGroup(group.id).map((place) => (
                  <li key={place.id}>
                    <button
                      type="button"
                      className={`partner-lab-place partner-lab-place--${group.id}`}
                      onClick={() => beginSituation(place.id)}
                    >
                      <span className="partner-lab-place-zh" lang="zh-HK">
                        {place.placeZh}
                      </span>
                      <span className="partner-lab-place-en">{place.placeEn}</span>
                      <span className="partner-lab-place-blurb">{place.blurb}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        </>
        ) : null}

        {orbitSheet === 'saved' && thread.length ? (
          <div className="partner-lab-chooser-block">
            <p className="partner-lab-chooser-label">This talk</p>
            <ol className="partner-lab-thread">
              {thread.map((turn, index) => (
                <li key={`${turn.partnerZh}-${index}`}>
                  {turn.partnerZh ? (
                    <button
                      type="button"
                      lang="zh-HK"
                      onClick={() => {
                        unlockTtsPlayback({ force: true })
                        void playPhrase(turn.partnerZh)
                      }}
                    >
                      {turn.partnerZh}
                    </button>
                  ) : null}
                  {turn.you ? <p>You {turn.you}</p> : null}
                  {turn.betterZh ? (
                    <p className="is-better" lang="zh-HK">
                      {turn.betterZh}
                    </p>
                  ) : null}
                </li>
              ))}
            </ol>
          </div>
        ) : null}

        {orbitSheet === 'saved' && keptLines.length ? (
          <div className="partner-lab-chooser-block">
            <p className="partner-lab-chooser-label">Lines you kept</p>
            <button type="button" className="partner-lab-recap-dismiss" onClick={startKeptScene}>
              Use your lines
            </button>
            <ul className="partner-lab-kept">
              {keptLines.slice(-6).reverse().map((line) => (
                <li key={`${line.category}-${line.zh}`}>
                  <span lang="zh-HK">{line.zh}</span>
                  <span>{line.en}</span>
                  <button
                    type="button"
                    onClick={() => {
                      unlockTtsPlayback({ force: true })
                      void playPhrase(line.zh)
                    }}
                  >
                    Replay
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        </div>
      </section>
    )
  }

  return (
    <section
      className={`partner-lab partner-lab--companion${entry === 'hub' ? ' is-hub' : ''}${fullscreen ? ' is-fullscreen' : ''}${
        verdictFlash === 'fail' ? ' is-fail-flash' : ''
      }`}
      data-wash={sessionKind === 'situation' ? situationMeta?.group : undefined}
      data-cast={sessionKind === 'situation' ? personality : undefined}
      aria-label="Practice Partner lab"
    >
      <header className="partner-lab-head">
        <div>
          <p className="partner-lab-kicker">
            {entry === 'hub' ? 'Beta' : 'Internal · not in app'}
          </p>
          <h2 className="partner-lab-title">Practice Partner</h2>
          <p className="partner-lab-lede">
            {sessionKind === 'situation'
              ? `${situationMeta?.placeEn || 'This place'}. ${practicePartnerPersonality(personality)?.labelEn || 'Friendly'}. ${practicePartnerGoal(goal)?.labelEn || 'Finish the task'}.`
              : sessionKind === 'open'
              ? 'Talk with 港灣. The path stays where you left it.'
              : sessionKind === 'scene'
                ? 'Use a line you already kept.'
                : 'Follow along! The practice partner will start off and repeat.'}
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
              <PracticePartnerPodium
                compact
                entries={board?.entries ?? []}
                me={board?.me}
                loading={boardLoading}
                error={boardError}
                signedIn={boardSignedIn}
              />
              <p className="partner-lab-scores-summary">
                <span>
                  <strong>{scoreboard.xp}</strong> XP
                </span>
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

      {sessionKind === 'situation' && situationMeta && !fullscreen ? (
        <div className="partner-lab-seal-row">
          <button
            type="button"
            className="partner-lab-seal"
            aria-expanded={sealOpen}
            onClick={() => setSealOpen((open) => !open)}
          >
            <span lang="zh-HK">{situationMeta.placeZh}</span>
            <span>{practicePartnerPersonality(personality)?.labelEn}</span>
            <span>{practicePartnerGoal(goal)?.labelEn}</span>
          </button>
          {sealOpen ? (
            <PartnerSituationMix
              personality={personality}
              goal={goal}
              onPersonality={choosePersonality}
              onGoal={chooseGoal}
            />
          ) : null}
        </div>
      ) : null}

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
        <div className="partner-lab-stars" aria-hidden="true" />
        <OrbitalSphereBackground className="partner-lab-orb" {...orbitProps} />
        <div
          className={`partner-lab-aura${
            mood === 'listening' || mood === 'speaking' || mood === 'reacting' ? ' is-live' : ''
          }`}
          aria-hidden="true"
        />
        <div className="partner-orbit-field" aria-hidden="true">
          <i className="partner-orbit-track is-a" />
          <i className="partner-orbit-track is-b" />
          <i className="partner-orbit-track is-c" />
          <i className="partner-orbit-comet" />
          <i className="partner-orbit-comet is-b" />
          <i className="partner-orbit-bead" />
          <i className="partner-orbit-bead is-b" />
          <i className="partner-orbit-bead is-c" />
        </div>
        <div className="partner-lab-orbit-ring" aria-hidden="true">
          <i className="partner-lab-orbit-arc" />
          <i className="partner-lab-orbit-arc is-b" />
          <i className="partner-lab-orbit-arc is-c" />
        </div>
        <dl className="partner-companion-readout is-sitting">
          <div>
            <dt>Status</dt>
            <dd>{listening ? 'You' : moodMeta.label}</dd>
          </div>
          <div>
            <dt>{sessionKind === 'situation' ? 'Place' : sessionKind === 'open' ? 'Mode' : 'Path'}</dt>
            <dd>
              {categoryMeta.labelEn}
              <span lang="zh-HK">{categoryMeta.labelZh}</span>
            </dd>
          </div>
          <div>
            <dt>Time</dt>
            <dd>
              <span ref={sittingLabelRef}>0:00</span>
            </dd>
          </div>
          <div>
            <dt>Kept</dt>
            <dd>{keptLines.length}</dd>
          </div>
        </dl>

        {spokenBeat ? (
          <div className="partner-lab-beats" aria-hidden="true">
            <i className={spokenBeat === 'reaction' ? 'is-on' : undefined} />
            <i className={spokenBeat === 'phrase' ? 'is-on' : undefined} />
            <i className={spokenBeat === 'cue' ? 'is-on' : undefined} />
          </div>
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
          className={`partner-lab-drill partner-lab-holo${activeDrill ? '' : ' is-empty'}${
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
                {xp ? ` · ${xp} XP` : ''}
              </span>
            ) : null}
          </p>
          {sessionKind === 'drill' ? (
            <PracticePartnerPath
              compact
              progress={path}
              activeId={category}
              activeUnit={practicePartnerUnitForMove(move)}
              fresh={pathFresh}
              note={pathNote}
            />
          ) : null}
          {sessionKind === 'drill' && sceneOffer ? (
            <div className="partner-lab-scene-offer">
              <p>
                {sceneOffer.placeEn} is open. Use the lines you kept.
                <span lang="zh-HK"> {sceneOffer.placeZh}</span>
              </p>
              <button type="button" disabled={busy || listening} onClick={enterScene}>
                Enter
              </button>
              <button type="button" onClick={() => setSceneOffer(null)}>
                Later
              </button>
            </div>
          ) : null}
          {sceneDone ? (
            <p className="partner-lab-scene-done">That scene is done. The road is still there.</p>
          ) : null}
          {activeDrill ? (
            <>
              {missCard ? (
                <p className="partner-lab-miss">
                  <span className="partner-lab-miss-heard">Heard {missCard.said}</span>
                  {missCard.chunk ? (
                    <span className="partner-lab-miss-chunk" lang="zh-HK">
                      Retry {missCard.chunk}
                    </span>
                  ) : null}
                  {whyNote ? <span className="partner-lab-miss-why">{whyNote}</span> : null}
                </p>
              ) : null}
              {correction ? (
                <div className="partner-lab-correction">
                  <p className="partner-lab-ribbon is-heard">{correction.said}</p>
                  <p className="partner-lab-ribbon is-better" lang="zh-HK">
                    {[...correction.zh].map((ch, i) => (
                      <span key={`${i}-${ch}`} className={lineMarks[i] ? 'is-changed' : undefined}>
                        {ch}
                      </span>
                    ))}
                  </p>
                  {correction.why ? <p className="partner-lab-miss-why">{correction.why}</p> : null}
                  <button type="button" onClick={retryCorrection}>
                    Retry
                  </button>
                </div>
              ) : null}
              {hintLine && talking ? (
                <p className="partner-lab-hint-line">
                  <span lang="zh-HK">{hintLine.zh}</span>
                  <span>{hintLine.en}</span>
                </p>
              ) : null}
              {difficulty === 'new_learner' ? (
                <p className="partner-lab-drill-en is-primary">{activeDrill.en}</p>
              ) : null}
              {difficulty === 'mainlander' && !freeLine && cardFace.zh === 'hidden' ? (
                <p className="partner-lab-drill-prompt">
                  {move === 'listen' ? 'Listen, then say it back.' : 'Say it in Cantonese.'}
                </p>
              ) : (
                <div
                  className={`partner-lab-drill-zh${difficulty === 'new_learner' ? ' is-support' : ''}${
                    zhFlash ? ' is-jade-flash' : ''
                  }${spokenBeat === 'phrase' ? ' is-phrase-beat' : ''}`}
                  lang="zh-HK"
                >
                  <span className="partner-lab-drill-zh-chars">
                    {[
                      ...(difficulty === 'mainlander' && !freeLine && cardFace.zh === 'cloze' && drillCloze
                        ? drillCloze
                        : activeDrill.zh),
                    ].map((ch, i) => {
                      const hanBefore = [...(difficulty === 'mainlander' && !freeLine && cardFace.zh === 'cloze' && drillCloze
                        ? drillCloze
                        : activeDrill.zh
                      ).slice(0, i)].filter((unit) => isHanChar(unit)).length
                      const lit = isHanChar(ch) && hanBefore < litCount
                      return (
                      <button
                        key={`${zhFlash}-${i}-${ch}`}
                        type="button"
                        className={`partner-lab-char${zhFlash ? ' is-jade' : ''}${lit ? ' is-lit' : ''}`}
                        style={zhFlash ? { animationDelay: `${i * 32}ms` } : undefined}
                        onClick={(event) => {
                          event.stopPropagation()
                          const meaning = glossForChar(ch).trim()
                          setTonePop(null)
                          if (!isHanChar(ch) || !meaning) {
                            setGloss(null)
                            return
                          }
                          setGloss({ char: ch, meaning })
                        }}
                      >
                        {ch}
                      </button>
                      )
                    })}
                  </span>
                  <button
                    type="button"
                    className="partner-lab-phrase-hear"
                    aria-label={
                      mood === 'speaking' || mood === 'reacting' || listening
                        ? 'Highlight phrase'
                        : 'Replay phrase'
                    }
                    onClick={flashDrillZh}
                  >
                    Hear
                  </button>
                  {zhFlash ? <span className="partner-lab-drill-zh-line" aria-hidden="true" /> : null}
                </div>
              )}
              {difficulty === 'abc' ? (
                <p className="partner-lab-drill-en is-secondary">{activeDrill.en}</p>
              ) : null}
              {difficulty === 'mainlander' && cardFace.en ? (
                <p className="partner-lab-drill-en">{activeDrill.en}</p>
              ) : null}
              {difficulty !== 'mainlander' || (!freeLine && cardFace.jp) ? (
                <p className="partner-lab-drill-jp">
                  <JyutpingChaoText
                    text={activeDrill.jyutping}
                    onSyllable={(jp) => {
                      const note = toneNoteForSyllable(jp)
                      setGloss(null)
                      setTonePop(note)
                    }}
                  />
                </p>
              ) : null}
              {gloss ? (
                <p className="partner-lab-gloss" role="status">
                  <span lang="zh-HK">{gloss.char}</span> {gloss.meaning}
                </p>
              ) : null}
              {tonePop ? (
                <p className="partner-lab-tone" role="status">
                  <span>
                    {tonePop.syllable}
                    {tonePop.contour}
                  </span>{' '}
                  {tonePop.name}. {tonePop.blurb}
                </p>
              ) : null}
            </>
          ) : (
            <p className="partner-lab-drill-empty">
              {difficultyMeta.labelEn} · {categoryMeta.labelEn} · {categoryMeta.labelZh}
            </p>
          )}
        </div>

        <div className="partner-lab-subtitle-band" aria-hidden="true" />

        <div
          ref={subtitleHostRef}
          className={`partner-lab-subtitles partner-lab-subtitles--fallout partner-lab-subtitles--${
            learningCaption ? 'partner' : displayPrimary.role
          }${displayPrimary.interim ? ' is-interim' : ''}${
            learningCaption ? ' has-secondary' : ''
          }`}
          aria-live="polite"
          onClick={(event) => event.stopPropagation()}
        >
          <PartnerYouLine
            ref={youLineRef}
            listening={listening}
            partnerHold={learningCaption ? null : partnerHold}
            speaker={partnerSpeaker}
            hostRef={subtitleHostRef}
            phrase={activeDrill ? { zh: activeDrill.zh, jyutping: activeDrill.jyutping } : null}
            onSyllable={(jp) => {
              setGloss(null)
              setTonePop(toneNoteForSyllable(jp))
            }}
          />
          {learningCaption && (learningCaption.secondaryText || learningCaption.secondaryScript) ? (
            <div className="partner-lab-subtitles-secondary is-reading is-partner-aside">
              {learningCaption.secondaryText ? (
                <p className="partner-lab-subtitles-secondary-text">{learningCaption.secondaryText}</p>
              ) : null}
              {learningCaption.secondaryScript ? (
                <p className="partner-lab-subtitles-script">
                  <span lang="zh-HK">{learningCaption.secondaryScript.zh}</span>
                  {learningCaption.secondaryScript.jyutping ? (
                    <span className="partner-lab-subtitles-jp">
                      <JyutpingChaoText
                        text={learningCaption.secondaryScript.jyutping}
                        onSyllable={(jp) => {
                          setGloss(null)
                          setTonePop(toneNoteForSyllable(jp))
                        }}
                      />
                    </span>
                  ) : null}
                </p>
              ) : null}
            </div>
          ) : null}
          {fullscreen && partnerHold ? (
            <button
              type="button"
              className={`partner-lab-replay${mood === 'speaking' || mood === 'reacting' ? ' is-speaking' : ''}`}
              disabled={mood === 'speaking' || mood === 'reacting' || listening}
              aria-label={
                mood === 'speaking' || mood === 'reacting' ? 'Partner is speaking' : 'Replay partner'
              }
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
          <p className="partner-lab-subtitles-speaker">
            {learningCaption ? partnerSpeaker : speakerName}
          </p>
          {learningCaption?.coachText ? (
            <p className="partner-lab-subtitles-coach">{learningCaption.coachText}</p>
          ) : null}
          {learningCaption ? (
            <>
              {learningCaption.primaryText ? (
                <p className="partner-lab-subtitles-text">{learningCaption.primaryText}</p>
              ) : null}
              {learningCaption.primaryScript ? (
                <>
                  <p className="partner-lab-subtitles-text" lang="zh-HK">
                    {learningCaption.primaryScript.zh}
                  </p>
                  {learningCaption.primaryScript.jyutping ? (
                    <p className="partner-lab-subtitles-jp">
                      <JyutpingChaoText
                        text={learningCaption.primaryScript.jyutping}
                        onSyllable={(jp) => {
                          setGloss(null)
                          setTonePop(toneNoteForSyllable(jp))
                        }}
                      />
                    </p>
                  ) : null}
                </>
              ) : null}
            </>
          ) : (
            <p className="partner-lab-subtitles-text partner-lab-subtitles-held">{displayPrimary.text}</p>
          )}
        </div>

        <p className="partner-lab-status" aria-live="polite">
          <span className="partner-lab-status-mood">{moodMeta.label}</span>
          <span className="partner-lab-status-hint">{moodMeta.hint}</span>
        </p>
      </div>

      <div
        className={`partner-lab-live${fullscreen || entry === 'hub' ? ' is-fs-dock' : ''}`}
        role="group"
        aria-label="Practice Partner live controls"
      >
        {fullscreen || entry === 'hub' ? (
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
                className="partner-lab-fs-change-topic"
                aria-label="Give me a line"
                disabled={busy || listening || sceneDone || mood === 'speaking' || mood === 'reacting'}
                onClick={(event) => {
                  event.stopPropagation()
                  askForLine()
                }}
              >
                A line
              </button>
              <button
                type="button"
                className={`partner-lab-fs-mic${listening ? ' is-live' : ''}`}
                disabled={(busy && !listening) || sceneDone}
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
                disabled={busy || listening || !activeDrill || sceneDone}
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
              disabled={(busy && !listening) || sceneDone}
              onClick={toggleTalk}
            >
              <span className="partner-lab-talk-label">{talkLabel}</span>
            </button>
            <button
              type="button"
              className="partner-lab-change-topic"
              disabled={busy || listening || sceneDone || mood === 'speaking' || mood === 'reacting'}
              onClick={askForLine}
            >
              A line
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
              {sessionKind === 'open' ? 'New chat' : sessionKind === 'situation' ? 'New situation' : sessionKind === 'scene' ? 'Restart scene' : 'New drill'}
            </button>
          </>
        )}
      </div>

      {vhsCue > 0 ? (
        <PartnerVhsTransition
          key={vhsCue}
          title={categoryMeta.labelEn}
          subtitle={categoryMeta.labelZh}
          onDone={() => setVhsCue(0)}
        />
      ) : null}

      {error ? <p className="partner-lab-error">{error}</p> : null}
    </section>
  )
}
