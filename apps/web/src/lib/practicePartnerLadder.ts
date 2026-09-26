/**
 * Practice Partner lesson ladder.
 * Same spoken card, four Duolingo-style jobs: repeat, listen, translate, finish.
 * A miss drops the retry to repeat (the hint). Session passes climb the rung.
 * Every third pass brings an earlier phrase back.
 */

export const PRACTICE_PARTNER_MOVES = ['repeat', 'listen', 'translate', 'finish'] as const

export type PracticePartnerMove = (typeof PRACTICE_PARTNER_MOVES)[number]

export type PracticePartnerLadderDifficulty = 'new_learner' | 'abc' | 'mainlander'

export const PRACTICE_PARTNER_MOVE_LABEL: Record<PracticePartnerMove, string> = {
  repeat: 'Repeat after me',
  listen: 'Listen, then say',
  translate: 'Say it in Cantonese',
  finish: 'Finish the line',
}

const PASS_XP: Record<PracticePartnerMove, number> = {
  repeat: 10,
  listen: 15,
  translate: 20,
  finish: 25,
}

export function resolvePracticePartnerMove(raw: unknown): PracticePartnerMove {
  const id = String(raw || '').trim()
  return (PRACTICE_PARTNER_MOVES as readonly string[]).includes(id)
    ? (id as PracticePartnerMove)
    : 'repeat'
}

/** Rung from session passes so far (before this card). 0 is the hello. */
export function practicePartnerMoveForPasses(passes: number): PracticePartnerMove {
  if (passes <= 0) return 'repeat'
  if (passes === 1) return 'listen'
  if (passes === 2) return 'translate'
  return 'finish'
}

/** After a win, every third pass reviews the oldest phrase still in the bank. */
export function practicePartnerReviewDue(passesAfterWin: number, remembered: number): boolean {
  return remembered > 0 && passesAfterWin >= 3 && passesAfterWin % 3 === 0
}

export function planPracticePartnerAdvance<T extends { en: string; zh: string; jyutping: string }>(
  passes: number,
  bank: readonly T[],
): { nextMove: PracticePartnerMove; review: T | null } {
  const passesAfterWin = Math.max(0, Math.floor(passes)) + 1
  const review = practicePartnerReviewDue(passesAfterWin, bank.length) ? (bank[0] ?? null) : null
  return { nextMove: practicePartnerMoveForPasses(passesAfterWin), review }
}

export function practicePartnerXpForPass(move: PracticePartnerMove, review: boolean): number {
  return PASS_XP[move] + (review ? 5 : 0)
}

/** Blank the last two characters so “finish the line” has something to say. */
export function finishLineCloze(zh: string): string | null {
  const text = zh.trim()
  const han = [...text].filter((ch) => /\p{Script=Han}/u.test(ch))
  if (han.length < 4) return null
  let dropped = 0
  const chars = [...text]
  for (let i = chars.length - 1; i >= 0 && dropped < 2; i -= 1) {
    if (/\p{Script=Han}/u.test(chars[i] || '')) {
      chars[i] = ''
      dropped += 1
    }
  }
  const shown = chars
    .join('')
    .replace(/\s+/g, '')
    .replace(/[。！？!?…]+$/g, '')
  if (!shown) return null
  return `${shown}……`
}

export type PracticePartnerCardFace = {
  zh: 'full' | 'cloze' | 'hidden'
  en: boolean
  jp: boolean
}

/**
 * What the drill card shows for this rung.
 * New Learner keeps the script on translate. Listen hides it for everyone.
 * A miss should switch the card back to repeat so the model is visible.
 */
export function practicePartnerCardShows(
  move: PracticePartnerMove,
  difficulty: PracticePartnerLadderDifficulty,
  canCloze = true,
): PracticePartnerCardFace {
  if (move === 'repeat') return { zh: 'full', en: true, jp: true }
  if (move === 'listen') return { zh: 'hidden', en: false, jp: false }
  if (move === 'translate') {
    const scaffold = difficulty === 'new_learner'
    return { zh: scaffold ? 'full' : 'hidden', en: true, jp: scaffold }
  }
  if (!canCloze) {
    return { zh: 'hidden', en: true, jp: difficulty === 'new_learner' }
  }
  return {
    zh: 'cloze',
    en: difficulty !== 'mainlander',
    jp: difficulty === 'new_learner',
  }
}
