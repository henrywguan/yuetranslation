/**
 * EN↔Burmese — colloquial Yangon / media Myanmar, native Myanmar script only.
 * Never Chinese characters or invented ASCII tone digits — client MLCTS via burmeseMlcts.ts.
 */
import { env, llmChatExtras } from './env.js'
import { openaiClient } from './openaiClient.js'
import { dictionaryTranslate } from './canto/dictionary.js'
import { looksLikeGlossDump } from '@jyut/shared/glossDump'
import { hasHan } from './canto/han.js'
import { inferBurmeseRegister } from './burmeseRegister.js'
import {
  emptyMeta,
  parsePayload,
  parseYuePayload,
  type TranslateResult,
  type TranslateStage,
} from './translateShared.js'

type TranslateLang = 'en' | 'my'

export async function translateBurmese(opts: {
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
        definition: to === 'my' ? fallbackDefinition : '',
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
          notes: [`dict:${dictHit.entry.id}`, 'my-colloquial'],
        },
      }
  }

  const client = openaiClient()
  if (!client) {
    const demoPrimary = to === 'my' ? `(demo MY) ${text}` : `(demo) ${text}`
    return {
        text: demoPrimary,
        definition: to === 'my' ? fallbackDefinition : '',
        alternatives: [],
        engine: 'demo',
        from,
        to,
        stage,
        meta: emptyMeta(['demo', 'my-colloquial']),
      }
  }

  const engine = env.openaiBaseUrl ? 'openai-compatible' : 'openai'
  const toMy = to === 'my'
  const register = toMy ? inferBurmeseRegister(text) : 'colloquial'
  const registerNote = register === 'formal' ? 'my-formal' : 'my-colloquial'
  let primary = text
  let alternatives: string[] = []
  let definition = fallbackDefinition

  if (wantAlts && toMy) {
    const system =
      register === 'formal'
        ? [
            'You are a Burmese (မြန်မာ) interpreter for formal written and spoken situations.',
            'Translate English into POLITE formal standard Burmese (complete sentences, respectful wording).',
            'Avoid slang; keep wording clear and respectful.',
            'Write ONLY in native Myanmar script (Unicode Myanmar block). Never Chinese characters, never MLCTS/romanization, never invented ASCII tone digits.',
            'Return ONLY valid JSON:',
            '{"primary":"<best formal Burmese>","alternatives":["<other polite variant>", "..."],"definition":"<short English gloss>"}',
            'Prefer 2–3 natural formal variants. No markdown.',
          ].join('\n')
        : [
            'You are a Burmese (မြန်မာ) interpreter for face-to-face conversation.',
            'Translate English into COLLOQUIAL spoken standard Burmese (everyday Yangon / media-natural particles are fine).',
            'Do NOT use stiff textbook / formal literary Burmese.',
            'Write ONLY in native Myanmar script (Unicode Myanmar block). Never Chinese characters, never MLCTS/romanization, never invented ASCII tone digits.',
            'Return ONLY valid JSON:',
            '{"primary":"<best colloquial Burmese>","alternatives":["<other natural variant>", "..."],"definition":"<short English gloss>"}',
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
    const parsedMy = parseYuePayload(raw, text, false)
    primary = parsedMy.text
    alternatives = parsedMy.alternatives
    if (parsedMy.definition) definition = parsedMy.definition
  } else if (wantAlts && !toMy) {
    const system = [
      'You are a Burmese interpreter helping Burmese speakers learn English.',
      'Translate colloquial Burmese into natural conversational English.',
      'Return ONLY valid JSON:',
      '{"primary":"<best English>","alternatives":["<other natural English phrasing>", "..."],"definition":"<short Burmese gloss of what the English means>"}',
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
    const system = toMy
      ? register === 'formal'
        ? [
            'You are a Burmese (မြန်မာ) interpreter for formal situations.',
            'Translate into POLITE formal standard Burmese (complete sentences, respectful wording).',
            'Write ONLY in native Myanmar script. Never Chinese characters, never MLCTS/romanization, never invented ASCII tone digits.',
            'Return ONLY valid JSON:',
            '{"translation":"<formal Burmese>","definition":"<short English gloss>"}',
          ].join('\n')
        : [
            'You are a Burmese (မြန်မာ) interpreter for face-to-face conversation.',
            'Translate into COLLOQUIAL spoken standard Burmese (everyday Yangon / media-natural, particles OK).',
            'Write ONLY in native Myanmar script. Never Chinese characters, never MLCTS/romanization, never invented ASCII tone digits.',
            'Return ONLY valid JSON:',
            '{"translation":"<colloquial Burmese>","definition":"<short English gloss>"}',
          ].join('\n')
      : [
          'You are a Burmese interpreter.',
          'Translate colloquial Burmese into natural English for conversation.',
          'Return ONLY valid JSON:',
          '{"translation":"<English>","definition":"<optional short sense note, or empty string>"}',
        ].join('\n')
    const completion = await client.chat.completions.create({
      model: env.openaiModel,
      temperature: toMy && register === 'formal' ? 0.2 : 0.25,
      max_tokens: 400,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: text },
      ],
      ...llmChatExtras(),
    })
    const raw = completion.choices[0]?.message?.content?.trim() || ''
    const payload = parsePayload(raw, toMy ? text : '', fallbackDefinition, false)
    primary = payload.text
    definition = toMy ? payload.definition || fallbackDefinition : payload.definition
  }

  if (toMy) {
    const hasMyanmarScript = /[\u1000-\u109F]/.test(primary)
    const outText = primary && !hasHan(primary) && hasMyanmarScript ? primary.trim() : ''
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
        meta: emptyMeta(outText ? [registerNote] : [registerNote, 'no-my-output']),
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
        meta: emptyMeta(['my-echo-blocked']),
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
