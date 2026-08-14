import OpenAI from 'openai'
import { z } from 'zod'
import { env } from './env.js'
import {
  dictionaryTranslate,
  hardenYueOutput,
  uniqStrings,
  type TranslateStage,
} from './canto/index.js'

const Body = z.object({
  text: z.string().min(1).max(2000),
  from: z.enum(['en', 'yue']).default('en'),
  to: z.enum(['en', 'yue']),
  /** When true and EN→粵, also return colloquial alternatives if they exist. */
  includeAlternatives: z.boolean().optional().default(false),
  /**
   * Live speech: interim = fast path (no alts, light scrub only).
   * final = dictionary/scrub/score (+ optional rewrite). Text mode should use final.
   */
  stage: z.enum(['interim', 'final']).optional().default('final'),
})

function openaiClient() {
  if (!env.openaiApiKey) return null
  return new OpenAI({
    apiKey: env.openaiApiKey,
    ...(env.openaiBaseUrl ? { baseURL: env.openaiBaseUrl } : {}),
  })
}

export async function translate(input: unknown) {
  const parsed = Body.parse(input)
  const from = parsed.from
  const to = parsed.to
  const text = parsed.text.trim()
  const stage: TranslateStage = parsed.stage
  const wantAlts = Boolean(
    parsed.includeAlternatives && from === 'en' && to === 'yue' && stage === 'final',
  )

  if (from === to) {
    return {
      text,
      alternatives: [],
      engine: 'identity',
      from,
      to,
      stage,
      meta: {
        dictionaryHit: false,
        scrubbed: false,
        colloquialScore: 0,
        rewritten: false,
        notes: ['identity'],
      },
    }
  }

  // 1) Phrase memory — O(1), both interim and final (best latency + reliability).
  const dictHit = dictionaryTranslate({
    sourceLang: from,
    targetLang: to,
    source: text,
    wantAlternatives: wantAlts,
  })
  if (dictHit) {
    return {
      text: dictHit.text,
      alternatives: wantAlts ? dictHit.alternatives : [],
      engine: 'dictionary',
      from,
      to,
      stage,
      meta: {
        dictionaryHit: true,
        scrubbed: false,
        colloquialScore: to === 'yue' ? 8 : 0,
        rewritten: false,
        notes: [`dict:${dictHit.entry.id}`],
      },
    }
  }

  const client = openaiClient()

  // 2) Demo fallback when no model key.
  if (!client) {
    const primary = to === 'yue' ? `（示範）${text}` : `(demo) ${text}`
    if (to === 'yue') {
      const hardened = await hardenYueOutput({
        text: primary,
        alternatives: [],
        stage,
        sourceEn: from === 'en' ? text : undefined,
        client: null,
      })
      return {
        text: hardened.text,
        alternatives: wantAlts ? hardened.alternatives : [],
        engine: 'demo',
        from,
        to,
        stage,
        meta: hardened.meta,
      }
    }
    return {
      text: primary,
      alternatives: [],
      engine: 'demo',
      from,
      to,
      stage,
      meta: {
        dictionaryHit: false,
        scrubbed: false,
        colloquialScore: 0,
        rewritten: false,
        notes: ['demo'],
      },
    }
  }

  // 3) Model translate
  const toYue = to === 'yue'
  let primary = text
  let alternatives: string[] = []
  let engine: 'openai' | 'dictionary' = 'openai'

  if (wantAlts) {
    const system = [
      'You are a Hong Kong Cantonese interpreter.',
      'Translate English into colloquial spoken Cantonese (口語粵語), not Mandarin and not formal written Chinese.',
      'Prefer Hong Kong characters such as 係, 唔, 喺, 咗, 緊, 㗎, 喇, 喎.',
      'Return ONLY valid JSON with this shape:',
      '{"primary":"<best translation>","alternatives":["<other natural variant>", "..."]}',
      'Rules for alternatives:',
      '- For everyday conversational questions (e.g. “what are you doing?”), prefer 2–3 natural spoken variants.',
      '- Variants should meaningfully differ (word order, particles, politeness).',
      '- Do not repeat the primary or near-duplicates.',
      '- If there is truly no useful variation, return "alternatives": [].',
      '- No markdown, no explanation.',
    ].join('\n')

    const completion = await client.chat.completions.create({
      model: env.openaiModel,
      temperature: 0.35,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: text },
      ],
      response_format: { type: 'json_object' },
    })

    const raw = completion.choices[0]?.message?.content?.trim() || text
    const parsedYue = parseYuePayload(raw, text)
    primary = parsedYue.text
    alternatives = parsedYue.alternatives
  } else {
    const system = toYue
      ? [
          'You are a Hong Kong Cantonese interpreter.',
          'Translate into colloquial spoken Cantonese (口語粵語), not Mandarin and not formal written Chinese.',
          'Prefer Hong Kong characters such as 係, 唔, 喺, 咗, 緊, 㗎, 喇, 喎.',
          'Return ONLY the translation.',
        ].join('\n')
      : [
          'You are a Hong Kong Cantonese interpreter.',
          'Translate Cantonese into natural English for face-to-face conversation.',
          'Return ONLY the translation.',
        ].join('\n')

    const completion = await client.chat.completions.create({
      model: env.openaiModel,
      temperature: 0.2,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: text },
      ],
    })
    primary = completion.choices[0]?.message?.content?.trim() || text
  }

  // 4) Harden Cantonese outputs (scrub / score / optional rewrite on final).
  if (toYue) {
    const hardened = await hardenYueOutput({
      text: primary,
      alternatives,
      stage,
      sourceEn: from === 'en' ? text : undefined,
      client,
    })
    return {
      text: hardened.text,
      alternatives: wantAlts ? hardened.alternatives : [],
      engine,
      from,
      to,
      stage,
      meta: hardened.meta,
    }
  }

  return {
    text: primary,
    alternatives: [],
    engine,
    from,
    to,
    stage,
    meta: {
      dictionaryHit: false,
      scrubbed: false,
      colloquialScore: 0,
      rewritten: false,
      notes: [],
    },
  }
}

function parseYuePayload(raw: string, fallback: string): { text: string; alternatives: string[] } {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
  try {
    const parsed = JSON.parse(cleaned) as { primary?: unknown; alternatives?: unknown }
    const primary =
      typeof parsed.primary === 'string' && parsed.primary.trim()
        ? parsed.primary.trim()
        : fallback
    const alts = Array.isArray(parsed.alternatives)
      ? parsed.alternatives.filter((x): x is string => typeof x === 'string')
      : []
    return { text: primary, alternatives: uniqStrings(primary, alts) }
  } catch {
    return { text: cleaned || fallback, alternatives: [] }
  }
}
