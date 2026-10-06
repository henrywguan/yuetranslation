/**
 * EN↔Malay — colloquial Bahasa Melayu (Malaysia / ms-MY), Latin orthography only.
 * Not Indonesian (`id`), not Brunei/Singapore-only slang unless natural.
 */
import { env, llmChatExtras } from './env.js'
import { openaiClient } from './openaiClient.js'
import { dictionaryTranslate } from './canto/dictionary.js'
import { looksLikeGlossDump } from '@jyut/shared/glossDump'
import { hasHan } from './canto/han.js'
import { inferMalayRegister } from './malayRegister.js'
import {
  emptyMeta,
  parsePayload,
  parseYuePayload,
  type TranslateResult,
  type TranslateStage,
} from './translateShared.js'

type TranslateLang = 'en' | 'ms'

export async function translateMalay(opts: {
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
      definition: to === 'ms' ? fallbackDefinition : '',
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
        notes: [`dict:${dictHit.entry.id}`, 'ms-colloquial'],
      },
    }
  }

  const client = openaiClient()
  if (!client) {
    const demoPrimary = to === 'ms' ? `(demo MS) ${text}` : `(demo) ${text}`
    return {
      text: demoPrimary,
      definition: to === 'ms' ? fallbackDefinition : '',
      alternatives: [],
      engine: 'demo',
      from,
      to,
      stage,
      meta: emptyMeta(['demo', 'ms-colloquial']),
    }
  }

  const engine = env.openaiBaseUrl ? 'openai-compatible' : 'openai'
  const toMs = to === 'ms'
  const register = toMs ? inferMalayRegister(text) : 'colloquial'
  const registerNote = register === 'formal' ? 'ms-formal' : 'ms-colloquial'
  let primary = text
  let alternatives: string[] = []
  let definition = fallbackDefinition

  if (wantAlts && toMs) {
    const system =
      register === 'formal'
        ? [
            'You are a Malay interpreter for formal written and spoken situations in Malaysia.',
            'Translate English into POLITE formal Bahasa Melayu (complete sentences; anda/saya when natural).',
            'Avoid slang, heavy lah/je particles, and Indonesian-only wording.',
            'Use correct Malay (Malaysia) Latin orthography. Never Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
            'Do NOT use Indonesian (Bahasa Indonesia) when Malay differs (e.g. prefer kereta not mobil for car; basikal not sepeda; tandas not toilet for bathroom signs when natural).',
            'Return ONLY valid JSON:',
            '{"primary":"<best formal Malay>","alternatives":["<other polite variant>", "..."],"definition":"<short English gloss>"}',
            'Prefer 2–3 natural formal variants. No markdown.',
          ].join('\n')
        : [
            'You are a Malay interpreter for face-to-face conversation in Malaysia.',
            'Translate English into COLLOQUIAL spoken Bahasa Melayu — standard Malay with Malaysia (ms-MY) everyday style.',
            'Not Indonesian, not stiff bureaucratic Malay, not Brunei/Singapore-only slang unless it is also natural in Malaysia.',
            'Prefer everyday wording: hai, apa khabar, terima kasih, tak, je, lah when natural; awak/kau among peers.',
            'Use correct Malay (Malaysia) Latin orthography. Never Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
            'Return ONLY valid JSON:',
            '{"primary":"<best colloquial Malay>","alternatives":["<other natural variant>", "..."],"definition":"<short English gloss>"}',
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
    const parsedMs = parseYuePayload(raw, text, false)
    primary = parsedMs.text
    alternatives = parsedMs.alternatives
    if (parsedMs.definition) definition = parsedMs.definition
  } else if (wantAlts && !toMs) {
    const system = [
      'You are a Malay interpreter helping Malay speakers (Malaysia) learn English.',
      'Translate colloquial Bahasa Melayu (including Malaysia everyday speech) into natural conversational English.',
      'Return ONLY valid JSON:',
      '{"primary":"<best English>","alternatives":["<other natural English phrasing>", "..."],"definition":"<short Malay gloss of what the English means>"}',
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
    const system = toMs
      ? register === 'formal'
        ? [
            'You are a Malay interpreter for formal situations in Malaysia.',
            'Translate into POLITE formal Bahasa Melayu (complete sentences; anda/saya when natural).',
            'Avoid slang and heavy colloquial particles.',
            'Correct Malay (Malaysia) Latin orthography only. Never Chinese characters, Chao, IPA, or ASCII tone digits.',
            'Not Indonesian.',
            'Return ONLY valid JSON:',
            '{"translation":"<formal Malay>","definition":"<short English gloss>"}',
          ].join('\n')
        : [
            'You are a Malay interpreter for face-to-face conversation in Malaysia.',
            'Translate into COLLOQUIAL spoken Bahasa Melayu (Malaysia / ms-MY everyday style).',
            'Not Indonesian, not bureaucratic Malay.',
            'Correct Malay (Malaysia) Latin orthography only. Never Chinese characters, Chao, IPA, or ASCII tone digits.',
            'Return ONLY valid JSON:',
            '{"translation":"<colloquial Malay>","definition":"<short English gloss>"}',
          ].join('\n')
      : [
          'You are a Malay interpreter (Malaysia).',
          'Translate colloquial Bahasa Melayu into natural English for conversation.',
          'Return ONLY valid JSON:',
          '{"translation":"<English>","definition":"<optional short sense note, or empty string>"}',
        ].join('\n')
    const completion = await client.chat.completions.create({
      model: env.openaiModel,
      temperature: toMs && register === 'formal' ? 0.2 : 0.25,
      max_tokens: 400,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: text },
      ],
      ...llmChatExtras(),
    })
    const raw = completion.choices[0]?.message?.content?.trim() || ''
    const payload = parsePayload(raw, toMs ? text : '', fallbackDefinition, false)
    primary = payload.text
    definition = toMs ? payload.definition || fallbackDefinition : payload.definition
  }

  if (toMs) {
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
      meta: emptyMeta(outText ? [registerNote] : [registerNote, 'no-ms-output']),
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
      meta: emptyMeta(['ms-echo-blocked']),
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
