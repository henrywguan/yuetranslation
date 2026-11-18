/**
 * Shared EN ↔ voice-lang translator (dictionary → LLM → script gate → echo rescue).
 * Same pipeline as `translateBengali` / `translateTurkish`; each language module
 * supplies its own prompts and script gates so varieties never share wording
 * (ru ≠ uk, fa ≠ ar, ur ≠ hi, te / gu / kn ≠ ta / bn).
 */
import { env, llmChatExtras } from './env.js'
import { openaiClient } from './openaiClient.js'
import { dictionaryTranslate } from './canto/dictionary.js'
import { looksLikeGlossDump } from '@jyut/shared/glossDump'
import { hasHan } from './canto/han.js'
import { inferSourceRegister } from './voiceLangRegister.js'
import type { TargetLang } from './canto/types.js'
import {
  emptyMeta,
  parsePayload,
  parseYuePayload,
  type TranslateResult,
  type TranslateStage,
} from './translateShared.js'

export type VoicePairPrompts = {
  /** EN → lang with alternatives (JSON `primary` / `alternatives` / `definition`). */
  altsFormal: string[]
  altsColloquial: string[]
  /** EN → lang single line (JSON `translation` / `definition`). */
  singleFormal: string[]
  singleColloquial: string[]
  /** lang → EN interpreter identity line (shared JSON contract appended). */
  toEnRole: string
}

export type VoicePairConfig<L extends TargetLang> = {
  code: L
  /** Human label used in the lang → EN prompts (e.g. "Telugu"). */
  label: string
  /** Meta note prefix (e.g. `te` → `te-colloquial`). */
  note: string
  demoTag: string
  /** Target output must contain this script (Indic / Greek / Cyrillic / Hebrew / Arabic). */
  requireScript?: RegExp
  /** Target output is rejected when it contains these (e.g. Russian-only letters in Ukrainian). */
  rejectScript?: RegExp
  prompts: VoicePairPrompts
}

const ECHO_PUNCT = /[¿?¡!.,;:'"“”‘’«»„।؟،۔;·]+/g

function normForEcho(s: string): string {
  return s.toLowerCase().normalize('NFKC').replace(ECHO_PUNCT, '').replace(/\s+/g, ' ').trim()
}

export function makeVoicePairTranslator<L extends TargetLang>(cfg: VoicePairConfig<L>) {
  const okTarget = (s: string): boolean =>
    Boolean(s) &&
    !hasHan(s) &&
    (!cfg.requireScript || cfg.requireScript.test(s)) &&
    (!cfg.rejectScript || !cfg.rejectScript.test(s))

  return async function translateVoicePair(opts: {
    from: 'en' | L
    to: 'en' | L
    text: string
    stage: TranslateStage
    wantAlts: boolean
    fallbackDefinition: string
  }): Promise<TranslateResult> {
    const { from, to, text, stage, wantAlts, fallbackDefinition } = opts
    const toLang = to === cfg.code

    const dictHit = dictionaryTranslate({
      sourceLang: from,
      targetLang: to,
      source: text,
      wantAlternatives: wantAlts,
    })
    if (dictHit) {
      return {
        text: dictHit.text,
        definition: toLang ? fallbackDefinition : '',
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
          notes: [`dict:${dictHit.entry.id}`, `${cfg.note}-colloquial`],
        },
      }
    }

    const client = openaiClient()
    if (!client) {
      return {
        text: toLang ? `(demo ${cfg.demoTag}) ${text}` : `(demo) ${text}`,
        definition: toLang ? fallbackDefinition : '',
        alternatives: [],
        engine: 'demo',
        from,
        to,
        stage,
        meta: emptyMeta(['demo', `${cfg.note}-colloquial`]),
      }
    }

    const engine = env.openaiBaseUrl ? 'openai-compatible' : 'openai'
    const register = toLang ? inferSourceRegister(text) : 'colloquial'
    const registerNote = register === 'formal' ? `${cfg.note}-formal` : `${cfg.note}-colloquial`
    let primary = text
    let alternatives: string[] = []
    let definition = fallbackDefinition

    if (wantAlts && toLang) {
      const system = [
        ...(register === 'formal' ? cfg.prompts.altsFormal : cfg.prompts.altsColloquial),
        'Return ONLY valid JSON:',
        `{"primary":"<best ${register} ${cfg.label}>","alternatives":["<other natural variant>", "..."],"definition":"<short English gloss>"}`,
        `Prefer 2–3 natural ${register === 'formal' ? 'formal' : 'spoken'} variants. No markdown.`,
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
    } else if (wantAlts && !toLang) {
      const system = [
        `${cfg.prompts.toEnRole} Help ${cfg.label} speakers learn English.`,
        `Translate colloquial ${cfg.label} into natural conversational English.`,
        'Return ONLY valid JSON:',
        `{"primary":"<best English>","alternatives":["<other natural English phrasing>", "..."],"definition":"<short ${cfg.label} gloss of what the English means>"}`,
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
      const parsed = parseYuePayload(raw, '', false)
      primary = parsed.text
      alternatives = parsed.alternatives.filter((a) => a && !hasHan(a))
      if (parsed.definition) definition = parsed.definition
    } else {
      const system = toLang
        ? [
            ...(register === 'formal' ? cfg.prompts.singleFormal : cfg.prompts.singleColloquial),
            'Return ONLY valid JSON:',
            `{"translation":"<${register} ${cfg.label}>","definition":"<short English gloss>"}`,
          ].join('\n')
        : [
            cfg.prompts.toEnRole,
            `Translate colloquial ${cfg.label} into natural English for conversation.`,
            'Return ONLY valid JSON:',
            '{"translation":"<English>","definition":"<optional short sense note, or empty string>"}',
          ].join('\n')
      const completion = await client.chat.completions.create({
        model: env.openaiModel,
        temperature: toLang && register === 'formal' ? 0.2 : 0.25,
        max_tokens: 400,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: text },
        ],
        ...llmChatExtras(),
      })
      const raw = completion.choices[0]?.message?.content?.trim() || ''
      const payload = parsePayload(raw, toLang ? text : '', fallbackDefinition, false)
      primary = payload.text
      definition = toLang ? payload.definition || fallbackDefinition : payload.definition
    }

    if (toLang) {
      const outText = primary && okTarget(primary.trim()) ? primary.trim() : ''
      return {
        text: outText,
        definition,
        alternatives: wantAlts ? alternatives.filter((a) => a && okTarget(a) && a !== outText) : [],
        engine,
        from,
        to,
        stage,
        meta: emptyMeta(outText ? [registerNote] : [registerNote, `no-${cfg.note}-output`]),
      }
    }

    const cleanedEn = (primary || '').trim()
    const sourceNorm = normForEcho(cleanedEn)
    const echoedSource = Boolean(sourceNorm) && sourceNorm === normForEcho(text)
    if (!cleanedEn || looksLikeGlossDump(cleanedEn) || hasHan(cleanedEn) || echoedSource) {
      const rescue = dictionaryTranslate({
        sourceLang: cfg.code,
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
            notes: [`dict:${rescue.entry.id}`, registerNote, `${cfg.note}-en-rescue`],
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
        meta: emptyMeta([`${cfg.note}-echo-blocked`]),
      }
    }

    return {
      text: cleanedEn,
      definition,
      alternatives: wantAlts ? alternatives.filter((a) => a && !hasHan(a) && a !== cleanedEn) : [],
      engine,
      from,
      to,
      stage,
      meta: emptyMeta([registerNote]),
    }
  }
}
