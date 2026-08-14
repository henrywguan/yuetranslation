import OpenAI from 'openai'
import { z } from 'zod'
import { env } from './env.js'

const Body = z.object({
  text: z.string().min(1).max(500),
})

/** Compact English glosses for common HK colloquial characters (demo / offline). */
const GLOSS: Record<string, string> = {
  你: 'you',
  我: 'I / me',
  佢: 'he / she / they',
  係: 'to be (yes)',
  唔: 'not',
  喺: 'at / in',
  有: 'have / there is',
  冇: 'do not have / none',
  做: 'do / make',
  緊: 'progressive (-ing)',
  咗: 'perfective (already done)',
  咩: 'what (colloquial)',
  乜: 'what',
  嘢: 'thing',
  呀: 'softening particle',
  㗎: 'assertive particle',
  喇: 'change-of-state particle',
  喎: 'hearsay / soft particle',
  嗎: 'question particle',
  呢: 'this / particle',
  個: 'classifier (ge)',
  啲: 'some / plural-ish',
  嘅: 'possessive / relative',
  而: 'and / while',
  家: 'home / family; in 而家 = now',
  度: 'place / degree',
  邊: 'where / which',
  點: 'how / spot',
  好: 'good / very',
  多: 'many / much',
  謝: 'thanks',
  該: 'ought; in 唔該 = thanks',
  早: 'early',
  晨: 'morning',
  哈: 'ha (in 哈囉)',
  囉: 'lo (in 哈囉)',
  嗨: 'hi',
  最: 'most',
  近: 'recent / near',
  幾: 'how many / quite',
  請: 'please / invite',
  問: 'ask',
  賣: 'sell',
  錢: 'money',
  樣: 'kind / appearance',
  地: 'ground / earth',
  鐵: 'iron; in 地鐵 = MTR',
  港: 'harbour / Hong Kong',
  站: 'station',
  去: 'go',
  嚟: 'come',
  食: 'eat',
  飲: 'drink',
  睇: 'look / watch',
  聽: 'listen / hear',
  講: 'speak',
  話: 'say / speech',
  知: 'know',
  想: 'want / think',
  可: 'can / may',
  以: 'so as to',
  會: 'will / know how',
  要: 'want / need',
  得: 'get / can (result)',
  唔該: 'thanks / excuse me',
  多謝: 'thank you (grateful)',
}

export type BreakdownChar = {
  char: string
  /** Jyutping if known; null for punctuation / unknown. */
  jyutping: string | null
  meaning: string
}

function isHan(ch: string) {
  return /[\u3400-\u9fff\uf900-\ufaff]/.test(ch)
}

function demoBreakdown(text: string): BreakdownChar[] {
  const chars = Array.from(text.trim())
  return chars
    .filter((ch) => ch.trim() !== '')
    .map((ch) => ({
      char: ch,
      jyutping: isHan(ch) ? null : null,
      meaning: isHan(ch) ? GLOSS[ch] || 'Cantonese character' : '',
    }))
    .filter((row) => isHan(row.char) || /[？！。，、…]/.test(row.char))
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
      const jyutping =
        typeof row.jyutping === 'string' && row.jyutping.trim()
          ? row.jyutping.trim()
          : null
      const meaning = typeof row.meaning === 'string' ? row.meaning.trim() : ''
      out.push({ char, jyutping, meaning })
    }
    return out.length ? out : fallback
  } catch {
    return fallback
  }
}

export async function breakdown(input: unknown) {
  const { text } = Body.parse(input)
  const trimmed = text.trim()
  const fallback = demoBreakdown(trimmed)

  if (!env.openaiApiKey) {
    return { characters: fallback, engine: 'demo' as const }
  }

  const client = new OpenAI({ apiKey: env.openaiApiKey })
  const system = [
    'You explain Hong Kong Cantonese (口語粵語) character-by-character for language learners.',
    'Given a Cantonese phrase, return ONLY valid JSON:',
    '{"characters":[{"char":"<one character>","jyutping":"<syllable+tone or null>","meaning":"<short English gloss in this phrase>"}]}',
    'Rules:',
    '- Include every character in order (skip spaces).',
    '- For punctuation, jyutping null and a brief meaning like “question mark”.',
    '- Meanings must fit THIS phrase (particles, aspect markers).',
    '- Jyutping with tone numbers (e.g. nei5).',
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
    return {
      characters: parseBreakdownPayload(raw, fallback),
      engine: 'openai' as const,
    }
  } catch {
    return { characters: fallback, engine: 'demo' as const }
  }
}
