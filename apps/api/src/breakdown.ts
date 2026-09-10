import { z } from 'zod'
import { env, llmChatExtras } from './env.js'
import { openaiClientWithKey } from './openaiClient.js'
import { lookupGloss } from './canto/gloss.js'
import { hasHan, isHanChar } from './canto/han.js'
import { scrubMandarinToYue } from './canto/scrub.js'
import { cantoneseGlossForEnglish } from './canto/lexiconTranslate.js'
import { isGenericCharGloss } from '@jyut/shared/charGloss'

const Body = z.object({
  text: z.string().min(1).max(500),
  /** Optional focus language; auto-detected from script when omitted. */
  lang: z.enum(['en', 'yue', 'cmn', 'wuu', 'sichuan', 'tl', 'es', 'vi', 'ceb', 'ilo', 'bcl']).optional(),
})

export type BreakdownChar = {
  char: string
  /**
   * Yue: Jyutping if known.
   * Cmn: pinyin when provided by client merge (API may leave null).
   * Wuu: citation-form Wugniu (吴语学堂) from the model (never Yue Jyutping).
   * Sichuan: 四川话拼音 with tone numbers (e.g. ni3) from the model.
   * En: IPA if known (same field so the client can reuse the row shape).
   * Tl / Es: accented dictionary form / stress spelling (same field).
   * Null for punctuation / unknown / wuu gloss-only.
   */
  jyutping: string | null
  meaning: string
  glossSource?: string
}

function pickMeaning(...candidates: (string | null | undefined)[]): string {
  for (const raw of candidates) {
    const t = (raw || '').trim()
    if (t && !isGenericCharGloss(t)) return t
  }
  return (candidates.find((c) => (c || '').trim()) || '').trim()
}

/** First learner-friendly sense from CC-Canto-style gloss strings. */
function firstSense(gloss: string): string {
  const t = gloss.trim()
  if (!t) return ''
  return t.replace(/^\([^)]+\)\s*/, '').split(/;\s*/)[0]?.trim() || t
}

type WordSpan = { start: number; end: number; word: string; gloss: string }

/** Longest-match known words (CC-Canto / seed) for phrase-aware char glosses. */
function findWordSpans(text: string): WordSpan[] {
  const chars = [...text]
  const spans: WordSpan[] = []
  let i = 0
  while (i < chars.length) {
    if (!isHanChar(chars[i]!)) {
      i += 1
      continue
    }
    let matched: { len: number; word: string; gloss: string } | null = null
    for (let len = Math.min(6, chars.length - i); len >= 2; len -= 1) {
      const word = chars.slice(i, i + len).join('')
      const hit = lookupGloss(word)
      if (hit?.gloss) {
        matched = { len, word, gloss: firstSense(hit.gloss) }
        break
      }
    }
    if (matched) {
      spans.push({
        start: i,
        end: i + matched.len,
        word: matched.word,
        gloss: matched.gloss,
      })
      i += matched.len
    } else {
      i += 1
    }
  }
  return spans
}

function meaningInWordSpan(index: number, spans: WordSpan[]): string {
  const span = spans.find((s) => index >= s.start && index < s.end)
  if (!span) return ''
  if (span.end - span.start === 1) return span.gloss
  return `in ${span.word} (${span.gloss})`
}

function localYueBreakdown(text: string): BreakdownChar[] {
  const trimmed = text.trim()
  const chars = [...trimmed]
  const spans = findWordSpans(trimmed)
  const rows: BreakdownChar[] = []

  for (let i = 0; i < chars.length; i += 1) {
    const ch = chars[i]!
    if (ch.trim() === '') continue
    if (!isHanChar(ch) && !/[？！。，、…]/.test(ch)) continue

    const hit = lookupGloss(ch)
    let meaning = hit?.gloss ? firstSense(hit.gloss) : ''
    if (!meaning && isHanChar(ch)) {
      meaning = meaningInWordSpan(i, spans)
    }
    if (!meaning && !isHanChar(ch)) {
      meaning =
        ch === '？' ? 'question mark' : ch === '！' ? 'exclamation mark' : ch === '。' ? 'full stop' : 'comma'
    }

    rows.push({
      char: ch,
      jyutping: hit?.jyutping || null,
      meaning,
      glossSource: hit?.source,
    })
  }
  return rows
}

function parseYueBreakdownPayload(raw: string, fallback: BreakdownChar[]): BreakdownChar[] {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
  try {
    const parsed = JSON.parse(cleaned) as { characters?: unknown }
    if (!Array.isArray(parsed.characters)) return fallback
    const out: BreakdownChar[] = []
    for (const item of parsed.characters) {
      if (!item || typeof item !== 'object') continue
      const row = item as Record<string, unknown>
      const char = typeof row.char === 'string' ? row.char : ''
      if (!char) continue
      const local = lookupGloss(char)
      const jyutping =
        typeof row.jyutping === 'string' && row.jyutping.trim()
          ? row.jyutping.trim()
          : local?.jyutping || null
      const meaning =
        typeof row.meaning === 'string' && row.meaning.trim()
          ? row.meaning.trim()
          : local?.gloss || ''
      out.push({
        char,
        jyutping,
        meaning,
        glossSource: local?.source || 'model',
      })
    }
    return out.length ? out : fallback
  } catch {
    return fallback
  }
}

const SKIP_EN_BREAKDOWN = new Set([
  'a',
  'an',
  'the',
  'to',
  'of',
  'and',
  'or',
  'in',
  'on',
  'at',
  'for',
  'with',
  'from',
  'by',
  'as',
  'is',
  'are',
  'be',
  'been',
  'am',
  'was',
  'were',
  'do',
  'does',
  'did',
  'not',
  'no',
  'it',
  'its',
  'this',
  'that',
  'these',
  'those',
  'i',
  'you',
  'he',
  'she',
  'we',
  'they',
  'me',
  'my',
  'your',
])

function detectBreakdownLang(
  text: string,
  explicit?: 'en' | 'yue' | 'cmn' | 'wuu' | 'sichuan' | 'tl' | 'es' | 'vi' | 'ceb' | 'ilo' | 'bcl',
): 'en' | 'yue' | 'cmn' | 'wuu' | 'sichuan' | 'tl' | 'es' | 'vi' | 'ceb' | 'ilo' | 'bcl' {
  if (explicit) return explicit
  return hasHan(text) ? 'yue' : 'en'
}

function tokenizeEnglish(text: string): string[] {
  const matches = text.match(/[A-Za-z]+(?:['\u2019][A-Za-z]+)?|[0-9]+|[^\sA-Za-z0-9]+/g)
  return (matches || []).filter((t) => t.trim())
}

function localEnglishBreakdown(text: string): BreakdownChar[] {
  const rows: BreakdownChar[] = []
  for (const tok of tokenizeEnglish(text)) {
    if (/^[^\w\u2019']+$/.test(tok)) {
      rows.push({
        char: tok,
        jyutping: null,
        meaning:
          tok === '?' || tok === '？'
            ? 'question mark'
            : tok === '!' || tok === '！'
              ? 'exclamation mark'
              : tok === '.' || tok === '。'
                ? 'full stop'
                : tok === ',' || tok === '，'
                  ? 'comma'
                  : 'punctuation',
        glossSource: 'seed',
      })
      continue
    }
    const lemma = tok.toLowerCase().replace(/\u2019/g, "'")
    const gloss = !SKIP_EN_BREAKDOWN.has(lemma.replace(/'s$/, ''))
      ? cantoneseGlossForEnglish(lemma) || cantoneseGlossForEnglish(tok)
      : null
    rows.push({
      char: tok,
      jyutping: null,
      meaning: gloss || '',
      glossSource: gloss ? 'lexicon' : undefined,
    })
  }
  return rows
}

function parseEnglishBreakdownPayload(raw: string, fallback: BreakdownChar[]): BreakdownChar[] {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
  try {
    const parsed = JSON.parse(cleaned) as { words?: unknown; characters?: unknown }
    const list = Array.isArray(parsed.words)
      ? parsed.words
      : Array.isArray(parsed.characters)
        ? parsed.characters
        : null
    if (!list) return fallback
    const out: BreakdownChar[] = []
    for (const item of list) {
      if (!item || typeof item !== 'object') continue
      const row = item as Record<string, unknown>
      const char =
        typeof row.word === 'string'
          ? row.word
          : typeof row.char === 'string'
            ? row.char
            : typeof row.text === 'string'
              ? row.text
              : ''
      if (!char) continue
      const ipa =
        typeof row.ipa === 'string' && row.ipa.trim()
          ? row.ipa.trim()
          : typeof row.pronunciation === 'string' && row.pronunciation.trim()
            ? row.pronunciation.trim()
            : typeof row.jyutping === 'string' && row.jyutping.trim()
              ? row.jyutping.trim()
              : null
      const meaning =
        typeof row.meaning === 'string' && row.meaning.trim()
          ? row.meaning.trim()
          : typeof row.gloss === 'string' && row.gloss.trim()
            ? row.gloss.trim()
            : cantoneseGlossForEnglish(char) || ''
      out.push({
        char,
        jyutping: ipa,
        meaning,
        glossSource: 'model',
      })
    }
    return out.length ? out : fallback
  } catch {
    return fallback
  }
}

async function englishBreakdown(text: string) {
  const fallback = localEnglishBreakdown(text)
  if (!env.openaiApiKey) {
    return { characters: fallback, engine: 'dictionary' as const, lang: 'en' as const }
  }

  const client = openaiClientWithKey()
  const system = [
    'You explain English word-by-word for Cantonese-speaking learners.',
    'Given an English phrase, return ONLY valid JSON:',
    '{"words":[{"word":"<token>","ipa":"<IPA without slashes, or null>","meaning":"<short Cantonese (粵語) gloss in this phrase>"}]}',
    'Rules:',
    '- Include every token in order (words and punctuation; skip spaces).',
    '- IPA should be learner-friendly (e.g. həˈloʊ). Null for punctuation.',
    '- Meanings must be concise Hong Kong Cantonese that fit THIS phrase.',
    '- For function words (a/the/to), still give a brief 粵 gloss.',
    '- No markdown.',
  ].join('\n')

  try {
    const completion = await client.chat.completions.create({
      model: env.openaiModel,
      temperature: 0.2,
      max_tokens: 700,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: text },
      ],
      response_format: { type: 'json_object' },
      ...llmChatExtras(),
    })
    const raw = completion.choices[0]?.message?.content?.trim() || ''
    const merged = parseEnglishBreakdownPayload(raw, fallback).map((row, i) => {
      const fb = fallback[i]
      if (!fb || fb.char.toLowerCase() !== row.char.toLowerCase()) {
        const byText = fallback.find((f) => f.char.toLowerCase() === row.char.toLowerCase())
        return {
          ...row,
          meaning: pickMeaning(row.meaning, byText?.meaning, cantoneseGlossForEnglish(row.char)),
          glossSource:
            row.meaning && !isGenericCharGloss(row.meaning)
              ? row.glossSource || 'model'
              : byText?.glossSource,
        }
      }
      return {
        ...row,
        jyutping: row.jyutping || fb.jyutping,
        meaning: pickMeaning(row.meaning, fb.meaning, cantoneseGlossForEnglish(row.char)),
        glossSource:
          row.meaning && !isGenericCharGloss(row.meaning)
            ? row.glossSource || 'model'
            : fb.glossSource,
      }
    })
    return { characters: merged, engine: 'openai' as const, lang: 'en' as const }
  } catch {
    return { characters: fallback, engine: 'dictionary' as const, lang: 'en' as const }
  }
}

async function yueBreakdown(text: string) {
  const trimmed = scrubMandarinToYue(text.trim()).text
  const fallback = localYueBreakdown(trimmed)

  if (!env.openaiApiKey) {
    return { characters: fallback, engine: 'dictionary' as const, lang: 'yue' as const }
  }

  const client = openaiClientWithKey()
  const system = [
    'You explain Hong Kong Cantonese (口語粵語) character-by-character for language learners.',
    'Given a Cantonese phrase, return ONLY valid JSON:',
    '{"characters":[{"char":"<one character>","jyutping":"<syllable+tone or null>","meaning":"<short English gloss in this phrase>"}]}',
    'Rules:',
    '- Include every character in order (skip spaces).',
    '- For punctuation, jyutping null and a brief meaning like “question mark”.',
    '- Meanings must fit THIS phrase (particles, aspect markers).',
    '- Jyutping with tone numbers (e.g. nei5) — optional; client library is authoritative.',
    '- No markdown.',
  ].join('\n')

  try {
    const completion = await client.chat.completions.create({
      model: env.openaiModel,
      temperature: 0.2,
      max_tokens: 600,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: trimmed },
      ],
      response_format: { type: 'json_object' },
      ...llmChatExtras(),
    })
    const raw = completion.choices[0]?.message?.content?.trim() || ''
    const merged = parseYueBreakdownPayload(raw, fallback).map((row, i) => {
      const fb = fallback[i]
      if (!fb || fb.char !== row.char) return row
      return {
        ...row,
        jyutping: fb.jyutping || row.jyutping,
        meaning: pickMeaning(row.meaning, fb.meaning),
        glossSource:
          row.meaning && !isGenericCharGloss(row.meaning)
            ? row.glossSource || 'model'
            : fb.glossSource,
      }
    })
    return {
      characters: merged,
      engine: 'openai' as const,
      lang: 'yue' as const,
    }
  } catch {
    return { characters: fallback, engine: 'dictionary' as const, lang: 'yue' as const }
  }
}


async function tlBreakdown(text: string) {
  const fallback = localTlBreakdown(text)
  if (!env.openaiApiKey) {
    return { characters: fallback, engine: 'dictionary' as const, lang: 'tl' as const }
  }

  const client = openaiClientWithKey()
  const system = [
    'You explain Tagalog / Filipino word-by-word for English-speaking learners.',
    'Given a Tagalog phrase, return ONLY valid JSON:',
    '{"words":[{"word":"<token>","accented":"<dictionary form with stress/glottal diacritics, or null>","meaning":"<short English gloss in this phrase>"}]}',
    'Rules:',
    '- Include every token in order (words and punctuation; skip spaces).',
    '- accented: use standard Filipino dictionary diacritics (á é í ó ú ñ) when stress/glottal differs from the unmarked form; null when unmarked or for punctuation.',
    '- Meanings must be concise English that fit THIS phrase.',
    '- For function words (ng/sa/ang), still give a brief gloss.',
    '- No markdown.',
  ].join('\n')

  try {
    const completion = await client.chat.completions.create({
      model: env.openaiModel,
      temperature: 0.2,
      max_tokens: 700,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: text },
      ],
      response_format: { type: 'json_object' },
      ...llmChatExtras(),
    })
    const raw = completion.choices[0]?.message?.content?.trim() || ''
    const merged = parseTlBreakdownPayload(raw, fallback).map((row, i) => {
      const fb = fallback[i]
      if (!fb || fb.char.toLowerCase() !== row.char.toLowerCase()) {
        const byText = fallback.find((f) => f.char.toLowerCase() === row.char.toLowerCase())
        return {
          ...row,
          meaning: pickMeaning(row.meaning, byText?.meaning),
          glossSource:
            row.meaning && !isGenericCharGloss(row.meaning)
              ? row.glossSource || 'model'
              : byText?.glossSource,
        }
      }
      return {
        ...row,
        jyutping: row.jyutping || fb.jyutping,
        meaning: pickMeaning(row.meaning, fb.meaning),
        glossSource:
          row.meaning && !isGenericCharGloss(row.meaning)
            ? row.glossSource || 'model'
            : fb.glossSource,
      }
    })
    return { characters: merged, engine: 'openai' as const, lang: 'tl' as const }
  } catch {
    return { characters: fallback, engine: 'dictionary' as const, lang: 'tl' as const }
  }
}

function tokenizeTagalog(text: string): string[] {
  const matches = text.match(/[A-Za-zÀ-ÿÑñ]+(?:'[A-Za-zÀ-ÿÑñ]+)?|[0-9]+|[^\sA-Za-zÀ-ÿÑñ0-9]+/g)
  return (matches || []).filter((t) => t.trim())
}

function localTlBreakdown(text: string): BreakdownChar[] {
  return tokenizeTagalog(text).map((tok) => {
    if (/^[^A-Za-zÀ-ÿÑñ0-9]+$/.test(tok)) {
      return {
        char: tok,
        jyutping: null,
        meaning:
          tok === '?' || tok === '？'
            ? 'question mark'
            : tok === '!' || tok === '！'
              ? 'exclamation mark'
              : tok === '.' || tok === '。'
                ? 'full stop'
                : tok === ',' || tok === '，'
                  ? 'comma'
                  : 'punctuation',
        glossSource: 'seed',
      }
    }
    return {
      char: tok,
      jyutping: null,
      meaning: '',
    }
  })
}

function parseTlBreakdownPayload(raw: string, fallback: BreakdownChar[]): BreakdownChar[] {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
  try {
    const parsed = JSON.parse(cleaned) as { words?: unknown; characters?: unknown }
    const list = Array.isArray(parsed.words)
      ? parsed.words
      : Array.isArray(parsed.characters)
        ? parsed.characters
        : null
    if (!list) return fallback
    const out: BreakdownChar[] = []
    for (const item of list) {
      if (!item || typeof item !== 'object') continue
      const row = item as Record<string, unknown>
      const char =
        typeof row.word === 'string'
          ? row.word
          : typeof row.char === 'string'
            ? row.char
            : typeof row.text === 'string'
              ? row.text
              : ''
      if (!char) continue
      const accented =
        typeof row.accented === 'string' && row.accented.trim()
          ? row.accented.trim()
          : typeof row.jyutping === 'string' && row.jyutping.trim()
            ? row.jyutping.trim()
            : typeof row.pronunciation === 'string' && row.pronunciation.trim()
              ? row.pronunciation.trim()
              : null
      const meaning =
        typeof row.meaning === 'string' && row.meaning.trim()
          ? row.meaning.trim()
          : typeof row.gloss === 'string' && row.gloss.trim()
            ? row.gloss.trim()
            : ''
      out.push({
        char,
        jyutping: accented,
        meaning,
        glossSource: 'model',
      })
    }
    return out.length ? out : fallback
  } catch {
    return fallback
  }
}


async function esBreakdown(text: string) {
  const fallback = localEsBreakdown(text)
  if (!env.openaiApiKey) {
    return { characters: fallback, engine: 'dictionary' as const, lang: 'es' as const }
  }

  const client = openaiClientWithKey()
  const system = [
    'You explain Mexican Spanish word-by-word for English-speaking learners.',
    'Given a Mexican Spanish phrase, return ONLY valid JSON:',
    '{"words":[{"word":"<token>","accented":"<form with written accents if needed, or null>","meaning":"<short English gloss in this phrase>"}]}',
    'Rules:',
    '- Include every token in order (words and punctuation; skip spaces).',
    '- accented: use standard Spanish orthographic accents (á é í ó ú ñ ü) when the written form differs from an unmarked token; null when already correct or for punctuation.',
    '- Prefer Mexican Spanish senses when a word differs by region.',
    '- Meanings must be concise English that fit THIS phrase.',
    '- For function words (de/la/el/que), still give a brief gloss.',
    '- No markdown.',
  ].join('\n')

  try {
    const completion = await client.chat.completions.create({
      model: env.openaiModel,
      temperature: 0.2,
      max_tokens: 700,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: text },
      ],
      response_format: { type: 'json_object' },
      ...llmChatExtras(),
    })
    const raw = completion.choices[0]?.message?.content?.trim() || ''
    const merged = parseTlBreakdownPayload(raw, fallback).map((row, i) => {
      const fb = fallback[i]
      if (!fb || fb.char.toLowerCase() !== row.char.toLowerCase()) {
        const byText = fallback.find((f) => f.char.toLowerCase() === row.char.toLowerCase())
        return {
          ...row,
          meaning: pickMeaning(row.meaning, byText?.meaning),
          glossSource:
            row.meaning && !isGenericCharGloss(row.meaning)
              ? row.glossSource || 'model'
              : byText?.glossSource,
        }
      }
      return {
        ...row,
        jyutping: row.jyutping || fb.jyutping,
        meaning: pickMeaning(row.meaning, fb.meaning),
        glossSource:
          row.meaning && !isGenericCharGloss(row.meaning)
            ? row.glossSource || 'model'
            : fb.glossSource,
      }
    })
    return { characters: merged, engine: 'openai' as const, lang: 'es' as const }
  } catch {
    return { characters: fallback, engine: 'dictionary' as const, lang: 'es' as const }
  }
}

function tokenizeMexicanSpanish(text: string): string[] {
  const matches = text.match(/[A-Za-zÀ-ÿÜüÑñ]+(?:'[A-Za-zÀ-ÿÜüÑñ]+)?|[0-9]+|[^\sA-Za-zÀ-ÿÜüÑñ0-9]+/g)
  return (matches || []).filter((t) => t.trim())
}

function localEsBreakdown(text: string): BreakdownChar[] {
  return tokenizeMexicanSpanish(text).map((tok) => {
    if (/^[^A-Za-zÀ-ÿÜüÑñ0-9]+$/.test(tok)) {
      return {
        char: tok,
        jyutping: null,
        meaning:
          tok === '?' || tok === '？' || tok === '¿'
            ? 'question mark'
            : tok === '!' || tok === '！' || tok === '¡'
              ? 'exclamation mark'
              : tok === '.' || tok === '。'
                ? 'full stop'
                : tok === ',' || tok === '，'
                  ? 'comma'
                  : 'punctuation',
        glossSource: 'seed',
      }
    }
    return {
      char: tok,
      jyutping: null,
      meaning: '',
    }
  })
}

async function viBreakdown(text: string) {
  const fallback = localViBreakdown(text)
  if (!env.openaiApiKey) {
    return { characters: fallback, engine: 'dictionary' as const, lang: 'vi' as const }
  }

  const client = openaiClientWithKey()
  const system = [
    'You explain Vietnamese word-by-word for English-speaking learners.',
    'Given a Vietnamese phrase, return ONLY valid JSON:',
    '{"words":[{"word":"<token>","accented":"<full Quốc ngữ form with tone + vowel-quality diacritics, or null>","meaning":"<short English gloss in this phrase>"}]}',
    'Rules:',
    '- Include every token in order (words and punctuation; skip spaces).',
    '- accented: use standard Vietnamese Quốc ngữ diacritics (tone marks + vowel-quality marks); null when already correct or for punctuation.',
    '- Do NOT use Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
    '- Meanings must be concise English that fit THIS phrase.',
    '- For function words (là/của/và), still give a brief gloss.',
    '- No markdown.',
  ].join('\n')

  try {
    const completion = await client.chat.completions.create({
      model: env.openaiModel,
      temperature: 0.2,
      max_tokens: 700,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: text },
      ],
      response_format: { type: 'json_object' },
      ...llmChatExtras(),
    })
    const raw = completion.choices[0]?.message?.content?.trim() || ''
    const merged = parseTlBreakdownPayload(raw, fallback).map((row, i) => {
      const fb = fallback[i]
      if (!fb || fb.char.toLowerCase() !== row.char.toLowerCase()) {
        const byText = fallback.find((f) => f.char.toLowerCase() === row.char.toLowerCase())
        return {
          ...row,
          meaning: pickMeaning(row.meaning, byText?.meaning),
          glossSource:
            row.meaning && !isGenericCharGloss(row.meaning)
              ? row.glossSource || 'model'
              : byText?.glossSource,
        }
      }
      return {
        ...row,
        jyutping: row.jyutping || fb.jyutping,
        meaning: pickMeaning(row.meaning, fb.meaning),
        glossSource:
          row.meaning && !isGenericCharGloss(row.meaning)
            ? row.glossSource || 'model'
            : fb.glossSource,
      }
    })
    return { characters: merged, engine: 'openai' as const, lang: 'vi' as const }
  } catch {
    return { characters: fallback, engine: 'dictionary' as const, lang: 'vi' as const }
  }
}

/** Vietnamese words use Latin letters plus Quốc ngữ diacritics (Đ/đ + combining/precomposed marks). */
function tokenizeVietnamese(text: string): string[] {
  const matches = text.match(
    /[A-Za-zÀ-ỹĐđ\u0300-\u036f]+(?:'[A-Za-zÀ-ỹĐđ]+)?|[0-9]+|[^\sA-Za-zÀ-ỹĐđ0-9]+/g,
  )
  return (matches || []).filter((t) => t.trim())
}

function localViBreakdown(text: string): BreakdownChar[] {
  return tokenizeVietnamese(text).map((tok) => {
    if (/^[^A-Za-zÀ-ỹĐđ0-9]+$/.test(tok)) {
      return {
        char: tok,
        jyutping: null,
        meaning:
          tok === '?' || tok === '？'
            ? 'question mark'
            : tok === '!' || tok === '！'
              ? 'exclamation mark'
              : tok === '.' || tok === '。'
                ? 'full stop'
                : tok === ',' || tok === '，'
                  ? 'comma'
                  : 'punctuation',
        glossSource: 'seed',
      }
    }
    return {
      char: tok,
      jyutping: null,
      meaning: '',
    }
  })
}

async function cmnBreakdown(text: string) {
  // Preserve Mandarin — never scrub into Cantonese. Client supplies pinyin locally;
  // API returns gloss rows with jyutping left null for client merge.
  const trimmed = text.trim()
  const fallback = localYueBreakdown(trimmed).map((row) => ({
    ...row,
    jyutping: null as string | null,
  }))
  return { characters: fallback, engine: 'dictionary' as const, lang: 'cmn' as const }
}

async function wuuBreakdown(text: string) {
  /**
   * Colloquial Shanghainese — DETAILED per-char pedagogy.
   * `jyutping` holds citation-form Wugniu (吴语学堂) for that character — not Yue Jyutping,
   * not Mandarin pinyin, and not sandhi-surface spellings (phrase-level Wugniu stays on translate).
   */
  const trimmed = text.trim()
  const fallback = localYueBreakdown(trimmed).map((row) => ({
    ...row,
    jyutping: null as string | null,
  }))

  if (!env.openaiApiKey) {
    return { characters: fallback, engine: 'dictionary' as const, lang: 'wuu' as const }
  }

  const client = openaiClientWithKey()
  const system = [
    'You explain colloquial Shanghainese (上海话 / 沪语) character-by-character for language learners.',
    'Given a Shanghainese phrase, return ONLY valid JSON:',
    '{"characters":[{"char":"<one character>","jyutping":"<Wugniu citation reading or null>","meaning":"<short English gloss in this phrase>"}]}',
    'Rules:',
    '- Include every character in order (skip spaces).',
    '- For punctuation, jyutping null and a brief meaning like “question mark”.',
    '- Meanings must fit THIS phrase (particles, aspect markers, dialectal uses).',
    '- The jyutping field holds Wugniu (吴语学堂拼音) citation / isolation readings for each character (e.g. non, ho) — NOT Mandarin pinyin and NOT Cantonese Jyutping.',
    '- Do NOT invent Cantonese-style per-syllable tone digits for sandhi-surface forms. Phrase-level sandhi belongs elsewhere; here give citation Wugniu per character.',
    '- Prefer Shanghainese colloquial readings when they differ from Mandarin.',
    '- No markdown.',
  ].join('\n')

  try {
    const completion = await client.chat.completions.create({
      model: env.openaiModel,
      temperature: 0.2,
      max_tokens: 600,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: trimmed },
      ],
      response_format: { type: 'json_object' },
      ...llmChatExtras(),
    })
    const raw = completion.choices[0]?.message?.content?.trim() || ''
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim()
    let modelRows = fallback
    try {
      const parsed = JSON.parse(cleaned) as { characters?: unknown }
      if (Array.isArray(parsed.characters)) {
        const out: BreakdownChar[] = []
        for (const item of parsed.characters) {
          if (!item || typeof item !== 'object') continue
          const row = item as Record<string, unknown>
          const char = typeof row.char === 'string' ? row.char : ''
          if (!char) continue
          // Never fill from Yue lexicon — jyutping must be Wugniu from the model.
          const jyutping =
            typeof row.jyutping === 'string' && row.jyutping.trim()
              ? row.jyutping.trim()
              : null
          const meaning =
            typeof row.meaning === 'string' && row.meaning.trim() ? row.meaning.trim() : ''
          out.push({
            char,
            jyutping,
            meaning,
            glossSource: meaning ? 'model' : undefined,
          })
        }
        if (out.length) modelRows = out
      }
    } catch {
      /* keep fallback */
    }

    const merged = modelRows.map((row, i) => {
      const fb = fallback[i]
      if (!fb || fb.char !== row.char) return row
      return {
        ...row,
        jyutping: row.jyutping || null,
        meaning: pickMeaning(row.meaning, fb.meaning),
        glossSource:
          row.meaning && !isGenericCharGloss(row.meaning)
            ? row.glossSource || 'model'
            : fb.glossSource,
      }
    })
    return {
      characters: merged,
      engine: 'openai' as const,
      lang: 'wuu' as const,
    }
  } catch {
    return { characters: fallback, engine: 'dictionary' as const, lang: 'wuu' as const }
  }
}

/**
 * Chengdu Sichuanese — DETAILED per-char pedagogy.
 * `jyutping` field holds 四川话拼音 (tone numbers) — same per-char pedagogy shape as Yue/Wuu.
 * Never scrub into Yue; never prefer CC-Canto Jyutping over model Sichuanese Pinyin.
 */
async function sichuanBreakdown(text: string) {
  const trimmed = text.trim()
  const fallback = localYueBreakdown(trimmed).map((row) => ({
    ...row,
    jyutping: null as string | null,
  }))

  if (!env.openaiApiKey) {
    return { characters: fallback, engine: 'dictionary' as const, lang: 'sichuan' as const }
  }

  const client = openaiClientWithKey()
  const system = [
    'You explain Chengdu Sichuanese (四川话) character-by-character for language learners.',
    'Given a Sichuanese phrase, return ONLY valid JSON:',
    '{"characters":[{"char":"<one character>","jyutping":"<四川话拼音 syllable+tone or null>","meaning":"<short English gloss in this phrase>"}]}',
    'Rules:',
    '- Include every character in order (skip spaces).',
    '- For punctuation, jyutping null and a brief meaning like “question mark”.',
    '- Meanings must fit THIS phrase (particles, aspect markers, dialectal uses).',
    '- The jyutping field holds 四川话拼音 with tone numbers (e.g. ni3, yao4) — NOT Mandarin pinyin and NOT Cantonese Jyutping.',
    '- Prefer Chengdu colloquial readings when they differ from Mandarin.',
    '- No markdown.',
  ].join('\n')

  try {
    const completion = await client.chat.completions.create({
      model: env.openaiModel,
      temperature: 0.2,
      max_tokens: 600,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: trimmed },
      ],
      response_format: { type: 'json_object' },
      ...llmChatExtras(),
    })
    const raw = completion.choices[0]?.message?.content?.trim() || ''
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim()
    let modelRows: BreakdownChar[] = fallback
    try {
      const parsed = JSON.parse(cleaned) as { characters?: unknown }
      if (Array.isArray(parsed.characters)) {
        const out: BreakdownChar[] = []
        for (const item of parsed.characters) {
          if (!item || typeof item !== 'object') continue
          const row = item as Record<string, unknown>
          const char = typeof row.char === 'string' ? row.char : ''
          if (!char) continue
          // Never fill from Yue lexicon — jyutping must be 四川话拼音 from the model.
          const jyutping =
            typeof row.jyutping === 'string' && row.jyutping.trim()
              ? row.jyutping.trim()
              : null
          const meaning =
            typeof row.meaning === 'string' && row.meaning.trim()
              ? row.meaning.trim()
              : ''
          out.push({
            char,
            jyutping,
            meaning,
            glossSource: meaning ? 'model' : undefined,
          })
        }
        if (out.length) modelRows = out
      }
    } catch {
      /* keep fallback */
    }

    const merged = modelRows.map((row, i) => {
      const fb = fallback[i]
      if (!fb || fb.char !== row.char) return row
      return {
        ...row,
        // Prefer model 四川话拼音; do not fall back to Yue Jyutping from local gloss.
        jyutping: row.jyutping || null,
        meaning: pickMeaning(row.meaning, fb.meaning),
        glossSource:
          row.meaning && !isGenericCharGloss(row.meaning)
            ? row.glossSource || 'model'
            : fb.glossSource,
      }
    })
    return {
      characters: merged,
      engine: 'openai' as const,
      lang: 'sichuan' as const,
    }
  } catch {
    return { characters: fallback, engine: 'dictionary' as const, lang: 'sichuan' as const }
  }
}

export async function breakdown(input: unknown) {
  const parsed = Body.parse(input)
  const text = parsed.text.trim()
  const lang = detectBreakdownLang(text, parsed.lang)
  if (lang === 'en') return englishBreakdown(text)
  if (lang === 'tl') return tlBreakdown(text)
  if (lang === 'es') return esBreakdown(text)
  if (lang === 'vi') return viBreakdown(text)
  // Soft: Cebuano / Ilocano text-only — reuse English token breakdown until dedicated packs exist.
  if (lang === 'ceb' || lang === 'ilo' || lang === 'bcl') return englishBreakdown(text)
  if (lang === 'cmn') return cmnBreakdown(text)
  if (lang === 'wuu') return wuuBreakdown(text)
  if (lang === 'sichuan') return sichuanBreakdown(text)
  return yueBreakdown(text)
}
