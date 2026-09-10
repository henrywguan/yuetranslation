/**
 * Unified dictionary entry for Details — lexicon + phrase memory + optional LLM + keyless visuals (emoji / Wikipedia).
 * Lang-agnostic contract; prompts parameterized by DETAIL_ENRICH_META (server mirror of pedagogy).
 */
import { z } from 'zod'
import { env, llmChatExtras } from './env.js'
import { openaiClientWithKey } from './openaiClient.js'
import {
  cantoneseGlossForEnglish,
  cantoneseSensesForEnglish,
} from './canto/lexiconTranslate.js'
import { lookupGloss } from './canto/gloss.js'
import { hasHan } from './canto/han.js'
import { resolveDictionaryMedia, type DictionaryMedia } from './detailsMedia.js'

export const DetailLangSchema = z.enum(['en', 'yue', 'cmn', 'wuu', 'tl', 'es', 'vi', 'ceb', 'ilo'])
export type DetailLang = z.infer<typeof DetailLangSchema>

const EnrichBody = z.object({
  text: z.string().min(1).max(500),
  lang: DetailLangSchema,
  /** Paired pane text (source or translation) for context-aware senses. */
  contextText: z.string().max(500).optional(),
  contextLang: DetailLangSchema.optional(),
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
  pronunciation?: string
  senses: DictionarySense[]
  examples: DictionaryExample[]
  usageNotes: string[]
  media: DictionaryMedia[]
  provenance: string[]
  engine: 'offline' | 'openai' | 'mixed'
}

/** Server-side meta so new langs only need a row here (keep in sync with web detailPedagogy). */
const ENRICH_META: Record<
  DetailLang,
  { label: string; glossLangHint: string; exampleIn: string }
> = {
  en: {
    label: 'English',
    glossLangHint: 'Hong Kong Cantonese (粵語) and/or brief English when useful',
    exampleIn: 'natural English',
  },
  yue: {
    label: 'Hong Kong Cantonese (粵語)',
    glossLangHint: 'clear English',
    exampleIn: 'natural 粵語',
  },
  cmn: {
    label: 'Mandarin Chinese',
    glossLangHint: 'clear English',
    exampleIn: 'natural Mandarin',
  },
  wuu: {
    label: 'Shanghainese (吳語)',
    glossLangHint: 'clear English',
    exampleIn: 'natural Shanghainese or Mandarin with a note',
  },
  tl: {
    label: 'Tagalog / Filipino',
    glossLangHint: 'clear English',
    exampleIn: 'natural Tagalog',
  },
  es: {
    label: 'Mexican Spanish',
    glossLangHint: 'clear English',
    exampleIn: 'natural Mexican Spanish',
  },
  vi: {
    label: 'Vietnamese',
    glossLangHint: 'clear English',
    exampleIn: 'natural Vietnamese',
  },
  ceb: {
    label: 'Cebuano / Bisaya',
    glossLangHint: 'clear English',
    exampleIn: 'natural Cebuano',
  },
  ilo: {
    label: 'Ilocano / Ilokano',
    glossLangHint: 'clear English',
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

function offlineSenses(text: string, lang: DetailLang, contextText?: string): DictionarySense[] {
  const lemma = text.trim()
  const senses: DictionarySense[] = []
  const push = (gloss: string, note: string) => {
    const t = gloss.trim()
    if (!t) return
    if (senses.some((s) => s.gloss.toLowerCase() === t.toLowerCase())) return
    senses.push({ gloss: t, note })
  }
  if (lang === 'en') {
    const fromSenses = cantoneseSensesForEnglish(lemma)
    if (fromSenses.length) {
      for (const g of fromSenses) push(g, 'Lexicon')
    } else {
      const gloss =
        cantoneseGlossForEnglish(lemma.toLowerCase()) || cantoneseGlossForEnglish(lemma)
      if (gloss) push(gloss, 'Lexicon')
    }
  } else if (lang === 'yue' || lang === 'cmn' || lang === 'wuu') {
    const hit = lookupGloss(lemma)
    if (hit?.gloss) {
      const first = hit.gloss.replace(/^\([^)]+\)\s*/, '').split(/;\s*/)[0]?.trim() || hit.gloss
      if (first) push(first, hit.source || 'Dictionary')
    }
  }
  const ctx = (contextText || '').trim()
  if (ctx) push(ctx, 'Paired translation')
  return senses
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
  contextText?: string
  contextLang?: DetailLang
}): Promise<{
  pronunciation?: string
  senses: DictionarySense[]
  examples: DictionaryExample[]
  usageNotes: string[]
} | null> {
  if (!env.openaiApiKey) return null
  const meta = ENRICH_META[input.lang]
  const client = openaiClientWithKey()
  const system = [
    `You are a learner dictionary for JyutTranslate (${meta.label}).`,
    'Synthesize ONE unified dictionary entry from typical learner sources (monolingual dict, bilingual gloss, usage guides).',
    'Return ONLY valid JSON:',
    '{"pronunciation":"<ipa or romanization or empty>","senses":[{"gloss":"...","pos":"noun|verb|…","note":"optional"}],"examples":[{"text":"...","translation":"...","note":"optional"}],"usageNotes":["..."]}',
    'Rules:',
    `- Gloss language: ${meta.glossLangHint}.`,
    `- Example sentences in ${meta.exampleIn}; add a short translation when helpful.`,
    '- Prefer senses that fit the CONTEXT phrase when provided (disambiguate Apple fruit vs company, etc.).',
    '- 1–4 senses, 1–3 examples, 0–3 usage notes. Be concise. No markdown.',
  ].join('\n')
  const user = [
    `Lemma (${input.lang}): ${input.text}`,
    input.contextText
      ? `Context (${input.contextLang || 'paired'}): ${input.contextText}`
      : 'Context: (none)',
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
  const offline = offlineSenses(lemma, lang, parsed.contextText)
  if (offline.length) provenance.push('lexicon', 'paired-context')

  const model = await modelEnrich({
    text: lemma,
    lang,
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
    const modelGlosses = model.senses
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
    pronunciation,
    senses,
    examples,
    usageNotes,
    media,
    provenance: uniqueStrings(provenance),
    engine,
  }
}
