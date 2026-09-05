import { create } from 'zustand'
import { createAzureLiveSession } from './azureSpeech'
import { createWebSpeechSession } from './webSpeech'
import { speakText, stopSpeaking, isMicEchoMuted, unlockTtsPlayback } from './tts'
import { fetchHealth, getUpgradeUrl, saveAutoSpeakPref } from './api'
import { micBlockedMessage, unlockMicrophone, stopMediaStream, isAppleTouchDevice } from './mediaAccess'
import { connectMicAnalyser, disconnectMicAnalyser } from './audioReactive'
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
  /** Remembered partner variety for Conversation (粵 / 普 / 沪 / Tagalog). */
  chineseLang: 'yue' | 'cmn' | 'wuu' | 'tl'
  /** Solo upper pane language (any en|yue|cmn|wuu|tl; must differ from lower). */
  soloUpperLang: Lang
  /** Solo lower pane language (any en|yue|cmn|wuu|tl; must differ from upper). */
  soloLowerLang: Lang
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
  soloShowAutoHint: boolean
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
  /** Conversation: clear partner-pane output after Chinese variety change. */
  clearConversationChinesePane: () => void
  setAutoSpeak: (v: boolean) => void
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
  translateTyped: (text: string, from: Lang) => Promise<void>
  openBreakdown: (
    phrase: string,
    opts?: {
      lang?: 'en' | 'yue' | 'cmn' | 'wuu' | 'tl'
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
  clearHistory: () => void
  setSoloShowAutoHint: (v: boolean) => void
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
    holdSideLock = null
    releaseHeldMic()
    clearTapTimers()
  }
}

function holdActive(gen: number) {
  return gen === holdGen && (holding || flushingHold || tapSticky)
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
  return detected
}

function formatMinutes(seconds: number) {
  return Math.max(0, Math.ceil(seconds / 60))
}

async function runSpeak(
  get: () => State,
  set: (p: Partial<State>) => void,
  text: string,
  lang: Lang,
) {
  const token = ++speakToken
  get().session?.setPlaybackActive(true)
  set({ status: 'speaking', speakingText: text })
  try {
    await speakText(text, lang)
  } finally {
    get().session?.setPlaybackActive(false)
    if (token === speakToken) {
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
  if (isMicEchoMuted() || get().status === 'speaking') {
    stopSpeaking()
    get().session?.setPlaybackActive(false)
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
    if (lang === 'en') {
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
  speakToken += 1
  stopSpeaking()
  stopHeartbeat()
  clearTapTimers()
  holding = false
  tapSticky = false
  startingHold = false
  // Keep face pane language lock through STT flush unless explicitly cleared.
  if (opts?.clearSideLock !== false) {
    holdSideLock = null
  }
  const session = get().session
  if (session) {
    try {
      await session.stop()
    } catch {
      /* ignore */
    }
  }
  // Stop after the recognizer so Azure can finish reading the stream.
  releaseHeldMic()
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
  void get().loadBootstrap()
}

export const useYueStore = create<State>((set, get) => ({
  mode: 'solo',
  speakDirection: 'en',
  chineseLang: 'yue',
  soloUpperLang: 'en',
  soloLowerLang: 'yue',
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
  soloShowAutoHint: false,
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
      speakDirection === 'yue' || speakDirection === 'cmn' || speakDirection === 'wuu' || speakDirection === 'tl'
        ? { speakDirection, chineseLang: speakDirection }
        : { speakDirection },
    ),
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
      lang === 'yue' || lang === 'cmn' || lang === 'wuu' || lang === 'tl'
        ? { chineseLang: lang as 'yue' | 'cmn' | 'wuu' | 'tl' }
        : current === 'yue' || current === 'cmn' || current === 'wuu' || current === 'tl'
          ? {}
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
  setSoloShowAutoHint: (soloShowAutoHint) => set({ soloShowAutoHint }),

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
    set({ error: null })
    await runSpeak(get, set, trimmed, lang)
  },

  loadBootstrap: async () => {
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
      set({
        entitlement: ent,
        demoMode: Boolean(data.engines?.demo),
        incidentBanner: data.incidentBanner ?? null,
        autoSpeak: nextAutoSpeak,
      })
      // Sync TTS voices from server prefs (cross-device) into local cache.
      try {
        const {
          writeLocalCmnVoice,
          writeLocalEnVoice,
          writeLocalTlVoice,
          writeLocalYueVoice,
          resolveCmnVoice,
          resolveEnVoice,
          resolveTlVoice,
          resolveYueVoice,
        } = await import('./ttsVoices')
        if (ent.prefs?.ttsVoiceYue) writeLocalYueVoice(resolveYueVoice(ent.prefs.ttsVoiceYue))
        if (ent.prefs?.ttsVoiceEn) writeLocalEnVoice(resolveEnVoice(ent.prefs.ttsVoiceEn))
        if (ent.prefs?.ttsVoiceCmn) writeLocalCmnVoice(resolveCmnVoice(ent.prefs.ttsVoiceCmn))
        if (ent.prefs?.ttsVoiceTl) writeLocalTlVoice(resolveTlVoice(ent.prefs.ttsVoiceTl))
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
  },

  stopLive: async () => {
    resetHoldCapture()
    flushingHold = false
    tapSticky = false
    clearTapTimers()
    holdGen += 1
    await tearDownLive(get, set, { clearInterim: true })
  },

  startHold: async (side) => {
    repairStaleHoldCapture(get)
    // Ghost `live` without a session blocks every subsequent press until refresh.
    if (get().live && !get().session) {
      await tearDownLive(get, set, { clearInterim: false })
      repairStaleHoldCapture(get)
    }
    if (holding || startingHold || flushingHold || tapSticky || get().live) return
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
    const micBlock = micBlockedMessage()
    if (micBlock) {
      set({ error: micBlock })
      return
    }

    // Sync unlock before any await — iOS needs a gesture-time play() so later
    // auto-speak (after STT + translate) can use the same HTMLAudioElement.
    unlockTtsPlayback()
    // Always hard-stop any prior TTS/echo state — a stuck `playing` flag silences STT everywhere.
    speakToken += 1
    stopSpeaking()
    set({ status: 'idle', speakingText: null })

    const apple = isAppleTouchDevice()
    // iPhone/iPad: always start Web Speech in the user-gesture turn. A warm Azure
    // token on the second press skips that path and Azure often listens with no audio.
    const webSpeechFirst = apple
    // Re-open the iOS audio session before Web Speech after auto-speak from the prior turn.
    const micWarm = apple ? unlockMicrophone() : null
    // Desktop / warm-token paths: kick off getUserMedia now so it runs during sync setup.
    const micPriming = webSpeechFirst ? null : unlockMicrophone()

    const gen = ++holdGen
    holding = true
    tapSticky = false
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
      liveInteraction: 'hold',
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
        set({ error: message })
        // STT session died — tear down so live=false doesn’t block the next mic press.
        void get().endHold()
      },
      onStatus: (status: 'listening' | 'idle' | 'speaking') => {
        if (gen !== holdGen) return
        if (get().status === 'speaking' && status === 'listening') return
        if (status !== 'speaking') set({ status })
      },
    }

    const webSpeechLock = () => {
      const lock = holdSideLock
      const d = get().speakDirection
      return lock || (d === 'en' || d === 'yue' || d === 'cmn' || d === 'wuu' ? d : undefined)
    }

    let next = null as LiveSession | null
    let alreadyStarted = false

    // iPhone/iPad without a warm Azure token: start Web Speech BEFORE any await so
    // recognition.start() stays in the user-gesture turn (otherwise Safari listens with no audio).
    if (webSpeechFirst) {
      // Prime iOS audio session in parallel — never block STT on getUserMedia or early
      // syllables are lost (English speakers especially tend to start talking immediately).
      if (micWarm) {
        void micWarm.then((warmed) => {
          if (warmed) stopMediaStream(warmed)
        })
      }
      next = createWebSpeechSession(handlers, webSpeechLock())
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
    }

    if (!alreadyStarted) {
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

      if (gen !== holdGen || (!holding && !tapSticky)) {
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

    if (gen !== holdGen || (!holding && !tapSticky)) {
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
      if (gen !== holdGen || (!holding && !tapSticky)) {
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
      set({ live: true, session: next, status: 'listening', error: null })
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
      releaseHeldMic()
      clearTapTimers()
      set({ error: String(e), live: false, session: null, liveInteraction: null, liveSide: null })
    }
  },

  armTapMode: () => {
    // Modes 1–2: short press released — keep mic on until sentence end or second tap.
    if (!holding && !startingHold && !get().live) return
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
    // Prevent concurrent teardown/translate (double release / double tap).
    if (flushingHold) return
    if (!holding && !startingHold && !get().live && !tapSticky) return
    const gen = holdGen
    holding = false
    tapSticky = false
    clearTapTimers()
    flushingHold = true
    let postSpeak: { text: string; lang: Lang } | null = null
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
        // Capture finished → single final translate (lean = no alt fan-out).
        postSpeak = await runTranslation(get, set, lang, text, { lean: true, skipSpeak: true })
      } else {
        set({
          status: 'idle',
          enInterim: '',
          yueInterim: '',
          face: { ...get().face, enInterim: '', yueInterim: '' },
        })
      }
    } finally {
      flushingHold = false
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
    const zhTargets = latest && (latest.to === 'yue' || latest.to === 'cmn' || latest.to === 'wuu' || latest.to === 'tl')
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

  clearHistory: () => {
    speakToken += 1
    stopSpeaking()
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
      history: [],
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
}))

if (import.meta.env.DEV && typeof window !== 'undefined') {
  const w = window as unknown as {
    __yueStore?: typeof useYueStore
    __yueLearnedGloss?: unknown
  }
  w.__yueStore = useYueStore
  import('./learnedGloss').then((m) => {
    w.__yueLearnedGloss = m.learnedGlossStats
  })
}
