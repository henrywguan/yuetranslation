import { create } from 'zustand'
import { createAzureLiveSession } from './azureSpeech'
import { createWebSpeechSession } from './webSpeech'
import { speakText, stopSpeaking } from './tts'
import { fetchHealth, getUpgradeUrl, postHeartbeat, translateText } from './api'
import type {
  ConversationTurn,
  Entitlement,
  Lang,
  LiveSession,
  Mode,
  SpeakDirection,
} from './types'

/** Isolated live lines for Face-to-face — never shared with Solo/Text. */
export type FaceLive = {
  enInterim: string
  yueInterim: string
  enTranslation: string
  yueTranslation: string
  yueDefinition: string
}

export function emptyFaceLive(): FaceLive {
  return {
    enInterim: '',
    yueInterim: '',
    enTranslation: '',
    yueTranslation: '',
    yueDefinition: '',
  }
}

type State = {
  mode: Mode
  speakDirection: SpeakDirection
  live: boolean
  status: 'idle' | 'listening' | 'speaking'
  autoSpeak: boolean
  entitlement: Entitlement | null
  error: string | null
  enInterim: string
  yueInterim: string
  enTranslation: string
  yueTranslation: string
  /** English gloss for the current Cantonese translation (clarity). */
  yueDefinition: string
  /** Colloquial EN→粵 variants for the current Cantonese result (empty if none). */
  yueAlternatives: string[]
  /** Face-to-face panes only — separate from Solo/Text results. */
  face: FaceLive
  /** Active Cantonese phrase shown in the character-breakdown frame (null = closed). */
  breakdownPhrase: string | null
  /** True while any translate request is in flight. */
  translating: boolean
  /** Target language of the in-flight translation (for pane placement). */
  translatingTo: Lang | null
  history: ConversationTurn[]
  session: LiveSession | null
  /** How the current live turn was armed — drives button copy. */
  liveInteraction: 'hold' | 'tap' | null
  /** Face-to-face: which pane owns the active mic turn. */
  liveSide: Lang | null
  setMode: (mode: Mode) => void
  setSpeakDirection: (d: SpeakDirection) => void
  setAutoSpeak: (v: boolean) => void
  /** Play (or stop) TTS for a line — does not require auto-speak. */
  speakManual: (text: string, lang: Lang) => Promise<void>
  loadBootstrap: () => Promise<void>
  /** Press/tap start: mic + STT (no translate yet). Optional side locks Face pane language. */
  startHold: (side?: Lang) => Promise<void>
  /** Short tap release: keep listening until speech pauses, then auto-translate. */
  armTapMode: () => void
  /** End listening + one final translate (shows TranslateThinking). */
  endHold: () => Promise<void>
  /** Cancel live without translating (mode switch / quota). */
  stopLive: () => Promise<void>
  translateTyped: (text: string, from: Lang) => Promise<void>
  openBreakdown: (phrase: string) => void
  closeBreakdown: () => void
  /** Promote a variation to primary, reshuffle alts, and open its character breakdown. */
  selectYueVariation: (phrase: string) => void
  clearHistory: () => void
}

let translateSeq = 0
const pending = new Map<Lang, number>()
let speakToken = 0
let heartbeatTimer: ReturnType<typeof setInterval> | null = null
let translateInFlight = 0
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

/** After a final in tap mode, wait this long with no new speech before translating. */
const TAP_SILENCE_MS = 950
/** Safety cap so tap mode cannot run forever. */
const TAP_MAX_MS = 45000

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
}

function scheduleTapSilenceEnd(get: () => State) {
  if (!tapSticky) return
  if (tapSilenceTimer) clearTimeout(tapSilenceTimer)
  tapSilenceTimer = setTimeout(() => {
    tapSilenceTimer = null
    if (!tapSticky) return
    void get().endHold()
  }, TAP_SILENCE_MS)
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
  return [{ id: crypto.randomUUID(), at: Date.now(), ...turn }, ...get().history].slice(0, 80)
}

async function runTranslation(
  get: () => State,
  set: (p: Partial<State>) => void,
  lang: Lang,
  text: string,
  isFinal: boolean,
  opts?: { lean?: boolean },
) {
  const to: Lang = lang === 'en' ? 'yue' : 'en'
  const seq = ++translateSeq
  pending.set(lang, seq)
  beginTranslate(set, to)
  let speak: { text: string; lang: Lang } | null = null
  const isFace = get().mode === 'conversation'
  const lean = Boolean(opts?.lean) || isFace
  try {
    const result = await translateText(text, lang, to, {
      // Live hold-to-speak skips variation fan-out for lower latency.
      includeAlternatives: isFinal && lang === 'en' && !lean,
      stage: isFinal ? 'final' : 'interim',
    })
    const alternatives = result.alternatives || []
    if (pending.get(lang) !== seq) return
    const definition = result.definition || (lang === 'en' ? text : '')

    if (isFace) {
      const face = get().face
      if (lang === 'en') {
        set({
          face: {
            ...face,
            enInterim: text,
            yueInterim: '',
            enTranslation: '',
            yueTranslation: result.text,
            yueDefinition: result.definition || (isFinal ? text : ''),
          },
        })
      } else {
        set({
          face: {
            ...face,
            yueInterim: text,
            enInterim: '',
            yueTranslation: '',
            enTranslation: result.text,
            yueDefinition: result.definition || '',
          },
        })
      }
    } else {
      const history = isFinal
        ? nextHistory(get, {
            from: lang,
            to,
            source: text,
            translation: result.text,
            definition,
            alternatives: lang === 'en' ? alternatives : undefined,
            engine: result.engine,
          })
        : undefined
      if (lang === 'en') {
        set({
          enInterim: text,
          yueInterim: '',
          enTranslation: '',
          yueTranslation: result.text,
          yueDefinition: result.definition || (isFinal ? text : ''),
          yueAlternatives: isFinal ? alternatives : get().yueAlternatives,
          ...(history ? { history } : {}),
        })
      } else {
        set({
          yueInterim: text,
          enInterim: '',
          yueTranslation: '',
          enTranslation: result.text,
          yueDefinition: result.definition || '',
          yueAlternatives: isFinal ? [] : get().yueAlternatives,
          ...(history ? { history } : {}),
        })
      }
    }
    if (isFinal) speak = { text: result.text, lang: to }
  } catch (e) {
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
  stopSpeaking()
  get().session?.setPlaybackActive(false)
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
      yueAlternatives: [],
      status: 'listening',
    })
  }
}

async function tearDownLive(
  get: () => State,
  set: (p: Partial<State>) => void,
  opts?: { clearInterim?: boolean },
) {
  speakToken += 1
  stopSpeaking()
  stopHeartbeat()
  clearTapTimers()
  holding = false
  tapSticky = false
  startingHold = false
  holdSideLock = null
  const session = get().session
  if (session) {
    try {
      await session.stop()
    } catch {
      /* ignore */
    }
  }
  const clearInterim = opts?.clearInterim !== false
  set({
    live: false,
    session: null,
    liveInteraction: null,
    liveSide: null,
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
  speakDirection: 'auto',
  live: false,
  status: 'idle',
  autoSpeak: false,
  entitlement: null,
  error: null,
  enInterim: '',
  yueInterim: '',
  enTranslation: '',
  yueTranslation: '',
  yueDefinition: '',
  yueAlternatives: [],
  face: emptyFaceLive(),
  breakdownPhrase: null,
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
            : 'Voice playback needs Pro (or remaining TTS quota).',
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
      set({ entitlement: ent })
    } catch {
      set({
        entitlement: null,
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

    const gen = ++holdGen
    holding = true
    tapSticky = false
    flushingHold = false
    startingHold = true
    holdSideLock = side ?? null
    clearTapTimers()
    resetHoldCapture()
    set({ error: null, liveInteraction: 'hold', liveSide: side ?? null })

    const handlers = {
      onInterim: (detected: Lang, text: string) => {
        if (!holdActive(gen)) return
        const lang = resolveHoldLang(detected, get().speakDirection)
        holdLang = lang
        holdInterim = text
        applyHoldSource(get, set, lang, holdSourceText())
        if (tapSticky) {
          // Still talking — push auto-end out.
          if (tapSilenceTimer) {
            clearTimeout(tapSilenceTimer)
            tapSilenceTimer = null
          }
        }
      },
      onFinal: (detected: Lang, text: string) => {
        // Accumulate STT while live — translate only when the turn ends (option A).
        if (!holdActive(gen)) return
        const lang = resolveHoldLang(detected, get().speakDirection)
        const trimmed = text.trim()
        if (!trimmed) return
        holdLang = lang
        holdFinals.push(trimmed)
        holdInterim = ''
        applyHoldSource(get, set, lang, holdSourceText())
        if (tapSticky) scheduleTapSilenceEnd(get)
      },
      onBargeIn: () => {
        speakToken += 1
        if (get().live) set({ status: 'listening' })
      },
      onError: (message: string) => {
        if (gen !== holdGen) return
        set({ error: message })
      },
      onStatus: (status: 'listening' | 'idle' | 'speaking') => {
        if (gen !== holdGen) return
        if (get().status === 'speaking' && status === 'listening') return
        if (status !== 'speaking') set({ status })
      },
    }

    let next = await createAzureLiveSession(handlers)
    if (!next) {
      const lock = holdSideLock
      const d = get().speakDirection
      next = createWebSpeechSession(
        handlers,
        lock || (d === 'en' || d === 'yue' ? d : undefined),
      )
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
      return
    }
    if (!next) {
      holding = false
      tapSticky = false
      startingHold = false
      holdSideLock = null
      clearTapTimers()
      set({
        error: 'Speech unavailable. Configure Azure Speech or use Chromium.',
        liveInteraction: null,
        liveSide: null,
      })
      return
    }
    try {
      await next.start()
      if (gen !== holdGen || (!holding && !tapSticky)) {
        startingHold = false
        try {
          await next.stop()
        } catch {
          /* ignore */
        }
        return
      }
      startingHold = false
      set({ live: true, session: next, status: 'listening' })
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
      clearTapTimers()
      set({ error: String(e), live: false, session: null, liveInteraction: null, liveSide: null })
    }
  },

  armTapMode: () => {
    if (!holding && !startingHold && !get().live) return
    if (flushingHold) return
    holding = false
    tapSticky = true
    set({ liveInteraction: 'tap' })
    clearTapTimers()
    // If we already captured a final before the short release, start the pause clock.
    if (holdFinals.length) scheduleTapSilenceEnd(get)
    tapMaxTimer = setTimeout(() => {
      tapMaxTimer = null
      if (tapSticky) void get().endHold()
    }, TAP_MAX_MS)
  },

  endHold: async () => {
    if (!holding && !startingHold && !get().live && !flushingHold && !tapSticky) return
    const gen = holdGen
    holding = false
    tapSticky = false
    clearTapTimers()
    flushingHold = true
    // Stop recognizer first so Azure/WebSpeech can flush a final transcript.
    await tearDownLive(get, set, { clearInterim: false })
    await new Promise((r) => setTimeout(r, 160))
    if (gen !== holdGen) {
      flushingHold = false
      return
    }

    const lang = holdLang
    const text = holdSourceText()
    resetHoldCapture()
    flushingHold = false

    if (lang && text) {
      // Existing TranslateThinking loader via translating / translatingTo.
      await runTranslation(get, set, lang, text, true, { lean: true })
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
    await runTranslation(get, set, from, trimmed, true)
  },

  openBreakdown: (phrase) => {
    const trimmed = phrase.trim()
    if (!trimmed) return
    set({ breakdownPhrase: trimmed })
  },

  closeBreakdown: () => set({ breakdownPhrase: null }),

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

    set({
      yueTranslation: chosen,
      yueAlternatives: nextAlts,
      history: nextHistory,
      breakdownPhrase: chosen,
    })
  },

  clearHistory: () => {
    speakToken += 1
    stopSpeaking()
    if (get().mode === 'conversation') {
      set({
        face: emptyFaceLive(),
        breakdownPhrase: null,
        translating: false,
        translatingTo: null,
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
      yueAlternatives: [],
      breakdownPhrase: null,
      translating: false,
      translatingTo: null,
    })
  },
}))

if (import.meta.env.DEV && typeof window !== 'undefined') {
  ;(window as unknown as { __yueStore?: typeof useYueStore }).__yueStore = useYueStore
}
