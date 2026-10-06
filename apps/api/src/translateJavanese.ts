/**
 * EN↔Javanese — colloquial Basa Jawa (Central/East Java media), Latin orthography only.
 * Undha-usuk: ngoko by default; respectful (madya/krama-leaning) when English is formal.
 */
import { env, llmChatExtras } from './env.js'
import { openaiClient } from './openaiClient.js'
import { dictionaryTranslate } from './canto/dictionary.js'
import { looksLikeGlossDump } from '@jyut/shared/glossDump'
import { hasHan } from './canto/han.js'
import { inferJavaneseRegister } from './javaneseRegister.js'
import {
  emptyMeta,
  parsePayload,
  parseYuePayload,
  type TranslateResult,
  type TranslateStage,
} from './translateShared.js'

type TranslateLang = 'en' | 'jv'

export async function translateJavanese(opts: {
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
      definition: to === 'jv' ? fallbackDefinition : '',
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
        notes: [`dict:${dictHit.entry.id}`, 'jv-ngoko'],
      },
    }
  }

  const client = openaiClient()
  if (!client) {
    const demoPrimary = to === 'jv' ? `(demo JV) ${text}` : `(demo) ${text}`
    return {
      text: demoPrimary,
      definition: to === 'jv' ? fallbackDefinition : '',
      alternatives: [],
      engine: 'demo',
      from,
      to,
      stage,
      meta: emptyMeta(['demo', 'jv-ngoko']),
    }
  }

  const engine = env.openaiBaseUrl ? 'openai-compatible' : 'openai'
  const toJv = to === 'jv'
  const register = toJv ? inferJavaneseRegister(text) : 'ngoko'
  const registerNote = register === 'respectful' ? 'jv-respectful' : 'jv-ngoko'
  let primary = text
  let alternatives: string[] = []
  let definition = fallbackDefinition

  if (wantAlts && toJv) {
    const system =
      register === 'respectful'
        ? [
            'You are a Javanese interpreter for formal written and spoken situations.',
            'Translate English into RESPECTFUL Javanese (Basa Jawa) using madya or krama undha-usuk as appropriate.',
            'Prefer clear Central/East Java media Latin orthography (not Hanacaraka / Aksara Jawa).',
            'Do NOT default to Indonesian (Bahasa Indonesia) wording — use real Javanese (e.g. matur nuwun not terima kasih; mboten not tidak; piye/menapa not bagaimana).',
            'Never Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
            'Return ONLY valid JSON:',
            '{"primary":"<best respectful Javanese>","alternatives":["<other polite variant>", "..."],"definition":"<short English gloss>"}',
            'Prefer 2–3 natural respectful variants. No markdown.',
          ].join('\n')
        : [
            'You are a Javanese interpreter for face-to-face conversation.',
            'Translate English into COLLOQUIAL ngoko Javanese (Basa Jawa) as spoken in Central/East Java media.',
            'Not Indonesian, not stiff bureaucratic Javanese, not Hanacaraka script.',
            'Prefer everyday ngoko: piye, ora, aku/kowe, wis, arep, suwun when natural.',
            'Use correct Latin Javanese orthography. Never Chinese characters, Chao tone letters, IPA, or invented ASCII tone digits.',
            'Return ONLY valid JSON:',
            '{"primary":"<best ngoko Javanese>","alternatives":["<other natural variant>", "..."],"definition":"<short English gloss>"}',
            'Prefer 2–3 natural spoken variants. No markdown.',
          ].join('\n')
    const completion = await client.chat.completions.create({
      model: env.openaiModel,
      temperature: register === 'respectful' ? 0.3 : 0.4,
      max_tokens: 400,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: text },
      ],
      response_format: { type: 'json_object' },
      ...llmChatExtras(),
    })
    const raw = completion.choices[0]?.message?.content?.trim() || ''
    const parsedJv = parseYuePayload(raw, text, false)
    primary = parsedJv.text
    alternatives = parsedJv.alternatives
    if (parsedJv.definition) definition = parsedJv.definition
  } else if (wantAlts && !toJv) {
    const system = [
      'You are a Javanese interpreter helping Javanese speakers learn English.',
      'Translate colloquial or respectful Latin Javanese (ngoko / madya / krama) into natural conversational English.',
      'Return ONLY valid JSON:',
      '{"primary":"<best English>","alternatives":["<other natural English phrasing>", "..."],"definition":"<short Javanese gloss of what the English means>"}',
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
    const system = toJv
      ? register === 'respectful'
        ? [
            'You are a Javanese interpreter for formal situations.',
            'Translate into RESPECTFUL Javanese (madya/krama undha-usuk as appropriate).',
            'Latin Javanese orthography only — not Indonesian, not Hanacaraka.',
            'Never Chinese characters, Chao, IPA, or ASCII tone digits.',
            'Return ONLY valid JSON:',
            '{"translation":"<respectful Javanese>","definition":"<short English gloss>"}',
          ].join('\n')
        : [
            'You are a Javanese interpreter for face-to-face conversation.',
            'Translate into COLLOQUIAL ngoko Javanese (Central/East Java media).',
            'Not Indonesian, not bureaucratic Javanese.',
            'Latin Javanese orthography only. Never Chinese characters, Chao, IPA, or ASCII tone digits.',
            'Return ONLY valid JSON:',
            '{"translation":"<ngoko Javanese>","definition":"<short English gloss>"}',
          ].join('\n')
      : [
          'You are a Javanese interpreter.',
          'Translate Latin Javanese into natural English for conversation.',
          'Return ONLY valid JSON:',
          '{"translation":"<English>","definition":"<optional short sense note, or empty string>"}',
        ].join('\n')
    const completion = await client.chat.completions.create({
      model: env.openaiModel,
      temperature: toJv && register === 'respectful' ? 0.2 : 0.25,
      max_tokens: 400,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: text },
      ],
      ...llmChatExtras(),
    })
    const raw = completion.choices[0]?.message?.content?.trim() || ''
    const payload = parsePayload(raw, toJv ? text : '', fallbackDefinition, false)
    primary = payload.text
    definition = toJv ? payload.definition || fallbackDefinition : payload.definition
  }

  if (toJv) {
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
      meta: emptyMeta(outText ? [registerNote] : [registerNote, 'no-jv-output']),
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
      meta: emptyMeta(['jv-echo-blocked']),
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
