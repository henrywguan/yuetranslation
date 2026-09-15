/** Offline word bank for Harbor Quest · Match the Definition arena. */

export type MatchDifficulty = 'easy' | 'medium' | 'hard'

export type MatchWord = {
  id: string
  han: string
  /** Space-separated Jyutping syllables with tone digits (e.g. `nei5 hou2`). */
  jp: string
  /** English gloss shown as a choice. */
  def: string
  difficulty: MatchDifficulty
}

export type MatchDifficultyConfig = {
  id: MatchDifficulty
  label: { en: string; zh: string }
  blurb: { en: string; zh: string }
  /** Seconds on the clock per round. */
  seconds: number
  /** Arena gold awarded per correct hit. */
  goldPerHit: number
}

/** Easy = simple words · Medium = phrases · Hard = full sentences. */
export const MATCH_DIFFICULTY: Record<MatchDifficulty, MatchDifficultyConfig> = {
  easy: {
    id: 'easy',
    label: { en: 'Easy', zh: '簡單' },
    blurb: { en: 'Simple words', zh: '簡單詞語' },
    seconds: 15,
    goldPerHit: 10,
  },
  medium: {
    id: 'medium',
    label: { en: 'Medium', zh: '中等' },
    blurb: { en: 'Everyday phrases', zh: '日常短語' },
    seconds: 22,
    goldPerHit: 18,
  },
  hard: {
    id: 'hard',
    label: { en: 'Hard', zh: '困難' },
    blurb: { en: 'Full sentences', zh: '完整句子' },
    seconds: 30,
    goldPerHit: 30,
  },
}

export const MATCH_DIFFICULTIES: MatchDifficulty[] = ['easy', 'medium', 'hard']

/**
 * Starter set from Open Cantonese + Harbor Quest clips.
 * Definitions are short learner glosses (not full dictionary senses).
 */
export const MATCH_DEFINITION_BANK: MatchWord[] = [
  // —— Easy · single words ——
  { id: 'si1', han: '詩', jp: 'si1', def: 'poem', difficulty: 'easy' },
  { id: 'si2', han: '史', jp: 'si2', def: 'history', difficulty: 'easy' },
  { id: 'si3', han: '試', jp: 'si3', def: 'to try / attempt', difficulty: 'easy' },
  { id: 'si4', han: '時', jp: 'si4', def: 'time', difficulty: 'easy' },
  { id: 'si5', han: '市', jp: 'si5', def: 'market', difficulty: 'easy' },
  { id: 'si6', han: '是', jp: 'si6', def: 'is / yes', difficulty: 'easy' },
  { id: 'maai5', han: '買', jp: 'maai5', def: 'to buy', difficulty: 'easy' },
  { id: 'maai6', han: '賣', jp: 'maai6', def: 'to sell', difficulty: 'easy' },
  { id: 'baa1', han: '爸', jp: 'baa1', def: 'dad / father', difficulty: 'easy' },
  { id: 'ngo5', han: '我', jp: 'ngo5', def: 'I / me', difficulty: 'easy' },
  { id: 'nei5', han: '你', jp: 'nei5', def: 'you', difficulty: 'easy' },
  { id: 'hou2', han: '好', jp: 'hou2', def: 'good', difficulty: 'easy' },
  { id: 'jam2', han: '飲', jp: 'jam2', def: 'to drink', difficulty: 'easy' },
  { id: 'sik6', han: '食', jp: 'sik6', def: 'to eat', difficulty: 'easy' },
  { id: 'heoi3', han: '去', jp: 'heoi3', def: 'to go', difficulty: 'easy' },
  { id: 'lai4', han: '來', jp: 'lai4', def: 'to come', difficulty: 'easy' },
  { id: 'daai6', han: '大', jp: 'daai6', def: 'big', difficulty: 'easy' },
  { id: 'sai3', han: '細', jp: 'sai3', def: 'small', difficulty: 'easy' },
  { id: 'jau5', han: '有', jp: 'jau5', def: 'to have', difficulty: 'easy' },
  { id: 'mou4', han: '冇', jp: 'mou4', def: 'to not have', difficulty: 'easy' },
  { id: 'teng1', han: '聽', jp: 'teng1', def: 'to listen', difficulty: 'easy' },
  { id: 'gong2', han: '講', jp: 'gong2', def: 'to speak', difficulty: 'easy' },
  { id: 'duk6', han: '讀', jp: 'duk6', def: 'to read aloud', difficulty: 'easy' },
  { id: 'tai2', han: '睇', jp: 'tai2', def: 'to look / watch', difficulty: 'easy' },
  { id: 'se2', han: '寫', jp: 'se2', def: 'to write', difficulty: 'easy' },
  { id: 'gaan2', han: '揀', jp: 'gaan2', def: 'to choose', difficulty: 'easy' },
  { id: 'jat1', han: '一', jp: 'jat1', def: 'one', difficulty: 'easy' },
  { id: 'gwaa1', han: '瓜', jp: 'gwaa1', def: 'melon / gourd', difficulty: 'easy' },

  // —— Medium · phrases ——
  { id: 'nei5hou2', han: '你好', jp: 'nei5 hou2', def: 'hello (polite)', difficulty: 'medium' },
  { id: 'haa1lou2', han: '哈佬', jp: 'haa1 lou2', def: 'hello (casual)', difficulty: 'medium' },
  { id: 'm4goi1', han: '唔該', jp: 'm4 goi1', def: 'thanks (for a service)', difficulty: 'medium' },
  { id: 'do1ze6', han: '多謝', jp: 'do1 ze6', def: 'thanks (for a gift / praise)', difficulty: 'medium' },
  { id: 'zoi3gin3', han: '再見', jp: 'zoi3 gin3', def: 'goodbye', difficulty: 'medium' },
  { id: 'jat1zan6gin3', han: '一陣見', jp: 'jat1 zan6 gin3', def: 'see you later (same day)', difficulty: 'medium' },
  { id: 'baa1si2', han: '巴士', jp: 'baa1 si2', def: 'bus', difficulty: 'medium' },
  { id: 'so1faa2', han: '梳化', jp: 'so1 faa2', def: 'sofa', difficulty: 'medium' },
  { id: 'hai6mai6', han: '係咪？', jp: 'hai6 mai6', def: 'is that right?', difficulty: 'medium' },
  { id: 'ngaam1laa3', han: '啱喇', jp: 'ngaam1 laa3', def: 'correct / that’s it', difficulty: 'medium' },
  { id: 'gan1zyu6', han: '跟住我讀', jp: 'gan1 zyu6 ngo5 duk6', def: 'repeat after me', difficulty: 'medium' },
  { id: 'wai2', han: '喂？', jp: 'wai2', def: 'hello? (on the phone)', difficulty: 'medium' },
  { id: 'kuk1kei4', han: '曲奇餅', jp: 'kuk1 kei4 beng2', def: 'cookie', difficulty: 'medium' },
  { id: 'm4hou2ji3si1', han: '唔好意思', jp: 'm4 hou2 ji3 si1', def: 'sorry / excuse me', difficulty: 'medium' },
  { id: 'm4sai2haak3hei3', han: '唔使客氣', jp: 'm4 sai2 haak3 hei3', def: 'you’re welcome', difficulty: 'medium' },
  { id: 'dim2joeng2', han: '點樣？', jp: 'dim2 joeng2', def: 'how? / in what way?', difficulty: 'medium' },
  { id: 'gei2do1cin2', han: '幾多錢？', jp: 'gei2 do1 cin2', def: 'how much does it cost?', difficulty: 'medium' },
  { id: 'hou2sik6', han: '好食', jp: 'hou2 sik6', def: 'delicious', difficulty: 'medium' },
  { id: 'jam2caa4', han: '飲茶', jp: 'jam2 caa4', def: 'to drink tea / yum cha', difficulty: 'medium' },
  { id: 'zou2san4', han: '早晨', jp: 'zou2 san4', def: 'good morning', difficulty: 'medium' },

  // —— Hard · sentences ——
  {
    id: 'cing2man6duk6',
    han: '請問呢個字點讀呀？',
    jp: 'cing2 man6 ni1 go3 zi6 dim2 duk6 aa3',
    def: 'Excuse me, how do you read this character?',
    difficulty: 'hard',
  },
  {
    id: 'zau2sin1',
    han: '走先喇，再見。',
    jp: 'zau2 sin1 laa3, zoi3 gin3',
    def: 'I’ve got to go — goodbye.',
    difficulty: 'hard',
  },
  {
    id: 'ngaam1baasi',
    han: '啱喇，就係巴士喇。',
    jp: 'ngaam1 laa3, zau6 hai6 baa1 si2 laa3',
    def: 'Correct — that’s a bus.',
    difficulty: 'hard',
  },
  {
    id: 'm4hai6zoi3si3',
    han: '唔係巴士呀，再試吓吖。',
    jp: 'm4 hai6 baa1 si2 aa3, zoi3 si3 haa5 aa1',
    def: 'That’s not a bus — try again.',
    difficulty: 'hard',
  },
  {
    id: 'ngaam1hou2',
    han: '啱喇，非常好！',
    jp: 'ngaam1 laa3, fei1 soeng4 hou2',
    def: 'That’s right — very good!',
    difficulty: 'hard',
  },
  {
    id: 'm4ngaam1',
    han: '唔啱呀，再試吓吖。',
    jp: 'm4 ngaam1 aa3, zoi3 si3 haa5 aa1',
    def: 'Not quite — try again.',
    difficulty: 'hard',
  },
  {
    id: 'ngo5heoi3sik6',
    han: '我去食飯喇。',
    jp: 'ngo5 heoi3 sik6 faan6 laa3',
    def: 'I’m going to eat (a meal) now.',
    difficulty: 'hard',
  },
  {
    id: 'nei5jam2mat1',
    han: '你想飲咩呀？',
    jp: 'nei5 soeng2 jam2 me1 aa3',
    def: 'What would you like to drink?',
    difficulty: 'hard',
  },
  {
    id: 'gam1jat6hou2tin1',
    han: '今日天氣好好。',
    jp: 'gam1 jat6 tin1 hei3 hou2 hou2',
    def: 'The weather is really nice today.',
    difficulty: 'hard',
  },
  {
    id: 'm4goi1maai5daan1',
    han: '唔該，埋單。',
    jp: 'm4 goi1, maai4 daan1',
    def: 'Excuse me — the bill, please.',
    difficulty: 'hard',
  },
  {
    id: 'ngo5m4ming4',
    han: '我唔明，可唔可以講多次？',
    jp: 'ngo5 m4 ming4, ho2 m4 ho2 ji5 gong2 do1 ci3',
    def: 'I don’t understand — can you say it again?',
    difficulty: 'hard',
  },
  {
    id: 'nei5heoi3bin1',
    han: '你而家去邊度呀？',
    jp: 'nei5 ji4 gaa1 heoi3 bin1 dou6 aa3',
    def: 'Where are you going right now?',
    difficulty: 'hard',
  },
]

/** @deprecated Prefer MATCH_DIFFICULTY.easy — kept for older smoke imports. */
export const MATCH_ROUND_SECONDS = MATCH_DIFFICULTY.easy.seconds
/** @deprecated Prefer MATCH_DIFFICULTY.easy — kept for older smoke imports. */
export const MATCH_GOLD_PER_HIT = MATCH_DIFFICULTY.easy.goldPerHit

/** Ferry coins granted per 1 arena gold exchanged. */
export const HARBOR_GOLD_TO_COINS = 1

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j]!, out[i]!]
  }
  return out
}

export function matchBankFor(difficulty: MatchDifficulty): MatchWord[] {
  return MATCH_DEFINITION_BANK.filter((w) => w.difficulty === difficulty)
}

export type MatchRound = {
  word: MatchWord
  difficulty: MatchDifficulty
  /** Three definitions; exactly one matches `word.def`. */
  choices: string[]
  correctIndex: number
  seconds: number
  goldPerHit: number
}

/** Build one timed round with two distractor glosses from the same difficulty. */
export function buildMatchRound(
  difficulty: MatchDifficulty,
  excludeId?: string,
): MatchRound {
  const cfg = MATCH_DIFFICULTY[difficulty]
  const bank = matchBankFor(difficulty)
  const pool = excludeId ? bank.filter((w) => w.id !== excludeId) : bank
  const source = pool.length > 0 ? pool : bank
  const word = source[Math.floor(Math.random() * source.length)]!
  const distractors = shuffle(bank.filter((w) => w.id !== word.id).map((w) => w.def)).slice(0, 2)
  // If a tiny bank somehow lacks distractors, pad from other difficulties.
  while (distractors.length < 2) {
    const extra = MATCH_DEFINITION_BANK.find(
      (w) => w.id !== word.id && !distractors.includes(w.def) && w.def !== word.def,
    )
    if (!extra) break
    distractors.push(extra.def)
  }
  const choices = shuffle([word.def, ...distractors])
  return {
    word,
    difficulty,
    choices,
    correctIndex: choices.indexOf(word.def),
    seconds: cfg.seconds,
    goldPerHit: cfg.goldPerHit,
  }
}
