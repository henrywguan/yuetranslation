/**
 * EN↔Khmer — colloquial Cambodian Khmer (ភាសាខ្មែរ), native Khmer script only.
 * Never Chinese characters or invented tone digits — client readings via khmerReading.ts.
 */
import { env, llmChatExtras } from './env.js'
import { openaiClient } from './openaiClient.js'
import { dictionaryTranslate } from './canto/dictionary.js'
import { looksLikeGlossDump } from '@jyut/shared/glossDump'
import { hasHan } from './canto/han.js'
import { inferKhmerRegister } from './khmerRegister.js'
import {
  emptyMeta,
  parsePayload,
  parseYuePayload,
  type TranslateResult,
  type TranslateStage,
} from './translateShared.js'

type TranslateLang = 'en' | 'km'

export async function translateKhmer(opts: {
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
        definition: to === 'km' ? fallbackDefinition : '',
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
          notes: [`dict:${dictHit.entry.id}`, 'km-colloquial'],
        },
      }
  }

  const client = openaiClient()
  if (!client) {
    const demoPrimary = to === 'km' ? `(demo KM) ${text}` : `(demo) ${text}`
    return {
        text: demoPrimary,
        definition: to === 'km' ? fallbackDefinition : '',
        alternatives: [],
        engine: 'demo',
        from,
        to,
        stage,
        meta: emptyMeta(['demo', 'km-colloquial']),
      }
  }

  const engine = env.openaiBaseUrl ? 'openai-compatible' : 'openai'
  const toKm = to === 'km'
  const register = toKm ? inferKhmerRegister(text) : 'colloquial'
  const registerNote = register === 'formal' ? 'km-formal' : 'km-colloquial'
  let primary = text
  let alternatives: string[] = []
  let definition = fallbackDefinition

  if (wantAlts && toKm) {
    const system =
      register === 'formal'
        ? [
            'You are a Cambodian Khmer interpreter for formal written and spoken situations.',
            'Translate English into POLITE formal standard Khmer (ភាសាខ្មែរ) — complete sentences, respectful wording.',
            'Avoid slang; keep wording clear and respectful.',
            'Write ONLY in native Khmer script (Unicode Khmer block). Never Chinese characters, never Latin romanization, never invented ASCII tone digits.',
            'Return ONLY valid JSON:',
            '{"primary":"<best formal Khmer>","alternatives":["<other polite variant>", "..."],"definition":"<short English gloss>"}',
            'Prefer 2–3 natural formal variants. No markdown.',
          ].join('\n')
        : [
            'You are a Cambodian Khmer interpreter for face-to-face conversation.',
            'Translate English into COLLOQUIAL spoken Cambodian Khmer (ភាសាខ្មែរ) — everyday Cambodia-natural particles and pronouns.',
            'Do NOT use stiff textbook / formal written Khmer.',
            'Write ONLY in native Khmer script (Unicode Khmer block). Never Chinese characters, never Latin romanization, never invented ASCII tone digits.',
            'Return ONLY valid JSON:',
            '{"primary":"<best colloquial Khmer>","alternatives":["<other natural variant>", "..."],"definition":"<short English gloss>"}',
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
    const parsedKm = parseYuePayload(raw, text, false)
    primary = parsedKm.text
    alternatives = parsedKm.alternatives
    if (parsedKm.definition) definition = parsedKm.definition
  } else if (wantAlts && !toKm) {
    const system = [
      'You are a Cambodian Khmer interpreter helping Khmer speakers learn English.',
      'Translate colloquial Khmer into natural conversational English.',
      'Return ONLY valid JSON:',
      '{"primary":"<best English>","alternatives":["<other natural English phrasing>", "..."],"definition":"<short Khmer gloss of what the English means>"}',
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
    const system = toKm
      ? register === 'formal'
        ? [
            'You are a Cambodian Khmer interpreter for formal situations.',
            'Translate into POLITE formal standard Khmer (ភាសាខ្មែរ) — complete sentences, respectful wording.',
            'Write ONLY in native Khmer script. Never Chinese characters, never Latin romanization, never invented ASCII tone digits.',
            'Return ONLY valid JSON:',
            '{"translation":"<formal Khmer>","definition":"<short English gloss>"}',
          ].join('\n')
        : [
            'You are a Cambodian Khmer interpreter for face-to-face conversation.',
            'Translate into COLLOQUIAL spoken Cambodian Khmer (ភាសាខ្មែរ) — everyday Cambodia-natural, particles OK.',
            'Write ONLY in native Khmer script. Never Chinese characters, never Latin romanization, never invented ASCII tone digits.',
            'Return ONLY valid JSON:',
            '{"translation":"<colloquial Khmer>","definition":"<short English gloss>"}',
          ].join('\n')
      : [
          'You are a Cambodian Khmer interpreter.',
          'Translate colloquial Khmer into natural English for conversation.',
          'Return ONLY valid JSON:',
          '{"translation":"<English>","definition":"<optional short sense note, or empty string>"}',
        ].join('\n')
    const completion = await client.chat.completions.create({
      model: env.openaiModel,
      temperature: toKm && register === 'formal' ? 0.2 : 0.25,
      max_tokens: 400,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: text },
      ],
      ...llmChatExtras(),
    })
    const raw = completion.choices[0]?.message?.content?.trim() || ''
    const payload = parsePayload(raw, toKm ? text : '', fallbackDefinition, false)
    primary = payload.text
    definition = toKm ? payload.definition || fallbackDefinition : payload.definition
  }

  if (toKm) {
    const hasKhmerScript = /[\u1780-\u17FF]/.test(primary)
    const outText = primary && !hasHan(primary) && hasKhmerScript ? primary.trim() : ''
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
        meta: emptyMeta(outText ? [registerNote] : [registerNote, 'no-km-output']),
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
        meta: emptyMeta(['km-echo-blocked']),
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
