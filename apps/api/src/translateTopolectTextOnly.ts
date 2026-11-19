/**
 * EN ↔ Hakka (`hak`) / Teochew (`teo`) / Hokkien (`nan`) — text-only Chinese topolects.
 * Han primary + phrase romanization (Pha̍k-fa-sṳ / Peng’im / POJ·Tâi-lô).
 * No Azure STT/TTS; never treat zh-TW as Hokkien.
 */
import { env, llmChatExtras } from './env.js'
import { openaiClient } from './openaiClient.js'
import {
  dictionaryTranslate,
  looksLikeGlossDump,
  type TranslateStage,
} from './canto/index.js'
import { hasHan } from './canto/han.js'
import {
  emptyMeta,
  parsePayload,
  parseYuePayload,
  type TranslateResult,
} from './translateShared.js'

export type TopolectTextOnlyLang = 'hak' | 'teo' | 'nan'

type TopolectTranslateLang = 'en' | TopolectTextOnlyLang | string

type TopolectProfile = {
  code: TopolectTextOnlyLang
  englishName: string
  nativeName: string
  demoTag: string
  romanizationScheme: string
  romanizationHint: string
  styleHints: string
  noteTag: string
  romMetaTag: string
  /** Explicit anti-confusion rules for the model. */
  neverRules: string
}

const PROFILES: Record<TopolectTextOnlyLang, TopolectProfile> = {
  hak: {
    code: 'hak',
    englishName: 'Hakka',
    nativeName: '客家話',
    demoTag: 'HAK',
    romanizationScheme: 'Pha̍k-fa-sṳ',
    romanizationHint:
      'Pha̍k-fa-sṳ (白話字) with tone diacritics — NOT Mandarin pinyin, NOT Cantonese Jyutping, NOT POJ',
    styleHints:
      'Prefer everyday Hakka wording. Dialectal Han spellings OK when natural for Hakka. Do not rewrite into Mandarin textbook 普通话 or Cantonese particles (係/唔/喺/咗).',
    noteTag: 'hak-colloquial',
    romMetaTag: 'hak-phak-fa-su',
    neverRules:
      'Never Mandarin-only textbook style. Never Cantonese. Never invent Azure voice claims. Never use zh-TW as a label.',
  },
  teo: {
    code: 'teo',
    englishName: 'Teochew',
    nativeName: '潮州話 / 潮汕話',
    demoTag: 'TEO',
    romanizationScheme: 'Peng’im',
    romanizationHint:
      'Peng’im (潮州話拼音) with tone numbers — NOT Mandarin pinyin, NOT Cantonese Jyutping, NOT POJ/Tâi-lô',
    styleHints:
      'Prefer everyday Chaoshan / Teochew wording. Dialectal Han OK. Do not rewrite into Mandarin textbook or Hokkien / Taiwanese Min Nan forms.',
    noteTag: 'teo-colloquial',
    romMetaTag: 'teo-pengim',
    neverRules:
      'Never Mandarin-only textbook style. Never confuse with Hokkien (閩南語) or Cantonese. Never use zh-TW as Teochew.',
  },
  nan: {
    code: 'nan',
    englishName: 'Hokkien',
    nativeName: '閩南語 / 福建話 / 臺語',
    demoTag: 'NAN',
    romanizationScheme: 'POJ / Tâi-lô',
    romanizationHint:
      'Prefer Tâi-lô (official Taiwan) or POJ with tone marks — NOT Mandarin pinyin, NOT zh-TW Mandarin, NOT Cantonese Jyutping, NOT Peng’im',
    styleHints:
      'Prefer everyday Hokkien / Min Nan wording (Taiwanese Hokkien or Southern Fujian). Dialectal Han OK. Do not output Taiwanese Mandarin (國語) or label anything as zh-TW Mandarin.',
    noteTag: 'nan-colloquial',
    romMetaTag: 'nan-tailo',
    neverRules:
      'CRITICAL: zh-TW is Taiwanese Mandarin, NOT Hokkien. Never use Mandarin-only textbook 国语/國語 as Hokkien. Never confuse with Teochew or Cantonese.',
  },
}

function stripFence(raw: string) {
  return raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
}

function readRomanizationFields(raw: string): {
  romanization: string
  alternativeRomanizations: string[]
} {
  try {
    const j = JSON.parse(stripFence(raw)) as {
      romanization?: unknown
      alternativeRomanizations?: unknown
    }
    const romanization = typeof j.romanization === 'string' ? j.romanization.trim() : ''
    const alternativeRomanizations = Array.isArray(j.alternativeRomanizations)
      ? j.alternativeRomanizations.map((x) => (typeof x === 'string' ? x.trim() : ''))
      : []
    return { romanization, alternativeRomanizations }
  } catch {
    return { romanization: '', alternativeRomanizations: [] }
  }
}

export async function translateTopolectTextOnly(opts: {
  lang: TopolectTextOnlyLang
  from: TopolectTranslateLang
  to: TopolectTranslateLang
  text: string
  stage: TranslateStage
  wantAlts: boolean
  fallbackDefinition: string
}): Promise<TranslateResult> {
  const { lang, from, to, text, stage, wantAlts, fallbackDefinition } = opts
  const profile = PROFILES[lang]
  const toTopolect = to === lang

  const dictHit = dictionaryTranslate({
    sourceLang: from as Parameters<typeof dictionaryTranslate>[0]['sourceLang'],
    targetLang: to as Parameters<typeof dictionaryTranslate>[0]['targetLang'],
    source: text,
    wantAlternatives: wantAlts,
  })
  if (dictHit) {
    const alts = wantAlts ? dictHit.alternatives : []
    const romanization =
      toTopolect && typeof dictHit.romanization === 'string'
        ? dictHit.romanization
        : toTopolect && typeof dictHit.entry?.romanization === 'string'
          ? dictHit.entry.romanization
          : undefined
    const alternativeRomanizations =
      toTopolect && Array.isArray(dictHit.alternativeRomanizations)
        ? dictHit.alternativeRomanizations
        : undefined
    return {
      text: dictHit.text,
      definition: toTopolect ? fallbackDefinition : '',
      alternatives: alts,
      engine: 'dictionary',
      from,
      to,
      stage,
      meta: {
        dictionaryHit: true,
        scrubbed: false,
        colloquialScore: toTopolect ? 8 : 0,
        rewritten: false,
        notes: [
          `dict:${dictHit.entry.id}`,
          `${lang}-no-yue-scrub`,
          profile.noteTag,
          ...(romanization ? [profile.romMetaTag] : []),
          ...(alternativeRomanizations?.some(Boolean) ? [`${profile.romMetaTag}-alts`] : []),
        ],
      },
      ...(romanization ? { romanization } : {}),
      ...(alternativeRomanizations?.some(Boolean) ? { alternativeRomanizations } : {}),
    }
  }

  const client = openaiClient()
  if (!client) {
    const demoPrimary = toTopolect ? `（示范·${profile.demoTag}）${text}` : `(demo) ${text}`
    return {
      text: demoPrimary,
      definition: toTopolect ? fallbackDefinition : '',
      alternatives: [],
      engine: 'demo',
      from,
      to,
      stage,
      meta: emptyMeta(['demo', `${lang}-no-yue-scrub`, profile.noteTag]),
      ...(toTopolect ? { romanization: '（demo）' } : {}),
    }
  }

  const engine = env.openaiBaseUrl ? 'openai-compatible' : 'openai'
  let primary = text
  let alternatives: string[] = []
  let definition = fallbackDefinition
  let romanization = ''
  let alternativeRomanizations: string[] = []

  if (wantAlts && toTopolect) {
    const system = [
      `You are a ${profile.englishName} (${profile.nativeName}) interpreter for everyday spoken conversation.`,
      `Translate into COLLOQUIAL ${profile.englishName} using Chinese characters.`,
      profile.styleHints,
      profile.neverRules,
      `Also provide ${profile.romanizationScheme} for the primary line — ${profile.romanizationHint}.`,
      `For each alternative, also provide matching ${profile.romanizationScheme} in alternativeRomanizations (same order).`,
      'Return ONLY valid JSON:',
      `{"primary":"<best ${profile.englishName} Han>","alternatives":["<other natural ${profile.englishName}>", "..."],"alternativeRomanizations":["<${profile.romanizationScheme} for alt0>", "..."],"definition":"<short English gloss>","romanization":"<${profile.romanizationScheme} for primary>"}`,
      'Rules:',
      '- Prefer 2–3 spoken variants that differ in wording or politeness.',
      '- Do not repeat the primary or near-duplicates.',
      '- romanization must match the primary phrase; leave empty string if unsure.',
      '- alternativeRomanizations[i] must match alternatives[i]; use empty string if unsure.',
      '- No markdown, no explanation.',
    ].join('\n')
    const completion = await client.chat.completions.create({
      model: env.openaiModel,
      temperature: 0.35,
      max_tokens: 450,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: text },
      ],
      response_format: { type: 'json_object' },
      ...llmChatExtras(),
    })
    const raw = completion.choices[0]?.message?.content?.trim() || ''
    const parsed = parseYuePayload(raw, text, true)
    primary = parsed.text
    alternatives = parsed.alternatives
    if (parsed.definition) definition = parsed.definition
    const rom = readRomanizationFields(raw)
    romanization = rom.romanization
    alternativeRomanizations = rom.alternativeRomanizations
  } else if (wantAlts && !toTopolect) {
    const system = [
      `You are a ${profile.englishName} interpreter helping ${profile.englishName} speakers learn English.`,
      `Translate colloquial ${profile.englishName} (${profile.nativeName}) into natural conversational English.`,
      profile.neverRules,
      'Return ONLY valid JSON:',
      '{"primary":"<best English>","alternatives":["<other natural English>", "..."],"definition":"<short Chinese gloss of the English>"}',
      'Prefer 2–3 natural English variants. No markdown.',
    ].join('\n')
    const completion = await client.chat.completions.create({
      model: env.openaiModel,
      temperature: 0.35,
      max_tokens: 400,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: text },
      ],
      response_format: { type: 'json_object' },
      ...llmChatExtras(),
    })
    const raw = completion.choices[0]?.message?.content?.trim() || ''
    const parsedEn = parseYuePayload(raw, '', false)
    primary = parsedEn.text
    alternatives = parsedEn.alternatives.filter((a: string) => a && !hasHan(a))
    if (parsedEn.definition) definition = parsedEn.definition
  } else {
    const system = toTopolect
      ? [
          `You are a ${profile.englishName} (${profile.nativeName}) interpreter.`,
          `Translate into colloquial ${profile.englishName} Chinese characters.`,
          profile.styleHints,
          profile.neverRules,
          `Provide ${profile.romanizationScheme} for the translation — ${profile.romanizationHint}.`,
          'Return ONLY valid JSON:',
          `{"translation":"<${profile.englishName} Han>","definition":"<short English gloss>","romanization":"<${profile.romanizationScheme}>"}`,
        ].join('\n')
      : [
          `You are a ${profile.englishName} interpreter.`,
          `Translate ${profile.englishName} (${profile.nativeName}) into natural English for face-to-face conversation.`,
          profile.neverRules,
          'Return ONLY valid JSON:',
          '{"translation":"<English>","definition":"<optional short sense note, or empty string>"}',
        ].join('\n')
    const completion = await client.chat.completions.create({
      model: env.openaiModel,
      temperature: 0.2,
      max_tokens: 400,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: text },
      ],
      ...llmChatExtras(),
    })
    const raw = completion.choices[0]?.message?.content?.trim() || ''
    const payload = parsePayload(raw, toTopolect ? text : '', fallbackDefinition, toTopolect)
    primary = payload.text
    definition = toTopolect ? payload.definition || fallbackDefinition : payload.definition
    if (toTopolect) {
      romanization = readRomanizationFields(raw).romanization
    }
  }

  if (toTopolect) {
    const hanPairs = wantAlts
      ? alternatives
          .map((a: string, i: number) => ({
            text: a,
            rom: alternativeRomanizations[i] || '',
          }))
          .filter((p) => hasHan(p.text) && p.text !== (hasHan(primary) ? primary : ''))
      : []
    const outRaw = hasHan(primary) ? primary : ''
    const outAlts = hanPairs.map((p) => p.text)
    const outAltRoms = hanPairs.map((p) => p.rom)
    if (!outRaw) {
      return {
        text: '',
        definition,
        alternatives: [],
        engine,
        from,
        to,
        stage,
        meta: emptyMeta([`${lang}-no-yue-scrub`, `no-${lang}-output`]),
      }
    }
    return {
      text: outRaw,
      definition,
      alternatives: outAlts,
      engine,
      from,
      to,
      stage,
      meta: emptyMeta([
        `${lang}-no-yue-scrub`,
        profile.noteTag,
        ...(romanization ? [profile.romMetaTag] : []),
        ...(outAltRoms.some(Boolean) ? [`${profile.romMetaTag}-alts`] : []),
      ]),
      ...(romanization ? { romanization } : {}),
      ...(outAltRoms.some(Boolean) ? { alternativeRomanizations: outAltRoms } : {}),
    }
  }

  if (looksLikeGlossDump(primary) || (from === lang && hasHan(primary))) {
    return {
      text: '',
      definition: '',
      alternatives: [],
      engine,
      from,
      to,
      stage,
      meta: emptyMeta([`${lang}-echo-blocked`]),
    }
  }

  return {
    text: primary,
    definition,
    alternatives: wantAlts
      ? alternatives.filter((a: string) => a && !hasHan(a) && a !== primary)
      : [],
    engine,
    from,
    to,
    stage,
    meta: emptyMeta([`${lang}-no-yue-scrub`]),
  }
}

export function translateHakka(opts: {
  from: TopolectTranslateLang
  to: TopolectTranslateLang
  text: string
  stage: TranslateStage
  wantAlts: boolean
  fallbackDefinition: string
}): Promise<TranslateResult> {
  return translateTopolectTextOnly({ ...opts, lang: 'hak' })
}

export function translateTeochew(opts: {
  from: TopolectTranslateLang
  to: TopolectTranslateLang
  text: string
  stage: TranslateStage
  wantAlts: boolean
  fallbackDefinition: string
}): Promise<TranslateResult> {
  return translateTopolectTextOnly({ ...opts, lang: 'teo' })
}

export function translateHokkien(opts: {
  from: TopolectTranslateLang
  to: TopolectTranslateLang
  text: string
  stage: TranslateStage
  wantAlts: boolean
  fallbackDefinition: string
}): Promise<TranslateResult> {
  return translateTopolectTextOnly({ ...opts, lang: 'nan' })
}

export function isTopolectTextOnlyLang(lang: string | null | undefined): lang is TopolectTextOnlyLang {
  return lang === 'hak' || lang === 'teo' || lang === 'nan'
}
