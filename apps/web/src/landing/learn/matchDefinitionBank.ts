/** Offline word bank for Harbor Quest · Match the Definition arena. */

export type MatchWord = {
  id: string
  han: string
  /** Space-separated Jyutping syllables with tone digits (e.g. `nei5 hou2`). */
  jp: string
  /** English gloss shown as a choice. */
  def: string
}

/**
 * Starter set from Open Cantonese tone drills + early Harbor Quest clips.
 * Definitions are short learner glosses (not full dictionary senses).
 */
export const MATCH_DEFINITION_BANK: MatchWord[] = [
  { id: 'si1', han: '詩', jp: 'si1', def: 'poem' },
  { id: 'si2', han: '史', jp: 'si2', def: 'history' },
  { id: 'si3', han: '試', jp: 'si3', def: 'to try / attempt' },
  { id: 'si4', han: '時', jp: 'si4', def: 'time' },
  { id: 'si5', han: '市', jp: 'si5', def: 'market' },
  { id: 'si6', han: '是', jp: 'si6', def: 'is / yes' },
  { id: 'maai5', han: '買', jp: 'maai5', def: 'to buy' },
  { id: 'maai6', han: '賣', jp: 'maai6', def: 'to sell' },
  { id: 'nei5hou2', han: '你好', jp: 'nei5 hou2', def: 'hello' },
  { id: 'baa1', han: '爸', jp: 'baa1', def: 'dad / father' },
  { id: 'ngo5', han: '我', jp: 'ngo5', def: 'I / me' },
  { id: 'nei5', han: '你', jp: 'nei5', def: 'you' },
  { id: 'hou2', han: '好', jp: 'hou2', def: 'good' },
  { id: 'jam2', han: '飲', jp: 'jam2', def: 'to drink' },
  { id: 'sik6', han: '食', jp: 'sik6', def: 'to eat' },
  { id: 'heoi3', han: '去', jp: 'heoi3', def: 'to go' },
  { id: 'lai4', han: '來', jp: 'lai4', def: 'to come' },
  { id: 'daai6', han: '大', jp: 'daai6', def: 'big' },
  { id: 'sai3', han: '細', jp: 'sai3', def: 'small' },
  { id: 'jau5', han: '有', jp: 'jau5', def: 'to have' },
]

export const MATCH_ROUND_SECONDS = 15
export const MATCH_GOLD_PER_HIT = 10

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j]!, out[i]!]
  }
  return out
}

export type MatchRound = {
  word: MatchWord
  /** Three definitions; exactly one matches `word.def`. */
  choices: string[]
  correctIndex: number
}

/** Build one timed round with two distractor glosses from the bank. */
export function buildMatchRound(excludeId?: string): MatchRound {
  const pool = excludeId
    ? MATCH_DEFINITION_BANK.filter((w) => w.id !== excludeId)
    : MATCH_DEFINITION_BANK
  const word = pool[Math.floor(Math.random() * pool.length)]!
  const distractors = shuffle(
    MATCH_DEFINITION_BANK.filter((w) => w.id !== word.id).map((w) => w.def),
  ).slice(0, 2)
  const choices = shuffle([word.def, ...distractors])
  return {
    word,
    choices,
    correctIndex: choices.indexOf(word.def),
  }
}
