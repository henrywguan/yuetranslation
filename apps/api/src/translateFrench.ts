/**
 * EN↔French — Metropolitan French (France / fr-FR), Latin orthography with accents.
 * Compact clients show French only; Details add tu/vous honesty via frenchPedagogy.ts.
 */
import { env, llmChatExtras } from './env.js'
import { openaiClient } from './openaiClient.js'
import { dictionaryTranslate } from './canto/dictionary.js'
import { looksLikeGlossDump } from '@jyut/shared/glossDump'
import { hasHan } from './canto/han.js'
import { inferFrenchRegister } from './frenchRegister.js'
import {
  emptyMeta,
  parsePayload,
  parseYuePayload,
  type TranslateResult,
  type TranslateStage,
} from './translateShared.js'

type TranslateLang = 'en' | 'fr'

export async function translateFrench(opts: {
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
        definition: to === 'fr' ? fallbackDefinition : '',
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
          notes: [`dict:${dictHit.entry.id}`, 'fr-colloquial'],
        },
      }
  }

  const client = openaiClient()
  if (!client) {
    const demoPrimary = to === 'fr' ? `(demo FR) ${text}` : `(demo) ${text}`
    return {
        text: demoPrimary,
        definition: to === 'fr' ? fallbackDefinition : '',
        alternatives: [],
        engine: 'demo',
        from,
        to,
        stage,
        meta: emptyMeta(['demo', 'fr-colloquial']),
      }
  }

  const engine = env.openaiBaseUrl ? 'openai-compatible' : 'openai'
  const toFr = to === 'fr'
  const register = toFr ? inferFrenchRegister(text) : 'colloquial'
  const registerNote = register === 'formal' ? 'fr-formal' : 'fr-colloquial'
  let primary = text
  let alternatives: string[] = []
  let definition = fallbackDefinition

  if (wantAlts && toFr) {
    const system =
      register === 'formal'
        ? [
            'You are a Metropolitan French (France) interpreter for formal written and spoken situations.',
            'Translate English into POLITE formal French (vous address, complete sentences, careful wording).',
            'Use France / fr-FR vocabulary and spelling — not Quebec-primary Canadian French.',
            'ALWAYS use correct French orthography with accents (é, è, ê, ç, à, ù, …).',
            'Do NOT use Chinese characters. Do NOT invent tone digits, Chao tone letters, or IPA on the primary line.',
            'Return ONLY valid JSON:',
            '{"primary":"<best formal French>","alternatives":["<other polite variant>", "..."],"definition":"<short English gloss>"}',
            'Prefer 2–3 natural formal variants. No markdown.',
          ].join('\n')
        : [
            'You are a Metropolitan French (France) interpreter for face-to-face conversation.',
            'Translate English into COLLOQUIAL spoken French (everyday France — not stiff textbook, not Quebec-primary).',
            'Prefer tu / everyday wording when natural; avoid Quebec-only slang unless the source clearly needs it.',
            'ALWAYS use correct French orthography with accents (é, è, ê, ç, à, ù, …).',
            'Do NOT use Chinese characters. Do NOT invent tone digits, Chao tone letters, or IPA on the primary line.',
            'Return ONLY valid JSON:',
            '{"primary":"<best colloquial French>","alternatives":["<other natural variant>", "..."],"definition":"<short English gloss>"}',
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
    const parsedFr = parseYuePayload(raw, text, false)
    primary = parsedFr.text
    alternatives = parsedFr.alternatives
    if (parsedFr.definition) definition = parsedFr.definition
  } else if (wantAlts && !toFr) {
    const system = [
      'You are a Metropolitan French interpreter helping French speakers learn English.',
      'Translate colloquial French into natural conversational English.',
      'Return ONLY valid JSON:',
      '{"primary":"<best English>","alternatives":["<other natural English phrasing>", "..."],"definition":"<short French gloss of what the English means>"}',
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
    const system = toFr
      ? register === 'formal'
        ? [
            'You are a Metropolitan French (France) interpreter for formal situations.',
            'Translate into POLITE formal French (vous; careful wording; France / fr-FR — not Quebec-primary).',
            'ALWAYS use correct French orthography with accents.',
            'Do NOT use Chinese characters or tone numbers.',
            'Return ONLY valid JSON:',
            '{"translation":"<formal French>","definition":"<short English gloss>"}',
          ].join('\n')
        : [
            'You are a Metropolitan French (France) interpreter for face-to-face conversation.',
            'Translate into COLLOQUIAL spoken French (everyday France — not Quebec-primary).',
            'ALWAYS use correct French orthography with accents.',
            'Do NOT use Chinese characters or tone numbers.',
            'Return ONLY valid JSON:',
            '{"translation":"<colloquial French>","definition":"<short English gloss>"}',
          ].join('\n')
      : [
          'You are a Metropolitan French interpreter.',
          'Translate colloquial French into natural English for conversation.',
          'Return ONLY valid JSON:',
          '{"translation":"<English>","definition":"<optional short sense note, or empty string>"}',
        ].join('\n')
    const completion = await client.chat.completions.create({
      model: env.openaiModel,
      temperature: toFr && register === 'formal' ? 0.2 : 0.25,
      max_tokens: 400,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: text },
      ],
      ...llmChatExtras(),
    })
    const raw = completion.choices[0]?.message?.content?.trim() || ''
    const payload = parsePayload(raw, toFr ? text : '', fallbackDefinition, false)
    primary = payload.text
    definition = toFr ? payload.definition || fallbackDefinition : payload.definition
  }

  if (toFr) {
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
        meta: emptyMeta(outText ? [registerNote] : [registerNote, 'no-fr-output']),
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
      sourceLang: 'fr',
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
            notes: [`dict:${rescue.entry.id}`, registerNote, 'fr-en-rescue'],
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
        meta: emptyMeta(['fr-echo-blocked']),
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
