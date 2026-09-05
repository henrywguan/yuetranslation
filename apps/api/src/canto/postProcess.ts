import OpenAI from 'openai'
import { attestAgainstLexicon, ATTESTATION_REWRITE_THRESHOLD } from './attest.js'
import { colloquialScore, COLLOQUIAL_REWRITE_THRESHOLD } from './colloquialScore.js'
import { isHanChar } from './han.js'
import { scrubMandarinToYue } from './scrub.js'
import { uniqStrings } from './normalize.js'
import type { PostProcessMeta, TranslateStage } from './types.js'
import { env, llmChatExtras } from '../env.js'

export type HardenResult = {
  text: string
  alternatives: string[]
  meta: PostProcessMeta
}

/**
 * Harden a model (or demo) Cantonese string for live use.
 * The live app only requests final translations (after mic capture ends).
 * - interim (legacy/tests): light Mandarin scrub only
 * - final: scrub → 口語 score → CC-Canto attestation → optional rewrite
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
  let attestation = attestAgainstLexicon(text)
  let rewritten = false

  const looksMandarinish =
    score < COLLOQUIAL_REWRITE_THRESHOLD || /[们們什么什麼怎么怎麼吗嗎正在]/.test(text)
  const weaklyAttested = attestation.coverage < ATTESTATION_REWRITE_THRESHOLD
  // Short lexical headwords (e.g. 翻譯) must not be "clarified" away by attestation rewrite
  // just because CC-Canto lacks the headword — keep the draft unless it looks Mandarin.
  const hanCount = Array.from(text).filter((ch) => isHanChar(ch)).length
  const shortLexicalHeadword = hanCount > 0 && hanCount <= 3 && !looksMandarinish

  const shouldRewrite =
    opts.stage === 'final' &&
    Boolean(opts.client) &&
    !shortLexicalHeadword &&
    (looksMandarinish || weaklyAttested)

  if (shouldRewrite && opts.client) {
    try {
      const rewrittenText = await constrainedYueRewrite(opts.client, text, opts.sourceEn)
      if (rewrittenText && rewrittenText !== text) {
        text = rewrittenText
        rewritten = true
        notes.push(weaklyAttested && !looksMandarinish ? 'rewrite-attest' : 'rewrite')
        const scrub2 = scrubMandarinToYue(text)
        if (scrub2.changed) {
          text = scrub2.text
          notes.push('scrub-after-rewrite')
        }
        score = colloquialScore(text)
        attestation = attestAgainstLexicon(text)
        alternatives = uniqStrings(text, alternatives)
      }
    } catch {
      notes.push('rewrite-failed')
    }
  }

  if (opts.stage === 'final') {
    alternatives = uniqStrings(
      text,
      alternatives.map((a) => scrubMandarinToYue(a).text),
    )
    notes.push(`attest:${attestation.coverage.toFixed(2)}`)
  }

  return {
    text,
    alternatives: opts.stage === 'final' ? alternatives : [],
    meta: {
      dictionaryHit: false,
      scrubbed: notes.some((n) => n.startsWith('scrub')),
      colloquialScore: score,
      attestationCoverage: attestation.coverage,
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
    max_tokens: 240,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    ...llmChatExtras(),
  })
  return completion.choices[0]?.message?.content?.trim() || ''
}
