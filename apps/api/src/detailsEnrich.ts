/**
 * Unified dictionary entry for Details — lexicon + phrase memory + optional LLM + keyless visuals (emoji / Wikipedia).
 * Lang-agnostic contract; prompts parameterized by DETAIL_ENRICH_META (server mirror of pedagogy).
 */
import { z } from 'zod'
import { env, llmChatExtras } from './env.js'
import { openaiClientWithKey } from './openaiClient.js'
import { hasHan } from './canto/han.js'
import { resolveDictionaryMedia, type DictionaryMedia } from './detailsMedia.js'

export const DetailLangSchema = z.enum(['en', 'yue', 'cmn', 'wuu', 'sichuan', 'tl', 'es', 'vi', 'ceb', 'ilo'])
export type DetailLang = z.infer<typeof DetailLangSchema>

const EnrichBody = z.object({
  text: z.string().min(1).max(500),
  lang: DetailLangSchema,
  /** Paired pane text (source or translation) for context-aware senses. */
  contextText: z.string().max(500).optional(),
  contextLang: DetailLangSchema.optional(),
  /**
   * Learner gloss language — Account Hub primary language.
   * Senses / examples / usage are written in this language (not the lemma language).
   */
  glossLang: DetailLangSchema.optional(),
  /** Prefer illustrative media (emoji offline + keyless Wikipedia thumb). */
  wantMedia: z.boolean().optional(),
})

export type DictionarySense = {
  gloss: string
  pos?: string
  note?: string
}

export type DictionaryExample = {
  text: string
  translation?: string
  note?: string
}

export type { DictionaryMedia }

export type DictionaryEntry = {
  lemma: string
  lang: DetailLang
  /** Language senses/examples/usage were written in (Account Hub primary). */
  glossLang?: DetailLang
  pronunciation?: string
  senses: DictionarySense[]
  examples: DictionaryExample[]
  usageNotes: string[]
  media: DictionaryMedia[]
  provenance: string[]
  engine: 'offline' | 'openai' | 'mixed'
}

/**
 * Writing-language meta for senses/examples/usage.
 * `lang` = lemma language; `glossLang` (Account Hub primary) selects this row for output.
 * Keep in sync with web `DETAIL_PEDAGOGY` / primary langs.
 */
const ENRICH_META: Record<
  DetailLang,
  { label: string; glossLangHint: string; exampleIn: string }
> = {
  en: {
    label: 'English',
    glossLangHint: 'clear English',
    exampleIn: 'natural English',
  },
  yue: {
    label: 'Hong Kong Cantonese (粵語)',
    glossLangHint: 'Hong Kong Cantonese (粵語) — write glosses and notes in 粵語 Chinese characters (Jyutping is added by the client)',
    exampleIn: 'natural 粵語 (Chinese characters)',
  },
  cmn: {
    label: 'Mandarin Chinese',
    glossLangHint: 'Mandarin Chinese (普通话) — Chinese characters (pinyin is added by the client)',
    exampleIn: 'natural Mandarin (Chinese characters)',
  },
  wuu: {
    label: 'Shanghainese (吳語)',
    glossLangHint: 'Shanghainese (吳語) — Chinese characters',
    exampleIn: 'natural Shanghainese (Chinese characters)',
  },
  sichuan: {
    label: 'Sichuanese / Chengdu dialect (四川話)',
    glossLangHint: 'Chengdu Sichuanese (四川話) — Chinese characters',
    exampleIn: 'natural Chengdu Sichuanese (Chinese characters)',
  },
  tl: {
    label: 'Tagalog / Filipino',
    glossLangHint: 'Tagalog / Filipino',
    exampleIn: 'natural Tagalog',
  },
  es: {
    label: 'Mexican Spanish',
    glossLangHint: 'Mexican Spanish',
    exampleIn: 'natural Mexican Spanish',
  },
  vi: {
    label: 'Vietnamese',
    glossLangHint: 'Vietnamese',
    exampleIn: 'natural Vietnamese',
  },
  ceb: {
    label: 'Cebuano / Bisaya',
    glossLangHint: 'Cebuano',
    exampleIn: 'natural Cebuano',
  },
  ilo: {
    label: 'Ilocano / Ilokano',
    glossLangHint: 'Ilocano',
    exampleIn: 'natural Ilocano',
  },
}

function uniqueStrings(items: string[]): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const raw of items) {
    const t = raw.trim()
    if (!t) continue
    const key = t.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(t)
  }
  return out
}

/**
 * Offline senses stay in the Details panel language only.
 * Never promote CONTEXT / paired-pane text into senses (header translation covers that).
 * Cross-language lexicon glosses (e.g. EN→粵) are omitted so Solo EN↔Sichuanese cannot share a dict.
 * Monolingual senses come from the AI enrich path when available.
 */
function offlineSenses(_text: string, _lang: DetailLang): DictionarySense[] {
  return []
}

/** Drop senses that merely echo the paired CONTEXT string. */
function withoutPairedLeak(senses: DictionarySense[], contextText?: string): DictionarySense[] {
  const ctx = (contextText || '').trim().toLowerCase()
  if (!ctx) return senses
  return senses.filter((s) => s.gloss.trim().toLowerCase() !== ctx)
}


function parseModelEntry(raw: string): {
  pronunciation?: string
  senses: DictionarySense[]
  examples: DictionaryExample[]
  usageNotes: string[]
} {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
  try {
    const parsed = JSON.parse(cleaned) as Record<string, unknown>
    const senses: DictionarySense[] = []
    if (Array.isArray(parsed.senses)) {
      for (const item of parsed.senses) {
        if (!item || typeof item !== 'object') continue
        const row = item as Record<string, unknown>
        const gloss = typeof row.gloss === 'string' ? row.gloss.trim() : ''
        if (!gloss) continue
        senses.push({
          gloss,
          pos: typeof row.pos === 'string' ? row.pos.trim() : undefined,
          note: typeof row.note === 'string' ? row.note.trim() : undefined,
        })
      }
    }
    const examples: DictionaryExample[] = []
    if (Array.isArray(parsed.examples)) {
      for (const item of parsed.examples) {
        if (!item || typeof item !== 'object') continue
        const row = item as Record<string, unknown>
        const text = typeof row.text === 'string' ? row.text.trim() : ''
        if (!text) continue
        examples.push({
          text,
          translation: typeof row.translation === 'string' ? row.translation.trim() : undefined,
          note: typeof row.note === 'string' ? row.note.trim() : undefined,
        })
      }
    }
    const usageNotes = Array.isArray(parsed.usageNotes)
      ? uniqueStrings(parsed.usageNotes.filter((n): n is string => typeof n === 'string'))
      : []
    const pronunciation =
      typeof parsed.pronunciation === 'string' && parsed.pronunciation.trim()
        ? parsed.pronunciation.trim()
        : undefined
    return { pronunciation, senses, examples, usageNotes }
  } catch {
    return { senses: [], examples: [], usageNotes: [] }
  }
}

async function modelEnrich(input: {
  text: string
  lang: DetailLang
  glossLang: DetailLang
  contextText?: string
  contextLang?: DetailLang
}): Promise<{
  pronunciation?: string
  senses: DictionarySense[]
  examples: DictionaryExample[]
  usageNotes: string[]
} | null> {
  if (!env.openaiApiKey) return null
  const lemmaMeta = ENRICH_META[input.lang]
  const glossMeta = ENRICH_META[input.glossLang]
  const client = openaiClientWithKey()
  const system = [
    `You are a learner dictionary for JyutTranslate.`,
    `Lemma language: ${lemmaMeta.label}. Learner primary (gloss) language: ${glossMeta.label}.`,
    'Synthesize ONE unified dictionary entry: explain the LEMMA for a learner whose primary language is the gloss language.',
    'Return ONLY valid JSON:',
    '{"pronunciation":"<lemma pronunciation: ipa or romanization or empty>","senses":[{"gloss":"...","pos":"noun|verb|…","note":"optional"}],"examples":[{"text":"...","translation":"...","note":"optional"}],"usageNotes":["..."]}',
    'Rules:',
    `- Every sense gloss, usage note, and example "text" MUST be written in: ${glossMeta.glossLangHint}.`,
    `- Example "text" in ${glossMeta.exampleIn} — illustrate the lemma’s meaning for that learner.`,
    `- When gloss language ≠ lemma language, optional example "translation" may briefly show a lemma-language surface form; never put CONTEXT / paired-pane text into glosses.`,
    '- CONTEXT (when provided) is ONLY for sense disambiguation (e.g. Apple fruit vs company). NEVER copy CONTEXT into gloss, examples, or usageNotes.',
    '- Do not write senses in the lemma language when a different gloss language was requested.',
    '- 1–4 senses, 1–3 examples, 0–3 usage notes. Be concise. No markdown.',
  ].join('\n')
  const user = [
    `Lemma (${input.lang}): ${input.text}`,
    `Gloss language (${input.glossLang}): write senses/examples/usage in this language only.`,
    input.contextText
      ? `CONTEXT for disambiguation only (${input.contextLang || 'paired'}): ${input.contextText}`
      : 'CONTEXT: (none)',
  ].join('\n')

  try {
    const completion = await client.chat.completions.create({
      model: env.openaiModel,
      temperature: 0.35,
      max_tokens: 900,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      response_format: { type: 'json_object' },
      ...llmChatExtras(),
    })
    const raw = completion.choices[0]?.message?.content?.trim() || ''
    return parseModelEntry(raw)
  } catch {
    return null
  }
}

export async function enrichDictionaryEntry(input: unknown): Promise<DictionaryEntry> {
  const parsed = EnrichBody.parse(input)
  const lemma = parsed.text.trim()
  const lang = parsed.lang || (hasHan(lemma) ? 'yue' : 'en')
  const provenance: string[] = []
  const offline = withoutPairedLeak(offlineSenses(lemma, lang), parsed.contextText)
  if (offline.length) provenance.push('lexicon')

  const glossLang = parsed.glossLang || lang
  const model = await modelEnrich({
    text: lemma,
    lang,
    glossLang,
    contextText: parsed.contextText,
    contextLang: parsed.contextLang,
  })

  let senses = offline
  let examples: DictionaryExample[] = []
  let usageNotes: string[] = []
  let pronunciation: string | undefined
  let engine: DictionaryEntry['engine'] = 'offline'

  if (model) {
    provenance.push('ai-synthesis')
    engine = offline.length ? 'mixed' : 'openai'
    pronunciation = model.pronunciation
    // Prefer model senses when present; keep offline glosses that add something new.
    const modelGlosses = withoutPairedLeak(model.senses, parsed.contextText)
    if (modelGlosses.length) {
      senses = [
        ...modelGlosses,
        ...offline.filter(
          (o) => !modelGlosses.some((m) => m.gloss.toLowerCase() === o.gloss.toLowerCase()),
        ),
      ].slice(0, 6)
    }
    examples = model.examples.slice(0, 4)
    usageNotes = model.usageNotes.slice(0, 4)
  }
  senses = withoutPairedLeak(senses, parsed.contextText)

  const mediaPack = await resolveDictionaryMedia({
    lemma,
    contextText: parsed.contextText,
    // Remote Wikipedia thumb is keyless; still skip when caller opts out.
    wantRemote: parsed.wantMedia !== false,
  })
  const media = mediaPack.media
  if (mediaPack.provenance.length) {
    provenance.push(...mediaPack.provenance)
  }
  // Do not flip engine for Wikipedia/emoji — only LLM synthesis is metered.

  return {
    lemma,
    lang,
    glossLang,
    pronunciation,
    senses,
    examples,
    usageNotes,
    media,
    provenance: uniqueStrings(provenance),
    engine,
  }
}
