/**
 * EN↔Turkish — colloquial everyday Turkish (Türkiye / tr-TR), Latin orthography only.
 * Compact clients show Turkish only; Details add vowel-harmony + sen/siz honesty via turkishPedagogy.ts.
 */
import { env, llmChatExtras } from './env.js'
import { openaiClient } from './openaiClient.js'
import { dictionaryTranslate } from './canto/dictionary.js'
import { looksLikeGlossDump } from '@jyut/shared/glossDump'
import { hasHan } from './canto/han.js'
import { inferTurkishRegister } from './turkishRegister.js'
import {
  emptyMeta,
  parsePayload,
  parseYuePayload,
  type TranslateResult,
  type TranslateStage,
} from './translateShared.js'

type TranslateLang = 'en' | 'tr'

export async function translateTurkish(opts: {
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
      definition: to === 'tr' ? fallbackDefinition : '',
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
        notes: [`dict:${dictHit.entry.id}`, 'tr-colloquial'],
      },
    }
  }

  const client = openaiClient()
  if (!client) {
    const demoPrimary = to === 'tr' ? `(demo TR) ${text}` : `(demo) ${text}`
    return {
      text: demoPrimary,
      definition: to === 'tr' ? fallbackDefinition : '',
      alternatives: [],
      engine: 'demo',
      from,
      to,
      stage,
      meta: emptyMeta(['demo', 'tr-colloquial']),
    }
  }

  const engine = env.openaiBaseUrl ? 'openai-compatible' : 'openai'
  const toTr = to === 'tr'
  const register = toTr ? inferTurkishRegister(text) : 'colloquial'
  const registerNote = register === 'formal' ? 'tr-formal' : 'tr-colloquial'
  let primary = text
  let alternatives: string[] = []
  let definition = fallbackDefinition

  if (wantAlts && toTr) {
    const system =
      register === 'formal'
        ? [
            'You are a Turkish interpreter for formal written and spoken situations.',
            'Translate English into POLITE formal Turkish (siz address, complete sentences, careful standard Istanbul Turkish).',
            'ALWAYS use correct Turkish orthography: ı vs i, İ vs I, ğ, ş, ç, ö, ü — never strip diacritics or ASCII-fold (e.g. never "Istanbul" for "İstanbul", never "cok" for "çok").',
            'Respect vowel harmony in every suffix.',
            'Do NOT use Chinese characters. Do NOT invent tone digits, Chao tone letters, or IPA on the primary line.',
            'Return ONLY valid JSON:',
            '{"primary":"<best formal Turkish>","alternatives":["<other polite variant>", "..."],"definition":"<short English gloss>"}',
            'Prefer 2–3 natural formal variants. No markdown.',
          ].join('\n')
        : [
            'You are a Turkish interpreter for face-to-face conversation (Türkiye).',
            'Translate English into COLLOQUIAL spoken Turkish (everyday Istanbul Turkish — natural, friendly, not stiff Ottoman-flavoured or textbook wording).',
            'Prefer sen / everyday wording between peers; use siz when the source is polite, to a stranger, or service-oriented.',
            'ALWAYS use correct Turkish orthography: ı vs i, İ vs I, ğ, ş, ç, ö, ü — never strip diacritics or ASCII-fold.',
            'Respect vowel harmony in every suffix.',
            'Do NOT use Chinese characters. Do NOT invent tone digits, Chao tone letters, or IPA on the primary line.',
            'Return ONLY valid JSON:',
            '{"primary":"<best colloquial Turkish>","alternatives":["<other natural variant>", "..."],"definition":"<short English gloss>"}',
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
    const parsedTr = parseYuePayload(raw, text, false)
    primary = parsedTr.text
    alternatives = parsedTr.alternatives
    if (parsedTr.definition) definition = parsedTr.definition
  } else if (wantAlts && !toTr) {
    const system = [
      'You are a Turkish interpreter helping Turkish speakers learn English.',
      'Translate colloquial Turkish into natural conversational English.',
      'Return ONLY valid JSON:',
      '{"primary":"<best English>","alternatives":["<other natural English phrasing>", "..."],"definition":"<short Turkish gloss of what the English means>"}',
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
    const system = toTr
      ? register === 'formal'
        ? [
            'You are a Turkish interpreter for formal situations.',
            'Translate into POLITE formal Turkish (siz; careful standard wording).',
            'ALWAYS use correct Turkish orthography (ı İ ğ ş ç ö ü) and vowel harmony.',
            'Do NOT use Chinese characters or tone numbers.',
            'Return ONLY valid JSON:',
            '{"translation":"<formal Turkish>","definition":"<short English gloss>"}',
          ].join('\n')
        : [
            'You are a Turkish interpreter for face-to-face conversation (Türkiye).',
            'Translate into COLLOQUIAL spoken Turkish (everyday Istanbul Turkish).',
            'ALWAYS use correct Turkish orthography (ı İ ğ ş ç ö ü) and vowel harmony.',
            'Do NOT use Chinese characters or tone numbers.',
            'Return ONLY valid JSON:',
            '{"translation":"<colloquial Turkish>","definition":"<short English gloss>"}',
          ].join('\n')
      : [
          'You are a Turkish interpreter.',
          'Translate colloquial Turkish into natural English for conversation.',
          'Return ONLY valid JSON:',
          '{"translation":"<English>","definition":"<optional short sense note, or empty string>"}',
        ].join('\n')
    const completion = await client.chat.completions.create({
      model: env.openaiModel,
      temperature: toTr && register === 'formal' ? 0.2 : 0.25,
      max_tokens: 400,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: text },
      ],
      ...llmChatExtras(),
    })
    const raw = completion.choices[0]?.message?.content?.trim() || ''
    const payload = parsePayload(raw, toTr ? text : '', fallbackDefinition, false)
    primary = payload.text
    definition = toTr ? payload.definition || fallbackDefinition : payload.definition
  }

  if (toTr) {
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
      meta: emptyMeta(outText ? [registerNote] : [registerNote, 'no-tr-output']),
    }
  }

  const cleanedEn = (primary || '').trim()
  const sourceNorm = cleanedEn
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[¿?¡!.,;:'"“”‘’।]+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  const inputNorm = text
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[¿?¡!.,;:'"“”‘’।]+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  const echoedSource = Boolean(sourceNorm) && sourceNorm === inputNorm
  if (!cleanedEn || looksLikeGlossDump(cleanedEn) || hasHan(cleanedEn) || echoedSource) {
    const rescue = dictionaryTranslate({
      sourceLang: 'tr',
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
          notes: [`dict:${rescue.entry.id}`, registerNote, 'tr-en-rescue'],
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
      meta: emptyMeta(['tr-echo-blocked']),
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
