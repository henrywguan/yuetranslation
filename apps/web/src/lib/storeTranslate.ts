import { translateText } from './api'
import { newId } from './id'
import { sanitizeYueTranslation, sanitizeEnTranslation } from './translationGuard'
import type { DetailLayer } from './detailTypes'
import type { ConversationTurn, Entitlement, Lang, LiveSession, Mode } from './types'

/** Minimal store surface used by the translate pipeline. */
export type TranslateState = {
  mode: Mode
  face: {
    enInterim: string
    yueInterim: string
    enTranslation: string
    yueTranslation: string
    yueDefinition: string
    yueDefinitions: string[]
  }
  history: ConversationTurn[]
  detailStack: DetailLayer[]
  yueDefinition: string
  entitlement: Entitlement | null
  autoSpeak: boolean
  live: boolean
  session: LiveSession | null
  status: 'idle' | 'listening' | 'speaking'
  speakingText: string | null
  translating: boolean
  translatingTo: Lang | null
  altsLoading: boolean
  error: string | null
  enInterim: string
  yueInterim: string
  enTranslation: string
  yueTranslation: string
  yueDefinitions: string[]
  yueAlternatives: string[]
}

type Get = () => TranslateState
type Set = (p: Partial<TranslateState>) => void

type SpeakFinalFn = (get: Get, set: Set, text: string, lang: Lang) => Promise<void>

let translateSeq = 0
const pending = new Map<Lang, number>()
let translateInFlight = 0
/** Aborts the previous /api/translate when a newer Text request starts. */
let translateAbort: AbortController | null = null

/** Auto-speak after translate — wired from store.ts (shares speakToken there). */
let speakFinalImpl: SpeakFinalFn | null = null

/** Wire auto-speak used by runTranslation (call once from store.ts). */
export function setTranslateSpeakFinal(fn: SpeakFinalFn) {
  speakFinalImpl = fn
}

/** Drop in-flight translate results so a new hold cannot be overwritten. */
export function invalidatePendingTranslations() {
  translateSeq += 1
  pending.clear()
  translateAbort?.abort()
  translateAbort = null
}

function beginTranslate(set: Set, to: Lang) {
  translateInFlight += 1
  set({ translating: true, translatingTo: to })
}

function endTranslate(set: Set) {
  translateInFlight = Math.max(0, translateInFlight - 1)
  if (translateInFlight === 0) {
    set({ translating: false, translatingTo: null })
  }
}

function nextHistory(
  get: Get,
  turn: Omit<ConversationTurn, 'id' | 'at'>,
): ConversationTurn[] {
  return [{ id: newId(), at: Date.now(), ...turn }, ...get().history].slice(0, 80)
}

/**
 * After a lean Text EN→粵 primary lands, fetch alternatives/definitions in the
 * background so the first paint stays fast.
 */
async function enrichTextAlternatives(
  get: Get,
  set: Set,
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
export async function runTranslation(
  get: Get,
  set: Set,
  lang: Lang,
  text: string,
  opts?: { lean?: boolean; minThinkingMs?: number; enrichAlts?: boolean; skipSpeak?: boolean },
): Promise<{ text: string; lang: Lang } | null> {
  const to: Lang = lang === 'en' ? 'yue' : 'en'
  const seq = ++translateSeq
  pending.set(lang, seq)
  beginTranslate(set, to)
  const startedAt = Date.now()
  let speak: { text: string; lang: Lang } | null = null
  const isFace = get().mode === 'conversation'
  // Live mic + Conversation: skip EN→粵 variation fan-out for lower latency.
  // Typed Solo paints a primary first; alternatives enrich in the background when asked.
  const lean = Boolean(opts?.lean) || isFace
  const minThinkingMs = opts?.minThinkingMs ?? 900
  translateAbort?.abort()
  translateAbort = new AbortController()
  const signal = translateAbort.signal
  if (opts?.enrichAlts) set({ altsLoading: false })
  try {
    const result = await translateText(text, lang, to, {
      includeAlternatives: lang === 'en' && !lean,
      signal,
    })
    if (pending.get(lang) !== seq || signal.aborted) return null
    const hold = minThinkingMs - (Date.now() - startedAt)
    if (hold > 0) await new Promise((r) => setTimeout(r, hold))
    if (pending.get(lang) !== seq || signal.aborted) return null
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
      return null
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

    // Typed Solo EN→粵: paint primary first, then enrich alternatives without blocking TTS/UI.
    if (
      opts?.enrichAlts &&
      lang === 'en' &&
      lean &&
      !signal.aborted &&
      pending.get(lang) === seq
    ) {
      void enrichTextAlternatives(get, set, text, clean, seq, signal)
    }
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') return null
    if (e instanceof Error && e.name === 'AbortError') return null
    set({ error: String(e) })
    return null
  } finally {
    endTranslate(set)
  }
  if (speak && !opts?.skipSpeak) await speakFinalImpl?.(get, set, speak.text, speak.lang)
  return speak
}
