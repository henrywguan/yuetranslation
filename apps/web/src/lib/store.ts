import { create } from 'zustand'
import { createAzureLiveSession } from './azureSpeech'
import { createWebSpeechSession } from './webSpeech'
import { speakText, stopSpeaking, isTtsPlaying } from './tts'
import { fetchHealth, getUpgradeUrl, postHeartbeat, translateText } from './api'
import { micBlockedMessage, unlockMicrophone, stopMediaStream, isAppleTouchDevice } from './mediaAccess'
import { connectMicAnalyser, disconnectMicAnalyser } from './audioReactive'
import { prefetchSpeechToken, peekSpeechToken } from './speechToken'
import { newId } from './id'
import { sanitizeYueTranslation, sanitizeEnTranslation } from './translationGuard'
import type { DetailLayer } from './detailTypes'
import type {
  ConversationTurn,
  Entitlement,
  Lang,
  LiveSession,
  Mode,
  SpeakDirection,
} from './types'

/** Isolated live lines for Conversation mode — never shared with Solo/Text. */
type FaceLive = {
  enInterim: string
  yueInterim: string
  enTranslation: string
  yueTranslation: string
  yueDefinition: string
  yueDefinitions: string[]
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
  live: boolean
  status: 'idle' | 'listening' | 'speaking'
  autoSpeak: boolean
  entitlement: Entitlement | null
  /** True when /api/health reports demo engine (no model key loaded). */
  demoMode: boolean
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
  /** True while a background request is loading text-mode EN→粵 alternatives. */
  altsLoading: boolean
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
      translation?: string
      definition?: string
      definitions?: string[]
      alternatives?: string[]
    },
  ) => void
  pushDetail: (layer: DetailLayer) => void
  popDetail: () => void
  closeBreakdown: () => void
  minimizeDetail: () => void
  restoreDetail: () => void
  /** Promote a variation to primary, reshuffle alts, and open its character breakdown. */
  selectYueVariation: (phrase: string) => void
  clearHistory: () => void
}

let translateSeq = 0
const pending = new Map<Lang, number>()
let speakToken = 0
let heartbeatTimer: ReturnType<typeof setInterval> | null = null
let translateInFlight = 0
/** Aborts the previous /api/translate when a newer Text request starts. */
let translateAbort: AbortController | null = null
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

/** After a finalized utterance in tap mode, wait this long with no new speech → auto-stop. */
const TAP_SENTENCE_END_MS = 650
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

/** Drop in-flight translate results so a new hold cannot be overwritten. */
function invalidatePendingTranslations() {
  translateSeq += 1
  pending.clear()
  translateAbort?.abort()
  translateAbort = null
}

function resolveHoldLang(detected: Lang, direction: SpeakDirection): Lang {
  if (holdSideLock) return holdSideLock
  return resolveSourceLang(detected, direction)
}

function beginTranslate(set: (p: Partial<State>) => void, to: Lang) {
  translateInFlight += 1
  set({ translating: true, translatingTo: to })
}

function endTranslate(set: (p: Partial<State>) => void) {
  translateInFlight = Math.max(0, translateInFlight - 1)
  if (translateInFlight === 0) {
    set({ translating: false, translatingTo: null })
  }
}

function resolveSourceLang(detected: Lang, direction: SpeakDirection): Lang {
  if (direction === 'en') return 'en'
  if (direction === 'yue') return 'yue'
  // `cmn` is reserved for later Mandarin STT — treat as auto-detect until then.
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
  set({ status: 'speaking' })
  try {
    await speakText(text, lang)
  } finally {
    if (token !== speakToken) return
    get().session?.setPlaybackActive(false)
    set({ status: get().live ? 'listening' : 'idle' })
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
  const allowed = Boolean(ent?.allowed.autoSpeak && get().autoSpeak)
  if (!allowed) return
  await runSpeak(get, set, text, lang)
}

function nextHistory(
  get: () => State,
  turn: Omit<ConversationTurn, 'id' | 'at'>,
): ConversationTurn[] {
  return [{ id: newId(), at: Date.now(), ...turn }, ...get().history].slice(0, 80)
}

/**
 * After a lean Text EN→粵 primary lands, fetch alternatives/definitions in the
 * background so the first paint stays fast.
 */
async function enrichTextAlternatives(
  get: () => State,
  set: (p: Partial<State>) => void,
  sourceEn: string,
  primaryYue: string,
  seq: number,
  signal: AbortSignal,
) {
  set({ altsLoading: true })
  try {
    const result = await translateText(sourceEn, 'en', 'yue', {
      includeAlternatives: true,
      signal,
    })
    if (pending.get('en') !== seq || signal.aborted) return

    const latest = get().history[0]
    if (!latest || latest.from !== 'en' || latest.to !== 'yue' || latest.source !== sourceEn) {
      return
    }

    const currentPrimary = latest.translation.trim()
    const enrichPrimary = sanitizeYueTranslation(result.text)
    const fromResult = (result.alternatives || [])
      .map((a) => sanitizeYueTranslation(a))
      .filter(Boolean) as string[]
    const extras: string[] = []
    if (enrichPrimary && enrichPrimary !== currentPrimary) extras.push(enrichPrimary)
    // Keep the lean primary as an alt if enrich returned a different preferred line.
    if (primaryYue && primaryYue !== currentPrimary && primaryYue !== enrichPrimary) {
      extras.push(primaryYue)
    }
    const alternatives = [...extras, ...fromResult]
      .map((s) => s.trim())
      .filter((s) => s && s !== currentPrimary)
      .filter((s, i, arr) => arr.indexOf(s) === i)
      .slice(0, 4)

    const definitions = (result.definitions || [])
      .map((d) => d.trim())
      .filter(Boolean)
    const mergedDefs = [
      ...(latest.definitions || []),
      ...definitions,
      ...(result.definition ? [result.definition] : []),
    ]
      .map((d) => d.trim())
      .filter(Boolean)
      .filter((d, i, arr) => arr.findIndex((x) => x.toLowerCase() === d.toLowerCase()) === i)
      .slice(0, 8)

    const nextLatest = {
      ...latest,
      alternatives: alternatives.length ? alternatives : latest.alternatives,
      definitions: mergedDefs.length ? mergedDefs : latest.definitions,
      definition: latest.definition || result.definition || sourceEn,
    }

    const stack = get().detailStack
    const top = stack[0]
    const nextStack =
      top?.kind === 'phrase' &&
      (top.phrase === currentPrimary || top.phrase === primaryYue || top.phrase === enrichPrimary)
        ? [
            {
              ...top,
              phrase: currentPrimary,
              translation: sourceEn,
              definition: nextLatest.definition,
              definitions: nextLatest.definitions,
              alternatives: nextLatest.alternatives,
            },
            ...stack.slice(1),
          ]
        : stack

    set({
      yueAlternatives: nextLatest.alternatives || [],
      yueDefinitions: nextLatest.definitions || [],
      yueDefinition: nextLatest.definition || get().yueDefinition,
      history: [nextLatest, ...get().history.slice(1)],
      detailStack: nextStack,
    })
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') return
    if (e instanceof Error && e.name === 'AbortError') return
    // Soft-fail: primary already shown.
  } finally {
    if (pending.get('en') === seq) set({ altsLoading: false })
  }
}

/**
 * One-shot translation after capture (or typed submit).
 * Never call mid-utterance — there is no interim translate path.
 */
async function runTranslation(
  get: () => State,
  set: (p: Partial<State>) => void,
  lang: Lang,
  text: string,
  opts?: { lean?: boolean; minThinkingMs?: number },
) {
  const to: Lang = lang === 'en' ? 'yue' : 'en'
  const seq = ++translateSeq
  pending.set(lang, seq)
  beginTranslate(set, to)
  const startedAt = Date.now()
  let speak: { text: string; lang: Lang } | null = null
  const isFace = get().mode === 'conversation'
  const isText = get().mode === 'text'
  // Live mic + Conversation + Text: skip EN→粵 variation fan-out for lower latency.
  // Text still paints a primary result quickly; alternatives come from enrichTextAlternatives.
  const lean = Boolean(opts?.lean) || isFace || isText
  // Text should feel snappy — only a short floor so the loader does not flash.
  const minThinkingMs =
    opts?.minThinkingMs ?? (isText ? 120 : 900)
  translateAbort?.abort()
  translateAbort = new AbortController()
  const signal = translateAbort.signal
  if (isText) set({ altsLoading: false })
  try {
    const result = await translateText(text, lang, to, {
      includeAlternatives: lang === 'en' && !lean,
      signal,
    })
    if (pending.get(lang) !== seq || signal.aborted) return
    const hold = minThinkingMs - (Date.now() - startedAt)
    if (hold > 0) await new Promise((r) => setTimeout(r, hold))
    if (pending.get(lang) !== seq || signal.aborted) return
    const clean =
      to === 'yue'
        ? sanitizeYueTranslation(result.text)
        : sanitizeEnTranslation(result.text, lang === 'yue' ? text : undefined)
    if (!clean) {
      set({
        error:
          to === 'yue'
            ? 'Could not produce Cantonese for this phrase. Try again or rephrase.'
            : 'Could not produce English for this phrase. Try again or rephrase.',
      })
      return
    }
    const altSanitize =
      to === 'yue'
        ? sanitizeYueTranslation
        : (value: string | null | undefined) => sanitizeEnTranslation(value, lang === 'yue' ? text : undefined)
    const alternatives = (result.alternatives || []).filter((a) => Boolean(altSanitize(a)))
    const definition = result.definition || (lang === 'en' ? text : '')
    const definitions = (result.definitions || []).filter((d) => Boolean(d?.trim()))

    if (isFace) {
      const face = get().face
      if (lang === 'en') {
        set({
          face: {
            ...face,
            enInterim: text,
            yueInterim: '',
            enTranslation: '',
            yueTranslation: clean,
            yueDefinition: result.definition || text,
            yueDefinitions: definitions,
          },
        })
      } else {
        set({
          face: {
            ...face,
            yueInterim: text,
            enInterim: '',
            yueTranslation: '',
            enTranslation: clean,
            yueDefinition: result.definition || '',
            yueDefinitions: definitions,
          },
        })
      }
    } else {
      const history = nextHistory(get, {
        from: lang,
        to,
        source: text,
        translation: clean,
        definition,
        definitions: definitions.length ? definitions : undefined,
        alternatives: lang === 'en' ? alternatives : undefined,
      })
      if (lang === 'en') {
        set({
          enInterim: text,
          yueInterim: '',
          enTranslation: '',
          yueTranslation: clean,
          yueDefinition: result.definition || text,
          yueDefinitions: definitions,
          yueAlternatives: alternatives,
          history,
        })
      } else {
        set({
          yueInterim: text,
          enInterim: '',
          yueTranslation: '',
          enTranslation: clean,
          yueDefinition: result.definition || '',
          yueDefinitions: definitions,
          yueAlternatives: [],
          history,
        })
      }
    }
    speak = { text: clean, lang: to }

    // Text EN→粵: paint primary first, then enrich alternatives without blocking TTS/UI.
    if (isText && lang === 'en' && lean && !signal.aborted && pending.get(lang) === seq) {
      void enrichTextAlternatives(get, set, text, clean, seq, signal)
    }
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') return
    if (e instanceof Error && e.name === 'AbortError') return
    set({ error: String(e) })
  } finally {
    endTranslate(set)
  }
  if (speak) await speakFinal(get, set, speak.text, speak.lang)
}

function stopHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer)
    heartbeatTimer = null
  }
}

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

function applyHoldSource(
  get: () => State,
  set: (p: Partial<State>) => void,
  lang: Lang,
  text: string,
) {
  // Only barge in on real TTS — do not mute the mic on every STT interim/final.
  if (isTtsPlaying() || get().status === 'speaking') {
    stopSpeaking()
    get().session?.setPlaybackActive(false)
  }
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
  } else if (lang === 'en') {
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
  live: false,
  status: 'idle',
  autoSpeak: false,
  entitlement: null,
  demoMode: false,
  error: null,
  enInterim: '',
  yueInterim: '',
  enTranslation: '',
  yueTranslation: '',
  yueDefinition: '',
  yueDefinitions: [],
  yueAlternatives: [],
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
    if (get().live || startingHold || holding || tapSticky) {
      void get()
        .stopLive()
        .then(() => set({ mode }))
      return
    }
    set({ mode })
  },
  setSpeakDirection: (speakDirection) => set({ speakDirection }),
  setAutoSpeak: (autoSpeak) => set({ autoSpeak }),

  speakManual: async (text, lang) => {
    const trimmed = text.trim()
    if (!trimmed) return
    const ent = get().entitlement
    if (ent && !ent.allowed.tts) {
      set({
        error:
          ent.reason === 'login_required'
            ? 'Log in to play voice.'
            : 'Voice playback needs remaining TTS quota.',
      })
      return
    }
    if (get().status === 'speaking') {
      speakToken += 1
      stopSpeaking()
      get().session?.setPlaybackActive(false)
      set({ status: get().live ? 'listening' : 'idle', error: null })
      return
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
      // Do not force autoSpeak on — keep the user's preference (default off).
      set({
        entitlement: ent,
        demoMode: Boolean(data.engines?.demo),
      })
      prefetchSpeechToken()
    } catch {
      set({
        entitlement: null,
        demoMode: false,
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
        // Live STT preview of the source only — never translate here.
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
        set({ error: message })
        // Web Speech gave up after silent restarts — end the stuck “listening” turn.
        if (/no speech detected/i.test(message)) {
          void get().endHold()
        }
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
      return lock || (d === 'en' || d === 'yue' ? d : undefined)
    }

    const apple = isAppleTouchDevice()
    let next = null as LiveSession | null
    let alreadyStarted = false

    // iPhone/iPad without a warm Azure token: start Web Speech BEFORE any await so
    // recognition.start() stays in the user-gesture turn (otherwise Safari listens with no audio).
    if (apple && !peekSpeechToken()) {
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
      const primed = await unlockMicrophone()
      if (!primed) {
        holding = false
        tapSticky = false
        startingHold = false
        holdSideLock = null
        clearTapTimers()
        set({
          error: 'Microphone permission denied. Allow mic access for this site and try again.',
          liveInteraction: null,
          liveSide: null,
        })
        return
      }
      heldMicStream = primed
      connectMicAnalyser(primed)

      if (gen !== holdGen || (!holding && !tapSticky)) {
        releaseHeldMic()
        startingHold = false
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
      startingHold = false
      if (next) {
        try {
          await next.stop()
        } catch {
          /* ignore */
        }
      }
      releaseHeldMic()
      return
    }
    if (!next) {
      holding = false
      tapSticky = false
      startingHold = false
      holdSideLock = null
      releaseHeldMic()
      clearTapTimers()
      set({
        error: 'Speech unavailable. Set AZURE_SPEECH_KEY or use a browser with speech recognition.',
        liveInteraction: null,
        liveSide: null,
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
        startingHold = false
        try {
          await next.stop()
        } catch {
          /* ignore */
        }
        releaseHeldMic()
        return
      }
      startingHold = false
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
      stopHeartbeat()
      heartbeatTimer = setInterval(() => {
        void postHeartbeat(15)
          .then((ent) => {
            set({ entitlement: ent })
            if (!ent.allowed.live) {
              void get().stopLive()
              set({ error: 'Live minutes exhausted for this month.' })
            }
          })
          .catch((err) => {
            if (err?.code === 401 || err?.code === 402) {
              void get().stopLive()
              set({ error: err.message, entitlement: err.entitlement || get().entitlement })
            }
          })
      }, 15000)
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
    // Already have committed STT finals → shorter flush (latency). Else wait for late finals.
    const committedBeforeStop = holdFinals.length > 0 && !holdInterim.trim()
    // Stop recognizer first so Azure/WebSpeech can flush a final transcript.
    // Keep holdSideLock until after the flush window so late finals stay on-pane.
    await tearDownLive(get, set, { clearInterim: false, clearSideLock: false })
    await new Promise((r) => setTimeout(r, committedBeforeStop ? 70 : 160))
    if (gen !== holdGen) {
      flushingHold = false
      holdSideLock = null
      set({ liveSide: null })
      return
    }

    const lang = holdLang
    const text = holdSourceText()
    resetHoldCapture()
    holdSideLock = null
    flushingHold = false
    set({ liveSide: null })

    if (lang && text) {
      // Capture finished → single final translate (lean = no alt fan-out).
      await runTranslation(get, set, lang, text, { lean: true })
    } else {
      set({
        status: 'idle',
        enInterim: '',
        yueInterim: '',
        face: { ...get().face, enInterim: '', yueInterim: '' },
      })
    }
  },

  translateTyped: async (text, from) => {
    const trimmed = text.trim()
    if (!trimmed) return
    set({ error: null })
    // Lean = no alternatives fan-out (faster primary). Enter still uses the same path.
    await runTranslation(get, set, from, trimmed, { lean: true, minThinkingMs: 120 })
  },

  openBreakdown: (phrase, opts) => {
    const trimmed = phrase.trim()
    if (!trimmed) return
    const defs = (opts?.definitions || []).map((d) => d.trim()).filter(Boolean)
    const alts = (opts?.alternatives || []).map((a) => a.trim()).filter(Boolean)
    const layer: DetailLayer = {
      kind: 'phrase',
      phrase: trimmed,
      translation: opts?.translation?.trim() || undefined,
      definition: opts?.definition?.trim() || undefined,
      definitions: defs.length ? defs : undefined,
      alternatives: alts.length ? alts : undefined,
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
    const nextAlts = [current, ...prevAlts]
      .map((s) => s.trim())
      .filter((s) => s && s !== chosen)
      .filter((s, i, arr) => arr.indexOf(s) === i)
      .slice(0, 3)

    const history = get().history
    const latest = history[0]
    const nextHistory =
      latest && latest.to === 'yue'
        ? [
            {
              ...latest,
              translation: chosen,
              alternatives: nextAlts,
            },
            ...history.slice(1),
          ]
        : history

    const sourceEn =
      (latest && latest.to === 'yue' ? latest.source : '') || get().enInterim || ''
    const definition = get().yueDefinition || undefined
    const definitions = get().yueDefinitions
    set({
      yueTranslation: chosen,
      yueAlternatives: nextAlts,
      history: nextHistory,
      detailStack: [
        {
          kind: 'phrase',
          phrase: chosen,
          translation: sourceEn || undefined,
          definition,
          definitions: definitions.length ? definitions : undefined,
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
      altsLoading: false,
      detailStack: [],
      detailMinimized: false,
      translating: false,
      translatingTo: null,
    })
  },
}))

if (import.meta.env.DEV && typeof window !== 'undefined') {
  ;(window as unknown as { __yueStore?: typeof useYueStore }).__yueStore = useYueStore
}
