/**
 * EN↔Italian — Standard Italian (Italia / it-IT), Latin orthography with accents.
 * Compact clients show Italian only; Details add tu/Lei honesty via italianPedagogy.ts.
 */
import { env, llmChatExtras } from './env.js'
import { openaiClient } from './openaiClient.js'
import { dictionaryTranslate } from './canto/dictionary.js'
import { looksLikeGlossDump } from '@jyut/shared/glossDump'
import { hasHan } from './canto/han.js'
import { inferItalianRegister } from './italianRegister.js'
import {
  emptyMeta,
  parsePayload,
  parseYuePayload,
  type TranslateResult,
  type TranslateStage,
} from './translateShared.js'

type TranslateLang = 'en' | 'it'

export async function translateItalian(opts: {
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
        definition: to === 'it' ? fallbackDefinition : '',
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
          notes: [`dict:${dictHit.entry.id}`, 'it-colloquial'],
        },
      }
  }

  const client = openaiClient()
  if (!client) {
    const demoPrimary = to === 'it' ? `(demo IT) ${text}` : `(demo) ${text}`
    return {
        text: demoPrimary,
        definition: to === 'it' ? fallbackDefinition : '',
        alternatives: [],
        engine: 'demo',
        from,
        to,
        stage,
        meta: emptyMeta(['demo', 'it-colloquial']),
      }
  }

  const engine = env.openaiBaseUrl ? 'openai-compatible' : 'openai'
  const toIt = to === 'it'
  const register = toIt ? inferItalianRegister(text) : 'colloquial'
  const registerNote = register === 'formal' ? 'it-formal' : 'it-colloquial'
  let primary = text
  let alternatives: string[] = []
  let definition = fallbackDefinition

  if (wantAlts && toIt) {
    const system =
      register === 'formal'
        ? [
            'You are a standard Italian (Italia) interpreter for formal written and spoken situations.',
            'Translate English into POLITE formal Italian (Lei address, complete sentences, careful wording).',
            'Use Italy / it-IT vocabulary and spelling — standard Italian, not regional dialect as the default.',
            'ALWAYS use correct Italian orthography with accents where needed (è, é, à, ì, ò, ù, …).',
            'Do NOT use Chinese characters. Do NOT invent tone digits, Chao tone letters, or IPA on the primary line.',
            'Return ONLY valid JSON:',
            '{"primary":"<best formal Italian>","alternatives":["<other polite variant>", "..."],"definition":"<short English gloss>"}',
            'Prefer 2–3 natural formal variants. No markdown.',
          ].join('\n')
        : [
            'You are a standard Italian (Italia) interpreter for face-to-face conversation.',
            'Translate English into COLLOQUIAL spoken Italian (everyday Italy — not stiff textbook, not regional dialect by default).',
            'Prefer tu / everyday wording when natural; avoid dialect-only slang unless the source clearly needs it.',
            'ALWAYS use correct Italian orthography with accents where needed (è, é, à, ì, ò, ù, …).',
            'Do NOT use Chinese characters. Do NOT invent tone digits, Chao tone letters, or IPA on the primary line.',
            'Return ONLY valid JSON:',
            '{"primary":"<best colloquial Italian>","alternatives":["<other natural variant>", "..."],"definition":"<short English gloss>"}',
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
    const parsedIt = parseYuePayload(raw, text, false)
    primary = parsedIt.text
    alternatives = parsedIt.alternatives
    if (parsedIt.definition) definition = parsedIt.definition
  } else if (wantAlts && !toIt) {
    const system = [
      'You are a standard Italian interpreter helping Italian speakers learn English.',
      'Translate colloquial Italian into natural conversational English.',
      'Return ONLY valid JSON:',
      '{"primary":"<best English>","alternatives":["<other natural English phrasing>", "..."],"definition":"<short Italian gloss of what the English means>"}',
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
    const system = toIt
      ? register === 'formal'
        ? [
            'You are a standard Italian (Italia) interpreter for formal situations.',
            'Translate into POLITE formal Italian (Lei; careful wording; Italy / it-IT — not regional dialect).',
            'ALWAYS use correct Italian orthography with accents where needed.',
            'Do NOT use Chinese characters or tone numbers.',
            'Return ONLY valid JSON:',
            '{"translation":"<formal Italian>","definition":"<short English gloss>"}',
          ].join('\n')
        : [
            'You are a standard Italian (Italia) interpreter for face-to-face conversation.',
            'Translate into COLLOQUIAL spoken Italian (everyday Italy — not regional dialect by default).',
            'ALWAYS use correct Italian orthography with accents where needed.',
            'Do NOT use Chinese characters or tone numbers.',
            'Return ONLY valid JSON:',
            '{"translation":"<colloquial Italian>","definition":"<short English gloss>"}',
          ].join('\n')
      : [
          'You are a standard Italian interpreter.',
          'Translate colloquial Italian into natural English for conversation.',
          'Return ONLY valid JSON:',
          '{"translation":"<English>","definition":"<optional short sense note, or empty string>"}',
        ].join('\n')
    const completion = await client.chat.completions.create({
      model: env.openaiModel,
      temperature: toIt && register === 'formal' ? 0.2 : 0.25,
      max_tokens: 400,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: text },
      ],
      ...llmChatExtras(),
    })
    const raw = completion.choices[0]?.message?.content?.trim() || ''
    const payload = parsePayload(raw, toIt ? text : '', fallbackDefinition, false)
    primary = payload.text
    definition = toIt ? payload.definition || fallbackDefinition : payload.definition
  }

  if (toIt) {
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
        meta: emptyMeta(outText ? [registerNote] : [registerNote, 'no-it-output']),
      }
  }

  const cleanedEn = (primary || '').trim()
  const sourceNorm = cleanedEn
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[¿?¡!.,;:'"“”‘’]+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  const inputNorm = text
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[¿?¡!.,;:'"“”‘’]+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  const echoedSource = Boolean(sourceNorm) && sourceNorm === inputNorm
  if (!cleanedEn || looksLikeGlossDump(cleanedEn) || hasHan(cleanedEn) || echoedSource) {
    const rescue = dictionaryTranslate({
      sourceLang: 'it',
      targetLang: 'en',
      source: text,
      wantAlternatives: wantAlts,
    })
    if (rescue?.text) {
      return {
          text: rescue.text,
          definition: '',
          alternatives: wantAlts ? rescue.alternatives : [],
          engine: 'dictionary',
          from,
          to,
          stage,
          meta: {
            dictionaryHit: true,
            scrubbed: false,
            colloquialScore: 8,
            rewritten: false,
            notes: [`dict:${rescue.entry.id}`, registerNote, 'it-en-rescue'],
          },
        }
    }
    return {
        text: '',
        definition: '',
        alternatives: [],
        engine,
        from,
        to,
        stage,
        meta: emptyMeta(['it-echo-blocked']),
      }
  }

  return {
      text: cleanedEn,
      definition,
      alternatives: wantAlts
        ? alternatives.filter((a) => a && !hasHan(a) && a !== cleanedEn)
        : [],
      engine,
      from,
      to,
      stage,
      meta: emptyMeta([registerNote]),
    }
}
