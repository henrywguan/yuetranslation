/**
 * EN↔Egyptian Arabic (`ar`) — colloquial Cairene عامية مصرية, Arabic script only (ar-EG).
 * Never Modern Standard Arabic (`arsa` owns فصحى / ar-SA) and never Arabizi Latin.
 * Compact clients show Arabic only (RTL); Details add honesty notes via arabicPedagogy.ts.
 */
import { env, llmChatExtras } from './env.js'
import { openaiClient } from './openaiClient.js'
import { dictionaryTranslate } from './canto/dictionary.js'
import { looksLikeGlossDump } from '@jyut/shared/glossDump'
import { hasHan } from './canto/han.js'
import { hasArabicScript, inferArabicRegister } from './arabicRegister.js'
import {
  emptyMeta,
  parsePayload,
  parseYuePayload,
  type TranslateResult,
  type TranslateStage,
} from './translateShared.js'

type TranslateLang = 'en' | 'ar'

const SCRIPT_RULES = [
  'Write Arabic script only. Never Franco-Arabic / Arabizi Latin (no 3 / 7 / 2 digits standing for letters).',
  'Do NOT use Chinese characters. Do NOT invent tone digits, Chao tone letters, or IPA on the primary line.',
  'Omit full tashkeel (harakat); add a shadda or single vowel mark only where it prevents a real misreading.',
]

function isArabicLine(s: string): boolean {
  return Boolean(s) && hasArabicScript(s) && !hasHan(s)
}

export async function translateEgyptianArabic(opts: {
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
      definition: to === 'ar' ? fallbackDefinition : '',
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
        notes: [`dict:${dictHit.entry.id}`, 'ar-eg-colloquial'],
      },
    }
  }

  const client = openaiClient()
  if (!client) {
    return {
      text: to === 'ar' ? `(demo AR-EG) ${text}` : `(demo) ${text}`,
      definition: to === 'ar' ? fallbackDefinition : '',
      alternatives: [],
      engine: 'demo',
      from,
      to,
      stage,
      meta: emptyMeta(['demo', 'ar-eg-colloquial']),
    }
  }

  const engine = env.openaiBaseUrl ? 'openai-compatible' : 'openai'
  const toAr = to === 'ar'
  const register = toAr ? inferArabicRegister(text) : 'colloquial'
  const registerNote = register === 'formal' ? 'ar-eg-polite' : 'ar-eg-colloquial'
  let primary = text
  let alternatives: string[] = []
  let definition = fallbackDefinition

  if (wantAlts && toAr) {
    const system =
      register === 'formal'
        ? [
            'You are an Egyptian Arabic (Cairo / ar-EG) interpreter for polite, respectful situations.',
            'Translate the user text (usually English) into POLITE colloquial Egyptian Arabic (عامية مصرية مؤدبة) — use حضرتك, لو سمحت, من فضلك, careful wording.',
            'Stay in Egyptian dialect even when polite: NOT Modern Standard Arabic (فصحى), NOT Gulf, Levantine, or Maghrebi dialect.',
            ...SCRIPT_RULES,
            'Return ONLY valid JSON:',
            '{"primary":"<best polite Egyptian Arabic>","alternatives":["<other natural Egyptian variant>", "..."],"definition":"<short English gloss>"}',
            'Prefer 2–3 natural Egyptian variants. No markdown.',
          ].join('\n')
        : [
            'You are an Egyptian Arabic (Cairo / ar-EG) interpreter for face-to-face conversation.',
            'Translate the user text (usually English) into COLLOQUIAL spoken Egyptian Arabic (عامية مصرية) — the way Cairenes actually talk.',
            'Prefer Egyptian forms: ده / دي / دول، مش، عايز / عايزة، فين، إزاي، إمتى، ليه، كده، أوي، دلوقتي، بتاع، ـش negation (ما…ش), future with ح / هـ.',
            'NOT Modern Standard Arabic (فصحى), NOT Gulf, Levantine, or Maghrebi dialect.',
            ...SCRIPT_RULES,
            'Return ONLY valid JSON:',
            '{"primary":"<best colloquial Egyptian Arabic>","alternatives":["<other natural Egyptian variant>", "..."],"definition":"<short English gloss>"}',
            'Prefer 2–3 natural spoken Egyptian variants. No markdown.',
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
    const parsed = parseYuePayload(raw, text, false)
    primary = parsed.text
    alternatives = parsed.alternatives
    if (parsed.definition) definition = parsed.definition
  } else if (wantAlts && !toAr) {
    const system = [
      'You are an Egyptian Arabic interpreter helping Egyptian speakers learn English.',
      'The input is colloquial Egyptian Arabic (عامية مصرية, Arabic script or occasional Arabizi). Translate it into natural conversational English.',
      'Return ONLY valid JSON:',
      '{"primary":"<best English>","alternatives":["<other natural English phrasing>", "..."],"definition":"<short gloss of what the English means>"}',
      'Prefer 2–3 natural English variants. No markdown. Never echo the Arabic.',
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
    alternatives = parsedEn.alternatives.filter((a) => a && !hasHan(a) && !hasArabicScript(a))
    if (parsedEn.definition) definition = parsedEn.definition
  } else {
    const system = toAr
      ? register === 'formal'
        ? [
            'You are an Egyptian Arabic (Cairo / ar-EG) interpreter for polite situations.',
            'Translate into POLITE colloquial Egyptian Arabic (حضرتك، لو سمحت) — still Egyptian dialect, NOT فصحى, NOT Gulf/Levantine.',
            ...SCRIPT_RULES,
            'Return ONLY valid JSON:',
            '{"translation":"<polite Egyptian Arabic>","definition":"<short English gloss>"}',
          ].join('\n')
        : [
            'You are an Egyptian Arabic (Cairo / ar-EG) interpreter for face-to-face conversation.',
            'Translate into COLLOQUIAL spoken Egyptian Arabic (عامية مصرية: ده، مش، عايز، فين، إزاي) — NOT فصحى, NOT Gulf/Levantine.',
            ...SCRIPT_RULES,
            'Return ONLY valid JSON:',
            '{"translation":"<colloquial Egyptian Arabic>","definition":"<short English gloss>"}',
          ].join('\n')
      : [
          'You are an Egyptian Arabic interpreter.',
          'Translate colloquial Egyptian Arabic (عامية مصرية) into natural English for conversation. Never echo the Arabic.',
          'Return ONLY valid JSON:',
          '{"translation":"<English>","definition":"<optional short sense note, or empty string>"}',
        ].join('\n')
    const completion = await client.chat.completions.create({
      model: env.openaiModel,
      temperature: toAr && register === 'formal' ? 0.2 : 0.25,
      max_tokens: 400,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: text },
      ],
      ...llmChatExtras(),
    })
    const raw = completion.choices[0]?.message?.content?.trim() || ''
    const payload = parsePayload(raw, toAr ? text : '', fallbackDefinition, false)
    primary = payload.text
    definition = toAr ? payload.definition || fallbackDefinition : payload.definition
  }

  if (toAr) {
    const candidate = (primary || '').trim()
    const outText = isArabicLine(candidate) ? candidate : ''
    return {
      text: outText,
      definition,
      alternatives: wantAlts
        ? alternatives.map((a) => a.trim()).filter((a) => isArabicLine(a) && a !== outText)
        : [],
      engine,
      from,
      to,
      stage,
      meta: emptyMeta(outText ? [registerNote] : [registerNote, 'no-ar-eg-output']),
    }
  }

  const cleanedEn = (primary || '').trim()
  const fold = (s: string) =>
    s
      .toLowerCase()
      .normalize('NFKC')
      .replace(/[؟?¡!.,،؛;:'"“”‘’]+/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  const echoedSource = Boolean(fold(cleanedEn)) && fold(cleanedEn) === fold(text)
  const stillArabic = hasArabicScript(cleanedEn) && !/[A-Za-z]/.test(cleanedEn)
  if (!cleanedEn || looksLikeGlossDump(cleanedEn) || hasHan(cleanedEn) || echoedSource || stillArabic) {
    const rescue = dictionaryTranslate({
      sourceLang: 'ar',
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
          notes: [`dict:${rescue.entry.id}`, registerNote, 'ar-eg-en-rescue'],
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
      meta: emptyMeta(['ar-eg-echo-blocked']),
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
