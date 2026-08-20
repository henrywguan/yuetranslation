import OpenAI from 'openai'
import { z } from 'zod'
import { env, openaiConfigured, llmChatExtras } from './env.js'
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

const HAN = /[\u3400-\u9fff\uf900-\ufaff]/

function hasHan(text: string) {
  return HAN.test(text.trim())
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

  // 1) Phrase memory — O(1) curated EN↔粵 (always on: accurate + lowest latency).
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

  const client = openaiClient()

  // 2) Lexicon / CC-Canto MT — offline only (no model key).
  // Online deploys skip this so dated slang / composed dictionary junk never
  // beats the LLM for accuracy.
  if (!client) {
    const lexHit = lexiconTranslate({
      sourceLang: from,
      targetLang: to,
      source: text,
      wantAlternatives: wantAlts,
    })
    const lexTextOk = Boolean(lexHit) && (to !== 'en' || !looksLikeGlossDump(lexHit!.text))
    if (lexHit && lexTextOk) {
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

    // 3) Demo fallback when no model key and lexicon miss.
    const demoPrimary = to === 'yue' ? `（示範）${text}` : `(demo) ${text}`
    if (to === 'yue') {
      const hardened = await hardenYueOutput({
        text: demoPrimary,
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
        text: demoPrimary,
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

  // 4) Model translate (online path).
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
      'Translate conversational speech faithfully, including slang and informal wording.',
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
      max_tokens: 400,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: text },
      ],
      response_format: { type: 'json_object' },
      ...llmChatExtras(),
    })

    const raw = completion.choices[0]?.message?.content?.trim() || ''
    const parsedYue = parseYuePayload(raw, text, true)
    primary = parsedYue.text
    alternatives = parsedYue.alternatives
    if (parsedYue.definition) definition = parsedYue.definition
  } else {
    const system = toYue
      ? [
          'You are a Hong Kong Cantonese interpreter.',
          'Translate into colloquial spoken Cantonese (口語粵語), not Mandarin and not formal written Chinese.',
          'Prefer Hong Kong characters such as 係, 唔, 喺, 咗, 緊, 㗎, 喇, 喎.',
          'Translate conversational speech faithfully, including slang and informal wording.',
          'Return ONLY valid JSON:',
          '{"translation":"<Cantonese>","definition":"<short English gloss of what the Cantonese means>"}',
          'The definition should help a learner: brief, clear, natural English (not a dictionary dump).',
        ].join('\n')
      : [
          'You are a Hong Kong Cantonese interpreter.',
          'Translate Cantonese into natural English for face-to-face conversation.',
          'Translate conversational speech faithfully, including slang and informal wording.',
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
    const payload = parsePayload(raw, toYue ? text : '', fallbackDefinition, toYue)
    primary = payload.text
    definition = toYue ? payload.definition || fallbackDefinition : payload.definition
  }

  // If the model failed to produce usable text, recover with phrase memory only
  // (never CC-Canto lexicon while online).
  if (from === 'yue' && to === 'en' && (!primary.trim() || hasHan(primary))) {
    const rescue = dictionaryTranslate({
      sourceLang: 'yue',
      targetLang: 'en',
      source: text,
    })
    primary = rescue && !looksLikeGlossDump(rescue.text) ? rescue.text : ''
  }

  if (toYue && from === 'en' && !hasHan(primary)) {
    const rescue = dictionaryTranslate({
      sourceLang: 'en',
      targetLang: 'yue',
      source: text,
      wantAlternatives: wantAlts,
    })
    if (rescue && hasHan(rescue.text)) {
      primary = rescue.text
      if (!definition) definition = fallbackDefinition
      alternatives = wantAlts ? rescue.alternatives : alternatives
    }
  }

  // 5) Harden Cantonese outputs (scrub / score / optional rewrite).
  // CC-Canto is used here only for attestation of model output, not as MT.
  if (toYue) {
    const hardened = await hardenYueOutput({
      text: primary,
      alternatives,
      stage,
      sourceEn: from === 'en' ? text : undefined,
      client,
    })
    const outText = hasHan(hardened.text) ? hardened.text : ''
    return withYueDefinitions(
      {
        text: outText,
        definition,
        alternatives: wantAlts ? hardened.alternatives.filter((a) => hasHan(a)) : [],
        engine,
        from,
        to,
        stage,
        meta: {
          ...hardened.meta,
          notes: outText ? hardened.meta.notes : [...hardened.meta.notes, 'no-yue-output'],
        },
      },
      text,
    )
  }

  // 6) 粵→EN: never ship dictionary gloss dumps or source-language echo from the model path.
  if (looksLikeGlossDump(primary) || (from === 'yue' && hasHan(primary))) {
    return withYueDefinitions(
      {
        text: '',
        definition: '',
        alternatives: [],
        engine,
        from,
        to,
        stage,
        meta: emptyMeta(['yue-echo-blocked']),
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
  requireHan = false,
): { text: string; definition: string } {
  const cleaned = stripJsonFence(raw)
  try {
    const parsed = JSON.parse(cleaned) as { translation?: unknown; definition?: unknown; text?: unknown }
    const textCandidate = asTrimmedString(parsed.translation) || asTrimmedString(parsed.text)
    const text =
      textCandidate && (!requireHan || hasHan(textCandidate))
        ? textCandidate
        : requireHan
          ? ''
          : fallbackText
    return {
      text,
      definition: asTrimmedString(parsed.definition) || fallbackDefinition,
    }
  } catch {
    const text =
      cleaned && (!requireHan || hasHan(cleaned)) ? cleaned : requireHan ? '' : fallbackText
    return { text, definition: fallbackDefinition }
  }
}

function parseYuePayload(
  raw: string,
  fallback: string,
  requireHan = false,
): { text: string; alternatives: string[]; definition: string } {
  const cleaned = stripJsonFence(raw)
  try {
    const parsed = JSON.parse(cleaned) as {
      primary?: unknown
      alternatives?: unknown
      definition?: unknown
    }
    const primary = asTrimmedString(parsed.primary)
    const text =
      primary && (!requireHan || hasHan(primary))
        ? primary
        : requireHan
          ? ''
          : hasHan(fallback)
            ? fallback
            : ''
    const alts = Array.isArray(parsed.alternatives)
      ? parsed.alternatives.filter((x): x is string => typeof x === 'string')
      : []
    return {
      text,
      alternatives: uniqStrings(text, alts),
      definition: asTrimmedString(parsed.definition),
    }
  } catch {
    const text =
      cleaned && (!requireHan || hasHan(cleaned)) ? cleaned : requireHan ? '' : fallback
    return { text, alternatives: [], definition: '' }
  }
}
