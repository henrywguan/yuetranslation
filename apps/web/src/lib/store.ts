import { create } from 'zustand'
import { createAzureLiveSession } from './azureSpeech'
import { createWebSpeechSession } from './webSpeech'
import {
  speakText,
  stopSpeaking,
  isMicEchoMuted,
  isTtsPlaying,
  unlockTtsPlayback,
  duckTtsForMicBargeIn,
} from './tts'
import { fetchHealth, getUpgradeUrl, saveAutoSpeakPref, savePrimaryLangPref, translateText } from './api'
import { sanitizeEsTranslation } from './translationGuard'
import { micBlockedMessage, unlockMicrophone, stopMediaStream, isAppleTouchDevice } from './mediaAccess'
import { connectMicAnalyser, disconnectMicAnalyser, ensureSharedAudioContext } from './audioReactive'
import {
  appleFallsBackToAzure,
  appleLiveUsesWebSpeech,
  appleNeedsAzureStt,
  shouldDeferTtsStopUntilSttStarts,
} from './liveStt'
import { humanizeThrownError } from './apiError'
import { prefetchSpeechToken } from './speechToken'
import type { DetailLayer } from './detailTypes'
import type {
  ConversationTurn,
  Entitlement,
  IncidentBannerSettings,
  Lang,
  LiveSession,
  Mode,
  SpeakDirection,
} from './types'
import {
  invalidatePendingTranslations,
  runTranslation,
  setTranslateSpeakFinal,
} from './storeTranslate'
import { startHeartbeat, stopHeartbeat } from './storeLiveMeter'
import { readLocalAutoSpeak, writeLocalAutoSpeak } from './autoSpeakPref'
import {
  normalizePrimaryLang,
  readLocalPrimaryLang,
  writeLocalPrimaryLang,
  layoutForPrimary,
  type PrimaryLang,
} from './primaryLanguagePref'

/** Isolated live lines for Conversation mode — never shared with Solo/Text. */
type FaceLive = {
  enInterim: string
  yueInterim: string
  enTranslation: string
  yueTranslation: string
  yueDefinition: string
  yueDefinitions: string[]
  romanization?: string
  sandhiHint?: string
  ipa?: string
}

function emptyFaceLive(): FaceLive {
  return {
    enInterim: '',
    yueInterim: '',
    enTranslation: '',
    yueTranslation: '',
    yueDefinition: '',
    yueDefinitions: [],
  }
}

type State = {
  mode: Mode
  speakDirection: SpeakDirection
  /** Partner (top / rotated) pane language in Conversation. */
  chineseLang: Lang
  /** You (bottom / upright) pane language in Conversation. */
  conversationYouLang: Lang
  /** Solo upper pane language (any en|yue|cmn|wuu|tl|es; must differ from lower). */
  soloUpperLang: Lang
  /** Solo lower pane language (any en|yue|cmn|wuu|tl|es; must differ from upper). */
  soloLowerLang: Lang
  /** Non-English language paired with English across Solo / Conversation / Cam / brand. */
  primaryLanguage: PrimaryLang
  live: boolean
  status: 'idle' | 'listening' | 'speaking'
  /** Text currently playing via manual/auto TTS (for per-button speaking state). */
  speakingText: string | null
  autoSpeak: boolean
  entitlement: Entitlement | null
  /** True when /api/health reports demo engine (no model key loaded). */
  demoMode: boolean
  /** Ops-controlled site-wide incident banner (from /api/health). */
  incidentBanner: IncidentBannerSettings | null
  error: string | null
  enInterim: string
  yueInterim: string
  enTranslation: string
  yueTranslation: string
  /** English gloss for the current Cantonese translation (clarity). */
  yueDefinition: string
  /** Multiple English senses for the current Cantonese phrase. */
  yueDefinitions: string[]
  /** Colloquial EN→粵 variants for the current Cantonese result (empty if none). */
  yueAlternatives: string[]
  /** Learner note for the current English translation (粵 speakers). */
  enDefinition: string
  /** Multiple senses / 粵 glosses for the current English phrase. */
  enDefinitions: string[]
  /** Other natural English renderings for the current English result. */
  enAlternatives: string[]
  /** True while a background request is loading text-mode EN→粵 alternatives. */
  altsLoading: boolean
  /** Solo empty-state: show type-to-translate hint beside History. */
  /** Conversation panes only — separate from Solo/Text results. */
  face: FaceLive
  /** Drill-down details stack (phrase → character → …). Empty = closed. */
  detailStack: DetailLayer[]
  /** When true, details panel lives in the shared dock. */
  detailMinimized: boolean
  /** True while any translate request is in flight. */
  translating: boolean
  /** Target language of the in-flight translation (for pane placement). */
  translatingTo: Lang | null
  history: ConversationTurn[]
  session: LiveSession | null
  /** How the current live turn was armed — drives button copy. */
  liveInteraction: 'hold' | 'tap' | null
  /** Conversation: which pane owns the active mic turn. */
  liveSide: Lang | null
  setMode: (mode: Mode) => void
  setSpeakDirection: (d: SpeakDirection) => void
  /** Solo: set a pane language; if same as the other pane, swap. */
  setSoloPaneLang: (pane: 'upper' | 'lower', lang: Lang) => void
  /** Conversation: set you/partner pane language; if same as the other pane, swap. */
  setConversationPaneLang: (pane: 'you' | 'partner', lang: Lang) => void
  /** Conversation: clear partner-pane output after Chinese variety change. */
  clearConversationChinesePane: () => void
  setAutoSpeak: (v: boolean) => void
  /** Set primary language and apply it to Solo / Conversation defaults. */
  setPrimaryLanguage: (lang: PrimaryLang) => void
  /** Play (or stop) TTS for a line — does not require auto-speak. */
  speakManual: (text: string, lang: Lang) => Promise<void>
  loadBootstrap: () => Promise<void>
  /** Press/tap start: mic + STT (no translate yet). Optional side locks Conversation pane language. */
  startHold: (side?: Lang) => Promise<void>
  /** Short tap release: keep listening until speech pauses, then auto-translate. */
  armTapMode: () => void
  /** End listening + one final translate (shows TranslateThinking). */
  endHold: () => Promise<void>
  /** Cancel live without translating (mode switch / quota). */
  stopLive: () => Promise<void>
  /** Home / app switcher / Control Center: drop mic tracks now (orange pill). */
  releaseCaptureOnBackground: () => void
  translateTyped: (text: string, from: Lang) => Promise<void>
  openBreakdown: (
    phrase: string,
    opts?: {
      lang?: 'en' | 'yue' | 'cmn' | 'wuu' | 'tl' | 'es' | 'vi'
      translation?: string
      definition?: string
      definitions?: string[]
      alternatives?: string[]
      romanization?: string
      sandhiHint?: string
      ipa?: string
      alternativeRomanizations?: string[]
    },
  ) => void
  pushDetail: (layer: DetailLayer) => void
  popDetail: () => void
  closeBreakdown: () => void
  minimizeDetail: () => void
  restoreDetail: () => void
  /** Promote a variation to primary, reshuffle alts, and open its character breakdown. */
  selectYueVariation: (phrase: string) => void
  selectEnVariation: (phrase: string) => void
  /**
   * Re-translate the current Mexican Spanish turn as formal register and swap it in.
   * Uses paid `/api/translate` — callers should only fire from explicit user taps.
   */
  formalizeMexicanSpanish: (opts: {
    spanish: string
    sourceText: string
    sourceLang?: Lang
  }) => Promise<void>
  /** Clear Solo / Conversation active text only — keeps History. */
  clearCurrent: () => void
  /** Wipe History list (and persist empty to the account when signed in). */
  clearHistory: () => void
}

let speakToken = 0
/** True while the user is pressing the live button (hold mode). */
let holding = false
/** Short-tap sticky listen — auto-ends after speech pause. */
let tapSticky = false
/** Accept late STT finals briefly after release while the recognizer stops. */
let flushingHold = false
/** Monotonic id so a late release cannot translate a newer hold. */
let holdGen = 0
/** Finalized STT segments accumulated during the current hold. */
let holdFinals: string[] = []
let holdLang: Lang | null = null
let holdInterim = ''
/** Prevent overlapping startHold calls. */
let startingHold = false
/** Face pane language lock for the active turn (ignores auto-detect flips). */
let holdSideLock: Lang | null = null
let tapSilenceTimer: ReturnType<typeof setTimeout> | null = null
let tapMaxTimer: ReturnType<typeof setTimeout> | null = null

/** After a finalized utterance in tap mode, wait this long with no new speech → auto-stop.
 *  Keep this generous: short pauses while thinking / mid-phrase were cutting people off at 650ms. */
const TAP_SENTENCE_END_MS = 2000
/** Safety cap so tap mode cannot run forever. */
const TAP_MAX_MS = 45000
/** If STT produces nothing, stop listening and surface a mic hint. */
const NO_SPEECH_HINT_MS = 7000

let noSpeechTimer: ReturnType<typeof setTimeout> | null = null
/** Mic stream opened in the gesture turn — fed to Azure so iOS doesn’t need a second open. */
let heldMicStream: MediaStream | null = null
/** Bumps on every tearDown so a slower teardown cannot wipe a newer live session/mic. */
let tearEpoch = 0
/** iOS: follow-up taps keep a getUserMedia hold so Safari stays in record mode. */
let appleMicTurns = 0
/** Pointerup won the race before startHold finished — keep sticky tap. */
let pendingStickyTap = false
/** Coalesce overlapping App + TranslatorApp boots (and visibility blips). */
let bootstrapInflight: Promise<void> | null = null

/** DEV/test: inject a live session (skip Azure / Web Speech). */
let liveSessionFactory:
  | ((
      handlers: import('./types').SpeechEventHandlers,
      mediaStream: MediaStream | null,
      lockLang?: Lang,
    ) => Promise<LiveSession | null>)
  | null = null

export function __setLiveSessionFactoryForTests(
  factory: typeof liveSessionFactory,
) {
  liveSessionFactory = factory
}

export function __getHoldDebugFlagsForTests() {
  return {
    holding,
    tapSticky,
    flushingHold,
    startingHold,
    holdGen,
    tearEpoch,
    appleMicTurns,
    hasMic: Boolean(heldMicStream),
    pendingStickyTap,
  }
}

function clearNoSpeechTimer() {
  if (noSpeechTimer) {
    clearTimeout(noSpeechTimer)
    noSpeechTimer = null
  }
}

function releaseHeldMic() {
  disconnectMicAnalyser()
  stopMediaStream(heldMicStream)
  heldMicStream = null
}

/** Reset UI when startHold aborts after arming the mic button. */
function cancelHoldStart(set: (p: Partial<State>) => void) {
  holding = false
  tapSticky = false
  pendingStickyTap = false
  startingHold = false
  flushingHold = false
  holdSideLock = null
  releaseHeldMic()
  clearTapTimers()
  set({ liveInteraction: null, liveSide: null, status: 'idle' })
}

/** Clear orphaned module flags that block the next mic press after a torn-down turn. */
function repairStaleHoldCapture(get: () => State) {
  const { live, session } = get()
  if (live && session) return
  if (holding || startingHold || flushingHold || tapSticky) {
    holding = false
    startingHold = false
    flushingHold = false
    tapSticky = false
    pendingStickyTap = false
    holdSideLock = null
    releaseHeldMic()
    clearTapTimers()
  }
}

function holdActive(gen: number) {
  return gen === holdGen && (holding || flushingHold || tapSticky || pendingStickyTap)
}

function clearTapTimers() {
  if (tapSilenceTimer) {
    clearTimeout(tapSilenceTimer)
    tapSilenceTimer = null
  }
  if (tapMaxTimer) {
    clearTimeout(tapMaxTimer)
    tapMaxTimer = null
  }
  clearNoSpeechTimer()
}

/** Sticky tap: sentence/utterance ended — auto-stop unless the user keeps talking. */
function scheduleTapSentenceEnd(get: () => State) {
  if (!tapSticky) return
  if (tapSilenceTimer) clearTimeout(tapSilenceTimer)
  tapSilenceTimer = setTimeout(() => {
    tapSilenceTimer = null
    if (!tapSticky) return
    // Only auto-stop once we actually captured speech.
    if (!holdFinals.length && !holdInterim.trim()) return
    void get().endHold()
  }, TAP_SENTENCE_END_MS)
}

/** Pointerup often lands while startHold is awaiting STT start — keep sticky tap. */
function keepHoldOrSticky(gen: number, set: (p: Partial<State>) => void): boolean {
  if (pendingStickyTap) {
    pendingStickyTap = false
    tapSticky = true
    holding = false
    set({ liveInteraction: 'tap' })
  }
  return gen === holdGen && (holding || tapSticky)
}

function resolveHoldLang(detected: Lang, direction: SpeakDirection): Lang {
  if (holdSideLock) return holdSideLock
  return resolveSourceLang(detected, direction)
}

function resolveSourceLang(detected: Lang, direction: SpeakDirection): Lang {
  if (direction === 'en') return 'en'
  if (direction === 'yue') return 'yue'
  if (direction === 'cmn') return 'cmn'
  if (direction === 'wuu') return 'wuu'
  if (direction === 'tl') return 'tl'
  if (direction === 'es') return 'es'
  if (direction === 'vi') return 'vi'
  return detected
}

function formatMinutes(seconds: number) {
  return Math.max(0, Math.ceil(seconds / 60))
}

function micTurnIsLive(get: () => State) {
  return Boolean(get().live || holding || startingHold || tapSticky || pendingStickyTap)
}

async function runSpeak(
  get: () => State,
  set: (p: Partial<State>) => void,
  text: string,
  lang: Lang,
  rethrow = false,
) {
  // Don't layer auto-speak onto a tap the user already started (e.g. during translate).
  if (micTurnIsLive(get)) return
  const token = ++speakToken
  get().session?.setPlaybackActive(true)
  set({ status: 'speaking', speakingText: text })
  try {
    await speakText(text, lang)
  } catch (err) {
    // Auto-speak stays quiet; manual speak surfaces the error to the banner.
    if (rethrow) throw err
  } finally {
    // Only the still-current speak owns echo-tail / status. A barge-in tap
    // increments speakToken; applying setPlaybackActive(false) on the *new*
    // live session would swallow the first ~600ms of speech.
    if (token === speakToken) {
      get().session?.setPlaybackActive(false)
      set({ status: get().live ? 'listening' : 'idle', speakingText: null })
    }
  }
}

async function speakFinal(
  get: () => State,
  set: (p: Partial<State>) => void,
  text: string,
  lang: Lang,
) {
  const ent = get().entitlement
  // Auto-speak only when the user opted in (default is off).
  const autoSpeakFlag = get().autoSpeak
  const entAuto = Boolean(ent?.allowed.autoSpeak)
  const allowed = Boolean(entAuto && autoSpeakFlag)
  if (!allowed) return
  if (micTurnIsLive(get)) return
  await runSpeak(get, set, text, lang)
}

setTranslateSpeakFinal(speakFinal as Parameters<typeof setTranslateSpeakFinal>[0])

function resetHoldCapture() {
  holdFinals = []
  holdLang = null
  holdInterim = ''
}

function holdSourceText() {
  const parts = [...holdFinals]
  const interim = holdInterim.trim()
  if (interim) parts.push(interim)
  return parts.join(' ').replace(/\s+/g, ' ').trim()
}

function bargeInTtsIfNeeded(get: () => State) {
  if (isMicEchoMuted() || isTtsPlaying() || get().status === 'speaking') {
    // preserveSession: audio.load() / speechSynthesis.cancel() while Web Speech
    // is live makes the next capture silent on iPhone.
    stopSpeaking({ preserveSession: isAppleTouchDevice() })
  }
}

function applyHoldSource(
  get: () => State,
  set: (p: Partial<State>) => void,
  lang: Lang,
  text: string,
) {
  // Only barge in on real TTS — do not mute the mic on every STT interim/final.
  bargeInTtsIfNeeded(get)
  const isFace = get().mode === 'conversation'
  if (isFace) {
    const face = get().face
    const youLang = get().conversationYouLang
    if (lang === youLang) {
      set({
        face: {
          ...face,
          enInterim: text,
          yueInterim: '',
          enTranslation: '',
          yueTranslation: '',
          yueDefinition: '',
        },
        status: 'listening',
      })
    } else {
      set({
        face: {
          ...face,
          yueInterim: text,
          enInterim: '',
          enTranslation: '',
          yueTranslation: '',
          yueDefinition: '',
        },
        status: 'listening',
      })
    }
  } else {
    // Solo: en* = upper pane, yue* = lower pane.
    const upper = get().soloUpperLang
    const fromUpper = lang === upper
    if (fromUpper) {
      set({
        enInterim: text,
        yueInterim: '',
        enTranslation: '',
        yueTranslation: '',
        yueDefinition: '',
        yueDefinitions: [],
        yueAlternatives: [],
        status: 'listening',
      })
    } else {
      set({
        yueInterim: text,
        enInterim: '',
        enTranslation: '',
        yueTranslation: '',
        yueDefinition: '',
        yueDefinitions: [],
        yueAlternatives: [],
        status: 'listening',
      })
    }
  }
}

async function tearDownLive(
  get: () => State,
  set: (p: Partial<State>) => void,
  opts?: { clearInterim?: boolean; clearSideLock?: boolean },
) {
  const myEpoch = ++tearEpoch
  const session = get().session
  const mic = heldMicStream
  speakToken += 1
  stopSpeaking({ preserveSession: isAppleTouchDevice() })
  stopHeartbeat()
  clearTapTimers()
  holding = false
  tapSticky = false
  pendingStickyTap = false
  startingHold = false
  // Keep face pane language lock through STT flush unless explicitly cleared.
  if (opts?.clearSideLock !== false) {
    holdSideLock = null
  }
  if (session) {
    try {
      // Hung Azure/Web Speech stop() used to leave flushingHold true forever.
      await Promise.race([
        session.stop(),
        new Promise<void>((resolve) => setTimeout(resolve, 2500)),
      ])
    } catch {
      /* ignore */
    }
  }
  // A newer startHold/tearDown owns the mic — do not stop their tracks.
  if (myEpoch === tearEpoch && heldMicStream === mic) {
    releaseHeldMic()
  }
  // A newer live session was installed while we were stopping — leave it alone.
  if (myEpoch !== tearEpoch) return
  if (session && get().session && get().session !== session) return

  const clearInterim = opts?.clearInterim !== false
  set({
    live: false,
    session: null,
    liveInteraction: null,
    liveSide: opts?.clearSideLock === false ? get().liveSide : null,
    status: get().translating ? get().status : 'idle',
    ...(clearInterim
      ? {
          enInterim: '',
          yueInterim: '',
          face: { ...get().face, enInterim: '', yueInterim: '' },
        }
      : {}),
  })
  // Do not loadBootstrap here. Each mic stop used to GET /health + GET/PUT
  // /history on top of translate + TTS + heartbeat — enough POSTs for Vercel’s
  // checkpoint after 2–3 iPhone turns. Heartbeat already returns entitlement.
}

export const useYueStore = create<State>((set, get) => {
  const initialPrimary = readLocalPrimaryLang()
  const initialLayout = layoutForPrimary(initialPrimary)
  return {
  mode: 'solo',
  speakDirection: initialLayout.speakDirection,
  chineseLang: initialLayout.chineseLang,
  conversationYouLang: initialLayout.conversationYouLang,
  soloUpperLang: initialLayout.soloUpperLang,
  soloLowerLang: initialLayout.soloLowerLang,
  primaryLanguage: initialPrimary,
  live: false,
  status: 'idle',
  speakingText: null,
  autoSpeak: readLocalAutoSpeak(),
  entitlement: null,
  demoMode: false,
  incidentBanner: null,
  error: null,
  enInterim: '',
  yueInterim: '',
  enTranslation: '',
  yueTranslation: '',
  yueDefinition: '',
  yueDefinitions: [],
  yueAlternatives: [],
  enDefinition: '',
  enDefinitions: [],
  enAlternatives: [],
  altsLoading: false,
  face: emptyFaceLive(),
  detailStack: [],
  detailMinimized: false,
  translating: false,
  translatingTo: null,
  history: [],
  session: null,
  liveInteraction: null,
  liveSide: null,

  setMode: (mode) => {
    // Text tab folded into Solo — keep legacy 'text' values working.
    const next = mode === 'text' ? 'solo' : mode
    if (get().live || startingHold || holding || tapSticky) {
      void get()
        .stopLive()
        .then(() => set({ mode: next }))
      return
    }
    set({ mode: next })
  },
  setSpeakDirection: (speakDirection) =>
    set(
      speakDirection === 'yue' ||
      speakDirection === 'cmn' ||
      speakDirection === 'wuu' ||
      speakDirection === 'tl' ||
      speakDirection === 'es' ||
      speakDirection === 'vi'
        ? { speakDirection, chineseLang: speakDirection }
        : { speakDirection },
    ),
  setConversationPaneLang: (pane, lang) => {
    const you = get().conversationYouLang
    const partner = get().chineseLang
    const other = pane === 'you' ? partner : you
    const current = pane === 'you' ? you : partner
    if (lang === current) return
    let nextYou = you
    let nextPartner = partner
    const swapping = lang === other
    if (swapping) {
      if (pane === 'you') {
        nextYou = lang
        nextPartner = current
      } else {
        nextPartner = lang
        nextYou = current
      }
    } else if (pane === 'you') {
      nextYou = lang
    } else {
      nextPartner = lang
    }
    invalidatePendingTranslations()
    const face = get().face
    if (swapping) {
      set({
        conversationYouLang: nextYou,
        chineseLang: nextPartner,
        speakDirection: lang,
        face: {
          ...face,
          enInterim: face.yueInterim,
          yueInterim: face.enInterim,
          enTranslation: face.yueTranslation,
          yueTranslation: face.enTranslation,
          yueDefinition: face.yueDefinition,
          yueDefinitions: face.yueDefinitions,
          romanization: undefined,
          sandhiHint: undefined,
          ipa: undefined,
        },
        translating: false,
        translatingTo: null,
        altsLoading: false,
      })
      return
    }
    const cleared =
      pane === 'you'
        ? {
            enInterim: '',
            enTranslation: '',
          }
        : {
            yueInterim: '',
            yueTranslation: '',
            yueDefinition: '',
            yueDefinitions: [] as string[],
            romanization: undefined,
            sandhiHint: undefined,
            ipa: undefined,
          }
    set({
      conversationYouLang: nextYou,
      chineseLang: nextPartner,
      speakDirection: lang,
      face: { ...face, ...cleared },
      translating: false,
      translatingTo: null,
      altsLoading: false,
    })
  },
  setSoloPaneLang: (pane, lang) => {
    const upper = get().soloUpperLang
    const lower = get().soloLowerLang
    const other = pane === 'upper' ? lower : upper
    const current = pane === 'upper' ? upper : lower
    if (lang === current) return
    let nextUpper = upper
    let nextLower = lower
    const swapping = lang === other
    if (swapping) {
      // Same as the other pane → swap languages + pane contents.
      if (pane === 'upper') {
        nextUpper = lang
        nextLower = current
      } else {
        nextLower = lang
        nextUpper = current
      }
    } else if (pane === 'upper') {
      nextUpper = lang
    } else {
      nextLower = lang
    }
    const chinesePatch =
      lang === 'yue' || lang === 'cmn' || lang === 'wuu' || lang === 'tl' || lang === 'es' || lang === 'vi'
        ? { chineseLang: lang }
        : {}
    invalidatePendingTranslations()
    const s = get()
    if (swapping) {
      set({
        soloUpperLang: nextUpper,
        soloLowerLang: nextLower,
        speakDirection: lang,
        ...chinesePatch,
        enInterim: s.yueInterim,
        yueInterim: s.enInterim,
        enTranslation: s.yueTranslation,
        yueTranslation: s.enTranslation,
        enDefinition: s.yueDefinition,
        yueDefinition: s.enDefinition,
        enDefinitions: s.yueDefinitions,
        yueDefinitions: s.enDefinitions,
        enAlternatives: s.yueAlternatives,
        yueAlternatives: s.enAlternatives,
        translating: false,
        translatingTo: null,
        altsLoading: false,
      })
      return
    }
    // Language changed on one pane — clear that pane's text so stale output
    // cannot linger under the new label (SoloView re-translates from the other side).
    const cleared =
      pane === 'upper'
        ? {
            enInterim: '',
            enTranslation: '',
            enDefinition: '',
            enDefinitions: [] as string[],
            enAlternatives: [] as string[],
          }
        : {
            yueInterim: '',
            yueTranslation: '',
            yueDefinition: '',
            yueDefinitions: [] as string[],
            yueAlternatives: [] as string[],
          }
    set({
      soloUpperLang: nextUpper,
      soloLowerLang: nextLower,
      speakDirection: lang,
      ...chinesePatch,
      ...cleared,
      translating: false,
      translatingTo: null,
      altsLoading: false,
    })
  },
  clearConversationChinesePane: () => {
    invalidatePendingTranslations()
    const face = get().face
    const zhWasSource = Boolean(face.yueInterim.trim()) && !face.enInterim.trim()
    set({
      face: {
        ...face,
        yueInterim: '',
        yueTranslation: '',
        yueDefinition: '',
        yueDefinitions: [],
        romanization: undefined,
        sandhiHint: undefined,
        ipa: undefined,
        ...(zhWasSource ? { enTranslation: '' } : {}),
      },
      translating: false,
      translatingTo: null,
      altsLoading: false,
    })
  },
  setAutoSpeak: (autoSpeak) => {
    writeLocalAutoSpeak(autoSpeak)
    set({ autoSpeak })
    const loggedIn = Boolean(get().entitlement?.loggedIn)
    if (!loggedIn) return
    void saveAutoSpeakPref(autoSpeak)
      .then((data) => {
        if (data.entitlement) set({ entitlement: data.entitlement })
      })
      .catch(() => {
        /* Keep local preference; next bootstrap will reconcile if save failed. */
      })
  },

  setPrimaryLanguage: (lang) => {
    const primary = normalizePrimaryLang(lang)
    writeLocalPrimaryLang(primary)

    // Primary fills Solo upper + Conversation you (facing the phone user).
    // English primary pairs with Cantonese on the partner / lower side;
    // every other primary (including Cantonese) pairs with English.
    set({
      primaryLanguage: primary,
      ...layoutForPrimary(primary),
    })

    const loggedIn = Boolean(get().entitlement?.loggedIn)
    if (!loggedIn) return
    void savePrimaryLangPref(primary)
      .then((data) => {
        if (data.entitlement) set({ entitlement: data.entitlement })
      })
      .catch(() => {
        /* Keep local preference; next bootstrap will reconcile if save failed. */
      })
  },

  speakManual: async (text, lang) => {
    const trimmed = text.trim()
    if (!trimmed) return
    const ent = get().entitlement
    if (ent && !ent.allowed.tts) {
      set({
        error:
          ent.reason === 'account_disabled'
            ? 'This account has been disabled.'
            : ent.reason === 'tts_quota_exhausted' || ent.reason === 'no_tts_quota'
              ? 'Voice playback needs remaining TTS quota.'
              : 'Voice playback is not available.',
      })
      return
    }
    if (get().status === 'speaking') {
      const same = get().speakingText === trimmed
      speakToken += 1
      stopSpeaking()
      get().session?.setPlaybackActive(false)
      set({ status: get().live ? 'listening' : 'idle', speakingText: null, error: null })
      // Same utterance → stop; different text → fall through and play the new one.
      if (same) return
    }
    // Sync unlock while still in the click/tap gesture (Cam / Account call sites).
    unlockTtsPlayback()
    set({ error: null })
    try {
      await runSpeak(get, set, trimmed, lang, true)
    } catch (err) {
      set({ error: humanizeThrownError(err) })
    }
  },

  loadBootstrap: async () => {
    if (bootstrapInflight) return bootstrapInflight
    bootstrapInflight = (async () => {
    try {
      const data = await fetchHealth()
      const ent = data.entitlement
      if (!ent.upgradeUrl && getUpgradeUrl()) {
        ent.upgradeUrl = getUpgradeUrl()
      }
      // Prefer server Auto-speak when signed in (cross-device); else keep local cache.
      const nextAutoSpeak =
        ent.loggedIn && typeof ent.prefs?.autoSpeak === 'boolean'
          ? ent.prefs.autoSpeak
          : get().autoSpeak
      if (ent.loggedIn && typeof ent.prefs?.autoSpeak === 'boolean') {
        writeLocalAutoSpeak(ent.prefs.autoSpeak)
      }
      const nextPrimary =
        ent.loggedIn && ent.prefs?.primaryLang
          ? normalizePrimaryLang(ent.prefs.primaryLang)
          : get().primaryLanguage
      if (ent.loggedIn && ent.prefs?.primaryLang) {
        writeLocalPrimaryLang(nextPrimary)
      }
      // Only reset Solo/Conversation pane layout when primary actually changes.
      // Re-applying on every health refresh (visibility, mic overlays, concurrent
      // boots) wiped manual Solo pane picks — e.g. 粵 upper + Mexican Spanish lower
      // snapped back after record/stop.
      const prevPrimary = get().primaryLanguage
      const primaryChanged = nextPrimary !== prevPrimary
      const layout = layoutForPrimary(nextPrimary)
      const { hydrateHistory } = await import('./historySync')
      const history = await hydrateHistory(Boolean(ent.loggedIn))
      set({
        entitlement: ent,
        demoMode: Boolean(data.engines?.demo),
        incidentBanner: data.incidentBanner ?? null,
        autoSpeak: nextAutoSpeak,
        primaryLanguage: nextPrimary,
        ...(primaryChanged ? layout : {}),
        history,
      })
      // Sync TTS voices from server prefs (cross-device) into local cache.
      try {
        const {
          writeLocalCmnVoice,
          writeLocalEnVoice,
          writeLocalTlVoice,
          writeLocalEsVoice,
          writeLocalYueVoice,
          resolveCmnVoice,
          resolveEnVoice,
          resolveTlVoice,
          resolveEsVoice,
          resolveYueVoice,
        } = await import('./ttsVoices')
        if (ent.prefs?.ttsVoiceYue) writeLocalYueVoice(resolveYueVoice(ent.prefs.ttsVoiceYue))
        if (ent.prefs?.ttsVoiceEn) writeLocalEnVoice(resolveEnVoice(ent.prefs.ttsVoiceEn))
        if (ent.prefs?.ttsVoiceCmn) writeLocalCmnVoice(resolveCmnVoice(ent.prefs.ttsVoiceCmn))
        if (ent.prefs?.ttsVoiceTl) writeLocalTlVoice(resolveTlVoice(ent.prefs.ttsVoiceTl))
        if (ent.prefs?.ttsVoiceEs) writeLocalEsVoice(resolveEsVoice(ent.prefs.ttsVoiceEs))
      } catch {
        /* ignore */
      }
      prefetchSpeechToken()
    } catch {
      set({
        entitlement: null,
        demoMode: false,
        incidentBanner: null,
      })
    }
    })().finally(() => {
      bootstrapInflight = null
    })
    return bootstrapInflight
  },

  stopLive: async () => {
    resetHoldCapture()
    flushingHold = false
    tapSticky = false
    pendingStickyTap = false
    clearTapTimers()
    holdGen += 1
    await tearDownLive(get, set, { clearInterim: true })
  },

  releaseCaptureOnBackground: () => {
    // Sync first — iOS may freeze the page before session.stop() resolves,
    // which left getUserMedia / Web Speech live (Control Center orange pill).
    ++tearEpoch
    appleMicTurns = 0
    holdGen += 1
    resetHoldCapture()
    flushingHold = false
    tapSticky = false
    pendingStickyTap = false
    holding = false
    startingHold = false
    clearTapTimers()
    stopHeartbeat()
    speakToken += 1
    releaseHeldMic()
    const session = get().session
    if (session) {
      void session.stop().catch(() => undefined)
    }
    set({
      live: false,
      session: null,
      liveInteraction: null,
      liveSide: null,
      status: get().translating ? get().status : 'idle',
      enInterim: '',
      yueInterim: '',
      face: { ...get().face, enInterim: '', yueInterim: '' },
    })
  },

  startHold: async (side) => {
    const apple = isAppleTouchDevice()
    const bargingIn = isTtsPlaying() || get().status === 'speaking'
    const appleFollowUp = apple && appleMicTurns > 0
    // Resolve pane lock before choosing STT engine — Tagalog / Wu need Azure
    // fixed-locale on iPhone (Safari Web Speech returns service-not-allowed).
    const direction = get().speakDirection
    const intendedLock: Lang | undefined =
      side ||
      (direction === 'en' ||
      direction === 'yue' ||
      direction === 'cmn' ||
      direction === 'wuu' ||
      direction === 'tl' ||
      direction === 'es' ||
      direction === 'vi'
        ? direction
        : undefined)
    // Yue/En/… stay on Web Speech. tl/wuu use Azure fixed locale (never LID).
    const webSpeechFirst =
      apple && appleLiveUsesWebSpeech(intendedLock) && !liveSessionFactory
    if (apple && appleNeedsAzureStt(intendedLock)) {
      prefetchSpeechToken({ allowApple: true })
    }
    const deferTtsStop = shouldDeferTtsStopUntilSttStarts({
      apple,
      webSpeechFirst,
      ttsPlaying: bargingIn,
    })

    // Gesture-time unlocks first — must run before any await on this turn (iOS).
    // Do not steal the shared audio element while auto-speak is playing.
    if (!bargingIn) unlockTtsPlayback()
    ensureSharedAudioContext()

    if (!deferTtsStop) {
      speakToken += 1
      // iOS: do not audio.load() here — that resets the session and the next
      // Web Speech / Azure tap shows the icon with no audio.
      stopSpeaking({ preserveSession: apple })
      set({ status: 'idle', speakingText: null })
    }

    // Follow-up taps keep a getUserMedia hold so Safari stays in record mode.
    // Do not open gUM *while* TTS is playing — that fight cancels Web Speech.
    let micPriming: Promise<MediaStream | null> | null = null
    const skipMicPrimeNow =
      Boolean(liveSessionFactory) || (webSpeechFirst && !appleFollowUp) || deferTtsStop
    if (!skipMicPrimeNow) {
      micPriming = unlockMicrophone()
    }

    // Wait out an in-flight endHold flush on Azure. On Apple first tap,
    // recognition.start() must stay in this gesture turn.
    if (flushingHold && !webSpeechFirst) {
      const deadline = Date.now() + 4000
      while (flushingHold && Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 40))
      }
    }

    repairStaleHoldCapture(get)
    // Barge-in / zombie clear: a prior turn can leave live=true with a dead session.
    let bargedLive = false
    if (get().live) {
      holdGen += 1
      bargedLive = true
      if (webSpeechFirst) {
        void tearDownLive(get, set, { clearInterim: false })
      } else {
        await tearDownLive(get, set, { clearInterim: false })
      }
      repairStaleHoldCapture(get)
    }
    if (flushingHold && !holding && !startingHold && !tapSticky && !get().live) {
      flushingHold = false
    }
    if (
      holding ||
      startingHold ||
      flushingHold ||
      (tapSticky && !pendingStickyTap) ||
      (get().live && !bargedLive)
    ) {
      return
    }
    const { entitlement } = get()
    if (entitlement && !entitlement.allowed.live) {
      const msg =
        entitlement.reason === 'login_required'
          ? 'Log in to use live translation.'
          : `Free live minutes used (${formatMinutes(entitlement.usage.liveSeconds)} minutes this month). Upgrade for more.`
      set({ error: msg })
      return
    }

    // iOS Safari over http://192.168.x.x has no mediaDevices — fail before Azure crashes.
    if (!liveSessionFactory) {
      const micBlock = micBlockedMessage()
      if (micBlock) {
        set({ error: micBlock })
        return
      }
    }

    const gen = ++holdGen
    holding = true
    tapSticky = pendingStickyTap
    flushingHold = false
    startingHold = true
    holdSideLock = side ?? null
    clearTapTimers()
    resetHoldCapture()
    // Invalidate any in-flight translate from a previous turn.
    invalidatePendingTranslations()
    // Pipeline: mic on → STT source only → translate after capture ends.
    // Clear prior translations so nothing looks like an interim MT result.
    set({
      error: null,
      liveInteraction: pendingStickyTap ? 'tap' : 'hold',
      liveSide: side ?? null,
      translating: false,
      translatingTo: null,
      enInterim: '',
      yueInterim: '',
      enTranslation: '',
      yueTranslation: '',
      yueDefinition: '',
      yueDefinitions: [],
      yueAlternatives: [],
      face: emptyFaceLive(),
    })

    const handlers = {
      onInterim: (detected: Lang, text: string) => {
        // Live STT preview on the speaking side — translate only after capture ends.
        if (!holdActive(gen)) return
        clearNoSpeechTimer()
        const lang = resolveHoldLang(detected, get().speakDirection)
        holdLang = lang
        holdInterim = text
        applyHoldSource(get, set, lang, holdSourceText())
        // Still talking — restart sentence-end clock so auto-stop waits for real silence.
        if (tapSticky) scheduleTapSentenceEnd(get)
      },
      onFinal: (detected: Lang, text: string) => {
        // Accumulate STT while live — translate only in endHold after capture finishes.
        if (!holdActive(gen)) return
        clearNoSpeechTimer()
        const lang = resolveHoldLang(detected, get().speakDirection)
        const trimmed = text.trim()
        if (!trimmed) return
        holdLang = lang
        holdFinals.push(trimmed)
        holdInterim = ''
        applyHoldSource(get, set, lang, holdSourceText())
        // Sticky tap mode 1: utterance finalized → auto-stop after a short pause.
        if (tapSticky) scheduleTapSentenceEnd(get)
      },
      onError: (message: string) => {
        if (gen !== holdGen) return
        // Azure/Web Speech often emit canceled during intentional session.stop().
        if (flushingHold) return
        const trimmed = message.trim()
        if (trimmed) set({ error: trimmed })
        // STT session died — tear down so live=false doesn’t block the next mic press.
        void get().endHold()
      },
      onStatus: (status: 'listening' | 'idle' | 'speaking') => {
        if (gen !== holdGen) return
        // Ignore leftover "listening" while auto-speak is playing — but not
        // during an in-progress mic start (barge-in must be allowed to listen).
        if (get().status === 'speaking' && status === 'listening' && !startingHold) return
        if (status !== 'speaking') set({ status })
      },
    }

    const webSpeechLock = () => {
      const lock = holdSideLock
      const d = get().speakDirection
      return (
        lock ||
        (d === 'en' || d === 'yue' || d === 'cmn' || d === 'wuu' || d === 'tl' || d === 'es' || d === 'vi'
          ? d
          : undefined)
      )
    }

    let next = null as LiveSession | null
    let alreadyStarted = false

    if (liveSessionFactory) {
      next = await liveSessionFactory(handlers, heldMicStream, webSpeechLock())
    } else if (webSpeechFirst) {
      // Every iOS tap: start Web Speech in this gesture (zh-HK when locked to Yue).
      // Follow-up taps also keep a getUserMedia hold so Safari’s audio session
      // stays in record mode — otherwise the 2nd start is silent.
      next = createWebSpeechSession(handlers, webSpeechLock())
      if (next && deferTtsStop) {
        // Duck then start then pause — pausing HTMLAudio *before* rec.start()
        // (and speechSynthesis.cancel) makes Safari show the mic with no capture.
        speakToken += 1
        duckTtsForMicBargeIn()
        set({ status: 'listening', speakingText: null })
      }
      if (next) {
        try {
          await next.start()
          alreadyStarted = true
        } catch {
          try {
            await next.stop()
          } catch {
            /* ignore */
          }
          next = null
          alreadyStarted = false
        }
      }
      if (deferTtsStop) {
        stopSpeaking({ preserveSession: true })
      }
      if (alreadyStarted && appleFollowUp && !micPriming) {
        micPriming = unlockMicrophone()
      }
      if (alreadyStarted && micPriming) {
        const warmed = await micPriming
        if (warmed && keepHoldOrSticky(gen, set)) {
          heldMicStream = warmed
        } else if (warmed) {
          stopMediaStream(warmed)
        }
      }
    }

    if (!liveSessionFactory && !alreadyStarted) {
      if (
        apple &&
        appleLiveUsesWebSpeech(intendedLock) &&
        !appleFallsBackToAzure(intendedLock)
      ) {
        // Stay on Web Speech for Yue/En — do not mint /api/speech-token (LID leak).
        if (micPriming) {
          const leftover = await micPriming.catch(() => null)
          if (leftover) stopMediaStream(leftover)
        }
      } else {
        // Open mic in this gesture turn and keep the tracks for Azure (no second mic open).
        const primed = await micPriming!
        if (!primed) {
          cancelHoldStart(set)
          set({
            error: 'Microphone permission denied. Allow mic access for this site and try again.',
          })
          return
        }
        heldMicStream = primed

        if (!keepHoldOrSticky(gen, set)) {
          cancelHoldStart(set)
          return
        }

        next = await createAzureLiveSession(handlers, primed, webSpeechLock())
        if (!next) {
          // Free the exclusive mic lock so Web Speech can open its own input.
          releaseHeldMic()
          next = createWebSpeechSession(handlers, webSpeechLock())
        }
      }
    }

    if (!keepHoldOrSticky(gen, set)) {
      if (next) {
        try {
          await next.stop()
        } catch {
          /* ignore */
        }
      }
      cancelHoldStart(set)
      return
    }
    if (!next) {
      cancelHoldStart(set)
      set({
        error: 'Speech unavailable. Set AZURE_SPEECH_KEY or use a browser with speech recognition.',
      })
      return
    }
    try {
      if (!alreadyStarted) {
        try {
          await next.start()
        } catch (startErr) {
          // Azure may create a session then fail — fall back to Web Speech.
          try {
            await next.stop()
          } catch {
            /* ignore */
          }
          releaseHeldMic()
          next = createWebSpeechSession(handlers, webSpeechLock())
          if (!next) throw startErr
          await next.start()
        }
      }
      if (!keepHoldOrSticky(gen, set)) {
        try {
          await next.stop()
        } catch {
          /* ignore */
        }
        cancelHoldStart(set)
        return
      }
      startingHold = false
      if (heldMicStream) connectMicAnalyser(heldMicStream)
      set({
        live: true,
        session: next,
        status: 'listening',
        error: null,
        liveInteraction: tapSticky ? 'tap' : 'hold',
      })
      if (apple) {
        appleMicTurns += 1
      }
      clearNoSpeechTimer()
      noSpeechTimer = setTimeout(() => {
        noSpeechTimer = null
        if (!holdActive(gen)) return
        if (holdFinals.length || holdInterim.trim()) return
        set({
          error:
            'No speech detected. Check mic permission, speak closer to the phone, and ensure AZURE_SPEECH_KEY is set in apps/api/.env (Safari/Chrome speech is a fallback).',
        })
        // Sticky tap previously stayed “listening” forever with silence — auto-stop.
        void get().endHold()
      }, NO_SPEECH_HINT_MS)
      startHeartbeat(get, set)
    } catch (e) {
      holding = false
      tapSticky = false
      startingHold = false
      holdSideLock = null
      pendingStickyTap = false
      releaseHeldMic()
      clearTapTimers()
      set({ error: humanizeThrownError(e), live: false, session: null, liveInteraction: null, liveSide: null })
    }
  },

  armTapMode: () => {
    // Modes 1–2: short press released — keep mic on until sentence end or second tap.
    pendingStickyTap = true
    if (flushingHold) return
    holding = false
    tapSticky = true
    set({ liveInteraction: 'tap' })
    if (tapMaxTimer) {
      clearTimeout(tapMaxTimer)
      tapMaxTimer = null
    }
    if (tapSilenceTimer) {
      clearTimeout(tapSilenceTimer)
      tapSilenceTimer = null
    }
    // If speech already landed during the press, start the sentence-end clock.
    if (holdFinals.length || holdInterim.trim()) scheduleTapSentenceEnd(get)
    tapMaxTimer = setTimeout(() => {
      tapMaxTimer = null
      if (tapSticky) void get().endHold()
    }, TAP_MAX_MS)
  },

  endHold: async () => {
    // Prevent concurrent teardown (double release / double tap).
    if (flushingHold) return
    if (!holding && !startingHold && !get().live && !tapSticky && !pendingStickyTap) return
    const gen = holdGen
    holding = false
    tapSticky = false
    pendingStickyTap = false
    clearTapTimers()
    flushingHold = true
    let translateJob: { lang: Lang; text: string } | null = null
    try {
      // Already have committed STT finals → shorter flush (latency). Else wait for late finals.
      const committedBeforeStop = holdFinals.length > 0 && !holdInterim.trim()
      // Stop recognizer first so Azure/WebSpeech can flush a final transcript.
      // Keep holdSideLock until after the flush window so late finals stay on-pane.
      await tearDownLive(get, set, { clearInterim: false, clearSideLock: false })
      await new Promise((r) => setTimeout(r, committedBeforeStop ? 70 : 160))
      if (gen !== holdGen) {
        holdSideLock = null
        set({ liveSide: null })
        return
      }

      const lang = holdLang
      const text = holdSourceText()
      resetHoldCapture()
      holdSideLock = null
      set({ liveSide: null })

      if (lang && text) {
        translateJob = { lang, text }
      } else {
        set({
          status: 'idle',
          enInterim: '',
          yueInterim: '',
          face: { ...get().face, enInterim: '', yueInterim: '' },
        })
      }
    } finally {
      // Always clear before translate so the next mic press is never gated on network MT.
      flushingHold = false
    }

    let postSpeak: { text: string; lang: Lang } | null = null
    if (translateJob) {
      postSpeak = await runTranslation(get, set, translateJob.lang, translateJob.text, {
        lean: true,
        skipSpeak: true,
      })
    }
    if (postSpeak) await speakFinal(get, set, postSpeak.text, postSpeak.lang)
  },

  translateTyped: async (text, from) => {
    const trimmed = text.trim()
    if (!trimmed) return
    set({ error: null })
    // Lean = no alternatives fan-out (faster primary). Enter still uses the same path.
    await runTranslation(get, set, from, trimmed, {
      lean: true,
      minThinkingMs: 120,
      enrichAlts: true,
    })
  },

  openBreakdown: (phrase, opts) => {
    const trimmed = phrase.trim()
    if (!trimmed) return
    const defs = (opts?.definitions || []).map((d) => d.trim()).filter(Boolean)
    const alts = (opts?.alternatives || []).map((a) => a.trim()).filter(Boolean)
    const hasHan = /[\u3400-\u9fff]/.test(trimmed)
    const lang = opts?.lang || (hasHan ? get().chineseLang : 'en')
    const layer: DetailLayer = {
      kind: 'phrase',
      phrase: trimmed,
      lang,
      translation: opts?.translation?.trim() || undefined,
      definition: opts?.definition?.trim() || undefined,
      definitions: defs.length ? defs : undefined,
      alternatives: alts.length ? alts : undefined,
      romanization: opts?.romanization?.trim() || undefined,
      sandhiHint: opts?.sandhiHint?.trim() || undefined,
      ipa: opts?.ipa?.trim() || undefined,
      alternativeRomanizations: opts?.alternativeRomanizations?.length
        ? opts.alternativeRomanizations.map((r) => r.trim())
        : undefined,
    }
    set({
      detailStack: [layer],
      detailMinimized: false,
    })
  },

  pushDetail: (layer) => {
    const stack = [...get().detailStack, layer]
    set({
      detailStack: stack,
      detailMinimized: false,
    })
  },

  popDetail: () => {
    const stack = get().detailStack
    if (stack.length <= 1) {
      set({
        detailStack: [],
        detailMinimized: false,
      })
      return
    }
    set({ detailStack: stack.slice(0, -1) })
  },

  closeBreakdown: () =>
    set({
      detailStack: [],
      detailMinimized: false,
    }),

  minimizeDetail: () => {
    if (!get().detailStack.length) return
    set({ detailMinimized: true })
  },

  restoreDetail: () => {
    if (!get().detailStack.length) return
    set({ detailMinimized: false })
  },

  selectYueVariation: (phrase) => {
    const chosen = phrase.trim()
    if (!chosen) return
    const current = get().yueTranslation.trim()
    const prevAlts = get().yueAlternatives
    const latest = get().history[0]
    const prevAltRoms = latest?.alternativeRomanizations || []
    const primaryRom = latest?.romanization || ''
    const chosenIdx = prevAlts.indexOf(chosen)
    const chosenRom = chosenIdx >= 0 ? prevAltRoms[chosenIdx] || '' : ''
    const romByPhrase = new Map<string, string>()
    if (current && primaryRom) romByPhrase.set(current, primaryRom)
    prevAlts.forEach((a, i) => {
      if (prevAltRoms[i]) romByPhrase.set(a, prevAltRoms[i])
    })
    const nextAlts = [current, ...prevAlts]
      .map((s) => s.trim())
      .filter((s) => s && s !== chosen)
      .filter((s, i, arr) => arr.indexOf(s) === i)
      .slice(0, 3)
    const nextAltRoms = nextAlts.map((a) => romByPhrase.get(a) || '')

    const history = get().history
    const zhTargets = latest && (latest.to === 'yue' || latest.to === 'cmn' || latest.to === 'wuu' || latest.to === 'tl' || latest.to === 'es' || latest.to === 'vi')
    const nextHistory =
      zhTargets
        ? [
            {
              ...latest,
              translation: chosen,
              alternatives: nextAlts,
              romanization: chosenRom || latest.romanization,
              alternativeRomanizations: nextAltRoms.some(Boolean) ? nextAltRoms : undefined,
            },
            ...history.slice(1),
          ]
        : history

    const sourceEn =
      (zhTargets ? latest.source : '') ||
      get().enInterim ||
      ''
    const definition = get().yueDefinition || undefined
    const definitions = get().yueDefinitions
    const zhLang = get().chineseLang
    set({
      yueTranslation: chosen,
      yueAlternatives: nextAlts,
      history: nextHistory,
      detailStack: [
        {
          kind: 'phrase',
          phrase: chosen,
          lang: zhLang,
          translation: sourceEn || undefined,
          definition,
          definitions: definitions.length ? definitions : undefined,
          alternatives: nextAlts.length ? nextAlts : undefined,
          romanization: chosenRom || undefined,
          sandhiHint: latest?.sandhiHint,
          ipa: latest?.ipa,
          alternativeRomanizations: nextAltRoms.some(Boolean) ? nextAltRoms : undefined,
        },
      ],
      detailMinimized: false,
    })
  },

  selectEnVariation: (phrase) => {
    const chosen = phrase.trim()
    if (!chosen) return
    const current = get().enTranslation.trim()
    const prevAlts = get().enAlternatives || get().yueAlternatives
    const nextAlts = [current, ...prevAlts]
      .map((s) => s.trim())
      .filter((s) => s && s !== chosen)
      .filter((s, i, arr) => arr.indexOf(s) === i)
      .slice(0, 3)

    const history = get().history
    const latest = history[0]
    const nextHistory =
      latest && latest.to === 'en'
        ? [
            {
              ...latest,
              translation: chosen,
              alternatives: nextAlts,
            },
            ...history.slice(1),
          ]
        : history

    const sourceYue =
      (latest && latest.to === 'en' ? latest.source : '') || get().yueInterim || ''
    const definition = get().enDefinition || get().yueDefinition || undefined
    const definitions = get().enDefinitions?.length ? get().enDefinitions : get().yueDefinitions
    set({
      enTranslation: chosen,
      enAlternatives: nextAlts,
      history: nextHistory,
      detailStack: [
        {
          kind: 'phrase',
          phrase: chosen,
          lang: 'en',
          translation: sourceYue || undefined,
          definition,
          definitions: definitions?.length ? definitions : undefined,
          alternatives: nextAlts.length ? nextAlts : undefined,
        },
      ],
      detailMinimized: false,
    })
  },

  formalizeMexicanSpanish: async ({ spanish, sourceText, sourceLang = 'en' }) => {
    const source = sourceText.trim()
    const prev = spanish.trim()
    if (!source || !prev) return
    const from: Lang = sourceLang === 'es' ? 'en' : sourceLang
    set({ translating: true, translatingTo: 'es', error: null })
    try {
      const result = await translateText(source, from, 'es', {
        includeAlternatives: true,
        register: 'formal',
      })
      const formal = sanitizeEsTranslation(result.text)
      if (!formal) throw new Error('Formal translation returned empty')
      const alts = (result.alternatives || [])
        .map((a) => sanitizeEsTranslation(a))
        .filter((a): a is string => Boolean(a && a !== formal))
        .slice(0, 3)
      const history = get().history
      const latest = history[0]
      const nextHistory =
        latest && latest.to === 'es'
          ? [
              {
                ...latest,
                translation: formal,
                definition: result.definition || latest.definition,
                definitions: result.definitions?.length
                  ? result.definitions
                  : latest.definitions,
                alternatives: alts.length ? alts : undefined,
              },
              ...history.slice(1),
            ]
          : history

      const face = get().face
      const nextFace =
        get().mode === 'conversation'
          ? {
              ...face,
              yueTranslation:
                face.yueTranslation.trim() === prev ? formal : face.yueTranslation,
              enTranslation:
                face.enTranslation.trim() === prev ? formal : face.enTranslation,
            }
          : face

      set({
        enTranslation: get().enTranslation.trim() === prev ? formal : get().enTranslation,
        enAlternatives:
          get().soloUpperLang === 'es' || get().enTranslation.trim() === formal
            ? alts
            : get().enAlternatives,
        yueTranslation: get().yueTranslation.trim() === prev ? formal : get().yueTranslation,
        yueAlternatives:
          get().soloLowerLang === 'es' || get().yueTranslation.trim() === formal
            ? alts
            : get().yueAlternatives,
        yueDefinition: result.definition || get().yueDefinition,
        yueDefinitions: result.definitions?.length
          ? result.definitions
          : get().yueDefinitions,
        history: nextHistory,
        face: nextFace,
        detailStack: [
          {
            kind: 'phrase',
            phrase: formal,
            lang: 'es',
            translation: source,
            definition: result.definition || undefined,
            definitions: result.definitions?.length ? result.definitions : undefined,
            alternatives: alts.length ? alts : undefined,
          },
        ],
        detailMinimized: false,
        error: null,
      })
    } catch (e) {
      set({
        error: humanizeThrownError(e) || 'Could not formalize translation',
      })
      throw e
    } finally {
      set({ translating: false, translatingTo: null })
    }
  },

  clearCurrent: () => {
    speakToken += 1
    stopSpeaking()
    invalidatePendingTranslations()
    if (get().mode === 'conversation') {
      set({
        face: emptyFaceLive(),
        detailStack: [],
        detailMinimized: false,
        translating: false,
        translatingTo: null,
        altsLoading: false,
      })
      return
    }
    set({
      enInterim: '',
      yueInterim: '',
      enTranslation: '',
      yueTranslation: '',
      yueDefinition: '',
      yueDefinitions: [],
      yueAlternatives: [],
      enDefinition: '',
      enDefinitions: [],
      enAlternatives: [],
      altsLoading: false,
      detailStack: [],
      detailMinimized: false,
      translating: false,
      translatingTo: null,
    })
  },

  clearHistory: () => {
    set({ history: [] })
    void import('./historySync').then((m) => m.persistHistory([]))
  },
  }
})

if (import.meta.env.DEV && typeof window !== 'undefined') {
  const w = window as unknown as {
    __yueStore?: typeof useYueStore
    __yueLearnedGloss?: unknown
    __setLiveSessionFactoryForTests?: typeof __setLiveSessionFactoryForTests
    __getHoldDebugFlagsForTests?: typeof __getHoldDebugFlagsForTests
  }
  w.__yueStore = useYueStore
  w.__setLiveSessionFactoryForTests = __setLiveSessionFactoryForTests
  w.__getHoldDebugFlagsForTests = __getHoldDebugFlagsForTests
  import('./learnedGloss').then((m) => {
    w.__yueLearnedGloss = m.learnedGlossStats
  })
}


/** Keep History on device (and sync to the account when signed in). */
if (typeof window !== 'undefined') {
  let prevHistory = useYueStore.getState().history
  useYueStore.subscribe((state) => {
    if (state.history === prevHistory) return
    prevHistory = state.history
    void import('./historySync').then((m) => m.persistHistory(state.history))
  })
}
