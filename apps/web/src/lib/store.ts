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
  setMode: (mode: Mode) => void
  setSpeakDirection: (d: SpeakDirection) => void
  setAutoSpeak: (v: boolean) => void
  loadBootstrap: () => Promise<void>
  toggleLive: () => Promise<void>
  translateTyped: (text: string, from: Lang) => Promise<void>
  openBreakdown: (phrase: string) => void
  closeBreakdown: () => void
  /** Promote a variation to primary, reshuffle alts, and open its character breakdown. */
  selectYueVariation: (phrase: string) => void
  clearHistory: () => void
}

let translateSeq = 0
const pending = new Map<Lang, number>()
const timers = new Map<Lang, ReturnType<typeof setTimeout>>()
let speakToken = 0
let heartbeatTimer: ReturnType<typeof setInterval> | null = null
let translateInFlight = 0

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

async function speakFinal(
  get: () => State,
  set: (p: Partial<State>) => void,
  text: string,
  lang: Lang,
) {
  const ent = get().entitlement
  const allowed = Boolean(ent?.allowed.autoSpeak && get().autoSpeak)
  if (!allowed) return
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
) {
  const to: Lang = lang === 'en' ? 'yue' : 'en'
  const seq = ++translateSeq
  pending.set(lang, seq)
  beginTranslate(set, to)
  let speak: { text: string; lang: Lang } | null = null
  const isFace = get().mode === 'conversation'
  try {
    const result = await translateText(text, lang, to, {
      includeAlternatives: isFinal && lang === 'en' && !isFace,
      stage: isFinal ? 'final' : 'interim',
    })
    const alternatives = result.alternatives || []
    if (pending.get(lang) !== seq && !isFinal) return
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

export const useYueStore = create<State>((set, get) => ({
  mode: 'solo',
  speakDirection: 'auto',
  live: false,
  status: 'idle',
  autoSpeak: true,
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

  setMode: (mode) => {
    if (get().live) {
      void get()
        .toggleLive()
        .then(() => set({ mode }))
      return
    }
    set({ mode })
  },
  setSpeakDirection: (speakDirection) => set({ speakDirection }),
  setAutoSpeak: (autoSpeak) => set({ autoSpeak }),

  loadBootstrap: async () => {
    try {
      const data = await fetchHealth()
      const ent = data.entitlement
      if (!ent.upgradeUrl && getUpgradeUrl()) {
        ent.upgradeUrl = getUpgradeUrl()
      }
      set({
        entitlement: ent,
        autoSpeak: Boolean(ent.allowed.autoSpeak),
      })
    } catch {
      set({
        entitlement: null,
      })
    }
  },

  toggleLive: async () => {
    const { live, session, entitlement } = get()
    if (live && session) {
      speakToken += 1
      stopSpeaking()
      stopHeartbeat()
      await session.stop()
      set({
        live: false,
        session: null,
        status: 'idle',
        enInterim: '',
        yueInterim: '',
        face: { ...get().face, enInterim: '', yueInterim: '' },
      })
      void get().loadBootstrap()
      return
    }

    if (entitlement && !entitlement.allowed.live) {
      const msg =
        entitlement.reason === 'login_required'
          ? 'Log in to use live translation.'
          : `Free live minutes used (${formatMinutes(entitlement.usage.liveSeconds)} minutes this month). Upgrade for more.`
      set({ error: msg })
      return
    }

    set({ error: null })
    const handlers = {
      onInterim: (detected: Lang, text: string) => {
        const lang = resolveSourceLang(detected, get().speakDirection)
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
        const t = timers.get(lang)
        if (t) clearTimeout(t)
        timers.set(
          lang,
          setTimeout(() => void runTranslation(get, set, lang, text, false), 220),
        )
      },
      onFinal: (detected: Lang, text: string) => {
        const lang = resolveSourceLang(detected, get().speakDirection)
        const t = timers.get(lang)
        if (t) clearTimeout(t)
        speakToken += 1
        stopSpeaking()
        if (get().mode === 'conversation') {
          const face = get().face
          if (lang === 'en') set({ face: { ...face, enInterim: text } })
          else set({ face: { ...face, yueInterim: text } })
        } else if (lang === 'en') {
          set({ enInterim: text })
        } else {
          set({ yueInterim: text })
        }
        void runTranslation(get, set, lang, text, true)
      },
      onBargeIn: () => {
        speakToken += 1
        get().session?.setPlaybackActive(false)
        if (get().live) set({ status: 'listening' })
      },
      onError: (message: string) => set({ error: message }),
      onStatus: (status: 'listening' | 'idle' | 'speaking') => {
        if (get().status === 'speaking' && status === 'listening') return
        if (status !== 'speaking') set({ status })
      },
    }

    let next = await createAzureLiveSession(handlers)
    if (!next) {
      const d = get().speakDirection
      next = createWebSpeechSession(handlers, d === 'en' || d === 'yue' ? d : undefined)
    }
    if (!next) {
      set({ error: 'Speech unavailable. Configure Azure Speech or use Chromium.' })
      return
    }
    try {
      await next.start()
      set({ live: true, session: next, status: 'listening' })
      stopHeartbeat()
      heartbeatTimer = setInterval(() => {
        void postHeartbeat(15)
          .then((ent) => {
            set({ entitlement: ent })
            if (!ent.allowed.live) {
              void get().toggleLive()
              set({ error: 'Live minutes exhausted for this month.' })
            }
          })
          .catch((err) => {
            if (err?.code === 401 || err?.code === 402) {
              void get().toggleLive()
              set({ error: err.message, entitlement: err.entitlement || get().entitlement })
            }
          })
      }, 15000)
    } catch (e) {
      set({ error: String(e), live: false, session: null })
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