import { translateText } from './api'
import { newId } from './id'
import { sanitizeYueTranslation, sanitizeEnTranslation, sanitizeTlTranslation } from './translationGuard'
import type { DetailLayer } from './detailTypes'
import type { ConversationTurn, Entitlement, Lang, LiveSession, Mode } from './types'

/** Minimal store surface used by the translate pipeline. */
export type TranslateState = {
  mode: Mode
  chineseLang: 'yue' | 'cmn' | 'wuu' | 'tl'
  /** Solo upper/lower pane languages (any en|yue|cmn|wuu|tl pair; must differ). */  soloUpperLang: Lang
  soloLowerLang: Lang
  face: {
    enInterim: string
    yueInterim: string
    enTranslation: string
    yueTranslation: string
    yueDefinition: string
    yueDefinitions: string[]
    romanization?: string
    sandhiHint?: string
    ipa?: string
    alternativeRomanizations?: string[]
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
  enDefinition: string
  enDefinitions: string[]
  enAlternatives: string[]
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

function isChineseLang(lang: Lang): lang is 'yue' | 'cmn' | 'wuu' {
  return lang === 'yue' || lang === 'cmn' || lang === 'wuu'
}

/** Solo stores upper pane in en* fields and lower pane in yue* fields. */
function resolveSoloTarget(get: Get, from: Lang): Lang {
  const upper = get().soloUpperLang
  const lower = get().soloLowerLang
  if (from === upper) return lower
  if (from === lower) return upper
  // Fallback if STT detected a lang that isn't on either pane.
  return from === 'en' ? (upper === 'en' ? lower : upper) : 'en'
}

function sanitizeTranslation(to: Lang, text: string, source?: string): string | null {
  if (to === 'tl') return sanitizeTlTranslation(text)
  if (to === 'yue' || to === 'cmn' || to === 'wuu') return sanitizeYueTranslation(text)
  return sanitizeEnTranslation(text, source)
}

/**
 * After a lean typed EN→ZH primary lands, fetch alternatives/definitions in the
 * background so the first paint stays fast.
 */
async function enrichTextAlternatives(
  get: Get,
  set: Set,
  sourceEn: string,
  primaryZh: string,
  toZh: 'yue' | 'cmn' | 'wuu',
  seq: number,
  signal: AbortSignal,
) {
  set({ altsLoading: true })
  try {
    const result = await translateText(sourceEn, 'en', toZh, {
      includeAlternatives: true,
      signal,
    })
    if (pending.get('en') !== seq || signal.aborted) return

    const latest = get().history[0]
    if (!latest || latest.from !== 'en' || latest.to !== toZh || latest.source !== sourceEn) {
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
    if (primaryZh && primaryZh !== currentPrimary && primaryZh !== enrichPrimary) {
      extras.push(primaryZh)
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
      romanization:
        (result as { romanization?: string }).romanization || latest.romanization || undefined,
      sandhiHint:
        (result as { sandhiHint?: string }).sandhiHint || latest.sandhiHint || undefined,
      ipa: (result as { ipa?: string }).ipa || latest.ipa || undefined,
      alternativeRomanizations:
        (result as { alternativeRomanizations?: string[] }).alternativeRomanizations ||
        latest.alternativeRomanizations ||
        undefined,
    }

    const stack = get().detailStack
    const top = stack[0]
    const nextStack =
      top?.kind === 'phrase' &&
      (top.phrase === currentPrimary || top.phrase === primaryZh || top.phrase === enrichPrimary)
        ? [
            {
              ...top,
              phrase: currentPrimary,
              lang: toZh,
              translation: sourceEn,
              definition: nextLatest.definition,
              definitions: nextLatest.definitions,
              alternatives: nextLatest.alternatives,
              romanization: nextLatest.romanization,
              sandhiHint: nextLatest.sandhiHint,
              ipa: nextLatest.ipa,
              alternativeRomanizations: nextLatest.alternativeRomanizations,
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
  const chineseLang = get().chineseLang
  const isFace = get().mode === 'conversation'
  // Conversation: EN ↔ chineseLang. Solo: translate to the other pane's language.
  const to: Lang = isFace
    ? lang === 'en'
      ? chineseLang
      : 'en'
    : resolveSoloTarget(get, lang)
  const seq = ++translateSeq
  pending.set(lang, seq)
  beginTranslate(set, to)
  const startedAt = Date.now()
  let speak: { text: string; lang: Lang } | null = null
  // Live mic + Conversation: skip EN→ZH variation fan-out for lower latency.
  // Typed Solo paints a primary first; alternatives enrich in the background when asked.
  const lean = Boolean(opts?.lean) || isFace
  const minThinkingMs = opts?.minThinkingMs ?? 900
  translateAbort?.abort()
  translateAbort = new AbortController()
  const signal = translateAbort.signal
  if (opts?.enrichAlts) set({ altsLoading: false })
  try {
    const result = await translateText(text, lang, to, {
      includeAlternatives: !lean,
      signal,
    })
    if (pending.get(lang) !== seq || signal.aborted) return null
    const hold = minThinkingMs - (Date.now() - startedAt)
    if (hold > 0) await new Promise((r) => setTimeout(r, hold))
    if (pending.get(lang) !== seq || signal.aborted) return null
    const clean = sanitizeTranslation(to, result.text, isChineseLang(lang) ? text : undefined)
    if (!clean) {
      set({
        error:
          to === 'tl'
            ? 'Could not produce Tagalog for this phrase. Try again or rephrase.'
            : to === 'cmn'
            ? 'Could not produce Mandarin for this phrase. Try again or rephrase.'
            : to === 'wuu'
              ? 'Could not produce Shanghainese for this phrase. Try again or rephrase.'
              : to === 'yue'
                ? 'Could not produce Cantonese for this phrase. Try again or rephrase.'
                : 'Could not produce English for this phrase. Try again or rephrase.',
      })
      return null
    }
    const altSanitize = (value: string | null | undefined) =>
      sanitizeTranslation(to, value || '', isChineseLang(lang) ? text : undefined)
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
            romanization: (result as { romanization?: string }).romanization || undefined,
            sandhiHint: (result as { sandhiHint?: string }).sandhiHint || undefined,
            ipa: (result as { ipa?: string }).ipa || undefined,
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
          enDefinition: result.definition || '',
          enDefinitions: definitions,
          enAlternatives: alternatives,
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
        alternatives: alternatives.length ? alternatives : undefined,
        romanization: (result as { romanization?: string }).romanization || undefined,
        sandhiHint: (result as { sandhiHint?: string }).sandhiHint || undefined,
        ipa: (result as { ipa?: string }).ipa || undefined,
        alternativeRomanizations:
          (result as { alternativeRomanizations?: string[] }).alternativeRomanizations || undefined,
      })
      // Solo: en* = upper pane, yue* = lower pane (regardless of language).
      const fromUpper = lang === get().soloUpperLang
      if (fromUpper) {
        set({
          enInterim: text,
          yueInterim: '',
          enTranslation: '',
          yueTranslation: clean,
          yueDefinition: result.definition || (lang === 'en' ? text : ''),
          yueDefinitions: definitions,
          yueAlternatives: alternatives,
          enDefinition: to === 'en' ? result.definition || '' : get().enDefinition,
          enDefinitions: to === 'en' ? definitions : get().enDefinitions,
          enAlternatives: to === 'en' ? alternatives : [],
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
          yueAlternatives: isChineseLang(to) ? alternatives : [],
          enDefinition: result.definition || '',
          enDefinitions: definitions,
          enAlternatives: to === 'en' ? alternatives : [],
          history,
        })
      }
    }
    speak = { text: clean, lang: to }

    // Typed Solo EN→Chinese: paint primary first, then enrich alternatives without blocking TTS/UI.
    if (
      opts?.enrichAlts &&
      lang === 'en' &&
      isChineseLang(to) &&
      lean &&
      !signal.aborted &&
      pending.get(lang) === seq
    ) {
      void enrichTextAlternatives(get, set, text, clean, to, seq, signal)
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
