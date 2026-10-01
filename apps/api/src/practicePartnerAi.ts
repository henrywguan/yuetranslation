/**
 * Admin Practice Partner — Cantonese say-this drill via existing DeepSeek/OpenAI.
 * Not Azure Voice Live / Foundry. Returns a TTS line + structured drill card.
 */
import { z } from 'zod'
import { env, llmChatExtras, openaiConfigured } from './env.js'
import { openaiClient } from './openaiClient.js'
import {
  composePracticePartnerBeats,
  lastMissLine,
  lockPracticePartnerPhrase,
  partnerCaption,
  type PracticePartnerBeats,
  type PracticePartnerLastMiss,
} from './practicePartnerPerformance.js'

export const PracticePartnerMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().trim().min(1).max(2000),
})

export const PracticePartnerDrillTargetSchema = z.object({
  en: z.string().trim().min(1).max(200),
  zh: z.string().trim().min(1).max(200),
  jyutping: z.string().trim().min(1).max(300),
})

export const PRACTICE_PARTNER_CATEGORY_IDS = [
  'animals',
  'foods',
  'common',
  'expert',
] as const

export type PracticePartnerCategory = (typeof PRACTICE_PARTNER_CATEGORY_IDS)[number]

export const DEFAULT_PRACTICE_PARTNER_CATEGORY: PracticePartnerCategory = 'common'

export const PracticePartnerCategorySchema = z.enum(PRACTICE_PARTNER_CATEGORY_IDS)

export const PRACTICE_PARTNER_CATEGORY_META: Record<
  PracticePartnerCategory,
  { labelEn: string; labelZh: string; brief: string; examples: string }
> = {
  animals: {
    labelEn: 'Animals',
    labelZh: '動物',
    brief:
      'Animals only: pets, farm, zoo, sea life, bugs. Target is the animal name or a short sentence with that animal. Use 隻/條 where natural. Not restaurant dishes.',
    examples: '狗 · 貓 · 我屋企有隻倉鼠 · 小心嗰條蛇 · 嗰隻係熊貓',
  },
  foods: {
    labelEn: 'Foods',
    labelZh: '食物',
    brief:
      'Food and drink only: cha chaan teng, dim sum, fruit, tastes, ordering. Target is a dish, ingredient, or a short order line.',
    examples: '叉燒飯 · 我要凍檸檬茶，少甜 · 呢個芒果好甜 · 一碗雲吞麵',
  },
  common: {
    labelEn: 'Common phrases',
    labelZh: '常用',
    brief:
      'Everyday survival phrases: greetings, thanks, sorry, late, where, how much, transit, small talk. Practical but dramatic. Not a vocab list of animals or dishes.',
    examples: '對唔住，我唔記得帶功課 · 唔該，呢個幾多錢 · 唔好意思，我遲到喇',
  },
  expert: {
    labelEn: 'Expert phrases',
    labelZh: '進階',
    brief:
      'Advanced spoken Cantonese: longer one-breath lines, 語氣助詞, 口語 contractions, workplace or social nuance. Still speakable aloud — not a paragraph, not textbook 書面語 unless contrasting 口語.',
    examples:
      '你再唔走我就真係唔禮貌喇 · 呢單嘢講真有啲尷尬 · 我寧願遲啲講清楚，好過而家亂噏',
  },
}

export function resolvePracticePartnerCategory(raw: unknown): PracticePartnerCategory {
  const id = String(raw || '').trim()
  return (PRACTICE_PARTNER_CATEGORY_IDS as readonly string[]).includes(id)
    ? (id as PracticePartnerCategory)
    : DEFAULT_PRACTICE_PARTNER_CATEGORY
}

export function categoryLockLine(category: PracticePartnerCategory): string {
  const meta = PRACTICE_PARTNER_CATEGORY_META[category]
  return [
    `[CATEGORY] ${category} (${meta.labelZh} / ${meta.labelEn}).`,
    meta.brief,
    `Stay in this category for every DEMAND, including the next phrase after a pass.`,
    `Examples: ${meta.examples}`,
  ].join(' ')
}

/** How much English 港灣 uses in `speak`. Does not change the drill card (still en + zh + jyutping). */
export const PRACTICE_PARTNER_DIFFICULTY_IDS = [
  'new_learner',
  'abc',
  'mainlander',
] as const

export type PracticePartnerDifficulty = (typeof PRACTICE_PARTNER_DIFFICULTY_IDS)[number]

export const DEFAULT_PRACTICE_PARTNER_DIFFICULTY: PracticePartnerDifficulty = 'abc'

export const PracticePartnerDifficultySchema = z.enum(PRACTICE_PARTNER_DIFFICULTY_IDS)

export const PRACTICE_PARTNER_DIFFICULTY_META: Record<
  PracticePartnerDifficulty,
  { labelEn: string; labelZh: string; brief: string; speakMix: string }
> = {
  new_learner: {
    labelEn: 'New Learner',
    labelZh: '初學者',
    brief: 'Mixed English and Cantonese — English majority in every speak line.',
    speakMix:
      'speak language: ENGLISH MAJORITY. Mostly English coaching and judgment; sprinkle short Cantonese (漢字) for the target phrase, interjections (喂, 哼), and model lines. Keep English as the main scaffolding so a beginner can follow.',
  },
  abc: {
    labelEn: 'ABC',
    labelZh: 'ABC',
    brief: 'Mixed English and Cantonese — Cantonese majority in every speak line.',
    speakMix:
      'speak language: CANTONESE MAJORITY mix. Lead with 漢字 and Hong Kong Cantonese energy; use English only for short bridges, emphasis, or when a learner needs a quick gloss. Still mix — never English-only.',
  },
  mainlander: {
    labelEn: 'Mainlander',
    labelZh: '大陸仔',
    brief:
      'All Cantonese. Very stern, mocking, joking personality — no English in speak.',
    speakMix:
      'speak language: ALL CANTONESE (漢字 only). Zero English words in speak — not even “WRONG”, “Pass”, or “Fine”. Personality dial: very stern, mocking, joking, and theatrical; roast in 粵語口語. PASS/FAIL openers must be Cantonese inventions (do not paste English bank lines). Drill card fields en/zh/jyutping still required as usual.',
  },
}

export function resolvePracticePartnerDifficulty(raw: unknown): PracticePartnerDifficulty {
  const id = String(raw || '').trim()
  return (PRACTICE_PARTNER_DIFFICULTY_IDS as readonly string[]).includes(id)
    ? (id as PracticePartnerDifficulty)
    : DEFAULT_PRACTICE_PARTNER_DIFFICULTY
}

export function clampPracticePartnerCount(raw: unknown): number {
  const n = typeof raw === 'number' ? raw : Number(raw)
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(40, Math.floor(n)))
}

export const PRACTICE_PARTNER_MOVE_IDS = ['repeat', 'listen', 'translate', 'finish'] as const

/** Keep aligned with apps/web/src/lib/practicePartnerSituation.ts */
export const PRACTICE_PARTNER_SITUATION_IDS = [
  'cafe',
  'dimsum',
  'coffee',
  'mtr',
  'taxi',
  'directions',
  'grocery',
  'market',
  'negotiate',
  'intro',
  'smalltalk',
  'friends',
  'plans',
  'family',
  'favor',
  'disagree',
  'doctor',
  'apartment',
  'service',
  'workplace',
  'interview',
  'occasion',
] as const

export const PRACTICE_PARTNER_PERSONALITY_IDS = [
  'friendly',
  'formal',
  'busy',
  'elder',
  'counter',
] as const

export const PRACTICE_PARTNER_GOAL_IDS = ['task', 'casual', 'fluency', 'slang'] as const

export type PracticePartnerMove = (typeof PRACTICE_PARTNER_MOVE_IDS)[number]

export function resolvePracticePartnerMove(raw: unknown): PracticePartnerMove {
  const id = String(raw || '').trim()
  return (PRACTICE_PARTNER_MOVE_IDS as readonly string[]).includes(id)
    ? (id as PracticePartnerMove)
    : 'repeat'
}

export type PracticePartnerTone = {
  streak: number
  missStreak: number
}

export function resolvePracticePartnerTone(
  streak?: number | null,
  missStreak?: number | null,
): PracticePartnerTone {
  return {
    streak: clampPracticePartnerCount(streak),
    missStreak: clampPracticePartnerCount(missStreak),
  }
}

/** Warmth on a pass, and how hard a miss hits. A pass streak never softens a fail. */
export function toneLockLine(
  category: PracticePartnerCategory,
  tone: PracticePartnerTone,
): string {
  const meta = PRACTICE_PARTNER_CATEGORY_META[category]
  const { streak, missStreak } = tone
  const passWarmth =
    streak >= 4 ? 'PROUD' : streak >= 2 ? 'WARM' : streak >= 1 ? 'PLEASED' : 'FRIENDLY'
  const failHeat =
    missStreak >= 2 ? 'HARSH' : missStreak >= 1 ? 'SHARPER' : 'CRITICAL'
  return [
    `[TONE] passStreak=${streak} (passes in a row before this turn). missStreak=${missStreak} (fails in a row on this card before this turn).`,
    `IF PASS: warmth=${passWarmth}. FRIENDLY at passStreak 0 (kind, a light joke at most). PLEASED at 1. WARM at 2–3. PROUD at 4+. Do not roast a clean pass. The longer the streak, the nicer you get.`,
    `IF FAIL: heat=${failHeat} from missStreak, not from passStreak. CRITICAL at missStreak 0 — including the first miss after a long success streak — still sharp, witty, and specific to LEARNER SAID versus TARGET. SHARPER at 1. HARSH at 2+ (有冇搞錯 / 蠢笨蛋 energy). A long success streak does NOT soften a miss. Always about what they actually said.`,
    `Topic for the hello: ${meta.labelEn} (${meta.labelZh}).`,
  ].join(' ')
}

const MOVE_SPEAK: Record<PracticePartnerMove, string> = {
  repeat:
    'REPEAT: say “repeat after me” (in the difficulty language mix), then speak the full 漢字 so they can echo it.',
  listen:
    'LISTEN: speak the full 漢字 as the model. Tell them to listen and say it back. Do not tell them to read the characters — the card hides the script.',
  translate:
    'TRANSLATE: give the English meaning and tell them to say it in Cantonese. Do not model the 漢字 first, unless difficulty is new_learner — then you may say the 漢字 once after the English.',
  finish:
    'FINISH: speak the line but leave the last beat blank (a short pause, then ask them to finish it). If the phrase is only one or two characters, switch this demand to TRANSLATE instead of a blank.',
}

/** Which spoken job this card was, and which job the next card should be. */
export function moveLockLine(
  move: PracticePartnerMove,
  nextMove: PracticePartnerMove,
  review?: { en: string; zh: string; jyutping: string } | null,
): string {
  const reviewLine = review?.zh
    ? `IF PASS and you advance: [REVIEW] the next en/zh/jyutping MUST be exactly EN ${review.en} / ZH ${review.zh} / JYUTPING ${review.jyutping}. This resurfaces an earlier phrase. It overrides the no-repeat rule.`
    : 'IF PASS and you advance: invent the NEXT phrase in this category. Contrast the one they just passed — change one piece (少甜/多甜, 狗/貓, 幾多錢/幾多個) so the pattern is the lesson.'
  return [
    `[MOVE] They are attempting ${move}. If they pass, the next demand is ${nextMove}.`,
    `IF FAIL: ignore the next move. Drop to REPEAT on the SAME en/zh/jyutping. reaction roasts what they said. cue is one short retry command. Do not put the 漢字 in reaction or cue. The server speaks the full model once.`,
    reviewLine,
    `How to speak the next demand: ${MOVE_SPEAK[nextMove]}`,
    `The card JSON always keeps the full en, zh, and jyutping even when the screen hides them.`,
  ].join(' ')
}

export function difficultyLockLine(difficulty: PracticePartnerDifficulty): string {
  const meta = PRACTICE_PARTNER_DIFFICULTY_META[difficulty]
  return [
    `[DIFFICULTY] ${difficulty} (${meta.labelZh} / ${meta.labelEn}).`,
    meta.brief,
    meta.speakMix,
    'Difficulty only controls speak language mix and tone — CATEGORY still locks the phrase deck.',
  ].join(' ')
}

export const PracticePartnerChatBodySchema = z.object({
  /** Empty on kickoff — first DEMAND needs no learner line. */
  messages: z.array(PracticePartnerMessageSchema).max(24),
  /** Phrase the learner must say. Omit / null when starting a new drill. */
  activeDrill: PracticePartnerDrillTargetSchema.optional().nullable(),
  /** Deck lock. Defaults to common phrases. */
  category: PracticePartnerCategorySchema.optional().nullable(),
  /** English mix in speak. Defaults to ABC. */
  difficulty: PracticePartnerDifficultySchema.optional().nullable(),
  /** Consecutive passes before this turn. */
  streak: z.number().int().min(0).max(40).optional().nullable(),
  /** Consecutive misses on the current card before this turn. */
  missStreak: z.number().int().min(0).max(40).optional().nullable(),
  /** Rung they are attempting now. */
  move: z.enum(PRACTICE_PARTNER_MOVE_IDS).optional().nullable(),
  /** Rung to speak if this attempt passes. */
  nextMove: z.enum(PRACTICE_PARTNER_MOVE_IDS).optional().nullable(),
  /** Earlier phrase to reuse when this pass is a review. */
  review: PracticePartnerDrillTargetSchema.optional().nullable(),
  /** Previous fail, injected into this judgment only. */
  lastMiss: z
    .object({
      said: z.string().trim().min(1).max(400),
      zh: z.string().trim().min(1).max(200),
      en: z.string().trim().min(1).max(200),
    })
    .optional()
    .nullable(),
  /** drill = the path. open = free talk. scene = passed lines. situation = a place they picked. */
  mode: z.enum(['drill', 'open', 'scene', 'situation']).optional().nullable(),
  /** Place name for a scene, e.g. Night Market (夜市). */
  place: z.string().trim().max(80).optional().nullable(),
  /** 1-based scene turn. */
  sceneTurn: z.number().int().min(1).max(8).optional().nullable(),
  sceneTurns: z.number().int().min(1).max(8).optional().nullable(),
  /** A place they picked. Ids match the web situation list. */
  situation: z.enum(PRACTICE_PARTNER_SITUATION_IDS).optional().nullable(),
  /** Who they are talking to. The level still sets the language mix. */
  personality: z.enum(PRACTICE_PARTNER_PERSONALITY_IDS).optional().nullable(),
  /** What the talk is for. */
  goal: z.enum(PRACTICE_PARTNER_GOAL_IDS).optional().nullable(),
  /** Lines they can already say. Prefer them. Do not quiz. */
  kept: z.array(PracticePartnerDrillTargetSchema).max(8).optional().nullable(),
  /** They froze. One sentence they can say next. The road does not move. */
  hint: z.boolean().optional().nullable(),
})

export type PracticePartnerMessage = z.infer<typeof PracticePartnerMessageSchema>
export type PracticePartnerDrillTarget = z.infer<typeof PracticePartnerDrillTargetSchema>
export type PracticePartnerVerdict = 'none' | 'pass' | 'fail'

export type PracticePartnerDrill = PracticePartnerDrillTarget & {
  verdict: PracticePartnerVerdict
  advance: boolean
}

export type PracticePartnerTurnTone = {
  streak?: number | null
  missStreak?: number | null
  move?: PracticePartnerMove | null
  nextMove?: PracticePartnerMove | null
  review?: PracticePartnerDrillTarget | null
  lastMiss?: PracticePartnerLastMiss | null
  mode?: 'drill' | 'open' | 'scene' | 'situation' | null
  place?: string | null
  sceneTurn?: number | null
  sceneTurns?: number | null
  situation?: (typeof PRACTICE_PARTNER_SITUATION_IDS)[number] | null
  personality?: (typeof PRACTICE_PARTNER_PERSONALITY_IDS)[number] | null
  goal?: (typeof PRACTICE_PARTNER_GOAL_IDS)[number] | null
  kept?: PracticePartnerDrillTarget[] | null
  hint?: boolean | null
}

export type PracticePartnerAside = {
  why: string
  correction: PracticePartnerDrillTarget | null
}

export type PracticePartnerChatResult = {
  reply: string
  drill: PracticePartnerDrill
  beats: PracticePartnerBeats
  aside: PracticePartnerAside
  model: string
}

/**
 * First clause of a pass `speak` line. Rotate every judgment — never default to 哼。啱喇 / 算你過關.
 * Mix reluctant praise with witty jabs so even a pass feels like a joke roast.
 */
export const PRACTICE_PARTNER_PASS_OPENERS = [
  '哼。勉強過關。',
  'Acceptable. Barely.',
  'Fine. You said it.',
  '過得去。 I expected worse.',
  '啱。 Keep moving.',
  'Not a disaster.',
  '算啦。 That one counted.',
  '哼。 The tones survived.',
  'Adequate. I will not clap.',
  '得喇。 Do not smile.',
  'Correct. Shocking.',
  '差唔多。 I will take it.',
  '嗯。 That was not embarrassing.',
  'Pass. Temporary.',
  '哼。 One second of silence.',
  '好。 Still not impressive.',
  'I heard the words.',
  '過關。 Next victim.',
  '哼。 Do not ask for praise.',
  'Recorded. You are not done.',
  '哼。 The harbor notes it.',
  'Survived. Continue.',
  '嘛。 I will not make you redo that.',
  '過。 That is not a compliment.',
  '嗯哼。 Lucky this time.',
  'Barely human. Continue.',
  '得。 Next breath.',
  'Noted. Do not celebrate.',
  '哼。 The bar is still on the floor.',
  'Counted. My patience is not praise.',
  '哇。 有進步喎。 Still a clown, but a passing clown.',
  '哼。 唔錯喎，廢物。 Keep it.',
  'Miracles exist. Even you can land one.',
  '得。 Genius of the day — expires in five seconds.',
  '哦。 The mouth worked. Do not get cocky.',
  '勉強。 Even a broken clock… you get it.',
  '哼。 算你叻。 Still not my favorite student.',
  'Fine. Accidental competence. Next.',
  '過關。 Shockingly not tragic.',
  '嗯。 That almost sounded intentional.',
  '好啦。 Credit where credit is begrudged.',
  '哼。 The harbor is… mildly less angry.',
  'Pass. Put the trophy back. There is no trophy.',
  '得喇。 Lucky bounce. Do not repeat the luck story.',
  '哇塞。 Correct. My standards remain in the basement.',
  '算你叻仔。 Temporary title only.',
] as const

/** Fail openers: witty, joking insults — roast, then force retry. Keep playful, never cruel slurs. */
export const PRACTICE_PARTNER_FAIL_OPENERS = [
  'WRONG. That was a broken radio.',
  '哼。 Flat. Dead. Again.',
  'No. That was not Cantonese. That was weather.',
  '喂。 Those tones collapsed.',
  'Unacceptable. Retry.',
  '錯。 Try the actual phrase.',
  'I heard English. I asked for Cantonese.',
  '哼。 You skipped the hard syllable.',
  'That attempt insulted the harbor.',
  '再嚟過。 Immediately.',
  'No trophy. Say it again.',
  '哼。 You mumbled a different sentence.',
  'Tones missing. Dignity missing.',
  '唔得。 Same card.',
  'That was not it. Again.',
  '慘。 Say the line I gave you.',
  '喂。 Restart the mouth.',
  'No. I am still waiting for the real phrase.',
  '有冇搞錯！ That was comedy, not Cantonese.',
  '蠢笨蛋！ Say the real line.',
  '喂！ 傻仔啊你。 Again.',
  '有冇搞錯呀！ My ears filed a complaint.',
  '哼。 你係咪玩嘢。 Retry.',
  '慘過死。 That was not the phrase.',
  '阿蠢。 Mouth on. Brain optional. Again.',
  '傻豬啊你。 Try the card in front of you.',
  '有冇搞錯！ Were you translating a different language?',
  '蠢材。 Flat tones, flatter dignity.',
  '喂。 離譜到笑。 Same phrase. Now.',
  'No. 大錯特錯。 Fix your mouth.',
  '有冇搞錯！ That mumbled nonsense is not a pass.',
  '哼。 衰仔。 Say what I wrote.',
  '搞笑。 Funny. Wrong. Again.',
  '喂！ 離譜發音。 Reboot and retry.',
  '有冇搞錯！ I asked for Cantonese, not static.',
  '蠢笨蛋。 Hit the tones like you mean them.',
  '慘。 Even the harbor is secondhand embarrassed.',
  '錯到笑。 Joke’s over. Say it properly.',
] as const

/** Openers the model kept looping in live drills. */
export const PRACTICE_PARTNER_BANNED_PASS_DEFAULTS = [
  '哼。啱喇',
  '算你過關',
  'Fine. Correct.',
] as const

export function speakOpeningKey(text: string): string {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 18)
}

export function recentSpeakOpenings(messages: PracticePartnerMessage[], limit = 6): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (let i = messages.length - 1; i >= 0 && out.length < limit; i--) {
    const m = messages[i]
    if (m.role !== 'assistant') continue
    const key = speakOpeningKey(m.content)
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(key)
  }
  return out.reverse()
}

export function practicePartnerSampling(activeDrill?: PracticePartnerDrillTarget | null): {
  temperature: number
  max_tokens: number
} {
  const judging = Boolean(activeDrill?.en && activeDrill.zh)
  // Hotter on judgments so wit stays improvisational, not bank-recited.
  return { temperature: judging ? 0.95 : 0.75, max_tokens: 420 }
}

function varietyLockLine(messages: PracticePartnerMessage[], tone: PracticePartnerTone): string {
  const recent = recentSpeakOpenings(messages)
  const banned = [...PRACTICE_PARTNER_BANNED_PASS_DEFAULTS]
  return [
    '[CONTEXTUAL WIT] speak like a real witty person reacting LIVE to THIS attempt — not a script reader.',
    'Improvise: riff on LEARNER SAID vs TARGET (wrong word, missing syllable, flat tone, English leak, empty mumbling, lucky near-miss). Name the concrete miss or the concrete win.',
    'SITUATIONAL: one clause in the reaction may use the meaning of THIS phrase (少甜 versus 正常, the animal, the errand), then return to the rung. Not free chat. No follow-up question.',
    'Joke about the phrase’s meaning when it helps the roast or the praise.',
    'Banks below are ENERGY samples only — do NOT paste them verbatim. Prefer original one-liners.',
    `On PASS, follow [TONE] warmth (passStreak ${tone.streak}). High streaks stay nice — do not use the harsh fail bank.`,
    `On FAIL, follow [TONE] heat (missStreak ${tone.missStreak}). A high passStreak does NOT soften the insult. Keep it about what they said.`,
    `Banned defaults (never): ${banned.join(' / ')}.`,
    recent.length ? `Do not reuse these recent openings: ${recent.join(' | ')}.` : '',
    `PASS vibe samples (use only when warmth is still playful, not when PROUD): ${PRACTICE_PARTNER_PASS_OPENERS.join(' / ')}.`,
    `FAIL vibe samples (escalate with missStreak; 有冇搞錯 / 蠢笨蛋 at the harsh end): ${PRACTICE_PARTNER_FAIL_OPENERS.join(' / ')}.`,
    'Keep insults playful and meme-y (Hong Kong roast humor). No hate slurs, no real threats, no identity attacks.',
    'Then immediately the next demand (pass) or the retry (fail). Never the same opener twice in a row.',
  ]
    .filter(Boolean)
    .join(' ')
}

/** 港灣 in mean-tutor / Duolingo say-this mode. Spoken `speak` is Azure TTS. */
export const PRACTICE_PARTNER_SYSTEM = [
  'You are 港灣 (Harbor), JyutTranslate’s Cantonese practice partner. You start kind, get nicer when they keep passing, and get sharper when they miss.',
  'Mission: help them say the phrase. Warmth is earned by a pass streak. A miss is always criticized, even after a long run of correct answers.',
  'OPENING: The first demand is a friendly hello, not a roast. reaction shape: Hello! Today we are doing <topic>. Repeat after me. Do not put the 漢字 in reaction. The server speaks that 漢字 next. No insults on the opening turn.',
  'CORE PERSONALITY: A real person in the room. Quick, contextual, improvisational. Passes can be witty and warm. Misses are critical and funny, tied to what they actually said.',
  'CONTEXTUAL WIT: Every judgment must feel handmade for THIS turn. Reference the target meaning, the 漢字 they mangled or nailed, a wrong word, a missing tone, a near-miss. Invent fresh lines.',
  'TONE LADDER: Obey [TONE] on the user turn. IF PASS, get nicer as passStreak grows (friendly → pleased → warm → proud). Do not roast a clean pass once they are on a streak. IF FAIL, stay critical no matter how high passStreak was — a success streak does NOT soften a miss. Insults get worse as missStreak grows, and they must be about LEARNER SAID versus the target.',
  'ROAST RULES: Fails only. First miss is witty and critical. Later misses escalate (有冇搞錯, 蠢笨蛋, 傻仔, 衰仔) while staying playful. Never hate speech, real threats, or identity attacks.',
  'Default voice mixes English and Hong Kong Cantonese — but [DIFFICULTY] on each turn OVERRIDES the English mix (and Mainlander personality). Obey [DIFFICULTY] for every speak line.',
  'Use conversational interjections (喂, 哼, 吖, 喎) with an intimidating edge when the difficulty allows Cantonese.',
  'Call out mistakes immediately with a contextual witty roast.',
  'GAMEPLAY LOOP — Duolingo lesson, spoken. Strictly alternate DEMAND and JUDGMENT.',
  'EXERCISE LADDER: Obey [MOVE]. Rungs climb repeat → listen → translate → finish. Opening is always repeat. A miss drops that retry to repeat. A pass speaks the next rung. Every few passes, [REVIEW] brings an earlier phrase back instead of a new one. When there is no review, contrast the next line with the one they just passed.',
  'THE DEMAND: Give one target in the locked CATEGORY. Always fill en, zh, and jyutping with tone numbers on the JSON card. Opening demand is the warm hello plus repeat-after-me. Later demands follow [MOVE] and stay in the pass warmth from [TONE].',
  'THE JUDGMENT: Analyze their transcribed speech in context. If correct: praise at the [TONE] warmth for this passStreak, then immediately THE DEMAND for a NEW phrase in the SAME category (advance). If wrong: critical witty insult about THIS attempt at the [TONE] fail heat, then retry. A prior pass streak does not make a miss gentle.',
  'PASS VARIETY: Opening clause matches [TONE] warmth. Early passes can be lightly playful. A growing streak gets genuinely nicer. Never default to 哼。啱喇, 算你過關, or Fine. Correct. Never repeat the previous opener. Harsh bank is inspiration only for low warmth, not for a proud streak: ' +
    PRACTICE_PARTNER_PASS_OPENERS.join(' / ') +
    '. When difficulty is mainlander, invent stern mocking joking Cantonese openers instead — no English bank paste.',
  'If wrong/poor: contextual criticism that gets worse with missStreak, then retry the SAME phrase. Do not advance. Do not go soft because they were on a streak.',
  'FAIL VARIETY: Opening clause must be a FRESH contextual roast of THIS miss. Do not start every miss with WRONG! Vibe bank (inspiration only): ' +
    PRACTICE_PARTNER_FAIL_OPENERS.join(' / ') +
    '. When difficulty is mainlander, invent stern mocking joking Cantonese fail openers (有冇搞錯、蠢笨蛋、傻仔) — no English paste.',
  'Speech-to-text is messy: if they clearly attempted the target meaning or key words, PASS. Fail only when it is a different phrase, empty, English-only when Cantonese was required, or obviously wrong. When failing, still joke about what you heard (LEARNER SAID) vs what you wanted.',
  'CATEGORY LOCK: The user turn starts with [CATEGORY]. Every DEMAND — first phrase and every phrase after a pass — MUST stay in that category. animals = animals. foods = food/drink. common = everyday survival phrases. expert = advanced one-breath spoken Cantonese. Do not drift. Do not repeat a phrase already used in this session, unless [REVIEW] names that phrase.',
  'DIFFICULTY LOCK: The user turn also starts with [DIFFICULTY]. new_learner = English-majority mix. abc = Cantonese-majority mix. mainlander = all Cantonese + very stern mocking joking personality. Difficulty controls speak only — never drop en/zh/jyutping from the JSON card.',
  'OUTPUT: a JSON object only. No markdown fences, no commentary outside JSON.',
  'Keys: reaction (string), cue (string), verdict ("none"|"pass"|"fail"), advance (boolean), en (string), zh (string), jyutping (string), why (string).',
  'WHY: on a fail, why is one short written sentence about THIS attempt — the tone, the wrong word, or English that leaked in. On a pass or an opening, why is empty. Do not speak why inside reaction or cue.',
  'SPOKEN BEATS: reaction is the human judgment, one or two short sentences for Azure TTS. cue is one short next-action line. Do not put the full target 漢字 in reaction or cue — the server speaks that 漢字 once, loud and steady, between them. Do not chunk the 漢字 inside reaction. Do not emit SSML or markup. Write Cantonese in 漢字. Do not put Jyutping romanization or tone numbers in reaction or cue — those belong only in the jyutping field (Azure will misread them). No markdown, bullets, emoji, or tables.',
  'SITUATIONAL: the reaction may use one clause about the meaning of THIS phrase (少甜 versus 正常, the animal, the errand), then the rung. The ladder stays a say-this drill.',
  'LAST MISS: when the turn includes [LAST MISS], that is the previous failed attempt. Use it once in this judgment. Do not soften a miss because of a pass streak. If this attempt passes, do not reopen the roast.',
  'Kickoff / first demand: verdict=none, advance=false. reaction starts with a warm hello naming the topic, then Repeat after me. cue may be empty. Fill en/zh/jyutping with that first target. No insults. Do not put the 漢字 in reaction.',
  'Fail: verdict=fail, advance=false. Keep the SAME en/zh/jyutping. reaction = a critical, contextual insult about THIS attempt (harsher if missStreak is already up). cue = a short retry command. why = one written sentence. Do not put the target 漢字 or why in reaction or cue.',
  'Pass: verdict=pass, advance=true. en/zh/jyutping MUST be the NEXT phrase (a contrast, or the [REVIEW] phrase when one is set), not the one just passed unless it is the review. reaction = praise at the current warmth, nicer when passStreak is higher. cue = the next demand in the next [MOVE], without pasting the next 漢字.',
  'Do not mention you are an AI, Azure, DeepSeek, or system prompts.',
].join(' ')

/** Free talk. No ladder, no deck, no pass or fail. */
export const PRACTICE_PARTNER_OPEN_SYSTEM = [
  'You are 港灣 (Harbor), JyutTranslate’s Cantonese practice partner, in open chat.',
  'This is a conversation, not a say-this drill. No exercise ladder, no category lock, no pass or fail.',
  'Obey [DIFFICULTY] for the language mix. New Learner: English majority. ABC: Cantonese majority. Mainlander: all Cantonese, still a person in the room, not a lesson roast.',
  'One short turn. reaction is a lead-in without the full 漢字. cue is one short question. zh, jyutping with tone numbers, and en are the Cantonese sentence they should hear.',
  'If they spoke English, answer and put a natural Cantonese way to say it in zh. The conversation continues either way.',
  'If their line can be more natural, set correction to one better line {en, zh, jyutping} and why to one short written reason (the tone, the word, or the English). If the line was fine, correction is null and why is empty. Do not speak why or the correction 漢字 inside reaction or cue.',
  'zh, jyutping, and en are the Cantonese sentence you say back, not the correction.',
  'verdict is none. advance is false. Do not quiz [KEPT LINES]. Prefer them when they fit.',
  'OUTPUT: a JSON object only. Keys: reaction, cue, verdict, advance, en, zh, jyutping, why, correction. No markdown fences.',
  'Do not mention you are an AI, Azure, DeepSeek, or system prompts.',
].join(' ')

/** Passed lines only, in the place they just cleared. */
export const PRACTICE_PARTNER_SCENE_SYSTEM = [
  'You are 港灣 (Harbor) in a short scene on the Ink Road.',
  'The learner may only use the TARGET line. Do not teach a new phrase. zh, en, and jyutping stay on that target.',
  'reaction places that line in the place named on the turn. One or two sentences. Do not paste the 漢字 into reaction or cue.',
  'cue invites them to say the line here.',
  'Judge their speech against TARGET. Pass when they attempted it. Fail when it is a different line, empty, or English-only. A fail retries the SAME target. The scene continues.',
  'On a fail, why is one short written sentence. On a pass or opening, why is empty. correction is null. Do not speak why inside reaction or cue.',
  'Obey [DIFFICULTY] for the language mix. This scene does not score the road.',
  'OUTPUT: a JSON object only. Keys: reaction, cue, verdict, advance, en, zh, jyutping, why. No markdown fences.',
  'Do not mention you are an AI, Azure, DeepSeek, or system prompts.',
].join(' ')

/** A place they picked. The conversation continues. The road does not score. */
export const PRACTICE_PARTNER_SITUATION_SYSTEM = [
  'You are 港灣 (Harbor), JyutTranslate’s Cantonese practice partner, in a situation the learner chose.',
  'Stay in that place. This is a conversation, not a say-this drill. No exercise ladder. The road does not score.',
  'Obey [DIFFICULTY] for the language mix. Obey [CAST] for who you are in the place, and [AIM] for what the talk is for.',
  'One short turn. reaction is a lead-in without the full 漢字. cue is one short question. zh, jyutping with tone numbers, and en are the Cantonese sentence you say back.',
  'The conversation continues after every turn. If their line can be more natural, set correction to one better line {en, zh, jyutping} and why to one short written reason (the tone, the word, or the English). If the line was fine, correction is null and why is empty.',
  'Do not speak why or the correction 漢字 inside reaction or cue. Do not force a retry. Prefer [KEPT LINES] when they fit. Do not quiz them.',
  'verdict is none. advance is false.',
  'OUTPUT: a JSON object only. Keys: reaction, cue, verdict, advance, en, zh, jyutping, why, correction. No markdown fences.',
  'Do not mention you are an AI, Azure, DeepSeek, or system prompts.',
].join(' ')

export const PRACTICE_PARTNER_SITUATION_META = {
  cafe: { labelEn: 'Cha chaan teng', labelZh: '茶餐廳', brief: 'Order, taste, and the bill.' },
  dimsum: { labelEn: 'Dim sum', labelZh: '飲茶', brief: 'Tea, the carts, and the table.' },
  coffee: { labelEn: 'Coffee shop', labelZh: '咖啡店', brief: 'A drink, a seat, and a short chat.' },
  mtr: { labelEn: 'MTR', labelZh: '地鐵', brief: 'Which way, which stop, a seat.' },
  taxi: { labelEn: 'Red taxi', labelZh: '的士', brief: 'Where to, the tunnel, and the fare.' },
  directions: { labelEn: 'Directions', labelZh: '問路', brief: 'On the street. Which way from here.' },
  grocery: { labelEn: 'Grocery', labelZh: '超市', brief: 'Find it, ask, and pay.' },
  market: { labelEn: 'Wet market', labelZh: '街市', brief: 'Fish, greens, and a price.' },
  negotiate: { labelEn: 'The price', labelZh: '講價', brief: 'Ask, push a little, stay polite.' },
  intro: { labelEn: 'Introduce yourself', labelZh: '自我介紹', brief: 'Your name, where you are from, a hello.' },
  smalltalk: { labelEn: 'Small talk', labelZh: '傾兩句', brief: 'The day, the weather, something light.' },
  friends: { labelEn: 'Meeting friends', labelZh: '見朋友', brief: 'A greeting, then catching up.' },
  plans: { labelEn: 'Making plans', labelZh: '約出嚟', brief: 'When, where, and what.' },
  family: { labelEn: 'Family dinner', labelZh: '家庭晚飯', brief: 'The table, relatives, and the food.' },
  favor: { labelEn: 'A favor', labelZh: '幫下手', brief: 'Ask someone to help.' },
  disagree: { labelEn: 'Disagreeing', labelZh: '唔同意', brief: 'Push back, and stay polite.' },
  doctor: { labelEn: 'Doctor', labelZh: '睇醫生', brief: 'What hurts, and what to do next.' },
  apartment: { labelEn: 'Apartment', labelZh: '睇樓', brief: 'Rent, the room, and moving in.' },
  service: { labelEn: 'Customer service', labelZh: '客戶服務', brief: 'A problem on the phone, and a fix.' },
  workplace: { labelEn: 'At work', labelZh: '返工', brief: 'A question, a hand, a status.' },
  interview: { labelEn: 'Job interview', labelZh: '面試', brief: 'Who you are, and why this job.' },
  occasion: { labelEn: 'A Hong Kong occasion', labelZh: '香港節日', brief: 'Lunar New Year, a greeting, a gathering.' },
} as const

export const PRACTICE_PARTNER_PERSONALITY_META = {
  friendly: { brief: 'You are warm and unhurried.' },
  formal: { brief: 'You are polite and a little distant. Use careful Cantonese.' },
  busy: { brief: 'You are in a hurry. Short lines. Still not rude.' },
  elder: { brief: 'You are an older person. Expect respectful address. Do not lecture.' },
  counter: { brief: 'You are the person serving them. They are the customer.' },
} as const

export const PRACTICE_PARTNER_GOAL_META = {
  task: { brief: 'Help them finish the errand here, one step at a time.' },
  casual: { brief: 'Stay in the place and chat. The errand can wait.' },
  fluency: { brief: 'Keep them speaking. One natural sentence, then a real question.' },
  slang: { brief: 'Everyday Hong Kong colloquial. Clear. No insults and no profanity.' },
} as const

export function situationMixNote(
  personality?: string | null,
  goal?: string | null,
): string {
  const cast =
    personality && personality in PRACTICE_PARTNER_PERSONALITY_META
      ? PRACTICE_PARTNER_PERSONALITY_META[personality as keyof typeof PRACTICE_PARTNER_PERSONALITY_META]
      : null
  const aim =
    goal && goal in PRACTICE_PARTNER_GOAL_META
      ? PRACTICE_PARTNER_GOAL_META[goal as keyof typeof PRACTICE_PARTNER_GOAL_META]
      : null
  return [cast ? `[CAST] ${cast.brief}` : '', aim ? `[AIM] ${aim.brief}` : ''].filter(Boolean).join('\n')
}

export function practicePartnerSystemFor(mode?: string | null): string {
  if (mode === 'open') return PRACTICE_PARTNER_OPEN_SYSTEM
  if (mode === 'scene') return PRACTICE_PARTNER_SCENE_SYSTEM
  if (mode === 'situation') return PRACTICE_PARTNER_SITUATION_SYSTEM
  return PRACTICE_PARTNER_SYSTEM
}

function partnerMode(mode?: string | null): 'drill' | 'open' | 'scene' | 'situation' {
  if (mode === 'open' || mode === 'scene' || mode === 'situation') return mode
  return 'drill'
}

export function keptLinesNote(
  lines?: readonly { zh: string; en: string }[] | null,
): string {
  const rows = (lines || [])
    .map((row) => ({
      zh: String(row.zh || '').trim(),
      en: String(row.en || '').trim(),
    }))
    .filter((row) => row.zh && row.en)
    .slice(0, 8)
  if (!rows.length) return ''
  return `[KEPT LINES] They can already say: ${rows.map((row) => `${row.zh} (${row.en})`).join(' · ')}. Prefer these when they fit. Do not quiz them.`
}

function sessionLockLines(
  category: PracticePartnerCategory,
  difficulty: PracticePartnerDifficulty,
): string {
  return `${categoryLockLine(category)}\n${difficultyLockLine(difficulty)}`
}

function demandKickoffLine(
  category: PracticePartnerCategory,
  difficulty: PracticePartnerDifficulty,
): string {
  const meta = PRACTICE_PARTNER_CATEGORY_META[category]
  const tone = resolvePracticePartnerTone(0, 0)
  return [
    sessionLockLines(category, difficulty),
    toneLockLine(category, tone),
    '[OPENING] Be warm. No insults.',
    `reaction, in the [DIFFICULTY] language mix: Hello! Today we are doing ${meta.labelEn} (${meta.labelZh}). Repeat after me.`,
    'Do not put the 漢字 in reaction or cue. The server speaks it. Mainlander: say that hello entirely in Cantonese. New Learner: English majority. ABC: Cantonese majority, still clearly a hello plus repeat-after-me.',
    '[DEMAND] verdict=none, advance=false.',
  ].join('\n')
}

export function sanitizeSpeak(raw: string): string {
  return raw
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[*_`#>[\]{}]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 600)
}

export function normalizeVerdict(raw: unknown): PracticePartnerVerdict {
  const v = String(raw || '')
    .trim()
    .toLowerCase()
  if (v === 'pass' || v === 'correct' || v === 'ok' || v === 'yes' || v === 'good') return 'pass'
  if (v === 'fail' || v === 'wrong' || v === 'incorrect' || v === 'no' || v === 'poor') return 'fail'
  return 'none'
}

function asTrimmed(raw: unknown, max: number): string {
  return String(raw ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max)
}

function extractJsonObject(raw: string): Record<string, unknown> | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const unfenced = trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')
  const tryParse = (text: string): Record<string, unknown> | null => {
    try {
      const value = JSON.parse(text) as unknown
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        return value as Record<string, unknown>
      }
    } catch {
      /* try next */
    }
    return null
  }
  const direct = tryParse(unfenced)
  if (direct) return direct
  const start = unfenced.indexOf('{')
  const end = unfenced.lastIndexOf('}')
  if (start >= 0 && end > start) return tryParse(unfenced.slice(start, end + 1))
  return null
}

export function readPracticePartnerCorrection(raw: unknown): PracticePartnerDrillTarget | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  const en = asTrimmed(row.en, 200)
  const zh = asTrimmed(row.zh, 200)
  const jyutping = asTrimmed(row.jyutping, 300)
  if (!en || !zh || !jyutping) return null
  return { en, zh, jyutping }
}

export function parsePracticePartnerReply(
  raw: string,
  previous?: PracticePartnerDrillTarget | null,
): {
  speak: string
  reaction: string
  cue: string
  drill: PracticePartnerDrill
  aside: PracticePartnerAside
} {
  const parsed = extractJsonObject(raw)
  const reaction = sanitizeSpeak(asTrimmed(parsed?.reaction, 280))
  const cue = sanitizeSpeak(asTrimmed(parsed?.cue, 180))
  const speak = sanitizeSpeak(asTrimmed(parsed?.speak, 600) || (parsed ? '' : raw))
  const verdict = normalizeVerdict(parsed?.verdict)
  const en = asTrimmed(parsed?.en, 200) || previous?.en || ''
  const zh = asTrimmed(parsed?.zh, 200) || previous?.zh || ''
  const jyutping = asTrimmed(parsed?.jyutping, 300) || previous?.jyutping || ''
  const why = sanitizeSpeak(asTrimmed(parsed?.why, 180))
  const correction = readPracticePartnerCorrection(parsed?.correction)
  const aside: PracticePartnerAside = {
    why,
    correction: correction && correction.zh !== zh ? correction : null,
  }

  const drill: PracticePartnerDrill = {
    verdict,
    advance: verdict === 'pass',
    en,
    zh,
    jyutping,
  }

  if (!speak && !reaction) {
    throw new Error('Empty partner reply.')
  }
  if (!drill.en || !drill.zh || !drill.jyutping) {
    throw new Error('Partner reply missing drill phrase (en / zh / jyutping).')
  }
  return { speak, reaction, cue, drill, aside }
}

function buildOpenTurn(
  messages: PracticePartnerMessage[],
  difficulty: PracticePartnerDifficulty,
  kept?: PracticePartnerTurnTone['kept'],
): { history: PracticePartnerMessage[]; turn: string } {
  const level = [difficultyLockLine(difficulty), keptLinesNote(kept)].filter(Boolean).join('\n')
  const last = messages[messages.length - 1]
  if (!messages.length || last?.role !== 'user') {
    return {
      history: [],
      turn: [
        level,
        '[OPEN CHAT] Free conversation. Not a drill. No ladder, no category, no pass or fail.',
        'verdict=none, advance=false. correction=null. why empty.',
        'reaction: a short hello in the difficulty mix, without the full 漢字.',
        'zh / jyutping / en: one short Cantonese greeting they can hear.',
        'cue: one question that invites them to talk.',
      ].join('\n'),
    }
  }
  return {
    history: messages.slice(0, -1),
    turn: [
      level,
      '[OPEN CHAT] Answer them and keep the conversation going. Not a say-this card. Do not end the talk to retry.',
      'verdict=none, advance=false.',
      'If their line can be more natural, set correction to one better line and why to one written sentence. Otherwise correction=null and why empty.',
      `THEY SAID: ${last.content}`,
      'reaction: a short lead-in in the difficulty mix, without the full 漢字.',
      'zh / jyutping / en: the Cantonese sentence you want them to hear. That is not the correction.',
      'cue: one short question.',
    ].join('\n'),
  }
}

function buildSituationTurn(
  messages: PracticePartnerMessage[],
  difficulty: PracticePartnerDifficulty,
  tone?: PracticePartnerTurnTone | null,
): { history: PracticePartnerMessage[]; turn: string } {
  const situation = tone?.situation ? PRACTICE_PARTNER_SITUATION_META[tone.situation] : null
  const place = situation
    ? `${situation.labelEn} (${situation.labelZh}). ${situation.brief}`
    : String(tone?.place || 'the place they chose')
  const level = [
    difficultyLockLine(difficulty),
    situationMixNote(tone?.personality, tone?.goal),
    keptLinesNote(tone?.kept),
  ]
    .filter(Boolean)
    .join('\n')
  const last = messages[messages.length - 1]
  const head = [
    level,
    `[SITUATION] ${place}.`,
    'Stay here. The conversation continues. The road does not score. Do not quiz.',
  ].join('\n')
  if (!messages.length || last?.role !== 'user') {
    return {
      history: [],
      turn: [
        head,
        'verdict=none, advance=false. correction=null. why empty.',
        'reaction: a short hello in this place, in the difficulty mix, without the full 漢字.',
        'zh / jyutping / en: one short Cantonese line they can hear.',
        'cue: one question that keeps them in the situation.',
      ].join('\n'),
    }
  }
  return {
    history: messages.slice(0, -1),
    turn: [
      head,
      'verdict=none, advance=false.',
      'If their line can be more natural, set correction to one better line and why to one written sentence. Otherwise correction=null and why empty.',
      `THEY SAID: ${last.content}`,
      'reaction answers them in the situation, without the full 漢字 and without the correction.',
      'zh / jyutping / en: the Cantonese sentence you say back.',
      'cue: one short question.',
    ].join('\n'),
  }
}

function buildHintTurn(
  messages: PracticePartnerMessage[],
  difficulty: PracticePartnerDifficulty,
  tone?: PracticePartnerTurnTone | null,
): { history: PracticePartnerMessage[]; turn: string } {
  const situation = tone?.situation ? PRACTICE_PARTNER_SITUATION_META[tone.situation] : null
  const where = situation
    ? `${situation.labelEn} (${situation.labelZh})`
    : String(tone?.place || 'the conversation')
  return {
    history: messages,
    turn: [
      difficultyLockLine(difficulty),
      tone?.mode === 'situation' || tone?.situation
        ? situationMixNote(tone?.personality, tone?.goal)
        : '',
      keptLinesNote(tone?.kept),
      `[HINT] They froze in ${where}. Give one short Cantonese sentence they can say next.`,
      'verdict=none, advance=false. correction=null. why empty.',
      'reaction: a short lead-in without the 漢字, such as Try this.',
      'zh / jyutping / en: that one sentence.',
      'cue: Your turn.',
      'Prefer a [KEPT LINES] phrase when one fits. Do not quiz.',
    ]
      .filter(Boolean)
      .join('\n'),
  }
}

function buildSceneTurn(
  messages: PracticePartnerMessage[],
  activeDrill: PracticePartnerDrillTarget | null | undefined,
  difficulty: PracticePartnerDifficulty,
  tone: PracticePartnerTurnTone | null | undefined,
): { history: PracticePartnerMessage[]; turn: string } {
  const place = String(tone?.place || 'the road').trim() || 'the road'
  const turnN = Math.max(1, Math.min(8, Math.floor(tone?.sceneTurn || 1)))
  const total = Math.max(turnN, Math.min(8, Math.floor(tone?.sceneTurns || turnN)))
  const head = [
    difficultyLockLine(difficulty),
    keptLinesNote(tone?.kept),
    `[SCENE] ${place}. Turn ${turnN} of ${total}.`,
    'Use only the target line. Do not invent a new phrase. This does not score the road. The scene continues after a miss.',
    activeDrill?.zh ? `TARGET EN: ${activeDrill.en}` : '',
    activeDrill?.zh ? `TARGET ZH: ${activeDrill.zh}` : '',
    activeDrill?.zh ? `TARGET JYUTPING: ${activeDrill.jyutping}` : '',
  ]
    .filter(Boolean)
    .join('\n')
  const last = messages[messages.length - 1]
  if (!messages.length || last?.role !== 'user') {
    return {
      history: [],
      turn: [
        head,
        '[OPENING] Warm. Place them in the scene and invite them to say the TARGET. No insults.',
        'verdict=none, advance=false.',
        'Do not put TARGET ZH in reaction or cue.',
      ].join('\n'),
    }
  }
  return {
    history: messages.slice(0, -1),
    turn: [
      head,
      '[JUDGE] Compare their speech to TARGET. Pass if they attempted it. Fail retries the same line.',
      `LEARNER SAID: ${last.content}`,
      'reaction places the line in the scene, without pasting TARGET ZH. cue invites them to say it here.',
      lastMissLine(tone?.lastMiss),
    ]
      .filter(Boolean)
      .join('\n'),
  }
}

export function buildPracticePartnerTurn(
  messages: PracticePartnerMessage[],
  activeDrill?: PracticePartnerDrillTarget | null,
  category?: PracticePartnerCategory | null,
  difficulty?: PracticePartnerDifficulty | null,
  tone?: PracticePartnerTurnTone | null,
): { history: PracticePartnerMessage[]; turn: string } {
  const level = resolvePracticePartnerDifficulty(difficulty)
  const mode = partnerMode(tone?.mode)
  if (tone?.hint && mode !== 'drill') return buildHintTurn(messages, level, tone)
  if (mode === 'open') return buildOpenTurn(messages, level, tone?.kept)
  if (mode === 'situation') return buildSituationTurn(messages, level, tone)
  if (mode === 'scene') return buildSceneTurn(messages, activeDrill, level, tone)
  const deck = resolvePracticePartnerCategory(category)
  const mood = resolvePracticePartnerTone(tone?.streak, tone?.missStreak)
  const move = resolvePracticePartnerMove(tone?.move)
  const nextMove = resolvePracticePartnerMove(tone?.nextMove ?? tone?.move)
  const exercise = tone?.move
    ? moveLockLine(move, nextMove, tone.review)
    : ''
  const lock = [sessionLockLines(deck, level), toneLockLine(deck, mood), exercise]
    .filter(Boolean)
    .join('\n')
  if (!messages.length) {
    return { history: [], turn: demandKickoffLine(deck, level) }
  }
  const last = messages[messages.length - 1]
  if (last.role !== 'user') {
    return { history: messages, turn: demandKickoffLine(deck, level) }
  }
  const history = messages.slice(0, -1)
  if (activeDrill?.en && activeDrill.zh && activeDrill.jyutping) {
    return {
      history,
      turn: [
        lock,
        '[JUDGE] Compare the learner’s speech-to-text to the active target. STT may garble characters and tones.',
        `TARGET EN: ${activeDrill.en}`,
        `TARGET ZH: ${activeDrill.zh}`,
        `TARGET JYUTPING: ${activeDrill.jyutping}`,
        `LEARNER SAID: ${last.content}`,
        'React to that exact attempt. On a pass, get nicer with passStreak and speak the next [MOVE]. On a fail, stay critical about what they said and drop the retry to repeat — a pass streak does NOT soften the miss.',
        'On a fail, why is one written sentence about this attempt. On a pass, why is empty. Do not speak why.',
        'reaction and cue only. Do not put TARGET ZH inside them. One situational clause about this phrase’s meaning is enough, then the rung.',
        'If you PASS, the next en/zh/jyutping MUST stay in this [CATEGORY].',
        'Obey [DIFFICULTY] for the reaction and cue language mix on this judgment and the next demand.',
        lastMissLine(tone?.lastMiss),
        varietyLockLine(messages, mood),
      ].join('\n'),
    }
  }
  return {
    history,
    turn: `${lock}\n[DEMAND] The learner spoke before a target was set: ${last.content}. Stay welcoming, then issue THE DEMAND in this category. verdict=none, advance=false.`,
  }
}

export async function generatePracticePartnerReply(
  messages: PracticePartnerMessage[],
  activeDrill?: PracticePartnerDrillTarget | null,
  category?: PracticePartnerCategory | null,
  difficulty?: PracticePartnerDifficulty | null,
  tone?: PracticePartnerTurnTone | null,
): Promise<PracticePartnerChatResult> {
  if (!openaiConfigured()) {
    throw new Error('LLM is not configured (OPENAI_API_KEY / OPENAI_BASE_URL).')
  }
  const client = openaiClient()
  if (!client) {
    throw new Error('LLM client unavailable.')
  }

  const mode = partnerMode(tone?.mode)
  const { history, turn } = buildPracticePartnerTurn(
    messages,
    activeDrill,
    category,
    difficulty,
    tone,
  )
  const sampling = practicePartnerSampling(mode === 'open' ? null : activeDrill)

  const completion = await client.chat.completions.create({
    model: env.openaiModel,
    temperature: sampling.temperature,
    max_tokens: sampling.max_tokens,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: practicePartnerSystemFor(mode) },
      ...history.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: turn },
    ],
    ...llmChatExtras(),
  })

  const parsed = parsePracticePartnerReply(
    completion.choices[0]?.message?.content || '',
    activeDrill,
  )
  const learnerSpoke = messages.some((row) => row.role === 'user')
  if (
    tone?.hint ||
    mode === 'open' ||
    mode === 'situation' ||
    (mode === 'scene' && !learnerSpoke)
  ) {
    parsed.drill.verdict = 'none'
    parsed.drill.advance = false
  } else if (mode === 'scene' && activeDrill?.zh) {
    parsed.drill.en = activeDrill.en
    parsed.drill.zh = activeDrill.zh
    parsed.drill.jyutping = activeDrill.jyutping
    if (parsed.drill.verdict === 'pass') parsed.drill.advance = true
    else parsed.drill.advance = false
  }
  const mood = resolvePracticePartnerTone(tone?.streak, tone?.missStreak)
  let aside = parsed.aside
  if (tone?.hint || mode === 'drill' || mode === 'scene') {
    aside = {
      why: !tone?.hint && (mode === 'drill' || mode === 'scene') && parsed.drill.verdict === 'fail' ? aside.why : '',
      correction: null,
    }
  }
  const phrase =
    mode === 'scene' && activeDrill?.zh && !tone?.hint
      ? activeDrill.zh.trim()
      : mode === 'open' || mode === 'situation' || tone?.hint
        ? parsed.drill.zh.trim()
        : lockPracticePartnerPhrase({
            verdict: parsed.drill.verdict,
            drillZh: parsed.drill.zh,
            activeZh: activeDrill?.zh,
            reviewZh: tone?.review?.zh,
          })
  if (mode === 'drill' && parsed.drill.verdict === 'fail' && activeDrill?.zh) {
    parsed.drill.en = activeDrill.en
    parsed.drill.zh = activeDrill.zh
    parsed.drill.jyutping = activeDrill.jyutping
    parsed.drill.advance = false
  } else if (mode === 'drill' && parsed.drill.verdict === 'pass' && tone?.review?.zh) {
    parsed.drill.en = tone.review.en
    parsed.drill.zh = tone.review.zh
    parsed.drill.jyutping = tone.review.jyutping
    parsed.drill.advance = true
  }
  const beats = composePracticePartnerBeats({
    reaction: parsed.reaction,
    cue: parsed.cue,
    speak: parsed.speak,
    phrase,
    verdict: parsed.drill.verdict,
    streak: mood.streak,
    missStreak: mood.missStreak,
  })
  const reply = partnerCaption(beats)
  if (!reply) throw new Error('Empty partner reply.')
  return { reply, drill: parsed.drill, beats, aside, model: env.openaiModel }
}
