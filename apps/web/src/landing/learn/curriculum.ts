/**
 * Harbor Quest curriculum — game levels aligned to Open Cantonese
 * Cantonese Life 1 → Pronunciation Guide.
 *
 * Pedagogy follows their lesson order (initials / finals / tones).
 * Challenge copy is original game writing, not a verbatim reprint of the textbook.
 * Source: https://opencantonese.org/books/cantonese-life-1/pronunciation-guide
 */

import { LIFE0_LEVELS } from './curriculumLife0'
import { HARBOR_LIFE_CAMPAIGNS, LIFE_BOOK_LEVELS } from './curriculumLifeBook'

export type LearnLine = { en: string; zh: string }

/** Han clip for Azure Cantonese TTS (characters beat bare Jyutping). */
export type HearClip = { han: string; label?: string }

export type TeachStep = {
  kind: 'teach'
  id: string
  title: LearnLine
  body: LearnLine
  /** Big stage glyph (Jyutping, Han, or label). */
  spotlight?: string
  spotlightHint?: LearnLine
  /** Optional speaker examples for this beat. */
  hear?: HearClip[]
}

export type PickStep = {
  kind: 'pick'
  id: string
  tip?: LearnLine
  prompt: LearnLine
  choices: { id: string; label: string; sub?: string }[]
  correctId: string
  explain: LearnLine
  hear?: HearClip[]
}

export type BuildStep = {
  kind: 'build'
  id: string
  tip?: LearnLine
  prompt: LearnLine
  slots: { key: string; label: string; options: string[] }[]
  correct: Record<string, string>
  resultJp: string
  resultGloss?: LearnLine
  explain: LearnLine
  hear?: HearClip[]
}

export type QuestStep = TeachStep | PickStep | BuildStep

/** Voyage campaign — Sounds guide, then Life 1 Units 0–11. */
export type HarborCampaignId =
  | 'sounds'
  | 'life0'
  | 'life1'
  | 'life2'
  | 'life3'
  | 'life4'
  | 'life5'
  | 'life6'
  | 'life7'
  | 'life8'
  | 'life9'
  | 'life10'
  | 'life11'

/** World dressing — river harbor, Lingnan bamboo academy, or Guan tropical paradise. */
export type HarborRealmId = 'river' | 'bamboo' | 'guan'

export type HarborLevel = {
  id: string
  /** Open Cantonese lesson slug under the campaign book root. */
  ocLesson: string
  /** Override book root (Unit 0 lives outside pronunciation-guide/). */
  ocBase?: string
  /** Campaign this pier belongs to (default: sounds). */
  campaign?: HarborCampaignId
  /** Voyage biome dressing (default from campaign). */
  realm?: HarborRealmId
  chapter: number
  title: LearnLine
  blurb: LearnLine
  /** Initials / finals / tones teased on the map node. */
  tags: string[]
  /** Pier stone color accent. */
  hue: 'jade' | 'harbor' | 'ink' | 'gold'
  steps: QuestStep[]
}

const OC_BASE = 'https://opencantonese.org/books/cantonese-life-1/pronunciation-guide'

export const HARBOR_CAMPAIGNS: {
  id: HarborCampaignId
  title: LearnLine
  blurb: LearnLine
  realm: HarborRealmId
  ocHome: string
}[] = [
  {
    id: 'sounds',
    title: { en: 'Campaign 1 · Sounds', zh: '航線一 · 聲韻' },
    blurb: {
      en: 'Pronunciation Guide — initials, finals, and six tones.',
      zh: '發音導讀——聲母、韻母、六聲。',
    },
    realm: 'river',
    ocHome: OC_BASE,
  },
  {
    id: 'life0',
    title: { en: 'Campaign 2 · Life Unit 0', zh: '航線二 · 生活第0課' },
    blurb: {
      en: 'Getting started — listen-first classroom talk, daily phrases, numbers.',
      zh: '開始——先聽課堂用語、日常說話、數字。',
    },
    realm: 'bamboo',
    ocHome: 'https://opencantonese.org/books/cantonese-life-1/unit-0',
  },
  ...HARBOR_LIFE_CAMPAIGNS,
]

/** Short label for teleport / map chrome (Sounds · Life0 · Life1 …). */
export function campaignShortLabel(id: HarborCampaignId): string {
  if (id === 'sounds') return 'Sounds'
  if (id.startsWith('life')) return `Life${id.slice(4)}`
  return id
}

/** True for Cantonese Life 1 Units 1–11 (not Sounds / Unit 0). */
export function isLifeBookCampaign(id: HarborCampaignId): boolean {
  return id !== 'sounds' && id !== 'life0'
}

export function levelCampaign(level: HarborLevel): HarborCampaignId {
  return level.campaign ?? 'sounds'
}

export function levelRealm(level: HarborLevel): HarborRealmId {
  if (level.realm) return level.realm
  const camp = levelCampaign(level)
  if (camp === 'sounds') return 'river'
  // Life Unit 0+ default to bamboo academy when realm omitted.
  return 'bamboo'
}

export function openCantoneseLessonUrl(level: HarborLevel): string {
  const base = level.ocBase ?? OC_BASE
  return `${base.replace(/\/$/, '')}/${level.ocLesson}`
}

export function levelsForCampaign(campaign: HarborCampaignId): HarborLevel[] {
  return HARBOR_LEVELS.filter((l) => levelCampaign(l) === campaign)
}

const SOUNDS_LEVELS: HarborLevel[] = [
  {
    id: 'introduction',
    ocLesson: 'introduction',
    chapter: 0,
    title: { en: 'Harbor briefing', zh: '碼頭簡報' },
    blurb: {
      en: 'Jyutping, syllables, and how this voyage works.',
      zh: '粵拼、音節，同呢次航行點樣玩。',
    },
    tags: ['Jyutping', 'syllable'],
    hue: 'harbor',
    steps: [
      {
        kind: 'teach',
        id: 'intro-romanization',
        title: { en: 'Write speech in letters', zh: '用字母寫出語音' },
        body: {
          en: 'Cantonese can be written with Chinese characters — or with a Romanization system. Harbor Quest uses Jyutping: Latin letters plus a tone number.',
          zh: '粵語可以用漢字寫，亦可以用羅馬拼音。Harbor Quest 用粵拼：拉丁字母加聲調數字。',
        },
        spotlight: 'Jyutping',
        spotlightHint: { en: 'Our map legend', zh: '我哋嘅地圖圖例' },
      },
      {
        kind: 'pick',
        id: 'intro-spaces',
        hear: [{ han: '你好', label: 'nei5 hou2' }],
        tip: {
          en: 'Romanized Cantonese is written syllable by syllable.',
          zh: '羅馬拼音粵語係一個音節一個音節咁寫。',
        },
        prompt: {
          en: 'How do we separate syllables in Jyutping?',
          zh: '粵拼入面點樣分開音節？',
        },
        choices: [
          { id: 'space', label: 'With a space', sub: 'nei5 hou2' },
          { id: 'hyphen', label: 'With a hyphen', sub: 'nei5-hou2' },
          { id: 'none', label: 'No separator', sub: 'nei5hou2' },
        ],
        correctId: 'space',
        explain: {
          en: 'Insert a space between syllables — like nei5 hou2 for 你好.',
          zh: '音節之間加空格——例如 nei5 hou2＝你好。',
        },
      },
      {
        kind: 'teach',
        id: 'intro-parts',
        title: { en: 'Three parts of a syllable', zh: '音節三件套' },
        body: {
          en: 'Most Cantonese syllables have an initial (start consonant), a final (vowel + optional ending), and a tone. Some syllables skip the initial.',
          zh: '多數粵語音節有聲母（開頭輔音）、韻母（元音＋可選韻尾），同埋聲調。有啲音節冇聲母。',
        },
        spotlight: 'b + aa + 1',
        spotlightHint: { en: 'initial · final · tone', zh: '聲母 · 韻母 · 聲調' },
      },
      {
        kind: 'pick',
        id: 'intro-tone-number',
        hear: [{ han: '詩', label: 'si1' }],
        prompt: {
          en: 'In Jyutping si1, what does the 1 mark?',
          zh: '粵拼 si1 入面嘅 1 代表咩？',
        },
        choices: [
          { id: 'tone', label: 'Tone', sub: 'Pitch shape' },
          { id: 'stress', label: 'Stress', sub: 'Loudness' },
          { id: 'length', label: 'Length', sub: 'Duration only' },
        ],
        correctId: 'tone',
        explain: {
          en: 'The digit is the tone — one of six pitch shapes in Cantonese.',
          zh: '個數字係聲調——粵語六個音高形狀之一。',
        },
      },
      {
        kind: 'pick',
        id: 'intro-goal',
        tip: {
          en: 'Open Cantonese trains you to hear, then shape your mouth, then speak.',
          zh: 'Open Cantonese 教你先聽，再擺好口型，然後先開口。',
        },
        prompt: {
          en: 'Best first move when you meet a new sound?',
          zh: '遇到新音，最好嘅第一步係？',
        },
        choices: [
          { id: 'listen', label: 'Listen carefully first', sub: 'Then shape & speak' },
          { id: 'shout', label: 'Say it loud immediately', sub: 'Skip listening' },
          { id: 'skip', label: 'Skip to the quiz', sub: 'No practice' },
        ],
        correctId: 'listen',
        explain: {
          en: 'Don’t rush the first pass — listen, watch tongue/lip cues, then practice aloud.',
          zh: '唔好急住開口——先聽、睇舌位唇形，再大聲練習。',
        },
      },
    ],
  },
  {
    id: 'lesson-1',
    ocLesson: 'pronunciation-lesson-1',
    chapter: 1,
    title: { en: 'First pier · aa & pairs', zh: '第一碼頭 · aa 同清濁' },
    blurb: {
      en: 'Finals aa e i o u · initials b/p d/t g/k f s · tones 1 & 2.',
      zh: '韻母 aa e i o u · 聲母 b/p d/t g/k f s · 第一、二聲。',
    },
    tags: ['b p d t', 'aa', 'tone 1–2'],
    hue: 'jade',
    steps: [
      {
        kind: 'teach',
        id: 'l1-aa',
        title: { en: 'The final aa', zh: '韻母 aa' },
        body: {
          en: 'aa is a long open “ah.” Think father, not cat. In Jyutping it is always written aa (never just a for this sound).',
          zh: 'aa 係長而開嘅「啊」。似英文 father，唔似 cat。粵拼一定寫 aa。',
        },
        spotlight: 'aa',
        spotlightHint: { en: 'Open & long', zh: '開口、拉長' },
      },
      {
        kind: 'pick',
        id: 'l1-aa-pick',
        prompt: {
          en: 'Which Jyutping final is the long open “ah”?',
          zh: '邊個韻母係長而開嘅「啊」？',
        },
        choices: [
          { id: 'aa', label: 'aa' },
          { id: 'a', label: 'a' },
          { id: 'e', label: 'e' },
        ],
        correctId: 'aa',
        explain: {
          en: 'Long open ah → aa. Short a comes later in Lesson 2.',
          zh: '長開「啊」→ aa。短 a 會喺第二課出現。',
        },
      },
      {
        kind: 'teach',
        id: 'l1-pairs',
        title: { en: 'Initial pairs · aspiration', zh: '聲母對 · 送氣' },
        body: {
          en: 'Cantonese pairs like b/p, d/t, g/k share the same mouth place. The difference is aspiration: a puff of air (p, t, k) vs almost none (b, d, g). Paper-in-front-of-lips trick: aspirated should flutter it.',
          zh: 'b/p、d/t、g/k 口型一樣，分別喺送氣：p t k 有氣流，b d g 幾乎冇。用紙放嘴前——送氣音會吹郁紙。',
        },
        spotlight: 'b · p',
        spotlightHint: { en: 'unaspirated · aspirated', zh: '不送氣 · 送氣' },
      },
      {
        kind: 'pick',
        id: 'l1-bp',
        prompt: {
          en: 'Which initial has the strong puff of air?',
          zh: '邊個聲母送氣強？',
        },
        choices: [
          { id: 'p', label: 'p', sub: 'Aspirated' },
          { id: 'b', label: 'b', sub: 'Unaspirated' },
        ],
        correctId: 'p',
        explain: {
          en: 'p is aspirated; b is unaspirated — same place, different air.',
          zh: 'p 送氣；b 不送氣——位置相同，氣流唔同。',
        },
      },
      {
        kind: 'pick',
        id: 'l1-dt',
        prompt: {
          en: 'Pick the unaspirated partner of t.',
          zh: '揀 t 嘅不送氣拍檔。',
        },
        choices: [
          { id: 'd', label: 'd' },
          { id: 'g', label: 'g' },
          { id: 's', label: 's' },
        ],
        correctId: 'd',
        explain: {
          en: 'd/t are a pair. g/k and b/p are the other stop pairs.',
          zh: 'd/t 係一對。g/k、b/p 係另外兩對塞音。',
        },
      },
      {
        kind: 'pick',
        id: 'l1-gk',
        prompt: {
          en: 'Which pair matches g?',
          zh: '邊個係 g 嘅拍檔？',
        },
        choices: [
          { id: 'k', label: 'k' },
          { id: 'f', label: 'f' },
          { id: 's', label: 's' },
        ],
        correctId: 'k',
        explain: {
          en: 'g (unaspirated) pairs with k (aspirated).',
          zh: 'g（不送氣）配 k（送氣）。',
        },
      },
      {
        kind: 'build',
        id: 'l1-baa1',
        hear: [{ han: '爸', label: 'baa1' }],
        tip: {
          en: 'Build a syllable: initial + final + tone.',
          zh: '砌一個音節：聲母＋韻母＋聲調。',
        },
        prompt: {
          en: 'Assemble baat with tone 1 — wait, make baa1.',
          zh: '砌出 baa1。',
        },
        slots: [
          { key: 'initial', label: 'Initial', options: ['b', 'p', 'd'] },
          { key: 'final', label: 'Final', options: ['aa', 'a', 'e'] },
          { key: 'tone', label: 'Tone', options: ['1', '2', '3'] },
        ],
        correct: { initial: 'b', final: 'aa', tone: '1' },
        resultJp: 'baa1',
        resultGloss: { en: 'High-level open syllable', zh: '高平開口音節' },
        explain: {
          en: 'b + aa + tone 1 → baa1. Ferry clears the first gate.',
          zh: 'b＋aa＋第一聲 → baa1。船過第一閘。',
        },
      },
      {
        kind: 'pick',
        id: 'l1-vowels',
        prompt: {
          en: 'Lesson 1 also adds which simple finals?',
          zh: '第一課仲有邊啲單元音韻母？',
        },
        choices: [
          { id: 'eiou', label: 'e · i · o · u' },
          { id: 'aai', label: 'aai · ai · ei' },
          { id: 'mng', label: 'm · ng only' },
        ],
        correctId: 'eiou',
        explain: {
          en: 'After aa you meet e, i, o, u — still simple nuclei.',
          zh: '學完 aa 就係 e、i、o、u——仍然係簡單韻腹。',
        },
      },
      {
        kind: 'teach',
        id: 'l1-t1',
        hear: [{ han: '詩', label: 'si1' }],
        title: { en: 'Tone 1 · high level', zh: '第一聲 · 高平' },
        body: {
          en: 'Tone 1 stays high and flat for the whole syllable — like a calm high pier rail. Chao letter: ˥.',
          zh: '第一聲全程又高又平——似碼頭高欄。趙元任調號：˥。',
        },
        spotlight: '1 ˥',
        spotlightHint: { en: 'High · flat', zh: '高 · 平' },
      },
      {
        kind: 'teach',
        id: 'l1-t2',
        hear: [{ han: '史', label: 'si2' }],
        title: { en: 'Tone 2 · mid rising', zh: '第二聲 · 中升' },
        body: {
          en: 'Tone 2 climbs from mid toward high — a wave lifting the ferry. Chao letters: ˧˥.',
          zh: '第二聲由中音爬去高音——似浪托起船。調號：˧˥。',
        },
        spotlight: '2 ˧˥',
        spotlightHint: { en: 'Climb up', zh: '向上爬' },
      },
      {
        kind: 'pick',
        id: 'l1-tone-pick',
        prompt: {
          en: 'Which tone rises from mid to high?',
          zh: '邊個聲調由中升到高？',
        },
        choices: [
          { id: '2', label: 'Tone 2', sub: '˧˥' },
          { id: '1', label: 'Tone 1', sub: '˥' },
          { id: '3', label: 'Tone 3', sub: '˧' },
        ],
        correctId: '2',
        explain: {
          en: 'Tone 2 rises. Tone 1 stays high-flat; Tone 3 is mid-flat (next lesson).',
          zh: '第二聲上升。第一聲高平；第三聲中平（下一課）。',
        },
      },
      {
        kind: 'build',
        id: 'l1-si2',
        hear: [{ han: '史', label: 'si2' }],
        prompt: {
          en: 'Build the rising syllable si2.',
          zh: '砌出上升音節 si2。',
        },
        slots: [
          { key: 'initial', label: 'Initial', options: ['s', 'f', 'b'] },
          { key: 'final', label: 'Final', options: ['i', 'e', 'aa'] },
          { key: 'tone', label: 'Tone', options: ['1', '2', '6'] },
        ],
        correct: { initial: 's', final: 'i', tone: '2' },
        resultJp: 'si2',
        resultGloss: { en: 'History (史) in the classic tone set', zh: '經典六聲入面嘅「史」' },
        explain: {
          en: 's + i + 2 → si2. Lesson 1 pier cleared.',
          zh: 's＋i＋2 → si2。第一碼頭過關。',
        },
      },
    ],
  },
  {
    id: 'lesson-2',
    ocLesson: 'pronunciation-lesson-2',
    chapter: 2,
    title: { en: 'Mid tide · z/c & -i finals', zh: '中潮 · z/c 同 i 尾' },
    blurb: {
      en: 'Tone 3 · z/c · a · eo · aai ai ei oi ui eoi.',
      zh: '第三聲 · z/c · a · eo · aai ai ei oi ui eoi。',
    },
    tags: ['z c', 'tone 3', 'aai'],
    hue: 'harbor',
    steps: [
      {
        kind: 'teach',
        id: 'l2-t3',
        hear: [{ han: '試', label: 'si3' }],
        title: { en: 'Tone 3 · mid level', zh: '第三聲 · 中平' },
        body: {
          en: 'Tone 3 sits mid and flat — neither the high rail of tone 1 nor a climb. Chao: ˧.',
          zh: '第三聲企喺中間、打平——唔係第一聲咁高，亦唔爬升。調號：˧。',
        },
        spotlight: '3 ˧',
      },
      {
        kind: 'pick',
        id: 'l2-zc',
        tip: {
          en: 'z/c is another aspirated pair (like b/p).',
          zh: 'z/c 亦係送氣對（似 b/p）。',
        },
        prompt: {
          en: 'Which initial is aspirated?',
          zh: '邊個聲母送氣？',
        },
        choices: [
          { id: 'c', label: 'c' },
          { id: 'z', label: 'z' },
        ],
        correctId: 'c',
        explain: {
          en: 'c puffs; z does not. Same idea as p vs b.',
          zh: 'c 有氣；z 冇。同 p 對 b 一個道理。',
        },
      },
      {
        kind: 'pick',
        id: 'l2-a-vs-aa',
        prompt: {
          en: 'Short “uh/a” (not long ah) is written…',
          zh: '短 a（唔係長啊）寫成……',
        },
        choices: [
          { id: 'a', label: 'a' },
          { id: 'aa', label: 'aa' },
          { id: 'e', label: 'e' },
        ],
        correctId: 'a',
        explain: {
          en: 'Lesson 2 introduces short a beside the long aa you already know.',
          zh: '第二課引入短 a，同你識嘅長 aa 並列。',
        },
      },
      {
        kind: 'build',
        id: 'l2-sai3',
        hear: [{ han: '細', label: 'sai3' }],
        prompt: { en: 'Build sai3.', zh: '砌出 sai3。' },
        slots: [
          { key: 'initial', label: 'Initial', options: ['s', 'z', 'c'] },
          { key: 'final', label: 'Final', options: ['ai', 'aai', 'ei'] },
          { key: 'tone', label: 'Tone', options: ['1', '2', '3'] },
        ],
        correct: { initial: 's', final: 'ai', tone: '3' },
        resultJp: 'sai3',
        explain: {
          en: 's + ai + mid-level 3. -i finals are this pier’s specialty.',
          zh: 's＋ai＋中平 3。以 i 結尾嘅韻母係呢個碼頭專長。',
        },
      },
    ],
  },
  {
    id: 'lesson-3',
    ocLesson: 'pronunciation-lesson-3',
    chapter: 3,
    title: { en: 'Low fog · m n ng & -u', zh: '低霧 · m n ng 同 u 尾' },
    blurb: {
      en: 'Tone 4 · m n ng · aau au eu iu ou.',
      zh: '第四聲 · m n ng · aau au eu iu ou。',
    },
    tags: ['m n ng', 'tone 4', 'ou'],
    hue: 'ink',
    steps: [
      {
        kind: 'teach',
        id: 'l3-t4',
        hear: [{ han: '時', label: 'si4' }],
        title: { en: 'Tone 4 · low falling', zh: '第四聲 · 低降' },
        body: {
          en: 'Tone 4 starts low and drifts lower — fog rolling off the water. Chao: ˨˩.',
          zh: '第四聲由低再向下沉——似霧貼水面。調號：˨˩。',
        },
        spotlight: '4 ˨˩',
      },
      {
        kind: 'pick',
        id: 'l3-ng',
        prompt: {
          en: 'Which initial is the velar nasal (as in sing)?',
          zh: '邊個聲母係軟顎鼻音（似 sing 尾）？',
        },
        choices: [
          { id: 'ng', label: 'ng' },
          { id: 'n', label: 'n' },
          { id: 'm', label: 'm' },
        ],
        correctId: 'ng',
        explain: {
          en: 'ng is its own initial in Cantonese — not just an ending.',
          zh: '粵語嘅 ng 可以做聲母——唔淨係韻尾。',
        },
      },
      {
        kind: 'build',
        id: 'l3-mou4',
        hear: [{ han: '冇', label: 'mou4' }],
        prompt: { en: 'Build mou4.', zh: '砌出 mou4。' },
        slots: [
          { key: 'initial', label: 'Initial', options: ['m', 'n', 'ng'] },
          { key: 'final', label: 'Final', options: ['ou', 'au', 'iu'] },
          { key: 'tone', label: 'Tone', options: ['1', '4', '6'] },
        ],
        correct: { initial: 'm', final: 'ou', tone: '4' },
        resultJp: 'mou4',
        resultGloss: { en: '“Don’t have” (冇) — classic tone 4', zh: '「冇」——經典第四聲' },
        explain: {
          en: 'm + ou + low-falling 4. Nasals + -u finals unlock this pier.',
          zh: 'm＋ou＋低降 4。鼻音聲母同 u 尾韻過關。',
        },
      },
    ],
  },
  {
    id: 'lesson-4',
    ocLesson: 'pronunciation-lesson-4',
    chapter: 4,
    title: { en: 'Soft rise · l h · oe yu · -m/-n/-ng', zh: '柔升 · l h · oe yu · 鼻尾' },
    blurb: {
      en: 'Tone 5 · l h · oe yu · nasal endings.',
      zh: '第五聲 · l h · oe yu · 鼻音韻尾。',
    },
    tags: ['l h', 'tone 5', 'oe yu'],
    hue: 'gold',
    steps: [
      {
        kind: 'teach',
        id: 'l4-t5',
        hear: [{ han: '買', label: 'maai5' }],
        title: { en: 'Tone 5 · low rising', zh: '第五聲 · 低升' },
        body: {
          en: 'Tone 5 rises from low — softer climb than tone 2. Chao: ˩˧. Famous twin: 買 maai5.',
          zh: '第五聲由低向上——升幅比第二聲柔。調號：˩˧。出名一對：買 maai5。',
        },
        spotlight: '5 ˩˧',
      },
      {
        kind: 'pick',
        id: 'l4-oe',
        prompt: {
          en: 'Which final is the rounded mid vowel (French peu-ish)?',
          zh: '邊個韻母係圓唇中元音（似法文 peu）？',
        },
        choices: [
          { id: 'oe', label: 'oe' },
          { id: 'yu', label: 'yu' },
          { id: 'eo', label: 'eo' },
        ],
        correctId: 'oe',
        explain: {
          en: 'oe is the rounded mid vowel; yu is high rounded; eo appears in finals like eoi/eon.',
          zh: 'oe 係圓唇中元音；yu 係高圓唇；eo 出現喺 eoi/eon 等韻母。',
        },
      },
      {
        kind: 'build',
        id: 'l4-maai5',
        hear: [{ han: '買', label: 'maai5' }],
        prompt: { en: 'Build maai5 (buy).', zh: '砌出 maai5（買）。' },
        slots: [
          { key: 'initial', label: 'Initial', options: ['m', 'n', 'l'] },
          { key: 'final', label: 'Final', options: ['aai', 'ai', 'aa'] },
          { key: 'tone', label: 'Tone', options: ['2', '5', '6'] },
        ],
        correct: { initial: 'm', final: 'aai', tone: '5' },
        resultJp: 'maai5',
        resultGloss: { en: 'buy — tone 5 climb', zh: '買——第五聲上揚' },
        explain: {
          en: 'maai5 vs maai6 (sell) is why tone training matters.',
          zh: 'maai5（買）對 maai6（賣）——所以聲調好重要。',
        },
      },
    ],
  },
  {
    id: 'lesson-5',
    ocLesson: 'pronunciation-lesson-5',
    chapter: 5,
    title: { en: 'Stop gates · j w & -p/-t/-k', zh: '塞音閘 · j w 同入聲' },
    blurb: {
      en: 'Tone 6 · j w · checked finals -p -t -k.',
      zh: '第六聲 · j w · 入聲韻尾 -p -t -k。',
    },
    tags: ['j w', 'tone 6', '-p -t -k'],
    hue: 'jade',
    steps: [
      {
        kind: 'teach',
        id: 'l5-t6',
        hear: [{ han: '賣', label: 'maai6' }],
        title: { en: 'Tone 6 · low level', zh: '第六聲 · 低平' },
        body: {
          en: 'Tone 6 stays low and level — the deep water line. Chao: ˨. Twin of buy: 賣 maai6.',
          zh: '第六聲低而平——水深線。調號：˨。買嘅雙生：賣 maai6。',
        },
        spotlight: '6 ˨',
      },
      {
        kind: 'pick',
        id: 'l5-checked',
        tip: {
          en: 'Finals ending in -p/-t/-k are “checked” — the vowel cuts short.',
          zh: '以 -p/-t/-k 結尾嘅韻母係入聲——元音突然截斷。',
        },
        prompt: {
          en: 'Which final is a checked (stop) ending?',
          zh: '邊個係入聲韻尾？',
        },
        choices: [
          { id: 'aat', label: 'aat' },
          { id: 'aan', label: 'aan' },
          { id: 'aai', label: 'aai' },
        ],
        correctId: 'aat',
        explain: {
          en: '-t closes the syllable abruptly. -n and -i keep it open/sonorant.',
          zh: '-t 突然截斷音節；-n、-i 仍然響亮。',
        },
      },
      {
        kind: 'build',
        id: 'l5-jat1',
        hear: [{ han: '一', label: 'jat1' }],
        prompt: { en: 'Build jat1 (one).', zh: '砌出 jat1（一）。' },
        slots: [
          { key: 'initial', label: 'Initial', options: ['j', 'w', 'z'] },
          { key: 'final', label: 'Final', options: ['at', 'aat', 'an'] },
          { key: 'tone', label: 'Tone', options: ['1', '3', '6'] },
        ],
        correct: { initial: 'j', final: 'at', tone: '1' },
        resultJp: 'jat1',
        explain: {
          en: 'j + at + 1. Checked finals + j/w clear the stop gates.',
          zh: 'j＋at＋1。入聲同 j/w 過塞音閘。',
        },
      },
    ],
  },
  {
    id: 'lesson-6',
    ocLesson: 'pronunciation-lesson-6',
    chapter: 6,
    title: { en: 'Labial glide · gw kw · m/ng', zh: '唇化 · gw kw · 成音節' },
    blurb: {
      en: 'gw kw · syllabic m/ng · level-tone review.',
      zh: 'gw kw · 成音節 m/ng · 平調重溫。',
    },
    tags: ['gw kw', 'm ng', 'levels'],
    hue: 'harbor',
    steps: [
      {
        kind: 'pick',
        id: 'l6-gw',
        tip: {
          en: 'gw/kw add a w-glide after g/k.',
          zh: 'gw/kw 喺 g/k 後面加 w 滑音。',
        },
        prompt: {
          en: 'Which initial is aspirated?',
          zh: '邊個聲母送氣？',
        },
        choices: [
          { id: 'kw', label: 'kw' },
          { id: 'gw', label: 'gw' },
        ],
        correctId: 'kw',
        explain: {
          en: 'kw puffs; gw does not — still an aspiration pair.',
          zh: 'kw 送氣；gw 不送氣——仍然係送氣對。',
        },
      },
      {
        kind: 'pick',
        id: 'l6-syllabic',
        prompt: {
          en: 'Which can be a whole syllable by itself?',
          zh: '邊個可以自成一個音節？',
        },
        choices: [
          { id: 'ng', label: 'ng', sub: 'e.g. ng5 五' },
          { id: 'b', label: 'b alone' },
          { id: 'k', label: 'k alone' },
        ],
        correctId: 'ng',
        explain: {
          en: 'Syllabic m and ng are finals (and syllables) with no separate vowel letter.',
          zh: '成音節 m、ng 係冇獨立元音字母嘅韻母（亦係音節）。',
        },
      },
      {
        kind: 'build',
        id: 'l6-gwaa1',
        hear: [{ han: '瓜', label: 'gwaa1' }],
        prompt: { en: 'Build gwaa1.', zh: '砌出 gwaa1。' },
        slots: [
          { key: 'initial', label: 'Initial', options: ['gw', 'kw', 'g'] },
          { key: 'final', label: 'Final', options: ['aa', 'a', 'o'] },
          { key: 'tone', label: 'Tone', options: ['1', '3', '6'] },
        ],
        correct: { initial: 'gw', final: 'aa', tone: '1' },
        resultJp: 'gwaa1',
        explain: {
          en: 'Labialized initial unlocked. Level tones (1/3/6) get a review pass.',
          zh: '唇化聲母解鎖。平調（1/3/6）重溫過關。',
        },
      },
    ],
  },
  {
    id: 'lesson-7',
    ocLesson: 'pronunciation-lesson-7',
    chapter: 7,
    title: { en: 'Tone duels', zh: '聲調對決' },
    blurb: {
      en: 'Rising pairs · high vs low · tone combinations.',
      zh: '升調對 · 高低對比 · 聲調組合。',
    },
    tags: ['rising', 'combos'],
    hue: 'gold',
    steps: [
      {
        kind: 'pick',
        id: 'l7-rising',
        hear: [{ han: '史', label: 'si2' }, { han: '市', label: 'si5' }],
        prompt: {
          en: 'Which two tones both rise?',
          zh: '邊兩個聲調都會上升？',
        },
        choices: [
          { id: '25', label: '2 and 5' },
          { id: '14', label: '1 and 4' },
          { id: '36', label: '3 and 6' },
        ],
        correctId: '25',
        explain: {
          en: '2 (mid-rising) and 5 (low-rising). 1/3/6 are level; 4 falls.',
          zh: '2（中升）同 5（低升）。1/3/6 係平；4 係降。',
        },
      },
      {
        kind: 'pick',
        id: 'l7-buy-sell',
        hear: [{ han: '買', label: 'maai5' }, { han: '賣', label: 'maai6' }],
        prompt: {
          en: '賣 “sell” is which tone?',
          zh: '「賣」係第幾聲？',
        },
        choices: [
          { id: '6', label: 'Tone 6', sub: 'maai6' },
          { id: '5', label: 'Tone 5', sub: 'maai5' },
          { id: '2', label: 'Tone 2', sub: 'maai2' },
        ],
        correctId: '6',
        explain: {
          en: '買 maai5 vs 賣 maai6 — same segmental shape, different pitch path.',
          zh: '買 maai5 對 賣 maai6——音段一樣，音高路線唔同。',
        },
      },
      {
        kind: 'pick',
        id: 'l7-high-set',
        prompt: {
          en: 'Which set lives higher in the pitch range?',
          zh: '邊組音高整體較高？',
        },
        choices: [
          { id: '123', label: 'Tones 1 · 2 · 3' },
          { id: '456', label: 'Tones 4 · 5 · 6' },
        ],
        correctId: '123',
        explain: {
          en: '1–3 sit higher; 4–6 sit lower. Combinations drill that contrast.',
          zh: '1–3 偏高；4–6 偏低。組合練習就係練呢個對比。',
        },
      },
    ],
  },
  {
    id: 'jyutping-chart',
    ocLesson: 'jyutping-chart',
    chapter: 8,
    title: { en: 'Chart · captain’s ledger', zh: '總表 · 船長手冊' },
    blurb: {
      en: 'Boss review: initials, finals, and all six tones.',
      zh: '頭目重溫：聲母、韻母、六個聲調。',
    },
    tags: ['chart', 'review'],
    hue: 'ink',
    steps: [
      {
        kind: 'teach',
        id: 'chart-open',
        title: { en: 'The Jyutping chart', zh: '粵拼總表' },
        body: {
          en: 'Open Cantonese ends the guide with a full initials × finals chart plus the six tones. Your ferry now knows every pier — prove it.',
          zh: 'Open Cantonese 用完整聲母×韻母表同六聲結束導讀。你而家識晒每個碼頭——證明俾我睇。',
        },
        spotlight: '19×59',
        spotlightHint: { en: 'initials × finals (approx.)', zh: '聲母 × 韻母（約）' },
      },
      {
        kind: 'pick',
        id: 'chart-parts',
        prompt: {
          en: 'A full Jyutping syllable encodes…',
          zh: '完整粵拼音節包含……',
        },
        choices: [
          { id: 'all', label: 'Initial + final + tone' },
          { id: 'han', label: 'Only Chinese characters' },
          { id: 'eng', label: 'English spelling' },
        ],
        correctId: 'all',
        explain: {
          en: 'That’s the whole map legend — and how JyutTranslate labels every Cantonese line.',
          zh: '呢個就係成個地圖圖例——亦係 JyutTranslate 標每句粵語嘅方法。',
        },
      },
      {
        kind: 'build',
        id: 'chart-nei5hou2',
        hear: [{ han: '你好', label: 'nei5 hou2' }],
        prompt: {
          en: 'Build the second syllable of nei5 hou2.',
          zh: '砌出 nei5 hou2 嘅第二個音節。',
        },
        slots: [
          { key: 'initial', label: 'Initial', options: ['h', 'f', 's'] },
          { key: 'final', label: 'Final', options: ['ou', 'au', 'o'] },
          { key: 'tone', label: 'Tone', options: ['1', '2', '4'] },
        ],
        correct: { initial: 'h', final: 'ou', tone: '2' },
        resultJp: 'hou2',
        resultGloss: { en: '你好 — hello', zh: '你好' },
        explain: {
          en: 'Harbor Quest complete. Sail into the translator with Jyutping under every line.',
          zh: 'Harbor Quest 完成。去翻譯器——每句下面都有粵拼。',
        },
      },
      {
        kind: 'pick',
        id: 'chart-six',
        prompt: {
          en: 'How many lexical tones does this guide teach?',
          zh: '呢個導讀教幾個聲調？',
        },
        choices: [
          { id: '6', label: 'Six' },
          { id: '4', label: 'Four' },
          { id: '9', label: 'Nine' },
        ],
        correctId: '6',
        explain: {
          en: 'Six tones in modern Jyutping teaching — the captain’s full ledger.',
          zh: '現代粵拼教學六個聲調——船長完整手冊。',
        },
      },
    ],
  },]

export const HARBOR_LEVELS: HarborLevel[] = [
  ...SOUNDS_LEVELS,
  ...LIFE0_LEVELS,
  ...LIFE_BOOK_LEVELS,
]

export function levelById(id: string | null | undefined): HarborLevel | undefined {
  if (!id) return undefined
  return HARBOR_LEVELS.find((l) => l.id === id)
}

/** Next pier within the same campaign (not across campaigns). */
export function nextLevelId(id: string): string | null {
  const cur = levelById(id)
  if (!cur) return null
  const list = levelsForCampaign(levelCampaign(cur))
  const i = list.findIndex((l) => l.id === id)
  if (i < 0 || i >= list.length - 1) return null
  return list[i + 1]!.id
}
