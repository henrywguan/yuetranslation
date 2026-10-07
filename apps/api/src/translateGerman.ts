/**
 * EN↔German — Standard German (Deutschland / de-DE), Latin orthography with umlauts/ß.
 * Compact clients show German only; Details add du/Sie honesty via germanPedagogy.ts.
 */
import { env, llmChatExtras } from './env.js'
import { openaiClient } from './openaiClient.js'
import { dictionaryTranslate } from './canto/dictionary.js'
import { looksLikeGlossDump } from '@jyut/shared/glossDump'
import { hasHan } from './canto/han.js'
import { inferGermanRegister } from './germanRegister.js'
import {
  emptyMeta,
  parsePayload,
  parseYuePayload,
  type TranslateResult,
  type TranslateStage,
} from './translateShared.js'

type TranslateLang = 'en' | 'de'

export async function translateGerman(opts: {
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
        definition: to === 'de' ? fallbackDefinition : '',
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
          notes: [`dict:${dictHit.entry.id}`, 'de-colloquial'],
        },
      }
  }

  const client = openaiClient()
  if (!client) {
    const demoPrimary = to === 'de' ? `(demo DE) ${text}` : `(demo) ${text}`
    return {
        text: demoPrimary,
        definition: to === 'de' ? fallbackDefinition : '',
        alternatives: [],
        engine: 'demo',
        from,
        to,
        stage,
        meta: emptyMeta(['demo', 'de-colloquial']),
      }
  }

  const engine = env.openaiBaseUrl ? 'openai-compatible' : 'openai'
  const toDe = to === 'de'
  const register = toDe ? inferGermanRegister(text) : 'colloquial'
  const registerNote = register === 'formal' ? 'de-formal' : 'de-colloquial'
  let primary = text
  let alternatives: string[] = []
  let definition = fallbackDefinition

  if (wantAlts && toDe) {
    const system =
      register === 'formal'
        ? [
            'You are a standard German (Deutschland) interpreter for formal written and spoken situations.',
            'Translate English into POLITE formal German (Sie address, complete sentences, careful wording).',
            'Use Deutschland / de-DE vocabulary and spelling — not Swiss- or Austrian-primary as the default line.',
            'ALWAYS use correct German orthography with umlauts and ß when required (ä, ö, ü, ß, …). Capitalize all nouns.',
            'Do NOT use Chinese characters. Do NOT invent tone digits, Chao tone letters, or IPA on the primary line.',
            'Return ONLY valid JSON:',
            '{"primary":"<best formal German>","alternatives":["<other polite variant>", "..."],"definition":"<short English gloss>"}',
            'Prefer 2–3 natural formal variants. No markdown.',
          ].join('\n')
        : [
            'You are a standard German (Deutschland) interpreter for face-to-face conversation.',
            'Translate English into COLLOQUIAL spoken German (everyday Deutschland — not stiff textbook, not Swiss/Austrian-primary).',
            'Prefer du / everyday wording when natural; avoid Swiss- or Austrian-only slang unless the source clearly needs it.',
            'ALWAYS use correct German orthography with umlauts and ß when required (ä, ö, ü, ß, …). Capitalize all nouns.',
            'Do NOT use Chinese characters. Do NOT invent tone digits, Chao tone letters, or IPA on the primary line.',
            'Return ONLY valid JSON:',
            '{"primary":"<best colloquial German>","alternatives":["<other natural variant>", "..."],"definition":"<short English gloss>"}',
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
    const parsedDe = parseYuePayload(raw, text, false)
    primary = parsedDe.text
    alternatives = parsedDe.alternatives
    if (parsedDe.definition) definition = parsedDe.definition
  } else if (wantAlts && !toDe) {
    const system = [
      'You are a standard German interpreter helping German speakers learn English.',
      'Translate colloquial German into natural conversational English.',
      'Return ONLY valid JSON:',
      '{"primary":"<best English>","alternatives":["<other natural English phrasing>", "..."],"definition":"<short German gloss of what the English means>"}',
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
    const system = toDe
      ? register === 'formal'
        ? [
            'You are a standard German (Deutschland) interpreter for formal situations.',
            'Translate into POLITE formal German (Sie; careful wording; Deutschland / de-DE — not Swiss- or Austrian-primary).',
            'ALWAYS use correct German orthography with umlauts and ß when required.',
            'Do NOT use Chinese characters or tone numbers.',
            'Return ONLY valid JSON:',
            '{"translation":"<formal German>","definition":"<short English gloss>"}',
          ].join('\n')
        : [
            'You are a standard German (Deutschland) interpreter for face-to-face conversation.',
            'Translate into COLLOQUIAL spoken German (everyday Deutschland — not Swiss- or Austrian-primary).',
            'ALWAYS use correct German orthography with umlauts and ß when required.',
            'Do NOT use Chinese characters or tone numbers.',
            'Return ONLY valid JSON:',
            '{"translation":"<colloquial German>","definition":"<short English gloss>"}',
          ].join('\n')
      : [
          'You are a standard German interpreter.',
          'Translate colloquial German into natural English for conversation.',
          'Return ONLY valid JSON:',
          '{"translation":"<English>","definition":"<optional short sense note, or empty string>"}',
        ].join('\n')
    const completion = await client.chat.completions.create({
      model: env.openaiModel,
      temperature: toDe && register === 'formal' ? 0.2 : 0.25,
      max_tokens: 400,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: text },
      ],
      ...llmChatExtras(),
    })
    const raw = completion.choices[0]?.message?.content?.trim() || ''
    const payload = parsePayload(raw, toDe ? text : '', fallbackDefinition, false)
    primary = payload.text
    definition = toDe ? payload.definition || fallbackDefinition : payload.definition
  }

  if (toDe) {
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
        meta: emptyMeta(outText ? [registerNote] : [registerNote, 'no-de-output']),
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
      sourceLang: 'de',
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
            notes: [`dict:${rescue.entry.id}`, registerNote, 'de-en-rescue'],
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
        meta: emptyMeta(['de-echo-blocked']),
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
