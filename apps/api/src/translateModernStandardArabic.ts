/**
 * EN↔Modern Standard Arabic (`arsa`) — فصحى, formal / written-leaning, Arabic script only.
 * Speech uses ar-SA (Azure STT/TTS). Never Egyptian colloquial (`ar` owns عامية مصرية / ar-EG)
 * and never Arabizi Latin. Compact clients show Arabic only (RTL); Details add honesty notes.
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

type TranslateLang = 'en' | 'arsa'

const SCRIPT_RULES = [
  'Write Arabic script only, with correct hamza (أ / إ / ؤ / ئ / ء) and taa marbuta (ة) spelling. Never Arabizi / Franco-Arabic Latin.',
  'Do NOT use Chinese characters. Do NOT invent tone digits, Chao tone letters, or IPA on the primary line.',
  'Omit full tashkeel (harakat); add a vowel mark only where it prevents a real misreading.',
]

function isArabicLine(s: string): boolean {
  return Boolean(s) && hasArabicScript(s) && !hasHan(s)
}

export async function translateModernStandardArabic(opts: {
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
      definition: to === 'arsa' ? fallbackDefinition : '',
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
        notes: [`dict:${dictHit.entry.id}`, 'arsa-msa'],
      },
    }
  }

  const client = openaiClient()
  if (!client) {
    return {
      text: to === 'arsa' ? `(demo AR-SA) ${text}` : `(demo) ${text}`,
      definition: to === 'arsa' ? fallbackDefinition : '',
      alternatives: [],
      engine: 'demo',
      from,
      to,
      stage,
      meta: emptyMeta(['demo', 'arsa-msa']),
    }
  }

  const engine = env.openaiBaseUrl ? 'openai-compatible' : 'openai'
  const toArsa = to === 'arsa'
  const register = toArsa ? inferArabicRegister(text) : 'colloquial'
  const registerNote = register === 'formal' ? 'arsa-msa-official' : 'arsa-msa'
  let primary = text
  let alternatives: string[] = []
  let definition = fallbackDefinition

  if (wantAlts && toArsa) {
    const system =
      register === 'formal'
        ? [
            'You are a Modern Standard Arabic (العربية الفصحى) translator for official, legal, medical, and ceremonial writing.',
            'Translate the user text (usually English) into FORMAL written فصحى — the register of official letters, forms, and notices (e.g. يُرجى، نحيطكم علمًا، سيادتكم).',
            'Pan-Arab standard vocabulary and grammar. NOT Egyptian, Gulf, Levantine, or Maghrebi colloquial.',
            ...SCRIPT_RULES,
            'Return ONLY valid JSON:',
            '{"primary":"<best formal MSA>","alternatives":["<other formal MSA phrasing>", "..."],"definition":"<short English gloss>"}',
            'Prefer 2–3 natural formal variants. No markdown.',
          ].join('\n')
        : [
            'You are a Modern Standard Arabic (العربية الفصحى) interpreter.',
            'Translate the user text (usually English) into clear, natural Modern Standard Arabic — the neutral written / broadcast register understood across the Arab world.',
            'Use MSA forms: هذا / هذه، لا / ليس / لن / لم، أريد، أين، كيف، متى، لماذا، الآن، سوف / سـ. Formal-leaning but not stiff legalese.',
            'NOT Egyptian, Gulf, Levantine, or Maghrebi colloquial (no ده، مش، عايز، شو، وش).',
            ...SCRIPT_RULES,
            'Return ONLY valid JSON:',
            '{"primary":"<best MSA>","alternatives":["<other natural MSA phrasing>", "..."],"definition":"<short English gloss>"}',
            'Prefer 2–3 natural MSA variants. No markdown.',
          ].join('\n')
    const completion = await client.chat.completions.create({
      model: env.openaiModel,
      temperature: register === 'formal' ? 0.25 : 0.35,
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
  } else if (wantAlts && !toArsa) {
    const system = [
      'You are a Modern Standard Arabic interpreter helping Arabic speakers learn English.',
      'The input is Modern Standard Arabic (فصحى, Arabic script). Translate it into natural conversational English.',
      'Return ONLY valid JSON:',
      '{"primary":"<best English>","alternatives":["<other natural English phrasing>", "..."],"definition":"<short gloss of what the English means>"}',
      'Prefer 2–3 natural English variants. No markdown. Never echo the Arabic.',
    ].join('\n')
    const completion = await client.chat.completions.create({
      model: env.openaiModel,
      temperature: 0.3,
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
    const system = toArsa
      ? register === 'formal'
        ? [
            'You are a Modern Standard Arabic (العربية الفصحى) translator for official writing.',
            'Translate into FORMAL written فصحى (official letters / forms / notices). NOT Egyptian, Gulf, or Levantine colloquial.',
            ...SCRIPT_RULES,
            'Return ONLY valid JSON:',
            '{"translation":"<formal MSA>","definition":"<short English gloss>"}',
          ].join('\n')
        : [
            'You are a Modern Standard Arabic (العربية الفصحى) interpreter.',
            'Translate into clear, natural Modern Standard Arabic (neutral written / broadcast register). NOT Egyptian, Gulf, or Levantine colloquial.',
            ...SCRIPT_RULES,
            'Return ONLY valid JSON:',
            '{"translation":"<MSA>","definition":"<short English gloss>"}',
          ].join('\n')
      : [
          'You are a Modern Standard Arabic interpreter.',
          'Translate Modern Standard Arabic (فصحى) into natural English for conversation. Never echo the Arabic.',
          'Return ONLY valid JSON:',
          '{"translation":"<English>","definition":"<optional short sense note, or empty string>"}',
        ].join('\n')
    const completion = await client.chat.completions.create({
      model: env.openaiModel,
      temperature: toArsa && register === 'formal' ? 0.15 : 0.2,
      max_tokens: 400,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: text },
      ],
      ...llmChatExtras(),
    })
    const raw = completion.choices[0]?.message?.content?.trim() || ''
    const payload = parsePayload(raw, toArsa ? text : '', fallbackDefinition, false)
    primary = payload.text
    definition = toArsa ? payload.definition || fallbackDefinition : payload.definition
  }

  if (toArsa) {
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
      meta: emptyMeta(outText ? [registerNote] : [registerNote, 'no-arsa-output']),
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
      sourceLang: 'arsa',
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
          notes: [`dict:${rescue.entry.id}`, registerNote, 'arsa-en-rescue'],
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
      meta: emptyMeta(['arsa-echo-blocked']),
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
