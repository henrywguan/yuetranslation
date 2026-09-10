/**
 * EN ↔ Cebuano (`ceb`) / Ilocano (`ilo`) — colloquial everyday Latin-script paths.
 * Shared helper (dict → demo → LLM JSON). No STT/TTS; no Han in target output.
 */
import { env, llmChatExtras } from './env.js'
import { openaiClient } from './openaiClient.js'
import {
  dictionaryTranslate,
  looksLikeGlossDump,
  uniqStrings,
  type TranslateStage,
} from './canto/index.js'
import { hasHan } from './canto/han.js'

export type PhilippineRegionalLang = 'ceb' | 'ilo'

export type PhilippineTranslateLang =
  | 'en'
  | 'yue'
  | 'cmn'
  | 'wuu'
  | 'tl'
  | 'es'
  | 'vi'
  | PhilippineRegionalLang

export type PhilippineTranslateResult = {
  text: string
  definition: string
  alternatives: string[]
  engine: string
  from: PhilippineTranslateLang
  to: PhilippineTranslateLang
  stage: TranslateStage
  meta: {
    dictionaryHit: boolean
    scrubbed: boolean
    colloquialScore: number
    rewritten: boolean
    notes: string[]
  }
}

type RegionalProfile = {
  code: PhilippineRegionalLang
  englishName: string
  nativeName: string
  demoTag: string
  colloquialNote: string
  /** Everyday conversational hints for the model. */
  styleHints: string
}

const PROFILES: Record<PhilippineRegionalLang, RegionalProfile> = {
  ceb: {
    code: 'ceb',
    englishName: 'Cebuano',
    nativeName: 'Binisaya / Sugbuanon',
    demoTag: 'CEB',
    colloquialNote: 'ceb-colloquial',
    styleHints:
      'Everyday Visayan / Cebuano conversation (Cebu, Bohol, Mindanao). Prefer natural spoken Binisaya over stiff textbook forms. Light English loanwords OK when natural (e.g. okay, sorry).',
  },
  ilo: {
    code: 'ilo',
    englishName: 'Ilocano',
    nativeName: 'Ilokano',
    demoTag: 'ILO',
    colloquialNote: 'ilo-colloquial',
    styleHints:
      'Everyday Ilocano conversation (Ilocos / Northern Luzon). Prefer natural spoken Ilokano over stiff textbook forms. Light English loanwords OK when natural.',
  },
}

function emptyMeta(notes: string[] = []) {
  return {
    dictionaryHit: false,
    scrubbed: false,
    colloquialScore: 0,
    rewritten: false,
    notes,
  }
}

function stripJsonFence(raw: string) {
  return raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
}

function asTrimmedString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : ''
}

function parsePayload(
  raw: string,
  fallbackText: string,
  fallbackDefinition: string,
): { text: string; definition: string } {
  const cleaned = stripJsonFence(raw)
  try {
    const parsed = JSON.parse(cleaned) as {
      translation?: unknown
      definition?: unknown
      text?: unknown
    }
    const textCandidate = asTrimmedString(parsed.translation) || asTrimmedString(parsed.text)
    return {
      text: textCandidate || fallbackText,
      definition: asTrimmedString(parsed.definition) || fallbackDefinition,
    }
  } catch {
    return { text: cleaned || fallbackText, definition: fallbackDefinition }
  }
}

function parseAltsPayload(
  raw: string,
  fallback: string,
): { text: string; alternatives: string[]; definition: string } {
  const cleaned = stripJsonFence(raw)
  try {
    const parsed = JSON.parse(cleaned) as {
      primary?: unknown
      translation?: unknown
      alternatives?: unknown
      definition?: unknown
    }
    const primary = asTrimmedString(parsed.primary) || asTrimmedString(parsed.translation)
    const text = primary || fallback
    const alts = Array.isArray(parsed.alternatives)
      ? parsed.alternatives.filter((x): x is string => typeof x === 'string')
      : []
    return {
      text,
      alternatives: uniqStrings(text, alts),
      definition: asTrimmedString(parsed.definition),
    }
  } catch {
    return { text: cleaned || fallback, alternatives: [], definition: '' }
  }
}

function systemToRegional(profile: RegionalProfile, wantAlts: boolean): string {
  const base = [
    `You are a ${profile.englishName} (${profile.nativeName}) interpreter for face-to-face conversation and everyday signs.`,
    `Translate English into COLLOQUIAL spoken ${profile.englishName}.`,
    profile.styleHints,
    'Use Latin script only. Do NOT use Chinese characters, Baybayin, IPA, or invented tone digits.',
    'Prefer clear everyday wording suitable for conversation, menus, and travel signs.',
  ]
  if (wantAlts) {
    return [
      ...base,
      'Return ONLY valid JSON:',
      `{"primary":"<best colloquial ${profile.englishName}>","alternatives":["<other natural variant>", "..."],"definition":"<short English gloss>"}`,
      'Prefer 2–3 natural spoken variants. No markdown.',
    ].join('\n')
  }
  return [
    ...base,
    'Return ONLY valid JSON:',
    `{"translation":"<colloquial ${profile.englishName}>","definition":"<short English gloss>"}`,
  ].join('\n')
}

function systemFromRegional(profile: RegionalProfile, wantAlts: boolean): string {
  if (wantAlts) {
    return [
      `You are a ${profile.englishName} interpreter helping ${profile.englishName} speakers learn English.`,
      `Translate colloquial ${profile.englishName} into natural conversational English.`,
      'Return ONLY valid JSON:',
      `{"primary":"<best English>","alternatives":["<other natural English phrasing>", "..."],"definition":"<short ${profile.englishName} gloss of what the English means>"}`,
      'Prefer 2–3 natural English variants. No markdown.',
    ].join('\n')
  }
  return [
    `You are a ${profile.englishName} interpreter.`,
    `Translate colloquial ${profile.englishName} into natural English for conversation.`,
    'Return ONLY valid JSON:',
    '{"translation":"<English>","definition":"<optional short sense note, or empty string>"}',
  ].join('\n')
}

/**
 * Parameterized EN ↔ Cebuano / Ilocano translate (dict → demo → LLM).
 */
export async function translatePhilippineRegional(opts: {
  lang: PhilippineRegionalLang
  from: PhilippineTranslateLang
  to: PhilippineTranslateLang
  text: string
  stage: TranslateStage
  wantAlts: boolean
  fallbackDefinition: string
}): Promise<PhilippineTranslateResult> {
  const { lang, from, to, text, stage, wantAlts, fallbackDefinition } = opts
  const profile = PROFILES[lang]
  const toRegional = to === lang

  const dictHit = dictionaryTranslate({
    sourceLang: from,
    targetLang: to,
    source: text,
    wantAlternatives: wantAlts,
  })
  if (dictHit) {
    return {
      text: dictHit.text,
      definition: toRegional ? fallbackDefinition : '',
      alternatives: wantAlts ? dictHit.alternatives : [],
      engine: 'dictionary',
      from,
      to,
      stage,
      meta: {
        dictionaryHit: true,
        scrubbed: false,
        colloquialScore: 8,
        rewritten: false,
        notes: [`dict:${dictHit.entry.id}`, profile.colloquialNote],
      },
    }
  }

  const client = openaiClient()
  if (!client) {
    const demoPrimary = toRegional ? `(demo ${profile.demoTag}) ${text}` : `(demo) ${text}`
    return {
      text: demoPrimary,
      definition: toRegional ? fallbackDefinition : '',
      alternatives: [],
      engine: 'demo',
      from,
      to,
      stage,
      meta: emptyMeta(['demo', profile.colloquialNote]),
    }
  }

  const engine = env.openaiBaseUrl ? 'openai-compatible' : 'openai'
  let primary = text
  let alternatives: string[] = []
  let definition = fallbackDefinition

  if (wantAlts && toRegional) {
    const completion = await client.chat.completions.create({
      model: env.openaiModel,
      temperature: 0.4,
      max_tokens: 400,
      messages: [
        { role: 'system', content: systemToRegional(profile, true) },
        { role: 'user', content: text },
      ],
      response_format: { type: 'json_object' },
      ...llmChatExtras(),
    })
    const raw = completion.choices[0]?.message?.content?.trim() || ''
    const parsed = parseAltsPayload(raw, text)
    primary = parsed.text
    alternatives = parsed.alternatives
    if (parsed.definition) definition = parsed.definition
  } else if (wantAlts && !toRegional) {
    const completion = await client.chat.completions.create({
      model: env.openaiModel,
      temperature: 0.35,
      max_tokens: 400,
      messages: [
        { role: 'system', content: systemFromRegional(profile, true) },
        { role: 'user', content: text },
      ],
      response_format: { type: 'json_object' },
      ...llmChatExtras(),
    })
    const raw = completion.choices[0]?.message?.content?.trim() || ''
    const parsedEn = parseAltsPayload(raw, '')
    primary = parsedEn.text
    alternatives = parsedEn.alternatives.filter((a) => a && !hasHan(a))
    if (parsedEn.definition) definition = parsedEn.definition
  } else {
    const completion = await client.chat.completions.create({
      model: env.openaiModel,
      temperature: 0.25,
      max_tokens: 400,
      messages: [
        {
          role: 'system',
          content: toRegional
            ? systemToRegional(profile, false)
            : systemFromRegional(profile, false),
        },
        { role: 'user', content: text },
      ],
      ...llmChatExtras(),
    })
    const raw = completion.choices[0]?.message?.content?.trim() || ''
    const payload = parsePayload(raw, toRegional ? text : '', fallbackDefinition)
    primary = payload.text
    definition = toRegional ? payload.definition || fallbackDefinition : payload.definition
  }

  if (toRegional) {
    const outText = primary && !hasHan(primary) ? primary.trim() : ''
    return {
      text: outText,
      definition,
      alternatives: wantAlts
        ? alternatives.filter((a) => a && !hasHan(a) && a !== outText)
        : [],
      engine,
      from,
      to,
      stage,
      meta: emptyMeta(
        outText ? [profile.colloquialNote] : [profile.colloquialNote, `no-${lang}-output`],
      ),
    }
  }

  if (looksLikeGlossDump(primary) || hasHan(primary)) {
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
      ? alternatives.filter((a) => a && !hasHan(a) && a !== primary)
      : [],
    engine,
    from,
    to,
    stage,
    meta: emptyMeta([profile.colloquialNote]),
  }
}

export function translateCebuano(opts: {
  from: PhilippineTranslateLang
  to: PhilippineTranslateLang
  text: string
  stage: TranslateStage
  wantAlts: boolean
  fallbackDefinition: string
}): Promise<PhilippineTranslateResult> {
  return translatePhilippineRegional({ ...opts, lang: 'ceb' })
}

export function translateIlocano(opts: {
  from: PhilippineTranslateLang
  to: PhilippineTranslateLang
  text: string
  stage: TranslateStage
  wantAlts: boolean
  fallbackDefinition: string
}): Promise<PhilippineTranslateResult> {
  return translatePhilippineRegional({ ...opts, lang: 'ilo' })
}
