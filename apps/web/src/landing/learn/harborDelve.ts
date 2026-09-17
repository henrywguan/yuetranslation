/**
 * Harbor Quest · 港灣 companion delve (offline coached practice).
 * Scripted coach — no paid LLM. Practice Partner chat remains admin / future.
 */
export type HarborDelveCoachLine = { en: string; zh: string }

export type HarborDelveRound = {
  id: string
  prompt: HarborDelveCoachLine
  /** Optional TTS Han for SpeakButton. */
  hearHan?: string
  choices: { id: string; label: string; sub?: string }[]
  correctId: string
  coachOk: HarborDelveCoachLine
  coachNo: HarborDelveCoachLine
}

export const HARBOR_DELVE_COMPANION = {
  id: 'gangwan',
  name: { en: '港灣', zh: '港灣' },
  blurb: {
    en: 'Your Cantonese coach when no sailor is docked nearby.',
    zh: '碼頭無人時，陪你練粵語。',
  },
} as const

/** Coins per correct delve answer (alongside correctCount drip). */
export const HARBOR_DELVE_COINS_PER_HIT = 6

/** Title awarded on first completed delve. */
export const HARBOR_DELVE_CLEAR_TITLE = 'title-harbor-coach' as const

const BANK: HarborDelveRound[] = [
  {
    id: 'tone-si1',
    prompt: {
      en: '港灣: Hear 詩 — which tone number is this?',
      zh: '港灣：聽「詩」——呢個係第幾聲？',
    },
    hearHan: '詩',
    choices: [
      { id: '1', label: '1', sub: '˥ high level' },
      { id: '2', label: '2', sub: '˧˥ rising' },
      { id: '3', label: '3', sub: '˧ mid' },
      { id: '6', label: '6', sub: '˨ low' },
    ],
    correctId: '1',
    coachOk: {
      en: 'Yes — si1, high and flat. Keep that shape.',
      zh: '啱啦——si1，高而平。記住個形。',
    },
    coachNo: {
      en: 'That was tone 1 (˥). Try matching the high flat line again.',
      zh: '呢個係第1聲（˥）。再試對高平線。',
    },
  },
  {
    id: 'tone-si2',
    prompt: {
      en: '港灣: 史 — rising or falling?',
      zh: '港灣：「史」——升定降？',
    },
    hearHan: '史',
    choices: [
      { id: 'rise', label: 'Rising', sub: 'tone 2 ˧˥' },
      { id: 'fall', label: 'Falling', sub: 'tone 4 ˨˩' },
      { id: 'level', label: 'Level', sub: 'tone 1 ˥' },
    ],
    correctId: 'rise',
    coachOk: {
      en: 'si2 rises — like asking a quick question.',
      zh: 'si2 向上升——好似輕輕問句。',
    },
    coachNo: {
      en: '史 is si2 — a mid-to-high rise.',
      zh: '「史」係 si2——由中升到高。',
    },
  },
  {
    id: 'init-p',
    prompt: {
      en: '港灣: Which initial has the strong puff of air?',
      zh: '港灣：邊個聲母有強送氣？',
    },
    choices: [
      { id: 'b', label: 'b', sub: 'almost no puff' },
      { id: 'p', label: 'p', sub: 'strong puff' },
      { id: 'm', label: 'm', sub: 'nasal' },
    ],
    correctId: 'p',
    coachOk: {
      en: 'p flutters the paper — aspirated. b barely does.',
      zh: 'p 會吹動紙——送氣；b 幾乎唔會。',
    },
    coachNo: {
      en: 'Aspirated pair: p (puff) vs b (no puff).',
      zh: '送氣對：p（有氣）對 b（冇氣）。',
    },
  },
  {
    id: 'final-aa',
    prompt: {
      en: '港灣: Long open “ah” as in father — which Jyutping final?',
      zh: '港灣：好似 father 嘅長「啊」——邊個韻母？',
    },
    choices: [
      { id: 'a', label: 'a', sub: 'short' },
      { id: 'aa', label: 'aa', sub: 'long open' },
      { id: 'e', label: 'e', sub: 'different place' },
    ],
    correctId: 'aa',
    coachOk: {
      en: 'Always aa for that long open vowel in Jyutping.',
      zh: '粵拼入面呢個長開音一律寫 aa。',
    },
    coachNo: {
      en: 'Use aa — never bare a for the long open “ah.”',
      zh: '要用 aa——長開「啊」唔好只寫 a。',
    },
  },
  {
    id: 'jp-tone-digit',
    prompt: {
      en: '港灣: In Jyutping nei5, what does the 5 mark?',
      zh: '港灣：粵拼 nei5 入面，5 代表咩？',
    },
    hearHan: '你',
    choices: [
      { id: 'tone', label: 'Tone', sub: 'pitch shape' },
      { id: 'length', label: 'Length', sub: 'vowel duration' },
      { id: 'stress', label: 'Stress', sub: 'English stress' },
    ],
    correctId: 'tone',
    coachOk: {
      en: 'The digit is the tone — one of six Cantonese shapes.',
      zh: '個數字就係聲調——粵語六聲之一。',
    },
    coachNo: {
      en: '5 is the tone number, not length or English stress.',
      zh: '5 係聲調編號，唔係長度定英文重音。',
    },
  },
  {
    id: 'colloq-mgoi',
    prompt: {
      en: '港灣: Buying coffee — which feels more natural in HK?',
      zh: '港灣：買咖啡——邊句喺香港更自然？',
    },
    choices: [
      { id: 'mgoi', label: '唔該', sub: 'thanks / please (service)' },
      { id: 'xiexie', label: '謝謝', sub: 'Mandarin default' },
      { id: 'please', label: 'Please', sub: 'English only' },
    ],
    correctId: 'mgoi',
    coachOk: {
      en: '唔該 for service moments — classic harbor manners.',
      zh: '服務場合用「唔該」——碼頭禮數。',
    },
    coachNo: {
      en: 'Prefer 唔該 with staff; 多謝 for gifts or praise.',
      zh: '對職員多用「唔該」；禮物／讚美先用「多謝」。',
    },
  },
]

function mulberry(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 0x100000000
  }
}

/** Build a short delve (default 5 rounds) from the coach bank. */
export function buildHarborDelve(seed = Date.now(), count = 5): HarborDelveRound[] {
  const rng = mulberry(seed)
  const pool = [...BANK]
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const tmp = pool[i]!
    pool[i] = pool[j]!
    pool[j] = tmp
  }
  const n = Math.max(1, Math.min(count, pool.length))
  return pool.slice(0, n)
}

export const HARBOR_DELVE_INTRO: HarborDelveCoachLine = {
  en: '港灣: Dock’s quiet — let’s drill tones and Jyutping together. Tap when you’re ready.',
  zh: '港灣：碼頭靜靜地——一齊練聲調同粵拼。準備好就撳。',
}

export const HARBOR_DELVE_OUTRO_OK: HarborDelveCoachLine = {
  en: '港灣: Solid work. Come back anytime the pier feels empty.',
  zh: '港灣：做得好。碼頭無人隨時再嚟。',
}
