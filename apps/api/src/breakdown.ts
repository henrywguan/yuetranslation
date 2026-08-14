import OpenAI from 'openai'
import { z } from 'zod'
import { env } from './env.js'
import { lookupGloss } from './canto/gloss.js'
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

function isHan(ch: string) {
  return /[\u3400-\u9fff\uf900-\ufaff]/.test(ch)
}

function localBreakdown(text: string): BreakdownChar[] {
  const chars = Array.from(text.trim())
  return chars
    .filter((ch) => ch.trim() !== '')
    .filter((ch) => isHan(ch) || /[？！。，、…]/.test(ch))
    .map((ch) => {
      const hit = lookupGloss(ch)
      return {
        char: ch,
        jyutping: hit?.jyutping || null,
        meaning: hit?.gloss || (isHan(ch) ? 'Cantonese character' : ''),
        glossSource: hit?.source,
      }
    })
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
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: trimmed },
      ],
      response_format: { type: 'json_object' },
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
        meaning: row.meaning || fb.meaning,
        glossSource: row.meaning ? row.glossSource || 'model' : fb.glossSource,
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
