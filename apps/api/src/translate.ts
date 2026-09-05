import { z } from 'zod'
import { env, llmChatExtras } from './env.js'
import { openaiClient } from './openaiClient.js'
import {
  dictionaryTranslate,
  hardenYueOutput,
  lexiconTranslate,
  looksLikeGlossDump,
  englishDefinitionsForYue,
  cantoneseSensesForEnglish,
  uniqStrings,
  type TranslateStage,
} from './canto/index.js'
import { hasHan } from './canto/han.js'

const LangZ = z.enum(['en', 'yue', 'cmn'])

const Body = z.object({
  text: z.string().min(1).max(2000),
  from: LangZ.default('en'),
  to: LangZ,
  /** When true, also return colloquial alternatives for EN↔粵/Mandarin when they exist. */
  includeAlternatives: z.boolean().optional().default(false),
})

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

type TranslateLang = 'en' | 'yue' | 'cmn'

type TranslateResult = {
  text: string
  definition: string
  alternatives: string[]
  engine: string
  from: TranslateLang
  to: TranslateLang
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

/** Attach Cantonese learner senses for an English phrase (粵 speakers learning EN). */
function withEnDefinitions(result: TranslateResult): TranslateResult {
  if (result.to !== 'en') return result
  const senses = result.text ? cantoneseSensesForEnglish(result.text) : []
  return {
    ...result,
    definitions: mergeDefinitions(result.definition, senses),
  }
}

function withLearnerDefinitions(result: TranslateResult, sourceText: string): TranslateResult {
  return result.to === 'en' ? withEnDefinitions(result) : withYueDefinitions(result, sourceText)
}

/**
 * EN↔Mandarin path — never run Yue scrub/harden (preserve 普通话).
 * Dictionary/lexicon may miss; offline demo fallback is OK.
 */
async function translateMandarin(opts: {
  from: TranslateLang
  to: TranslateLang
  text: string
  stage: TranslateStage
  wantAlts: boolean
  fallbackDefinition: string
}): Promise<TranslateResult> {
  const { from, to, text, stage, wantAlts, fallbackDefinition } = opts

  const dictHit = dictionaryTranslate({
    sourceLang: from,
    targetLang: to,
    source: text,
    wantAlternatives: wantAlts,
  })
  if (dictHit) {
    return withLearnerDefinitions(
      {
        text: dictHit.text,
        definition: to === 'cmn' ? fallbackDefinition : '',
        alternatives: wantAlts ? dictHit.alternatives : [],
        engine: 'dictionary',
        from,
        to,
        stage,
        meta: {
          dictionaryHit: true,
          scrubbed: false,
          colloquialScore: 0,
          rewritten: false,
          notes: [`dict:${dictHit.entry.id}`, 'cmn-no-yue-scrub'],
        },
      },
      text,
    )
  }

  const client = openaiClient()
  if (!client) {
    // Offline demo — do not scrub Mandarin into Cantonese.
    const demoPrimary = to === 'cmn' ? `（示范）${text}` : `(demo) ${text}`
    return withLearnerDefinitions(
      {
        text: demoPrimary,
        definition: to === 'cmn' ? fallbackDefinition : '',
        alternatives: [],
        engine: 'demo',
        from,
        to,
        stage,
        meta: emptyMeta(['demo', 'cmn-no-yue-scrub']),
      },
      text,
    )
  }

  const engine = env.openaiBaseUrl ? 'openai-compatible' : 'openai'
  const toCmn = to === 'cmn'
  let primary = text
  let alternatives: string[] = []
  let definition = fallbackDefinition

  if (wantAlts && toCmn) {
    const system = [
      'You are a Mandarin Chinese interpreter (普通话).',
      'Translate English into natural spoken Mandarin. Simplified characters are OK (Mainland style).',
      'Do NOT use Cantonese-only particles or spellings (no 係/唔/喺/咗/㗎 unless shared).',
      'Return ONLY valid JSON:',
      '{"primary":"<best translation>","alternatives":["<other natural variant>", "..."],"definition":"<short English gloss>"}',
      'Rules for alternatives:',
      '- Prefer 2–3 natural spoken variants that differ in tone or wording.',
      '- Do not repeat the primary or near-duplicates.',
      '- If there is truly no useful variation, return "alternatives": [].',
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
    const parsedCmn = parseYuePayload(raw, text, true)
    primary = parsedCmn.text
    alternatives = parsedCmn.alternatives
    if (parsedCmn.definition) definition = parsedCmn.definition
  } else if (wantAlts && !toCmn) {
    const system = [
      'You are a Mandarin Chinese interpreter helping Mandarin speakers learn English.',
      'Translate Mandarin (普通话) into natural conversational English.',
      'Return ONLY valid JSON:',
      '{"primary":"<best English>","alternatives":["<other natural English phrasing>", "..."],"definition":"<short Mandarin gloss of what the English means>"}',
      'Rules for alternatives:',
      '- Prefer 2–3 natural English variants that differ in tone, formality, or wording.',
      '- Do not repeat the primary or near-duplicates.',
      '- definition should help a Mandarin learner: brief 普通话, not a dictionary dump.',
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
    const parsedEn = parseYuePayload(raw, '', false)
    primary = parsedEn.text
    alternatives = parsedEn.alternatives.filter((a) => a && !hasHan(a))
    if (parsedEn.definition) definition = parsedEn.definition
  } else {
    const system = toCmn
      ? [
          'You are a Mandarin Chinese interpreter (普通话).',
          'Translate into natural spoken Mandarin. Simplified characters are OK.',
          'Do NOT convert into Cantonese.',
          'Return ONLY valid JSON:',
          '{"translation":"<Mandarin>","definition":"<short English gloss of what the Mandarin means>"}',
        ].join('\n')
      : [
          'You are a Mandarin Chinese interpreter.',
          'Translate Mandarin (普通话) into natural English for face-to-face conversation.',
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
    const payload = parsePayload(raw, toCmn ? text : '', fallbackDefinition, toCmn)
    primary = payload.text
    definition = toCmn ? payload.definition || fallbackDefinition : payload.definition
  }

  // Never call hardenYueOutput / scrubMandarinToYue for Mandarin.
  if (toCmn) {
    const outText = hasHan(primary) ? primary : ''
    return withLearnerDefinitions(
      {
        text: outText,
        definition,
        alternatives: wantAlts ? alternatives.filter((a) => hasHan(a)) : [],
        engine,
        from,
        to,
        stage,
        meta: emptyMeta(
          outText ? ['cmn-no-yue-scrub'] : ['cmn-no-yue-scrub', 'no-cmn-output'],
        ),
      },
      text,
    )
  }

  if (looksLikeGlossDump(primary) || (from === 'cmn' && hasHan(primary))) {
    return withLearnerDefinitions(
      {
        text: '',
        definition: '',
        alternatives: [],
        engine,
        from,
        to,
        stage,
        meta: emptyMeta(['cmn-echo-blocked']),
      },
      text,
    )
  }

  return withLearnerDefinitions(
    {
      text: primary,
      definition,
      alternatives: wantAlts ? alternatives.filter((a) => a && !hasHan(a) && a !== primary) : [],
      engine,
      from,
      to,
      stage,
      meta: emptyMeta(['cmn-no-yue-scrub']),
    },
    text,
  )
}

export async function translate(input: unknown) {
  const parsed = Body.parse(input)
  const from = parsed.from
  const to = parsed.to
  const text = parsed.text.trim()
  // No interim translations anywhere — always run the full final pipeline.
  const stage: TranslateStage = 'final'
  const wantAlts = Boolean(parsed.includeAlternatives && from !== to)
  const fallbackDefinition = from === 'en' ? text : ''

  if (from === to) {
    return withLearnerDefinitions(
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

  // Mandarin path — skip Yue scrub/harden entirely.
  if (from === 'cmn' || to === 'cmn') {
    return translateMandarin({ from, to, text, stage, wantAlts, fallbackDefinition })
  }

  // 1) Phrase memory — O(1) curated EN↔粵 (always on: accurate + lowest latency).
  const dictHit = dictionaryTranslate({
    sourceLang: from,
    targetLang: to,
    source: text,
    wantAlternatives: wantAlts,
  })
  if (dictHit) {
    return withLearnerDefinitions(
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
        return withLearnerDefinitions(
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
      return withLearnerDefinitions(
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
      return withLearnerDefinitions(
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
    return withLearnerDefinitions(
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

  if (wantAlts && toYue) {
    const system = [
      'You are a Hong Kong Cantonese interpreter.',
      'Translate English into colloquial spoken Cantonese (口語粵語), not Mandarin and not formal written Chinese.',
      'Prefer Hong Kong characters such as 係, 唔, 喺, 咗, 緊, 㗎, 喇, 喎.',
      'Translate conversational speech faithfully, including slang and informal wording.',
      'The user message is SOURCE TEXT to translate — including single words, labels, and UI verbs (e.g. “Translate” → 翻譯).',
      'Never invent clarification, refusal, or “please speak more clearly” replies. Always translate the words given.',
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
  } else if (wantAlts && !toYue) {
    const system = [
      'You are a Hong Kong Cantonese interpreter helping Cantonese speakers learn English.',
      'Translate Cantonese into natural conversational English.',
      'Return ONLY valid JSON with this shape:',
      '{"primary":"<best English>","alternatives":["<other natural English phrasing>", "..."],"definition":"<short Cantonese (粵語) gloss of what the English means>"}',
      'Rules for alternatives:',
      '- Prefer 2–3 natural English variants that differ in tone, formality, or wording.',
      '- Do not repeat the primary or near-duplicates.',
      '- If there is truly no useful variation, return "alternatives": [].',
      '- definition should help a Cantonese learner: brief 粵語, not a dictionary dump.',
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
    const parsedEn = parseYuePayload(raw, '', false)
    primary = parsedEn.text
    alternatives = parsedEn.alternatives.filter((a) => a && !hasHan(a))
    if (parsedEn.definition) definition = parsedEn.definition
  } else {
    const system = toYue
      ? [
          'You are a Hong Kong Cantonese interpreter.',
          'Translate into colloquial spoken Cantonese (口語粵語), not Mandarin and not formal written Chinese.',
          'Prefer Hong Kong characters such as 係, 唔, 喺, 咗, 緊, 㗎, 喇, 喎.',
          'Translate conversational speech faithfully, including slang and informal wording.',
          'The user message is SOURCE TEXT to translate — including single words, labels, and UI verbs (e.g. “Translate” → 翻譯).',
          'Never invent clarification, refusal, or “please speak more clearly” replies. Always translate the words given.',
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
    return withLearnerDefinitions(
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
    // One retry for short phrases (menus / labels) where the model often echoes Han.
    if (client && text.trim().length <= 40) {
      try {
        const retry = await client.chat.completions.create({
          model: env.openaiModel,
          temperature: 0.1,
          max_tokens: 200,
          messages: [
            {
              role: 'system',
              content: [
                'Translate Cantonese / written Chinese into natural English.',
                'Output English only — never repeat Chinese characters.',
                'For food names use common English or Jyutping-aware menu terms (e.g. 蝦餃 → shrimp dumplings / har gow).',
                'Return ONLY JSON: {"translation":"<English>","definition":""}',
              ].join('\n'),
            },
            { role: 'user', content: text },
          ],
          response_format: { type: 'json_object' },
          ...llmChatExtras(),
        })
        const rawRetry = retry.choices[0]?.message?.content?.trim() || ''
        const parsedRetry = parsePayload(rawRetry, '', '', false)
        if (parsedRetry.text && !hasHan(parsedRetry.text) && !looksLikeGlossDump(parsedRetry.text)) {
          return withLearnerDefinitions(
            {
              text: parsedRetry.text,
              definition: parsedRetry.definition || '',
              alternatives: [],
              engine,
              from,
              to,
              stage,
              meta: emptyMeta(['yue-echo-retried']),
            },
            text,
          )
        }
      } catch {
        // fall through to empty block
      }
    }
    return withLearnerDefinitions(
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

  return withLearnerDefinitions(
    {
      text: primary,
      definition,
      alternatives: wantAlts ? alternatives.filter((a) => a && !hasHan(a) && a !== primary) : [],
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
