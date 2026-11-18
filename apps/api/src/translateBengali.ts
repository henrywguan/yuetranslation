/**
 * EN↔Bengali — colloquial Standard Colloquial Bengali (চলিত বাংলা), Bangla script only.
 * India-oriented (bn-IN). Compact clients show Bangla only; Details add ISO 15919 via bengaliIso15919.
 */
import { env, llmChatExtras } from './env.js'
import { openaiClient } from './openaiClient.js'
import { dictionaryTranslate } from './canto/dictionary.js'
import { looksLikeGlossDump } from '@jyut/shared/glossDump'
import { hasHan } from './canto/han.js'
import { inferBengaliRegister, BENGALI_SCRIPT_RE } from './bengaliRegister.js'
import {
  emptyMeta,
  parsePayload,
  parseYuePayload,
  type TranslateResult,
  type TranslateStage,
} from './translateShared.js'

type TranslateLang = 'en' | 'bn'

export async function translateBengali(opts: {
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
      definition: to === 'bn' ? fallbackDefinition : '',
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
        notes: [`dict:${dictHit.entry.id}`, 'bn-colloquial'],
      },
    }
  }

  const client = openaiClient()
  if (!client) {
    const demoPrimary = to === 'bn' ? `(demo BN) ${text}` : `(demo) ${text}`
    return {
      text: demoPrimary,
      definition: to === 'bn' ? fallbackDefinition : '',
      alternatives: [],
      engine: 'demo',
      from,
      to,
      stage,
      meta: emptyMeta(['demo', 'bn-colloquial']),
    }
  }

  const engine = env.openaiBaseUrl ? 'openai-compatible' : 'openai'
  const toBn = to === 'bn'
  const register = toBn ? inferBengaliRegister(text) : 'colloquial'
  const registerNote = register === 'formal' ? 'bn-formal' : 'bn-colloquial'
  let primary = text
  let alternatives: string[] = []
  let definition = fallbackDefinition

  if (wantAlts && toBn) {
    const system =
      register === 'formal'
        ? [
            'You are a Bengali interpreter for formal written and spoken situations.',
            'Translate English into POLITE formal Modern Standard Bengali (চলিত ভাষা with respectful আপনি forms; India / West Bengal orientation).',
            'Do NOT switch to archaic সাধু ভাষা unless the source is clearly archaic or legal boilerplate.',
            'Write ONLY in Bangla script (বাংলা লিপি). Never Devanagari, never Latin/Banglish as the main line, never ISO 15919 or other romanization in the output, never Chinese characters, never invented ASCII tone digits.',
            'Return ONLY valid JSON:',
            '{"primary":"<best formal Bengali>","alternatives":["<other polite variant>", "..."],"definition":"<short English gloss>"}',
            'Prefer 2–3 natural formal variants. No markdown.',
          ].join('\n')
        : [
            'You are a Bengali interpreter for face-to-face conversation (India / West Bengal).',
            'Translate English into COLLOQUIAL spoken Bengali (everyday চলিত বাংলা — natural, friendly, not stiff সাধু ভাষা).',
            'Use তুমি / আপনি naturally (তুই only when the source is clearly intimate); keep common English loanwords in Bangla script when that is how people actually speak.',
            'Write ONLY in Bangla script. Never Devanagari, never Latin/Banglish as the main line, never ISO 15919 or other romanization in the output, never Chinese characters, never invented ASCII tone digits.',
            'Return ONLY valid JSON:',
            '{"primary":"<best colloquial Bengali>","alternatives":["<other natural variant>", "..."],"definition":"<short English gloss>"}',
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
    const parsedBn = parseYuePayload(raw, text, false)
    primary = parsedBn.text
    alternatives = parsedBn.alternatives
    if (parsedBn.definition) definition = parsedBn.definition
  } else if (wantAlts && !toBn) {
    const system = [
      'You are a Bengali interpreter helping Bengali speakers learn English.',
      'Translate colloquial Bengali into natural conversational English.',
      'Return ONLY valid JSON:',
      '{"primary":"<best English>","alternatives":["<other natural English phrasing>", "..."],"definition":"<short Bengali gloss of what the English means>"}',
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
    const system = toBn
      ? register === 'formal'
        ? [
            'You are a Bengali interpreter for formal situations.',
            'Translate into POLITE formal Modern Standard Bengali (চলিত ভাষা, respectful আপনি forms).',
            'Write ONLY in Bangla script. Never Devanagari, never Latin romanization, never Chinese characters, never invented ASCII tone digits.',
            'Return ONLY valid JSON:',
            '{"translation":"<formal Bengali>","definition":"<short English gloss>"}',
          ].join('\n')
        : [
            'You are a Bengali interpreter for face-to-face conversation (India / West Bengal).',
            'Translate into COLLOQUIAL spoken Bengali (everyday চলিত বাংলা).',
            'Write ONLY in Bangla script. Never Devanagari, never Latin/Banglish as the main line, never romanization, never Chinese characters, never invented ASCII tone digits.',
            'Return ONLY valid JSON:',
            '{"translation":"<colloquial Bengali>","definition":"<short English gloss>"}',
          ].join('\n')
      : [
          'You are a Bengali interpreter.',
          'Translate colloquial Bengali into natural English for conversation.',
          'Return ONLY valid JSON:',
          '{"translation":"<English>","definition":"<optional short sense note, or empty string>"}',
        ].join('\n')
    const completion = await client.chat.completions.create({
      model: env.openaiModel,
      temperature: toBn && register === 'formal' ? 0.2 : 0.25,
      max_tokens: 400,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: text },
      ],
      ...llmChatExtras(),
    })
    const raw = completion.choices[0]?.message?.content?.trim() || ''
    const payload = parsePayload(raw, toBn ? text : '', fallbackDefinition, false)
    primary = payload.text
    definition = toBn ? payload.definition || fallbackDefinition : payload.definition
  }

  if (toBn) {
    const outText = primary && !hasHan(primary) && BENGALI_SCRIPT_RE.test(primary) ? primary.trim() : ''
    return {
      text: outText,
      definition,
      alternatives: wantAlts
        ? alternatives.filter((a) => a && !hasHan(a) && BENGALI_SCRIPT_RE.test(a) && a !== outText)
        : [],
      engine,
      from,
      to,
      stage,
      meta: emptyMeta(outText ? [registerNote] : [registerNote, 'no-bn-output']),
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
      sourceLang: 'bn',
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
          notes: [`dict:${rescue.entry.id}`, registerNote, 'bn-en-rescue'],
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
      meta: emptyMeta(['bn-echo-blocked']),
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
