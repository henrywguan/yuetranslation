/**
 * EN↔Dutch — colloquial standard Dutch (Netherlands / nl-NL), Latin orthography only.
 * Compact clients show Dutch only; Details add je/u honesty via dutchPedagogy.ts.
 */
import { env, llmChatExtras } from './env.js'
import { openaiClient } from './openaiClient.js'
import { dictionaryTranslate } from './canto/dictionary.js'
import { looksLikeGlossDump } from '@jyut/shared/glossDump'
import { hasHan } from './canto/han.js'
import { inferDutchRegister } from './dutchRegister.js'
import {
  emptyMeta,
  parsePayload,
  parseYuePayload,
  type TranslateResult,
  type TranslateStage,
} from './translateShared.js'

type TranslateLang = 'en' | 'nl'

export async function translateDutch(opts: {
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
      definition: to === 'nl' ? fallbackDefinition : '',
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
        notes: [`dict:${dictHit.entry.id}`, 'nl-colloquial'],
      },
    }
  }

  const client = openaiClient()
  if (!client) {
    const demoPrimary = to === 'nl' ? `(demo NL) ${text}` : `(demo) ${text}`
    return {
      text: demoPrimary,
      definition: to === 'nl' ? fallbackDefinition : '',
      alternatives: [],
      engine: 'demo',
      from,
      to,
      stage,
      meta: emptyMeta(['demo', 'nl-colloquial']),
    }
  }

  const engine = env.openaiBaseUrl ? 'openai-compatible' : 'openai'
  const toNl = to === 'nl'
  const register = toNl ? inferDutchRegister(text) : 'colloquial'
  const registerNote = register === 'formal' ? 'nl-formal' : 'nl-colloquial'
  let primary = text
  let alternatives: string[] = []
  let definition = fallbackDefinition

  if (wantAlts && toNl) {
    const system =
      register === 'formal'
        ? [
            'You are a Dutch (Netherlands) interpreter for formal written and spoken situations.',
            'Translate English into POLITE formal Dutch (u address, complete sentences, careful wording).',
            'Use standard Netherlands Dutch (nl-NL) — not Belgian Dutch / Flemish as the primary default.',
            'ALWAYS use correct Dutch orthography (ij, oe, ui, aa/ee/oo, diaeresis where required).',
            'Do NOT use Chinese characters. Do NOT invent tone digits, Chao tone letters, or IPA on the primary line.',
            'Return ONLY valid JSON:',
            '{"primary":"<best formal Dutch>","alternatives":["<other polite variant>", "..."],"definition":"<short English gloss>"}',
            'Prefer 2–3 natural formal variants. No markdown.',
          ].join('\n')
        : [
            'You are a Dutch (Netherlands) interpreter for face-to-face conversation.',
            'Translate English into COLLOQUIAL spoken Dutch (everyday Netherlands — not stiff textbook, not Flemish-primary).',
            'Prefer je / jij / everyday wording when natural; use u only when the source clearly needs formal address.',
            'ALWAYS use correct Dutch orthography (ij, oe, ui, aa/ee/oo, diaeresis where required).',
            'Do NOT use Chinese characters. Do NOT invent tone digits, Chao tone letters, or IPA on the primary line.',
            'Return ONLY valid JSON:',
            '{"primary":"<best colloquial Dutch>","alternatives":["<other natural variant>", "..."],"definition":"<short English gloss>"}',
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
    const parsedNl = parseYuePayload(raw, text, false)
    primary = parsedNl.text
    alternatives = parsedNl.alternatives
    if (parsedNl.definition) definition = parsedNl.definition
  } else if (wantAlts && !toNl) {
    const system = [
      'You are a Dutch interpreter helping Dutch speakers learn English.',
      'Translate colloquial Netherlands Dutch into natural conversational English.',
      'Return ONLY valid JSON:',
      '{"primary":"<best English>","alternatives":["<other natural English phrasing>", "..."],"definition":"<short Dutch gloss of what the English means>"}',
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
    const system = toNl
      ? register === 'formal'
        ? [
            'You are a Dutch (Netherlands) interpreter for formal situations.',
            'Translate into POLITE formal Dutch (u; careful wording; Netherlands / nl-NL — not Flemish-primary).',
            'ALWAYS use correct Dutch orthography.',
            'Do NOT use Chinese characters or tone numbers.',
            'Return ONLY valid JSON:',
            '{"translation":"<formal Dutch>","definition":"<short English gloss>"}',
          ].join('\n')
        : [
            'You are a Dutch (Netherlands) interpreter for face-to-face conversation.',
            'Translate into COLLOQUIAL spoken Dutch (everyday Netherlands — not Flemish-primary).',
            'ALWAYS use correct Dutch orthography.',
            'Do NOT use Chinese characters or tone numbers.',
            'Return ONLY valid JSON:',
            '{"translation":"<colloquial Dutch>","definition":"<short English gloss>"}',
          ].join('\n')
      : [
          'You are a Dutch interpreter.',
          'Translate colloquial Netherlands Dutch into natural English for conversation.',
          'Return ONLY valid JSON:',
          '{"translation":"<English>","definition":"<optional short sense note, or empty string>"}',
        ].join('\n')
    const completion = await client.chat.completions.create({
      model: env.openaiModel,
      temperature: toNl && register === 'formal' ? 0.2 : 0.25,
      max_tokens: 400,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: text },
      ],
      ...llmChatExtras(),
    })
    const raw = completion.choices[0]?.message?.content?.trim() || ''
    const payload = parsePayload(raw, toNl ? text : '', fallbackDefinition, false)
    primary = payload.text
    definition = toNl ? payload.definition || fallbackDefinition : payload.definition
  }

  if (toNl) {
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
      meta: emptyMeta(outText ? [registerNote] : [registerNote, 'no-nl-output']),
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
      sourceLang: 'nl',
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
          notes: [`dict:${rescue.entry.id}`, registerNote, 'nl-en-rescue'],
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
      meta: emptyMeta(['nl-echo-blocked']),
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
