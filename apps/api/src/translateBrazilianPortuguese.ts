/**
 * EN ↔ Brazilian Portuguese (`pt`) — colloquial everyday Brazil (pt-BR).
 * Not European Portuguese (pt-PT). Latin orthography; correct accents required.
 */
import { env, llmChatExtras } from './env.js'
import { openaiClient } from './openaiClient.js'
import { dictionaryTranslate } from './canto/dictionary.js'
import { looksLikeGlossDump } from '@jyut/shared/glossDump'
import { hasHan } from './canto/han.js'
import { inferBrazilianPortugueseRegister } from './brazilianPortugueseRegister.js'
import {
  emptyMeta,
  parsePayload,
  parseYuePayload,
  type TranslateResult,
  type TranslateStage,
} from './translateShared.js'

type TranslateLang = 'en' | 'pt'

export async function translateBrazilianPortuguese(opts: {
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
      definition: to === 'pt' ? fallbackDefinition : '',
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
        notes: [`dict:${dictHit.entry.id}`, 'pt-br-colloquial'],
      },
    }
  }

  const client = openaiClient()
  if (!client) {
    const demoPrimary = to === 'pt' ? `(demo PT-BR) ${text}` : `(demo) ${text}`
    return {
      text: demoPrimary,
      definition: to === 'pt' ? fallbackDefinition : '',
      alternatives: [],
      engine: 'demo',
      from,
      to,
      stage,
      meta: emptyMeta(['demo', 'pt-br-colloquial']),
    }
  }

  const engine = env.openaiBaseUrl ? 'openai-compatible' : 'openai'
  const toPt = to === 'pt'
  const register = toPt ? inferBrazilianPortugueseRegister(text) : 'colloquial'
  const registerNote = register === 'formal' ? 'pt-br-formal' : 'pt-br-colloquial'
  let primary = text
  let alternatives: string[] = []
  let definition = fallbackDefinition

  if (wantAlts && toPt) {
    const system =
      register === 'formal'
        ? [
            'You are a Brazilian Portuguese interpreter for formal written and spoken situations.',
            'Translate English into POLITE formal Brazilian Portuguese (pt-BR — not European Portuguese).',
            'Avoid slang; keep Brazilian spelling and lexicon (você/vocês, ônibus, celular, legal) — never European defaults (autocarro, telemóvel, fixe).',
            'On the PRIMARY line, ALWAYS use correct Portuguese orthographic accents (á à â ã é ê í ó ô õ ú ç). Alternatives may be lighter but must keep required accents.',
            'Do NOT use Chinese characters. Do NOT invent tone digits or IPA on the primary line.',
            'Return ONLY valid JSON:',
            '{"primary":"<best formal Brazilian Portuguese>","alternatives":["<other polite variant>", "..."],"definition":"<short English gloss>"}',
            'Prefer 2–3 natural formal variants. No markdown.',
          ].join('\n')
        : [
            'You are a Brazilian Portuguese interpreter for face-to-face conversation.',
            'Translate English into COLLOQUIAL spoken Brazilian Portuguese (pt-BR — everyday Brazil, not European Portuguese).',
            'Use natural Brazilian wording when natural (pô, cara, beleza, tá, né, ônibus, celular, legal, a gente). Prefer você/vocês over tu/vós.',
            'Do NOT use European Portuguese lexicon (autocarro, telemóvel, fixe, miúdo as default) or stiff textbook Portuguese.',
            'On the PRIMARY line, ALWAYS use correct Portuguese orthographic accents (á à â ã é ê í ó ô õ ú ç) on every word that needs them. Alternatives may be lighter but must keep required accents.',
            'Do NOT use Chinese characters. Do NOT invent tone digits or IPA on the primary line.',
            'Return ONLY valid JSON:',
            '{"primary":"<best colloquial Brazilian Portuguese>","alternatives":["<other natural Brazilian variant>", "..."],"definition":"<short English gloss>"}',
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
    const parsedPt = parseYuePayload(raw, text, false)
    primary = parsedPt.text
    alternatives = parsedPt.alternatives
    if (parsedPt.definition) definition = parsedPt.definition
  } else if (wantAlts && !toPt) {
    const system = [
      'You are a Brazilian Portuguese interpreter helping Portuguese speakers learn English.',
      'Translate colloquial Brazilian Portuguese into natural conversational English.',
      'Return ONLY valid JSON:',
      '{"primary":"<best English>","alternatives":["<other natural English phrasing>", "..."],"definition":"<short Brazilian Portuguese gloss of what the English means>"}',
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
    const system = toPt
      ? register === 'formal'
        ? [
            'You are a Brazilian Portuguese interpreter for formal situations.',
            'Translate into POLITE formal Brazilian Portuguese (pt-BR — not European Portuguese).',
            'ALWAYS use correct Portuguese orthographic accents (á à â ã é ê í ó ô õ ú ç).',
            'Do NOT use Chinese characters or tone numbers.',
            'Return ONLY valid JSON:',
            '{"translation":"<formal Brazilian Portuguese>","definition":"<short English gloss>"}',
          ].join('\n')
        : [
            'You are a Brazilian Portuguese interpreter for face-to-face conversation.',
            'Translate into COLLOQUIAL spoken Brazilian Portuguese (pt-BR — everyday Brazil, not European Portuguese).',
            'ALWAYS use correct Portuguese orthographic accents (á à â ã é ê í ó ô õ ú ç).',
            'Do NOT use Chinese characters or tone numbers.',
            'Return ONLY valid JSON:',
            '{"translation":"<colloquial Brazilian Portuguese>","definition":"<short English gloss>"}',
          ].join('\n')
      : [
          'You are a Brazilian Portuguese interpreter.',
          'Translate colloquial Brazilian Portuguese into natural English for conversation.',
          'Return ONLY valid JSON:',
          '{"translation":"<English>","definition":"<optional short sense note, or empty string>"}',
        ].join('\n')
    const completion = await client.chat.completions.create({
      model: env.openaiModel,
      temperature: toPt && register === 'formal' ? 0.2 : 0.25,
      max_tokens: 400,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: text },
      ],
      ...llmChatExtras(),
    })
    const raw = completion.choices[0]?.message?.content?.trim() || ''
    const payload = parsePayload(raw, toPt ? text : '', fallbackDefinition, false)
    primary = payload.text
    definition = toPt ? payload.definition || fallbackDefinition : payload.definition
  }

  if (toPt) {
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
      meta: emptyMeta(outText ? [registerNote] : [registerNote, 'no-pt-output']),
    }
  }

  const cleanedEn = (primary || '').trim()
  const sourceNorm = cleanedEn
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[¡¿?!.,;:'"“”‘’]+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  const inputNorm = text
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[¡¿?!.,;:'"“”‘’]+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  const echoedSource = Boolean(sourceNorm) && sourceNorm === inputNorm
  if (!cleanedEn || looksLikeGlossDump(cleanedEn) || hasHan(cleanedEn) || echoedSource) {
    const rescue = dictionaryTranslate({
      sourceLang: 'pt',
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
          notes: [`dict:${rescue.entry.id}`, registerNote, 'pt-en-rescue'],
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
      meta: emptyMeta(['pt-echo-blocked']),
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
