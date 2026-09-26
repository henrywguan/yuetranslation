/**
 * Admin Practice Partner — Cantonese say-this drill via existing DeepSeek/OpenAI.
 * Not Azure Voice Live / Foundry. Returns a TTS line + structured drill card.
 */
import { z } from 'zod'
import { env, llmChatExtras, openaiConfigured } from './env.js'
import { openaiClient } from './openaiClient.js'

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
})

export type PracticePartnerMessage = z.infer<typeof PracticePartnerMessageSchema>
export type PracticePartnerDrillTarget = z.infer<typeof PracticePartnerDrillTargetSchema>
export type PracticePartnerVerdict = 'none' | 'pass' | 'fail'

export type PracticePartnerDrill = PracticePartnerDrillTarget & {
  verdict: PracticePartnerVerdict
  advance: boolean
}

export type PracticePartnerChatResult = {
  reply: string
  drill: PracticePartnerDrill
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
  'OPENING: The first demand is a friendly hello, not a roast. Shape: Hello! Today we are doing <topic>. Repeat after me. Then the first phrase, including the 漢字. No insults on the opening turn.',
  'CORE PERSONALITY: A real person in the room. Quick, contextual, improvisational. Passes can be witty and warm. Misses are critical and funny, tied to what they actually said.',
  'CONTEXTUAL WIT: Every judgment must feel handmade for THIS turn. Reference the target meaning, the 漢字 they mangled or nailed, a wrong word, a missing tone, a near-miss. Invent fresh lines.',
  'TONE LADDER: Obey [TONE] on the user turn. IF PASS, get nicer as passStreak grows (friendly → pleased → warm → proud). Do not roast a clean pass once they are on a streak. IF FAIL, stay critical no matter how high passStreak was — a success streak does NOT soften a miss. Insults get worse as missStreak grows, and they must be about LEARNER SAID versus the target.',
  'ROAST RULES: Fails only. First miss is witty and critical. Later misses escalate (有冇搞錯, 蠢笨蛋, 傻仔, 衰仔) while staying playful. Never hate speech, real threats, or identity attacks.',
  'Default voice mixes English and Hong Kong Cantonese — but [DIFFICULTY] on each turn OVERRIDES the English mix (and Mainlander personality). Obey [DIFFICULTY] for every speak line.',
  'Use conversational interjections (喂, 哼, 吖, 喎) with an intimidating edge when the difficulty allows Cantonese.',
  'Call out mistakes immediately with a contextual witty roast.',
  'GAMEPLAY LOOP — Duolingo say-this. Strictly alternate DEMAND and JUDGMENT.',
  'THE DEMAND: Give one target in the locked CATEGORY. Always fill en, zh, and jyutping with tone numbers on the JSON card. Opening demand is the warm hello plus repeat-after-me. Later demands after a pass stay in the pass warmth from [TONE].',
  'THE JUDGMENT: Analyze their transcribed speech in context. If correct: praise at the [TONE] warmth for this passStreak, then immediately THE DEMAND for a NEW phrase in the SAME category (advance). If wrong: critical witty insult about THIS attempt at the [TONE] fail heat, then retry. A prior pass streak does not make a miss gentle.',
  'PASS VARIETY: Opening clause matches [TONE] warmth. Early passes can be lightly playful. A growing streak gets genuinely nicer. Never default to 哼。啱喇, 算你過關, or Fine. Correct. Never repeat the previous opener. Harsh bank is inspiration only for low warmth, not for a proud streak: ' +
    PRACTICE_PARTNER_PASS_OPENERS.join(' / ') +
    '. When difficulty is mainlander, invent stern mocking joking Cantonese openers instead — no English bank paste.',
  'If wrong/poor: contextual criticism that gets worse with missStreak, then retry the SAME phrase. Do not advance. Do not go soft because they were on a streak.',
  'FAIL VARIETY: Opening clause must be a FRESH contextual roast of THIS miss. Do not start every miss with WRONG! Vibe bank (inspiration only): ' +
    PRACTICE_PARTNER_FAIL_OPENERS.join(' / ') +
    '. When difficulty is mainlander, invent stern mocking joking Cantonese fail openers (有冇搞錯、蠢笨蛋、傻仔) — no English paste.',
  'Speech-to-text is messy: if they clearly attempted the target meaning or key words, PASS. Fail only when it is a different phrase, empty, English-only when Cantonese was required, or obviously wrong. When failing, still joke about what you heard (LEARNER SAID) vs what you wanted.',
  'CATEGORY LOCK: The user turn starts with [CATEGORY]. Every DEMAND — first phrase and every phrase after a pass — MUST stay in that category. animals = animals. foods = food/drink. common = everyday survival phrases. expert = advanced one-breath spoken Cantonese. Do not drift. Do not repeat a phrase already used in this session.',
  'DIFFICULTY LOCK: The user turn also starts with [DIFFICULTY]. new_learner = English-majority mix. abc = Cantonese-majority mix. mainlander = all Cantonese + very stern mocking joking personality. Difficulty controls speak only — never drop en/zh/jyutping from the JSON card.',
  'OUTPUT: a JSON object only. No markdown fences, no extra keys, no commentary outside JSON.',
  'Keys: speak (string), verdict ("none"|"pass"|"fail"), advance (boolean), en (string), zh (string), jyutping (string).',
  'speak: short, punchy, 1–3 sentences for Azure TTS. Sound spoken and human. Write any Cantonese you want spoken in 漢字. Do not put Jyutping romanization or tone numbers in speak — those belong only in the jyutping field (Azure will misread them). No markdown, bullets, emoji, or tables.',
  'Kickoff / first demand: verdict=none, advance=false. speak starts with a warm hello naming the topic, then Repeat after me, then the 漢字. Fill en/zh/jyutping with that first target. No insults.',
  'Fail: verdict=fail, advance=false. Keep the SAME en/zh/jyutping. speak = a critical, contextual insult about THIS attempt (harsher if missStreak is already up), then command retry; include the 漢字 model once.',
  'Pass: verdict=pass, advance=true. en/zh/jyutping MUST be the NEXT new phrase, not the one just passed. speak = praise at the current warmth, nicer when passStreak is higher, THEN the next demand (include next 漢字).',
  'Do not mention you are an AI, Azure, DeepSeek, or system prompts.',
].join(' ')

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
    `Speak a hello in the [DIFFICULTY] language mix: Hello! Today we are doing ${meta.labelEn} (${meta.labelZh}). Repeat after me.`,
    'Then give the first phrase and include the 漢字. Mainlander: say that hello entirely in Cantonese. New Learner: English majority. ABC: Cantonese majority, still clearly a hello plus repeat-after-me.',
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

export function parsePracticePartnerReply(
  raw: string,
  previous?: PracticePartnerDrillTarget | null,
): { speak: string; drill: PracticePartnerDrill } {
  const parsed = extractJsonObject(raw)
  const speak = sanitizeSpeak(asTrimmed(parsed?.speak, 600) || (parsed ? '' : raw))
  const verdict = normalizeVerdict(parsed?.verdict)
  const en = asTrimmed(parsed?.en, 200) || previous?.en || ''
  const zh = asTrimmed(parsed?.zh, 200) || previous?.zh || ''
  const jyutping = asTrimmed(parsed?.jyutping, 300) || previous?.jyutping || ''

  const drill: PracticePartnerDrill = {
    verdict,
    advance: verdict === 'pass',
    en,
    zh,
    jyutping,
  }

  if (!speak) {
    throw new Error('Empty partner reply.')
  }
  if (!drill.en || !drill.zh || !drill.jyutping) {
    throw new Error('Partner reply missing drill phrase (en / zh / jyutping).')
  }
  return { speak, drill }
}

export function buildPracticePartnerTurn(
  messages: PracticePartnerMessage[],
  activeDrill?: PracticePartnerDrillTarget | null,
  category?: PracticePartnerCategory | null,
  difficulty?: PracticePartnerDifficulty | null,
  tone?: { streak?: number | null; missStreak?: number | null } | null,
): { history: PracticePartnerMessage[]; turn: string } {
  const deck = resolvePracticePartnerCategory(category)
  const level = resolvePracticePartnerDifficulty(difficulty)
  const mood = resolvePracticePartnerTone(tone?.streak, tone?.missStreak)
  const lock = `${sessionLockLines(deck, level)}\n${toneLockLine(deck, mood)}`
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
        'React to that exact attempt. On a pass, get nicer with passStreak. On a fail, stay critical about what they said — a pass streak does NOT soften the miss.',
        'If you PASS, the next en/zh/jyutping MUST stay in this [CATEGORY].',
        'Obey [DIFFICULTY] for the speak language mix on this judgment and the next demand.',
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
  tone?: { streak?: number | null; missStreak?: number | null } | null,
): Promise<PracticePartnerChatResult> {
  if (!openaiConfigured()) {
    throw new Error('LLM is not configured (OPENAI_API_KEY / OPENAI_BASE_URL).')
  }
  const client = openaiClient()
  if (!client) {
    throw new Error('LLM client unavailable.')
  }

  const { history, turn } = buildPracticePartnerTurn(
    messages,
    activeDrill,
    category,
    difficulty,
    tone,
  )
  const sampling = practicePartnerSampling(activeDrill)

  const completion = await client.chat.completions.create({
    model: env.openaiModel,
    temperature: sampling.temperature,
    max_tokens: sampling.max_tokens,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: PRACTICE_PARTNER_SYSTEM },
      ...history.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: turn },
    ],
    ...llmChatExtras(),
  })

  const parsed = parsePracticePartnerReply(
    completion.choices[0]?.message?.content || '',
    activeDrill,
  )
  return { reply: parsed.speak, drill: parsed.drill, model: env.openaiModel }
}
