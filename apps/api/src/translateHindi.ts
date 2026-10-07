/**
 * EN↔Hindi — Modern Standard Hindi (हिन्दी), Devanagari only.
 * Compact clients show Hindi only; Details add IAST + formality via hindiRomanization / hindiFormality.
 */
import { env, llmChatExtras } from './env.js'
import { openaiClient } from './openaiClient.js'
import { dictionaryTranslate } from './canto/dictionary.js'
import { looksLikeGlossDump } from '@jyut/shared/glossDump'
import { hasHan } from './canto/han.js'
import { inferHindiRegister } from './hindiRegister.js'
import {
  emptyMeta,
  parsePayload,
  parseYuePayload,
  type TranslateResult,
  type TranslateStage,
} from './translateShared.js'

type TranslateLang = 'en' | 'hi'

export async function translateHindi(opts: {
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
    return {
        text: dictHit.text,
        definition: to === 'hi' ? fallbackDefinition : '',
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
          notes: [`dict:${dictHit.entry.id}`, 'hi-colloquial'],
        },
      }
  }

  const client = openaiClient()
  if (!client) {
    const demoPrimary = to === 'hi' ? `(demo HI) ${text}` : `(demo) ${text}`
    return {
        text: demoPrimary,
        definition: to === 'hi' ? fallbackDefinition : '',
        alternatives: [],
        engine: 'demo',
        from,
        to,
        stage,
        meta: emptyMeta(['demo', 'hi-colloquial']),
      }
  }

  const engine = env.openaiBaseUrl ? 'openai-compatible' : 'openai'
  const toHi = to === 'hi'
  const register = toHi ? inferHindiRegister(text) : 'colloquial'
  const registerNote = register === 'formal' ? 'hi-formal' : 'hi-colloquial'
  let primary = text
  let alternatives: string[] = []
  let definition = fallbackDefinition

  if (wantAlts && toHi) {
    const system =
      register === 'formal'
        ? [
            'You are a Hindi interpreter for formal written and spoken situations.',
            'Translate English into POLITE formal Modern Standard Hindi (भारत की मानक हिन्दी).',
            'Use respectful आप-forms and complete sentences; avoid slang and Hinglish Latin.',
            'Write ONLY in Devanagari (हिन्दी लिपि). Never Chinese characters, never IAST/ISO romanization in the output, never invented ASCII tone digits, never Urdu Nastaliq.',
            'Return ONLY valid JSON:',
            '{"primary":"<best formal Hindi>","alternatives":["<other polite variant>", "..."],"definition":"<short English gloss>"}',
            'Prefer 2–3 natural formal variants. No markdown.',
          ].join('\n')
        : [
            'You are a Hindi interpreter for face-to-face conversation in India.',
            'Translate English into COLLOQUIAL spoken Modern Standard Hindi (everyday हिन्दी).',
            'Prefer natural India colloquial register; do NOT default to stiff Sanskritized formal Hindi unless the source is formal.',
            'Do NOT produce Urdu-primary wording or Hinglish Latin as the main line.',
            'Write ONLY in Devanagari. Never Chinese characters, never IAST/ISO romanization in the output, never invented ASCII tone digits.',
            'Return ONLY valid JSON:',
            '{"primary":"<best colloquial Hindi>","alternatives":["<other natural variant>", "..."],"definition":"<short English gloss>"}',
            'Prefer 2–3 natural spoken variants. No markdown.',
          ].join('\n')
    const completion = await client.chat.completions.create({
      model: env.openaiModel,
      temperature: register === 'formal' ? 0.3 : 0.4,
      max_tokens: 400,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: text },
      ],
      response_format: { type: 'json_object' },
      ...llmChatExtras(),
    })
    const raw = completion.choices[0]?.message?.content?.trim() || ''
    const parsedHi = parseYuePayload(raw, text, false)
    primary = parsedHi.text
    alternatives = parsedHi.alternatives
    if (parsedHi.definition) definition = parsedHi.definition
  } else if (wantAlts && !toHi) {
    const system = [
      'You are a Hindi interpreter helping Hindi speakers learn English.',
      'Translate colloquial Modern Standard Hindi into natural conversational English.',
      'Return ONLY valid JSON:',
      '{"primary":"<best English>","alternatives":["<other natural English phrasing>", "..."],"definition":"<short Hindi gloss of what the English means>"}',
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
    alternatives = parsedEn.alternatives.filter((a) => a && !hasHan(a))
    if (parsedEn.definition) definition = parsedEn.definition
  } else {
    const system = toHi
      ? register === 'formal'
        ? [
            'You are a Hindi interpreter for formal situations.',
            'Translate into POLITE formal Modern Standard Hindi (respectful आप-forms).',
            'Write ONLY in Devanagari. Never Chinese characters, never IAST romanization, never invented ASCII tone digits, never Urdu Nastaliq.',
            'Return ONLY valid JSON:',
            '{"translation":"<formal Hindi>","definition":"<short English gloss>"}',
          ].join('\n')
        : [
            'You are a Hindi interpreter for face-to-face conversation in India.',
            'Translate into COLLOQUIAL spoken Modern Standard Hindi (everyday conversational).',
            'Write ONLY in Devanagari. Never Chinese characters, never IAST romanization, never Hinglish Latin as the main line, never invented ASCII tone digits.',
            'Return ONLY valid JSON:',
            '{"translation":"<colloquial Hindi>","definition":"<short English gloss>"}',
          ].join('\n')
      : [
          'You are a Hindi interpreter.',
          'Translate colloquial Modern Standard Hindi into natural English for conversation.',
          'Return ONLY valid JSON:',
          '{"translation":"<English>","definition":"<optional short sense note, or empty string>"}',
        ].join('\n')
    const completion = await client.chat.completions.create({
      model: env.openaiModel,
      temperature: toHi && register === 'formal' ? 0.2 : 0.25,
      max_tokens: 400,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: text },
      ],
      ...llmChatExtras(),
    })
    const raw = completion.choices[0]?.message?.content?.trim() || ''
    const payload = parsePayload(raw, toHi ? text : '', fallbackDefinition, false)
    primary = payload.text
    definition = toHi ? payload.definition || fallbackDefinition : payload.definition
  }

  if (toHi) {
    const hasDevanagari = /[\u0900-\u097F]/.test(primary)
    const outText = primary && !hasHan(primary) && hasDevanagari ? primary.trim() : ''
    return {
        text: outText,
        definition,
        alternatives: wantAlts
          ? alternatives.filter((a) => a && !hasHan(a) && /[\u0900-\u097F]/.test(a) && a !== outText)
          : [],
        engine,
        from,
        to,
        stage,
        meta: emptyMeta(outText ? [registerNote] : [registerNote, 'no-hi-output']),
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
        meta: emptyMeta(['hi-echo-blocked']),
      }
  }

  return {
      text: primary,
      definition,
      alternatives: wantAlts ? alternatives.filter((a) => a && !hasHan(a) && a !== primary) : [],
      engine,
      from,
      to,
      stage,
      meta: emptyMeta([registerNote]),
    }
}
