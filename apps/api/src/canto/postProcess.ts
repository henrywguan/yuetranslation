import OpenAI from 'openai'
import { colloquialScore, COLLOQUIAL_REWRITE_THRESHOLD } from './colloquialScore.js'
import { scrubMandarinToYue } from './scrub.js'
import { uniqStrings } from './normalize.js'
import type { PostProcessMeta, TranslateStage } from './types.js'
import { env } from '../env.js'

export type HardenResult = {
  text: string
  alternatives: string[]
  meta: PostProcessMeta
}

/**
 * Harden a model (or demo) Cantonese string for live use.
 * - interim: light Mandarin scrub only
 * - final: scrub → 口語 score → optional one-shot rewrite if still Mandarin-leaning
 */
export async function hardenYueOutput(opts: {
  text: string
  alternatives?: string[]
  stage: TranslateStage
  /** Original English — helps constrained rewrite. */
  sourceEn?: string
  client?: OpenAI | null
}): Promise<HardenResult> {
  const notes: string[] = []
  let text = opts.text.trim()
  let alternatives = uniqStrings(text, opts.alternatives || [])

  const scrub1 = scrubMandarinToYue(text)
  if (scrub1.changed) {
    notes.push('scrub')
    text = scrub1.text
    alternatives = alternatives.map((a) => scrubMandarinToYue(a).text)
    alternatives = uniqStrings(text, alternatives)
  }

  let score = colloquialScore(text)
  let rewritten = false

  const shouldRewrite =
    opts.stage === 'final' &&
    Boolean(opts.client) &&
    (score < COLLOQUIAL_REWRITE_THRESHOLD || /[们們什么什麼怎么怎麼吗嗎正在]/.test(text))

  if (shouldRewrite && opts.client) {
    try {
      const rewrittenText = await constrainedYueRewrite(opts.client, text, opts.sourceEn)
      if (rewrittenText && rewrittenText !== text) {
        text = rewrittenText
        rewritten = true
        notes.push('rewrite')
        const scrub2 = scrubMandarinToYue(text)
        if (scrub2.changed) {
          text = scrub2.text
          notes.push('scrub-after-rewrite')
        }
        score = colloquialScore(text)
        alternatives = uniqStrings(text, alternatives)
      }
    } catch {
      notes.push('rewrite-failed')
    }
  }

  // Scrub alternatives on finals too.
  if (opts.stage === 'final') {
    alternatives = uniqStrings(
      text,
      alternatives.map((a) => scrubMandarinToYue(a).text),
    )
  }

  return {
    text,
    alternatives: opts.stage === 'final' ? alternatives : [],
    meta: {
      dictionaryHit: false,
      scrubbed: notes.includes('scrub') || notes.includes('scrub-after-rewrite'),
      colloquialScore: score,
      rewritten,
      notes,
    },
  }
}

async function constrainedYueRewrite(client: OpenAI, draft: string, sourceEn?: string) {
  const system = [
    'You fix drafts into colloquial Hong Kong Cantonese (口語粵語).',
    'Not Mandarin, not formal written Chinese.',
    'Prefer 係、唔、喺、咗、緊、啲、㗎、喇、喎、咩、嘢、哋.',
    'Return ONLY the corrected Cantonese sentence.',
  ].join(' ')

  const user = sourceEn
    ? `English: ${sourceEn}\nDraft (may contain Mandarin): ${draft}`
    : `Draft (may contain Mandarin): ${draft}`

  const completion = await client.chat.completions.create({
    model: env.openaiModel,
    temperature: 0.2,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  })
  return completion.choices[0]?.message?.content?.trim() || ''
}
