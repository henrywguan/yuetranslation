import OpenAI from 'openai'
import { z } from 'zod'
import { env, llmChatExtras } from './env.js'
import { lookupGloss } from './canto/gloss.js'
import { isHanChar } from './canto/han.js'
import { scrubMandarinToYue } from './canto/scrub.js'

const Body = z.object({
  text: z.string().min(1).max(500),
})

export type BreakdownChar = {
  char: string
  /** Jyutping if known; null for punctuation / unknown. Client overwrites with to-jyutping. */
  jyutping: string | null
  meaning: string
  glossSource?: string
}

const GENERIC_CHAR_GLOSS = 'Cantonese character'

function isGenericCharGloss(gloss: string | null | undefined): boolean {
  return (gloss || '').trim() === GENERIC_CHAR_GLOSS
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

function localBreakdown(text: string): BreakdownChar[] {
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
      meaning = ch === '？' ? 'question mark' : ch === '！' ? 'exclamation mark' : ch === '。' ? 'full stop' : 'comma'
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

function parseBreakdownPayload(raw: string, fallback: BreakdownChar[]): BreakdownChar[] {
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

export async function breakdown(input: unknown) {
  const { text } = Body.parse(input)
  const trimmed = scrubMandarinToYue(text.trim()).text
  const fallback = localBreakdown(trimmed)

  if (!env.openaiApiKey) {
    return { characters: fallback, engine: 'dictionary' as const }
  }

  const client = new OpenAI({
    apiKey: env.openaiApiKey,
    ...(env.openaiBaseUrl ? { baseURL: env.openaiBaseUrl } : {}),
  })
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
    // Prefer model contextual meaning, but keep local gloss if model blank.
    const merged = parseBreakdownPayload(raw, fallback).map((row, i) => {
      const fb = fallback[i]
      if (!fb || fb.char !== row.char) return row
      return {
        ...row,
        // Never trust model Jyutping over local lexicon when present.
        jyutping: fb.jyutping || row.jyutping,
        meaning: pickMeaning(row.meaning, fb.meaning),
        glossSource: row.meaning && !isGenericCharGloss(row.meaning) ? row.glossSource || 'model' : fb.glossSource,
      }
    })
    return {
      characters: merged,
      engine: 'openai' as const,
    }
  } catch {
    return { characters: fallback, engine: 'dictionary' as const }
  }
}
