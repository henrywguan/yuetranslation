/**
 * EN ↔ European Portuguese (`ptpt`) — colloquial everyday Portugal (pt-PT).
 * Not Brazilian Portuguese (`pt`, pt-BR) — never cross-mapped. Latin orthography; correct accents required.
 */
import { env, llmChatExtras } from './env.js'
import { openaiClient } from './openaiClient.js'
import { dictionaryTranslate } from './canto/dictionary.js'
import { looksLikeGlossDump } from '@jyut/shared/glossDump'
import { hasHan } from './canto/han.js'
import { inferEuropeanPortugueseRegister } from './europeanPortugueseRegister.js'
import {
  emptyMeta,
  parsePayload,
  parseYuePayload,
  type TranslateResult,
  type TranslateStage,
} from './translateShared.js'

type TranslateLang = 'en' | 'ptpt'

export async function translateEuropeanPortuguese(opts: {
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
      definition: to === 'ptpt' ? fallbackDefinition : '',
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
        notes: [`dict:${dictHit.entry.id}`, 'pt-pt-colloquial'],
      },
    }
  }

  const client = openaiClient()
  if (!client) {
    const demoPrimary = to === 'ptpt' ? `(demo PT-PT) ${text}` : `(demo) ${text}`
    return {
      text: demoPrimary,
      definition: to === 'ptpt' ? fallbackDefinition : '',
      alternatives: [],
      engine: 'demo',
      from,
      to,
      stage,
      meta: emptyMeta(['demo', 'pt-pt-colloquial']),
    }
  }

  const engine = env.openaiBaseUrl ? 'openai-compatible' : 'openai'
  const toPtpt = to === 'ptpt'
  const register = toPtpt ? inferEuropeanPortugueseRegister(text) : 'colloquial'
  const registerNote = register === 'formal' ? 'pt-pt-formal' : 'pt-pt-colloquial'
  let primary = text
  let alternatives: string[] = []
  let definition = fallbackDefinition

  if (wantAlts && toPtpt) {
    const system =
      register === 'formal'
        ? [
            'You are a European Portuguese (Portugal) interpreter for formal written and spoken situations.',
            'Translate English into POLITE formal European Portuguese (pt-PT — NOT Brazilian Portuguese).',
            'Use Portugal formal address (o senhor / a senhora / você-avoidance with 3rd-person verbs) and European lexicon and syntax (autocarro, telemóvel, comboio, pequeno-almoço, casa de banho; enclitic pronouns like "diga-me"; "estou a fazer" not "estou fazendo").',
            'Use modern AO90 Portugal spelling (ação, ótimo, direção) — never Brazilian forms (ônibus, celular, trem, banheiro, café da manhã, "você" as default, gerund progressives).',
            'On the PRIMARY line, ALWAYS use correct Portuguese orthographic accents (á à â ã é ê í ó ô õ ú ç). Alternatives may be lighter but must keep required accents.',
            'Do NOT use Chinese characters. Do NOT invent tone digits, Chao tone letters, or IPA on the primary line.',
            'Return ONLY valid JSON:',
            '{"primary":"<best formal European Portuguese>","alternatives":["<other polite variant>", "..."],"definition":"<short English gloss>"}',
            'Prefer 2–3 natural formal variants. No markdown.',
          ].join('\n')
        : [
            'You are a European Portuguese (Portugal) interpreter for face-to-face conversation.',
            'Translate English into COLLOQUIAL spoken European Portuguese (pt-PT — everyday Lisbon/Porto speech, NOT Brazilian Portuguese).',
            'Use tu between friends/peers with 2nd-person verbs; for strangers prefer 3rd-person verbs without "você". Use European lexicon and syntax when natural (fixe, miúdo, autocarro, telemóvel, comboio, pequeno-almoço, casa de banho, "estou a fazer", enclitic "diz-me").',
            'Never use Brazilian defaults (ônibus, celular, trem, banheiro, legal for "cool", a gente as default, gerund progressives "estou fazendo").',
            'Use modern AO90 Portugal spelling (ação, ótimo, direção). On the PRIMARY line, ALWAYS use correct Portuguese orthographic accents (á à â ã é ê í ó ô õ ú ç) on every word that needs them.',
            'Do NOT use Chinese characters. Do NOT invent tone digits, Chao tone letters, or IPA on the primary line.',
            'Return ONLY valid JSON:',
            '{"primary":"<best colloquial European Portuguese>","alternatives":["<other natural variant>", "..."],"definition":"<short English gloss>"}',
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
    const parsedPtpt = parseYuePayload(raw, text, false)
    primary = parsedPtpt.text
    alternatives = parsedPtpt.alternatives
    if (parsedPtpt.definition) definition = parsedPtpt.definition
  } else if (wantAlts && !toPtpt) {
    const system = [
      'You are a European Portuguese interpreter helping Portuguese speakers from Portugal learn English.',
      'Translate colloquial European Portuguese into natural conversational English.',
      'Return ONLY valid JSON:',
      '{"primary":"<best English>","alternatives":["<other natural English phrasing>", "..."],"definition":"<short European Portuguese gloss of what the English means>"}',
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
    const system = toPtpt
      ? register === 'formal'
        ? [
            'You are a European Portuguese (Portugal) interpreter for formal situations.',
            'Translate into POLITE formal European Portuguese (pt-PT — not Brazilian; o senhor / a senhora; European lexicon and "estar a + infinitive").',
            'ALWAYS use correct Portuguese orthographic accents (AO90 Portugal spelling).',
            'Do NOT use Chinese characters or tone numbers.',
            'Return ONLY valid JSON:',
            '{"translation":"<formal European Portuguese>","definition":"<short English gloss>"}',
          ].join('\n')
        : [
            'You are a European Portuguese (Portugal) interpreter for face-to-face conversation.',
            'Translate into COLLOQUIAL spoken European Portuguese (pt-PT — everyday Portugal, not Brazilian; tu with peers; autocarro / telemóvel / "estou a fazer").',
            'ALWAYS use correct Portuguese orthographic accents (AO90 Portugal spelling).',
            'Do NOT use Chinese characters or tone numbers.',
            'Return ONLY valid JSON:',
            '{"translation":"<colloquial European Portuguese>","definition":"<short English gloss>"}',
          ].join('\n')
      : [
          'You are a European Portuguese interpreter.',
          'Translate colloquial European Portuguese into natural English for conversation.',
          'Return ONLY valid JSON:',
          '{"translation":"<English>","definition":"<optional short sense note, or empty string>"}',
        ].join('\n')
    const completion = await client.chat.completions.create({
      model: env.openaiModel,
      temperature: toPtpt && register === 'formal' ? 0.2 : 0.25,
      max_tokens: 400,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: text },
      ],
      ...llmChatExtras(),
    })
    const raw = completion.choices[0]?.message?.content?.trim() || ''
    const payload = parsePayload(raw, toPtpt ? text : '', fallbackDefinition, false)
    primary = payload.text
    definition = toPtpt ? payload.definition || fallbackDefinition : payload.definition
  }

  if (toPtpt) {
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
      meta: emptyMeta(outText ? [registerNote] : [registerNote, 'no-pt-pt-output']),
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
      sourceLang: 'ptpt',
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
          notes: [`dict:${rescue.entry.id}`, registerNote, 'pt-pt-en-rescue'],
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
      meta: emptyMeta(['pt-pt-echo-blocked']),
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
