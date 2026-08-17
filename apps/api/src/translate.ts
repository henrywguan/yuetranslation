import OpenAI from 'openai'
import { z } from 'zod'
import { env, openaiConfigured } from './env.js'
import {
  dictionaryTranslate,
  hardenYueOutput,
  lexiconTranslate,
  looksLikeGlossDump,
  englishDefinitionsForYue,
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
   * Translations are always final-quality. Legacy clients may still send
   * `interim`; it is coerced to `final` (no partial/MT streaming path).
   */
  stage: z.enum(['interim', 'final']).optional().default('final'),
})

function openaiClient() {
  if (!openaiConfigured()) return null
  return new OpenAI({
    apiKey: env.openaiApiKey || 'ollama',
    ...(env.openaiBaseUrl ? { baseURL: env.openaiBaseUrl } : {}),
  })
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

function mergeDefinitions(...parts: Array<string | string[] | undefined | null>): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const part of parts.flat()) {
    const s = (part || '').trim()
    if (!s || looksLikeGlossDump(s)) continue
    const key = s.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(s)
    if (out.length >= 8) break
  }
  return out
}

type TranslateResult = {
  text: string
  definition: string
  alternatives: string[]
  engine: string
  from: 'en' | 'yue'
  to: 'en' | 'yue'
  stage: TranslateStage
  meta: ReturnType<typeof emptyMeta> & Record<string, unknown>
  definitions?: string[]
}

/** Attach lexicon English senses for the Cantonese phrase in this turn. */
function withYueDefinitions(result: TranslateResult, sourceText: string): TranslateResult {
  const yuePhrase =
    result.to === 'yue' ? result.text : result.from === 'yue' ? sourceText : ''
  const senses = yuePhrase ? englishDefinitionsForYue(yuePhrase) : []
  return {
    ...result,
    definitions: mergeDefinitions(result.definition, senses),
  }
}

export async function translate(input: unknown) {
  const parsed = Body.parse(input)
  const from = parsed.from
  const to = parsed.to
  const text = parsed.text.trim()
  // No interim translations anywhere — always run the full final pipeline.
  const stage: TranslateStage = 'final'
  const wantAlts = Boolean(parsed.includeAlternatives && from === 'en' && to === 'yue')
  const fallbackDefinition = from === 'en' ? text : ''

  if (from === to) {
    return withYueDefinitions(
      {
        text,
        definition: '',
        alternatives: [],
        engine: 'identity',
        from,
        to,
        stage,
        meta: emptyMeta(['identity']),
      },
      text,
    )
  }

  // 1) Phrase memory — O(1) (best latency + reliability for live after capture).
  const dictHit = dictionaryTranslate({
    sourceLang: from,
    targetLang: to,
    source: text,
    wantAlternatives: wantAlts,
  })
  if (dictHit) {
    return withYueDefinitions(
      {
        text: dictHit.text,
        definition: to === 'yue' ? fallbackDefinition : '',
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
      },
      text,
    )
  }

  // 2) Lexicon fallback (seed + CC-Canto).
  // When a model is configured, only trust exact headword hits — never gloss dumps.
  const lexHit = lexiconTranslate({
    sourceLang: from,
    targetLang: to,
    source: text,
    wantAlternatives: wantAlts,
  })
  const lexTextOk = Boolean(lexHit) && (to !== 'en' || !looksLikeGlossDump(lexHit!.text))
  const useLexicon = Boolean(
    lexHit && lexTextOk && (!openaiConfigured() || lexHit.kind === 'exact'),
  )
  if (lexHit && useLexicon) {
    if (to === 'yue') {
      const hardened = await hardenYueOutput({
        text: lexHit.text,
        alternatives: wantAlts ? lexHit.alternatives : [],
        stage,
        sourceEn: from === 'en' ? text : undefined,
        client: null,
      })
      return withYueDefinitions(
        {
          text: hardened.text,
          definition: lexHit.definition || fallbackDefinition,
          alternatives: wantAlts ? hardened.alternatives : [],
          engine: 'lexicon',
          from,
          to,
          stage,
          meta: {
            ...hardened.meta,
            dictionaryHit: true,
            notes: [...lexHit.notes, ...hardened.meta.notes],
          },
        },
        text,
      )
    }
    return withYueDefinitions(
      {
        text: lexHit.text,
        definition: lexHit.definition,
        alternatives: [],
        engine: 'lexicon',
        from,
        to,
        stage,
        meta: {
          dictionaryHit: true,
          scrubbed: false,
          colloquialScore: 0,
          rewritten: false,
          notes: lexHit.notes,
        },
      },
      text,
    )
  }

  const client = openaiClient()

  // 3) Demo fallback when no model key and lexicon miss.
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
      return withYueDefinitions(
        {
          text: hardened.text,
          definition: fallbackDefinition,
          alternatives: wantAlts ? hardened.alternatives : [],
          engine: 'demo',
          from,
          to,
          stage,
          meta: hardened.meta,
        },
        text,
      )
    }
    return withYueDefinitions(
      {
        text: primary,
        definition: '',
        alternatives: [],
        engine: 'demo',
        from,
        to,
        stage,
        meta: emptyMeta(['demo']),
      },
      text,
    )
  }

  // 4) Model translate
  const toYue = to === 'yue'
  let primary = text
  let alternatives: string[] = []
  let definition = fallbackDefinition
  const engine = env.openaiBaseUrl ? 'openai-compatible' : 'openai'

  if (wantAlts) {
    const system = [
      'You are a Hong Kong Cantonese interpreter.',
      'Translate English into colloquial spoken Cantonese (口語粵語), not Mandarin and not formal written Chinese.',
      'Prefer Hong Kong characters such as 係, 唔, 喺, 咗, 緊, 㗎, 喇, 喎.',
      'Return ONLY valid JSON with this shape:',
      '{"primary":"<best translation>","alternatives":["<other natural variant>", "..."],"definition":"<short English gloss>"}',
      'Rules for alternatives:',
      '- For everyday conversational questions (e.g. “what are you doing?”), prefer 2–3 natural spoken variants.',
      '- Variants should meaningfully differ (word order, particles, politeness).',
      '- Do not repeat the primary or near-duplicates.',
      '- If there is truly no useful variation, return "alternatives": [].',
      '- definition should help a learner: brief, clear, natural English.',
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
    if (parsedYue.definition) definition = parsedYue.definition
  } else {
    const system = toYue
      ? [
          'You are a Hong Kong Cantonese interpreter.',
          'Translate into colloquial spoken Cantonese (口語粵語), not Mandarin and not formal written Chinese.',
          'Prefer Hong Kong characters such as 係, 唔, 喺, 咗, 緊, 㗎, 喇, 喎.',
          'Return ONLY valid JSON:',
          '{"translation":"<Cantonese>","definition":"<short English gloss of what the Cantonese means>"}',
          'The definition should help a learner: brief, clear, natural English (not a dictionary dump).',
        ].join('\n')
      : [
          'You are a Hong Kong Cantonese interpreter.',
          'Translate Cantonese into natural English for face-to-face conversation.',
          'Return ONLY valid JSON:',
          '{"translation":"<English>","definition":"<optional short sense note, or empty string>"}',
        ].join('\n')

    const completion = await client.chat.completions.create({
      model: env.openaiModel,
      temperature: 0.2,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: text },
      ],
    })
    const raw = completion.choices[0]?.message?.content?.trim() || ''
    const payload = parsePayload(raw, text, fallbackDefinition)
    primary = payload.text
    definition = toYue ? payload.definition || fallbackDefinition : payload.definition
  }

  // 5) Harden Cantonese outputs (scrub / score / optional rewrite).
  if (toYue) {
    const hardened = await hardenYueOutput({
      text: primary,
      alternatives,
      stage,
      sourceEn: from === 'en' ? text : undefined,
      client,
    })
    return withYueDefinitions(
      {
        text: hardened.text,
        definition,
        alternatives: wantAlts ? hardened.alternatives : [],
        engine,
        from,
        to,
        stage,
        meta: hardened.meta,
      },
      text,
    )
  }

  // 6) 粵→EN: never ship dictionary gloss dumps from the model path.
  if (looksLikeGlossDump(primary)) {
    return withYueDefinitions(
      {
        text: '',
        definition: '',
        alternatives: [],
        engine,
        from,
        to,
        stage,
        meta: emptyMeta(['gloss-dump-blocked']),
      },
      text,
    )
  }

  return withYueDefinitions(
    {
      text: primary,
      definition,
      alternatives: [],
      engine,
      from,
      to,
      stage,
      meta: emptyMeta(),
    },
    text,
  )
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
    const parsed = JSON.parse(cleaned) as { translation?: unknown; definition?: unknown; text?: unknown }
    const textCandidate = asTrimmedString(parsed.translation) || asTrimmedString(parsed.text)
    return {
      text: textCandidate || fallbackText,
      definition: asTrimmedString(parsed.definition) || fallbackDefinition,
    }
  } catch {
    return { text: cleaned || fallbackText, definition: fallbackDefinition }
  }
}

function parseYuePayload(
  raw: string,
  fallback: string,
): { text: string; alternatives: string[]; definition: string } {
  const cleaned = stripJsonFence(raw)
  try {
    const parsed = JSON.parse(cleaned) as {
      primary?: unknown
      alternatives?: unknown
      definition?: unknown
    }
    const primary = asTrimmedString(parsed.primary) || fallback
    const alts = Array.isArray(parsed.alternatives)
      ? parsed.alternatives.filter((x): x is string => typeof x === 'string')
      : []
    return {
      text: primary,
      alternatives: uniqStrings(primary, alts),
      definition: asTrimmedString(parsed.definition),
    }
  } catch {
    return { text: cleaned || fallback, alternatives: [], definition: '' }
  }
}
