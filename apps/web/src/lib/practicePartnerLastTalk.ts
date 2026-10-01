/**
 * The last talk the learner opened. Speak on the companion stage returns here.
 * The path stays on Path.
 */
import { practicePartnerSituation, type PracticePartnerSituationId } from './practicePartnerSituation'

const KEY = 'yue-practice-partner-last-talk-v1'

export type PartnerLastTalk =
  | { kind: 'open' }
  | { kind: 'situation'; situation: PracticePartnerSituationId }

export function readLastTalk(): PartnerLastTalk | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { kind?: string; situation?: string }
    if (parsed.kind === 'open') return { kind: 'open' }
    if (parsed.kind === 'situation' && practicePartnerSituation(parsed.situation)) {
      return { kind: 'situation', situation: parsed.situation as PracticePartnerSituationId }
    }
  } catch {
    /* ignore a bad cache */
  }
  return null
}

export function writeLastTalk(talk: PartnerLastTalk) {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(KEY, JSON.stringify(talk))
  } catch {
    /* private mode */
  }
}
