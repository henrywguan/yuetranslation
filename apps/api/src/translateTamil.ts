/**
 * EN↔Tamil — colloquial spoken Tamil (தமிழ்), Tamil script only.
 * Compact clients show Tamil only; Details add ISO 15919 via tamilIso15919 (client-side).
 */
import { env, llmChatExtras } from './env.js'
import { openaiClient } from './openaiClient.js'
import { dictionaryTranslate } from './canto/dictionary.js'
import { looksLikeGlossDump } from '@jyut/shared/glossDump'
import { hasHan } from './canto/han.js'
import { inferTamilRegister, TAMIL_SCRIPT_RE } from './tamilRegister.js'
import {
  emptyMeta,
  parsePayload,
  parseYuePayload,
  type TranslateResult,
  type TranslateStage,
} from './translateShared.js'

type TranslateLang = 'en' | 'ta'

export async function translateTamil(opts: {
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
      definition: to === 'ta' ? fallbackDefinition : '',
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
        notes: [`dict:${dictHit.entry.id}`, 'ta-colloquial'],
      },
    }
  }

  const client = openaiClient()
  if (!client) {
    const demoPrimary = to === 'ta' ? `(demo TA) ${text}` : `(demo) ${text}`
    return {
      text: demoPrimary,
      definition: to === 'ta' ? fallbackDefinition : '',
      alternatives: [],
      engine: 'demo',
      from,
      to,
      stage,
      meta: emptyMeta(['demo', 'ta-colloquial']),
    }
  }

  const engine = env.openaiBaseUrl ? 'openai-compatible' : 'openai'
  const toTa = to === 'ta'
  const register = toTa ? inferTamilRegister(text) : 'colloquial'
  const registerNote = register === 'formal' ? 'ta-formal' : 'ta-colloquial'
  let primary = text
  let alternatives: string[] = []
  let definition = fallbackDefinition

  if (wantAlts && toTa) {
    const system =
      register === 'formal'
        ? [
            'You are a Tamil interpreter for formal written and spoken situations.',
            'Translate English into POLITE formal Tamil (respectful நீங்கள் forms, careful standard wording — செந்தமிழ்-leaning only when the source is official).',
            'Write ONLY in Tamil script (தமிழ் எழுத்து). Never Latin/Tanglish as the main line, never ISO 15919 or other romanization in the output, never Chinese characters, never invented ASCII tone digits.',
            'Return ONLY valid JSON:',
            '{"primary":"<best formal Tamil>","alternatives":["<other polite variant>", "..."],"definition":"<short English gloss>"}',
            'Prefer 2–3 natural formal variants. No markdown.',
          ].join('\n')
        : [
            'You are a Tamil interpreter for face-to-face conversation (Tamil Nadu / India).',
            'Translate English into COLLOQUIAL spoken Tamil (everyday பேச்சுத் தமிழ் — natural, friendly, not stiff literary செந்தமிழ் unless the source is formal).',
            'Use நீங்க / நீ naturally; keep common English loanwords in Tamil script when that is how people actually speak.',
            'Write ONLY in Tamil script. Never Latin/Tanglish as the main line, never ISO 15919 or other romanization in the output, never Chinese characters, never invented ASCII tone digits.',
            'Return ONLY valid JSON:',
            '{"primary":"<best colloquial Tamil>","alternatives":["<other natural variant>", "..."],"definition":"<short English gloss>"}',
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
    const parsedTa = parseYuePayload(raw, text, false)
    primary = parsedTa.text
    alternatives = parsedTa.alternatives
    if (parsedTa.definition) definition = parsedTa.definition
  } else if (wantAlts && !toTa) {
    const system = [
      'You are a Tamil interpreter helping Tamil speakers learn English.',
      'Translate colloquial Tamil into natural conversational English.',
      'Return ONLY valid JSON:',
      '{"primary":"<best English>","alternatives":["<other natural English phrasing>", "..."],"definition":"<short Tamil gloss of what the English means>"}',
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
    const system = toTa
      ? register === 'formal'
        ? [
            'You are a Tamil interpreter for formal situations.',
            'Translate into POLITE formal Tamil (respectful நீங்கள் forms).',
            'Write ONLY in Tamil script. Never Latin romanization, never Chinese characters, never invented ASCII tone digits.',
            'Return ONLY valid JSON:',
            '{"translation":"<formal Tamil>","definition":"<short English gloss>"}',
          ].join('\n')
        : [
            'You are a Tamil interpreter for face-to-face conversation (Tamil Nadu / India).',
            'Translate into COLLOQUIAL spoken Tamil (everyday conversational பேச்சுத் தமிழ்).',
            'Write ONLY in Tamil script. Never Latin/Tanglish as the main line, never romanization, never Chinese characters, never invented ASCII tone digits.',
            'Return ONLY valid JSON:',
            '{"translation":"<colloquial Tamil>","definition":"<short English gloss>"}',
          ].join('\n')
      : [
          'You are a Tamil interpreter.',
          'Translate colloquial Tamil into natural English for conversation.',
          'Return ONLY valid JSON:',
          '{"translation":"<English>","definition":"<optional short sense note, or empty string>"}',
        ].join('\n')
    const completion = await client.chat.completions.create({
      model: env.openaiModel,
      temperature: toTa && register === 'formal' ? 0.2 : 0.25,
      max_tokens: 400,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: text },
      ],
      ...llmChatExtras(),
    })
    const raw = completion.choices[0]?.message?.content?.trim() || ''
    const payload = parsePayload(raw, toTa ? text : '', fallbackDefinition, false)
    primary = payload.text
    definition = toTa ? payload.definition || fallbackDefinition : payload.definition
  }

  if (toTa) {
    const outText = primary && !hasHan(primary) && TAMIL_SCRIPT_RE.test(primary) ? primary.trim() : ''
    return {
      text: outText,
      definition,
      alternatives: wantAlts
        ? alternatives.filter((a) => a && !hasHan(a) && TAMIL_SCRIPT_RE.test(a) && a !== outText)
        : [],
      engine,
      from,
      to,
      stage,
      meta: emptyMeta(outText ? [registerNote] : [registerNote, 'no-ta-output']),
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
      sourceLang: 'ta',
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
          notes: [`dict:${rescue.entry.id}`, registerNote, 'ta-en-rescue'],
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
      meta: emptyMeta(['ta-echo-blocked']),
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
