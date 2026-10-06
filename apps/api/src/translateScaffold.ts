/**
 * Generic EN↔lang translate stubs for newly scaffolded VoiceLang codes.
 * Per-language cloud agents should replace these with dedicated translate* modules
 * (see translateKorean / translateThai) when polishing pedagogy + register.
 */
import { z } from 'zod'
import { env, llmChatExtras } from './env.js'
import { openaiClient } from './openaiClient.js'
import { dictionaryTranslate } from './canto/dictionary.js'
import { looksLikeGlossDump } from '@jyut/shared/glossDump'
import { emptyMeta, parsePayload, parseYuePayload, type TranslateResult, type TranslateStage } from './translateShared.js'

export const ScaffoldLangZ = z.enum(['ja', 'id', 'pt', 'fr', 'hi', 'km', 'my', 'jv', 'it', 'de', 'nl'])
export type ScaffoldLang = z.infer<typeof ScaffoldLangZ>

const META: Record<
  ScaffoldLang,
  { label: string; locale: string; scriptNote: string }
> = {
  ja: {
    label: 'Japanese',
    locale: 'ja-JP',
    scriptNote: 'native script',
  },
  id: {
    label: 'Indonesian',
    locale: 'id-ID',
    scriptNote: 'Latin orthography',
  },
  pt: {
    label: 'Brazilian Portuguese',
    locale: 'pt-BR',
    scriptNote: 'Latin orthography',
  },
  fr: {
    label: 'French',
    locale: 'fr-FR',
    scriptNote: 'Latin orthography',
  },
  hi: {
    label: 'Hindi',
    locale: 'hi-IN',
    scriptNote: 'native script',
  },
  km: {
    label: 'Khmer',
    locale: 'km-KH',
    scriptNote: 'native script',
  },
  my: {
    label: 'Burmese',
    locale: 'my-MM',
    scriptNote: 'native script',
  },
  jv: {
    label: 'Javanese',
    locale: 'jv-ID',
    scriptNote: 'Latin orthography',
  },
  it: {
    label: 'Italian',
    locale: 'it-IT',
    scriptNote: 'Latin orthography',
  },
  de: {
    label: 'German',
    locale: 'de-DE',
    scriptNote: 'Latin orthography',
  },
  nl: {
    label: 'Dutch',
    locale: 'nl-NL',
    scriptNote: 'Latin orthography',
  }
}

function hasHan(s: string): boolean {
  return /[\u3400-\u9FFF]/.test(s)
}

type TranslateLang = ScaffoldLang | 'en'

export async function translateScaffoldLang(opts: {
  from: TranslateLang
  to: TranslateLang
  text: string
  stage: TranslateStage
  wantAlts: boolean
  fallbackDefinition: string
}): Promise<TranslateResult> {
  const { from, to, text, stage, wantAlts, fallbackDefinition } = opts
  const lang = (to === 'en' ? from : to) as ScaffoldLang
  const meta = META[lang]
  const toTarget = to === lang

  const dictHit = dictionaryTranslate({
    sourceLang: from as never,
    targetLang: to as never,
    source: text,
    wantAlternatives: wantAlts,
  })
  if (dictHit) {
    return {
      text: dictHit.text,
      definition: toTarget ? fallbackDefinition : '',
      alternatives: wantAlts ? dictHit.alternatives : [],
      engine: 'dictionary',
      from: from as never,
      to: to as never,
      stage,
      meta: {
        dictionaryHit: true,
        scrubbed: false,
        colloquialScore: 8,
        rewritten: false,
        notes: [`dict:${dictHit.entry.id}`, `${lang}-scaffold`],
      },
    }
  }

  const client = openaiClient()
  if (!client) {
    return {
      text: toTarget ? `(demo ${lang.toUpperCase()}) ${text}` : `(demo) ${text}`,
      definition: toTarget ? fallbackDefinition : '',
      alternatives: [],
      engine: 'demo',
      from: from as never,
      to: to as never,
      stage,
      meta: emptyMeta(['demo', `${lang}-scaffold`]),
    }
  }

  const engine = env.openaiBaseUrl ? 'openai-compatible' : 'openai'
  let primary = text
  let alternatives: string[] = []
  let definition = fallbackDefinition

  if (wantAlts && toTarget) {
    const system = [
      `You are a ${meta.label} interpreter for face-to-face conversation.`,
      `Translate English into COLLOQUIAL spoken ${meta.label} (${meta.scriptNote}).`,
      'Never Chinese characters. Never invent Cantonese-style ASCII tone digits.',
      'Return ONLY valid JSON:',
      '{"primary":"<best colloquial>","alternatives":["<other natural variant>", "..."],"definition":"<short English gloss>"}',
      'Prefer 2–3 natural spoken variants. No markdown.',
    ].join('\n')
    const completion = await client.chat.completions.create({
      model: env.openaiModel,
      temperature: 0.4,
      max_tokens: 400,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: text },
      ],
      response_format: { type: 'json_object' },
      ...llmChatExtras(),
    })
    const raw = completion.choices[0]?.message?.content?.trim() || ''
    const parsed = parseYuePayload(raw, text, false)
    primary = parsed.text
    alternatives = parsed.alternatives
    if (parsed.definition) definition = parsed.definition
  } else if (wantAlts && !toTarget) {
    const system = [
      `You are a ${meta.label} interpreter helping speakers learn English.`,
      `Translate colloquial ${meta.label} into natural conversational English.`,
      'Return ONLY valid JSON:',
      '{"primary":"<best English>","alternatives":["<other natural English phrasing>", "..."],"definition":"<short gloss>"}',
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
    const system = toTarget
      ? [
          `You are a ${meta.label} interpreter for face-to-face conversation.`,
          `Translate into COLLOQUIAL spoken ${meta.label} (${meta.scriptNote}).`,
          'Never Chinese characters. Never invent Cantonese-style ASCII tone digits.',
          'Return ONLY valid JSON:',
          '{"translation":"<colloquial>","definition":"<short English gloss>"}',
        ].join('\n')
      : [
          `You are a ${meta.label} interpreter.`,
          `Translate colloquial ${meta.label} into natural English for conversation.`,
          'Return ONLY valid JSON:',
          '{"translation":"<English>","definition":"<optional short sense note, or empty string>"}',
        ].join('\n')
    const completion = await client.chat.completions.create({
      model: env.openaiModel,
      temperature: 0.25,
      max_tokens: 400,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: text },
      ],
      ...llmChatExtras(),
    })
    const raw = completion.choices[0]?.message?.content?.trim() || ''
    const payload = parsePayload(raw, toTarget ? text : '', fallbackDefinition, false)
    primary = payload.text
    definition = toTarget ? payload.definition || fallbackDefinition : payload.definition
  }

  if (toTarget) {
    const outText = primary && !hasHan(primary) ? primary.trim() : ''
    return {
      text: outText,
      definition,
      alternatives: wantAlts
        ? alternatives.filter((a) => a && !hasHan(a) && a !== outText)
        : [],
      engine,
      from: from as never,
      to: to as never,
      stage,
      meta: emptyMeta(outText ? [`${lang}-scaffold`] : [`${lang}-scaffold`, `no-${lang}-output`]),
    }
  }

  if (looksLikeGlossDump(primary) || hasHan(primary)) {
    return {
      text: '',
      definition: '',
      alternatives: [],
      engine,
      from: from as never,
      to: to as never,
      stage,
      meta: emptyMeta([`${lang}-echo-blocked`]),
    }
  }

  return {
    text: primary,
    definition,
    alternatives: wantAlts ? alternatives.filter((a) => a && !hasHan(a) && a !== primary) : [],
    engine,
    from: from as never,
    to: to as never,
    stage,
    meta: emptyMeta([`${lang}-scaffold`]),
  }
}

export function isScaffoldLang(lang: string | null | undefined): lang is ScaffoldLang {
  return typeof lang === 'string' && (ScaffoldLangZ.options as string[]).includes(lang)
}
