/**
 * Client side of the Practice Partner performed turn.
 * Beats stay plain text. The server builds SSML.
 */

export const PARTNER_DELIVERIES = [
  'friendly',
  'pleased',
  'warm',
  'proud',
  'critical',
  'sharper',
  'harsh',
] as const

export type PartnerDelivery = (typeof PARTNER_DELIVERIES)[number]

export type PartnerPerformance = {
  reaction: string
  phrase: string
  cue: string
  delivery: PartnerDelivery
}

export type PartnerLastMiss = {
  said: string
  zh: string
  en: string
}

const DELIVERY_SET = new Set<string>(PARTNER_DELIVERIES)

export function isPartnerDelivery(value: string): value is PartnerDelivery {
  return DELIVERY_SET.has(value)
}

/** Same ladder as the server. A pass streak never softens a fail. */
export function deliveryForPartnerTurn(
  verdict: 'none' | 'pass' | 'fail',
  tone: { streak: number; missStreak: number },
): PartnerDelivery {
  if (verdict === 'fail') {
    if (tone.missStreak >= 2) return 'harsh'
    if (tone.missStreak >= 1) return 'sharper'
    return 'critical'
  }
  if (tone.streak >= 4) return 'proud'
  if (tone.streak >= 2) return 'warm'
  if (tone.streak >= 1) return 'pleased'
  return 'friendly'
}

export function partnerCaption(beats: Pick<PartnerPerformance, 'reaction' | 'phrase' | 'cue'>): string {
  return [beats.reaction, beats.phrase, beats.cue]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function withLockedPhrase(beats: PartnerPerformance, phrase: string): PartnerPerformance {
  const next = phrase.trim()
  if (!next || next === beats.phrase) return beats
  return { ...beats, phrase: next }
}

/** First clause, capped, so a hidden rung only reveals a retry piece. */
export function retryChunk(zh: string): string {
  const text = zh.trim()
  if (!text) return ''
  const clause = text.split(/[，,、；;。！？!?]/)[0]?.trim() || text
  const chars = [...clause]
  if (chars.length <= 8) return clause
  return chars.slice(0, 6).join('')
}

/**
 * How long the orb stays on the reaction face before the phrase beat.
 * Roughly 85ms per character plus the SSML break. Mood still changes when
 * the learner prefers reduced motion.
 */
export function reactionHoldMs(reaction: string): number {
  const chars = [...reaction.trim()].length
  return Math.min(4200, Math.max(480, chars * 85 + 360))
}

export function asPartnerPerformance(raw: unknown): PartnerPerformance | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  const delivery = typeof row.delivery === 'string' ? row.delivery : ''
  const reaction = typeof row.reaction === 'string' ? row.reaction.trim() : ''
  const phrase = typeof row.phrase === 'string' ? row.phrase.trim() : ''
  const cue = typeof row.cue === 'string' ? row.cue.trim() : ''
  if (!phrase || !isPartnerDelivery(delivery)) return null
  return { delivery, reaction: reaction.slice(0, 280), phrase: phrase.slice(0, 200), cue: cue.slice(0, 180) }
}

export type PartnerCaptionScript = {
  zh: string
  jyutping: string
}

/** What the subtitle band shows for the current phrase. */
export type PartnerCaptionLayout = {
  /** Largest line. English gloss for New Learner. Empty when the phrase script is the primary. */
  primaryText: string
  /** 漢字 plus Jyutping when that pair is the primary caption (ABC). */
  primaryScript: PartnerCaptionScript | null
  /** Spoken coaching in the primary language, above the largest line. */
  coachText: string
  /** English gloss when it is the secondary caption (ABC). */
  secondaryText: string
  /** 漢字 plus Jyutping when that pair is the secondary caption (New Learner). */
  secondaryScript: PartnerCaptionScript | null
}

function tidyCaption(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

function withoutPhrase(text: string, phrase: string): string {
  const raw = tidyCaption(text)
  const target = tidyCaption(phrase)
  if (!raw || !target) return raw
  return tidyCaption(raw.split(target).join(' '))
}

/**
 * New Learner: English is the large caption, 漢字 and Jyutping stay visible above it.
 * ABC: 漢字 and Jyutping are the large caption, English sits above them.
 * Mainlander: the spoken Chinese line only.
 */
export function partnerCaptionLayout(input: {
  difficulty: 'new_learner' | 'abc' | 'mainlander'
  en: string
  zh: string
  jyutping: string
  spoken?: string | null
  reaction?: string | null
  cue?: string | null
}): PartnerCaptionLayout {
  const en = tidyCaption(input.en)
  const zh = tidyCaption(input.zh)
  const jyutping = tidyCaption(input.jyutping)
  const spoken = tidyCaption(input.spoken || '')
  const coach = tidyCaption(
    [withoutPhrase(input.reaction || '', zh), withoutPhrase(input.cue || '', zh)].filter(Boolean).join(' '),
  )
  const script = zh ? { zh, jyutping } : null

  if (input.difficulty === 'mainlander') {
    return {
      primaryText: spoken || zh,
      primaryScript: null,
      coachText: '',
      secondaryText: '',
      secondaryScript: null,
    }
  }

  if (input.difficulty === 'abc') {
    return {
      primaryText: '',
      primaryScript: script,
      coachText: coach || withoutPhrase(spoken, zh),
      secondaryText: en,
      secondaryScript: null,
    }
  }

  const gloss = en || withoutPhrase(spoken, zh) || spoken
  const coachText =
    coach && gloss && coach.toLowerCase() === gloss.toLowerCase() ? '' : coach
  return {
    primaryText: gloss,
    primaryScript: null,
    coachText,
    secondaryText: '',
    secondaryScript: script,
  }
}

export function cleanPartnerLastMiss(raw: PartnerLastMiss | null | undefined): PartnerLastMiss | null {
  if (!raw) return null
  const said = raw.said.replace(/\s+/g, ' ').trim().slice(0, 400)
  const zh = raw.zh.replace(/\s+/g, ' ').trim().slice(0, 200)
  const en = raw.en.replace(/\s+/g, ' ').trim().slice(0, 200)
  if (!said || !zh || !en) return null
  return { said, zh, en }
}
