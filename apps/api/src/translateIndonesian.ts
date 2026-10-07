/**
 * EN↔Indonesian — colloquial Bahasa Indonesia (Jakarta/media), Latin orthography only.
 */
import { env, llmChatExtras } from './env.js'
import { openaiClient } from './openaiClient.js'
import { dictionaryTranslate } from './canto/dictionary.js'
import { looksLikeGlossDump } from '@jyut/shared/glossDump'
import { hasHan } from './canto/han.js'
import { inferIndonesianRegister } from './indonesianRegister.js'
import {
  emptyMeta,
  parsePayload,
  parseYuePayload,
  type TranslateResult,
  type TranslateStage,
} from './translateShared.js'

type TranslateLang = 'en' | 'id'

export async function translateIndonesian(opts: {
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
      definition: to === 'id' ? fallbackDefinition : '',
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
        notes: [`dict:${dictHit.entry.id}`, 'id-colloquial'],
      },
    }
  }

  const client = openaiClient()
  if (!client) {
    const demoPrimary = to === 'id' ? `(demo ID) ${text}` : `(demo) ${text}`
    return {
      text: demoPrimary,
      definition: to === 'id' ? fallbackDefinition : '',
      alternatives: [],
      engine: 'demo',
      from,
      to,
      stage,
      meta: emptyMeta(['demo', 'id-colloquial']),
    }
  }

  const engine = env.openaiBaseUrl ? 'openai-compatible' : 'openai'
  const toId = to === 'id'
  const register = toId ? inferIndonesianRegister(text) : 'colloquial'
  const registerNote = register === 'formal' ? 'id-formal' : 'id-colloquial'
  let primary = text
  let alternatives: string[] = []
  let definition = fallbackDefinition

  if (wantAlts && toId) {
    const system =
      register === 'formal'
        ? [
            'You are an Indonesian interpreter for formal written and spoken situations.',
            'Translate English into POLITE formal Bahasa Indonesia (complete sentences; Anda/saya when natural).',
            'Avoid slang, Jakarta youth slang (gue/lo), and heavy particles (dong/deh/sih).',
            'Use correct Indonesian Latin orthography. Never Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
            'Do NOT use Malay (Malaysia) wording when Indonesian differs (e.g. prefer mobil not kereta for car; tolong not sila).',
            'Return ONLY valid JSON:',
            '{"primary":"<best formal Indonesian>","alternatives":["<other polite variant>", "..."],"definition":"<short English gloss>"}',
            'Prefer 2–3 natural formal variants. No markdown.',
          ].join('\n')
        : [
            'You are an Indonesian interpreter for face-to-face conversation.',
            'Translate English into COLLOQUIAL spoken Bahasa Indonesia — standard Indonesian with Jakarta/media everyday style.',
            'Not regional Malay, not stiff bureaucratic Indonesian, not Javanese.',
            'Prefer everyday wording: halo, makasih, nggak, aja, dong, deh when natural; light gue/lo OK among peers.',
            'Use correct Indonesian Latin orthography. Never Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
            'Return ONLY valid JSON:',
            '{"primary":"<best colloquial Indonesian>","alternatives":["<other natural variant>", "..."],"definition":"<short English gloss>"}',
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
    const parsedId = parseYuePayload(raw, text, false)
    primary = parsedId.text
    alternatives = parsedId.alternatives
    if (parsedId.definition) definition = parsedId.definition
  } else if (wantAlts && !toId) {
    const system = [
      'You are an Indonesian interpreter helping Indonesian speakers learn English.',
      'Translate colloquial Bahasa Indonesia (including Jakarta slang) into natural conversational English.',
      'Return ONLY valid JSON:',
      '{"primary":"<best English>","alternatives":["<other natural English phrasing>", "..."],"definition":"<short Indonesian gloss of what the English means>"}',
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
    const system = toId
      ? register === 'formal'
        ? [
            'You are an Indonesian interpreter for formal situations.',
            'Translate into POLITE formal Bahasa Indonesia (complete sentences; Anda/saya when natural).',
            'Avoid slang and heavy Jakarta particles.',
            'Correct Indonesian Latin orthography only. Never Chinese characters, Chao, IPA, or ASCII tone digits.',
            'Return ONLY valid JSON:',
            '{"translation":"<formal Indonesian>","definition":"<short English gloss>"}',
          ].join('\n')
        : [
            'You are an Indonesian interpreter for face-to-face conversation.',
            'Translate into COLLOQUIAL spoken Bahasa Indonesia (Jakarta/media everyday style).',
            'Not Malay, not bureaucratic Indonesian.',
            'Correct Indonesian Latin orthography only. Never Chinese characters, Chao, IPA, or ASCII tone digits.',
            'Return ONLY valid JSON:',
            '{"translation":"<colloquial Indonesian>","definition":"<short English gloss>"}',
          ].join('\n')
      : [
          'You are an Indonesian interpreter.',
          'Translate colloquial Bahasa Indonesia into natural English for conversation.',
          'Return ONLY valid JSON:',
          '{"translation":"<English>","definition":"<optional short sense note, or empty string>"}',
        ].join('\n')
    const completion = await client.chat.completions.create({
      model: env.openaiModel,
      temperature: toId && register === 'formal' ? 0.2 : 0.25,
      max_tokens: 400,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: text },
      ],
      ...llmChatExtras(),
    })
    const raw = completion.choices[0]?.message?.content?.trim() || ''
    const payload = parsePayload(raw, toId ? text : '', fallbackDefinition, false)
    primary = payload.text
    definition = toId ? payload.definition || fallbackDefinition : payload.definition
  }

  if (toId) {
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
      meta: emptyMeta(outText ? [registerNote] : [registerNote, 'no-id-output']),
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
      meta: emptyMeta(['id-echo-blocked']),
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
