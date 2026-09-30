/**
 * Practice Partner performed turn.
 * One SSML clip: styled reaction, steady loud phrase, short cue.
 * The client never sends raw SSML. Phrase text is the drill 漢字.
 */
import { z } from 'zod'

export const PRACTICE_PARTNER_DELIVERIES = [
  'friendly',
  'pleased',
  'warm',
  'proud',
  'critical',
  'sharper',
  'harsh',
] as const

export type PracticePartnerDelivery = (typeof PRACTICE_PARTNER_DELIVERIES)[number]

export type PracticePartnerBeats = {
  reaction: string
  phrase: string
  cue: string
  delivery: PracticePartnerDelivery
}

export type PracticePartnerLastMiss = {
  said: string
  zh: string
  en: string
}

const REACTION_MAX = 280
const CUE_MAX = 180
const PHRASE_MAX = 200

/** Warmth on a pass or opening. Fail heat ignores the pass streak. */
export function deliveryForTurn(
  verdict: 'none' | 'pass' | 'fail',
  tone: { streak: number; missStreak: number },
): PracticePartnerDelivery {
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

/** Fail keeps the attempt. A review pass speaks that earlier line. */
export function lockPracticePartnerPhrase(opts: {
  verdict: 'none' | 'pass' | 'fail'
  drillZh: string
  activeZh?: string | null
  reviewZh?: string | null
}): string {
  if (opts.verdict === 'fail' && opts.activeZh?.trim()) return opts.activeZh.trim()
  if (opts.verdict === 'pass' && opts.reviewZh?.trim()) return opts.reviewZh.trim()
  return opts.drillZh.trim()
}

/**
 * Peel a standalone phrase beat out of an old one-string reply.
 * Leaves interior mentions alone so a roast can still say the word.
 */
export function peelPhrase(
  text: string,
  phrase: string,
): { before: string; after: string; peeled: boolean } {
  const raw = text.trim()
  const target = phrase.trim()
  if (!raw || !target) return { before: raw, after: '', peeled: false }
  const idx = raw.indexOf(target)
  if (idx < 0) return { before: raw, after: '', peeled: false }
  const before = raw.slice(0, idx)
  const after = raw.slice(idx + target.length)
  const leftOk = before.length === 0 || /[\s。！？!?.,，、；;：:]$/.test(before)
  const rightOk = after.length === 0 || /^[\s。！？!?.,，、；;：:]/.test(after)
  if (!leftOk || !rightOk) return { before: raw, after: '', peeled: false }
  return {
    before: before.replace(/[\s。！？!?.,，、；;：:]+$/g, '').trim(),
    after: after.replace(/^[\s。！？!?.,，、；;：:]+/g, '').trim(),
    peeled: true,
  }
}

export function partnerCaption(beats: Pick<PracticePartnerBeats, 'reaction' | 'phrase' | 'cue'>): string {
  return [beats.reaction, beats.phrase, beats.cue]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 600)
}

export function composePracticePartnerBeats(input: {
  reaction?: string
  cue?: string
  speak?: string
  phrase: string
  verdict: 'none' | 'pass' | 'fail'
  streak: number
  missStreak: number
}): PracticePartnerBeats {
  const phrase = input.phrase.trim().slice(0, PHRASE_MAX)
  let reaction = (input.reaction || '').trim()
  let cue = (input.cue || '').trim()
  if (!reaction) {
    const peeled = peelPhrase(input.speak || '', phrase)
    reaction = peeled.peeled ? peeled.before : (input.speak || '').trim()
    if (!cue && peeled.peeled) cue = peeled.after
  } else {
    const peeled = peelPhrase(reaction, phrase)
    if (peeled.peeled) {
      reaction = peeled.before
      if (!cue && peeled.after) cue = peeled.after
    }
    const cuePeeled = peelPhrase(cue, phrase)
    if (cuePeeled.peeled) {
      cue = [cuePeeled.before, cuePeeled.after].filter(Boolean).join(' ')
    }
  }
  return {
    reaction: reaction.replace(/\s+/g, ' ').trim().slice(0, REACTION_MAX),
    phrase,
    cue: cue.replace(/\s+/g, ' ').trim().slice(0, CUE_MAX),
    delivery: deliveryForTurn(input.verdict, {
      streak: input.streak,
      missStreak: input.missStreak,
    }),
  }
}

const DELIVERY_PROSODY: Record<PracticePartnerDelivery, { rate: string; pitch: string }> = {
  friendly: { rate: '+0%', pitch: '+0%' },
  pleased: { rate: '+4%', pitch: '+8%' },
  warm: { rate: '-6%', pitch: '+10%' },
  proud: { rate: '-12%', pitch: '+14%' },
  critical: { rate: '+8%', pitch: '-6%' },
  sharper: { rate: '+16%', pitch: '-12%' },
  harsh: { rate: '-10%', pitch: '-18%' },
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function prosody(text: string, rate: string, pitch: string, volume: 'loud' | 'x-loud'): string {
  const body = escapeXml(text.trim())
  if (!body) return ''
  return `<prosody rate="${rate}" pitch="${pitch}" volume="${volume}">${body}</prosody>`
}

/** Inner SSML. Reaction and cue follow delivery. The phrase resets to steady x-loud. */
export function buildPerformedSpeakInner(beats: PracticePartnerBeats): string {
  const mood = DELIVERY_PROSODY[beats.delivery] || DELIVERY_PROSODY.friendly
  const parts: string[] = []
  const reaction = prosody(beats.reaction, mood.rate, mood.pitch, 'loud')
  if (reaction) parts.push(reaction)
  const phrase = prosody(beats.phrase, '-4%', '+0%', 'x-loud')
  if (phrase) {
    if (parts.length) parts.push('<break time="360ms"/>')
    parts.push(phrase)
  }
  const cue = prosody(beats.cue, mood.rate, mood.pitch, 'loud')
  if (cue) {
    if (parts.length) parts.push('<break time="320ms"/>')
    parts.push(cue)
  }
  return parts.join('')
}

export function buildPerformedSsml(xmlLang: string, voice: string, beats: PracticePartnerBeats): string {
  const inner = buildPerformedSpeakInner(beats)
  return `<speak version="1.0" xml:lang="${escapeXml(xmlLang)}"><voice name="${escapeXml(voice)}">${inner}</voice></speak>`
}

export function performanceCacheToken(beats: PracticePartnerBeats): string {
  return `${beats.delivery}\n${beats.reaction}\n${beats.phrase}\n${beats.cue}`
}

export function spokenPerformanceChars(beats: Pick<PracticePartnerBeats, 'reaction' | 'phrase' | 'cue'>): number {
  return beats.reaction.trim().length + beats.phrase.trim().length + beats.cue.trim().length
}

const plain = (max: number) =>
  z
    .string()
    .max(max)
    .transform((s) => s.replace(/\s+/g, ' ').trim())

export const TtsPerformanceSchema = z
  .object({
    delivery: z.enum(PRACTICE_PARTNER_DELIVERIES),
    reaction: plain(REACTION_MAX),
    phrase: plain(PHRASE_MAX),
    cue: plain(CUE_MAX),
  })
  .refine((value) => value.phrase.length > 0, { path: ['phrase'], message: 'phrase required' })

/** Absent performance keeps the plain TTS path. A present object must be allowlisted. */
export function parseTtsPerformance(raw: unknown): PracticePartnerBeats | null {
  if (raw == null || raw === false) return null
  return TtsPerformanceSchema.parse(raw)
}

export function lastMissLine(miss: PracticePartnerLastMiss | null | undefined): string {
  if (!miss?.said || !miss.zh) return ''
  const said = miss.said.replace(/\s+/g, ' ').replace(/[\[\]]/g, ' ').trim().slice(0, 400)
  const zh = miss.zh.replace(/\s+/g, ' ').trim().slice(0, 200)
  const en = (miss.en || '').replace(/\s+/g, ' ').replace(/[\[\]]/g, ' ').trim().slice(0, 200)
  if (!said || !zh) return ''
  return [
    `[LAST MISS] Previous attempt: they said “${said}” for ZH ${zh}${en ? ` / EN ${en}` : ''}.`,
    'Name the concrete difference if you mention it (dropped tone, English leak, wrong word).',
    'This note is for THIS judgment only. A pass streak does NOT soften a miss. If this attempt passes, do not reopen the roast.',
  ].join(' ')
}
