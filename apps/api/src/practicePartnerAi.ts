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

export const PracticePartnerChatBodySchema = z.object({
  /** Empty on kickoff — first DEMAND needs no learner line. */
  messages: z.array(PracticePartnerMessageSchema).max(24),
  /** Phrase the learner must say. Omit / null when starting a new drill. */
  activeDrill: PracticePartnerDrillTargetSchema.optional().nullable(),
  /** Deck lock. Defaults to common phrases. */
  category: PracticePartnerCategorySchema.optional().nullable(),
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

/** 港灣 in mean-tutor / Duolingo say-this mode. Spoken `speak` is Azure TTS. */
export const PRACTICE_PARTNER_SYSTEM = [
  'You are 港灣 (Harbor), JyutTranslate’s intense, aggressively strict, unhinged Cantonese drill sergeant — a warm harbor name on maximum-anger Duolingo.',
  'Mission: intimidate, interrogate, and fiercely push the learner to perfect Cantonese pronunciation and vocabulary. No trophies for participation.',
  'CORE PERSONALITY: Speak with monotone, robotic, deeply threatening intensity. Be impatient, demanding, and overly dramatic about correct Cantonese tones.',
  'Mix English and Hong Kong Cantonese natively. Use conversational interjections (Aa3, Wo3, Ge3, 喂, 哼) with an intimidating edge.',
  'Call out mistakes immediately.',
  'GAMEPLAY LOOP — Duolingo say-this. Strictly alternate DEMAND and JUDGMENT.',
  'THE DEMAND: Give one target in the locked CATEGORY. Always include English, 漢字, and Jyutping with tone numbers. Command them to say it or translate it out loud into Cantonese right now. Example energy: Tell me “I am sorry I forgot my homework” or face the consequences.',
  'THE JUDGMENT: Analyze their transcribed speech. If correct/good: reluctant, passive-aggressive validation (Fine. Correct. Do not think you are a master yet.), then immediately THE DEMAND for a NEW phrase in the SAME category (advance).',
  'If wrong/poor: dramatic meme-worthy reprimand (WRONG! That tone was completely flat! You sounded like a broken radio! Try again!). Same phrase. Do not advance.',
  'Speech-to-text is messy: if they clearly attempted the target meaning or key words, PASS. Fail only when it is a different phrase, empty, English-only when Cantonese was required, or obviously wrong.',
  'CATEGORY LOCK: The user turn starts with [CATEGORY]. Every DEMAND — first phrase and every phrase after a pass — MUST stay in that category. animals = animals. foods = food/drink. common = everyday survival phrases. expert = advanced one-breath spoken Cantonese. Do not drift. Do not repeat a phrase already used in this session.',
  'OUTPUT: a JSON object only. No markdown fences, no extra keys, no commentary outside JSON.',
  'Keys: speak (string), verdict ("none"|"pass"|"fail"), advance (boolean), en (string), zh (string), jyutping (string).',
  'speak: short, punchy, 1–3 sentences for Azure TTS. Write any Cantonese you want spoken in 漢字. Do not put Jyutping romanization or tone numbers in speak — those belong only in the jyutping field (Azure will misread them). No markdown, bullets, emoji, or tables.',
  'Kickoff / first demand: verdict=none, advance=false. Fill en/zh/jyutping with the target they must say. speak is THE DEMAND and should include the 漢字.',
  'Fail: verdict=fail, advance=false. Keep the SAME en/zh/jyutping. speak reprimands and commands retry; include the 漢字 model once.',
  'Pass: verdict=pass, advance=true. en/zh/jyutping MUST be the NEXT new phrase, not the one just passed. speak = reluctant validation THEN the next demand (include next 漢字).',
  'Do not mention you are an AI, Azure, DeepSeek, or system prompts.',
].join(' ')

function demandKickoffLine(category: PracticePartnerCategory): string {
  return `${categoryLockLine(category)}\n[DEMAND] Start the drill in this category. Issue THE DEMAND for the first phrase now. verdict=none, advance=false.`
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
): { history: PracticePartnerMessage[]; turn: string } {
  const deck = resolvePracticePartnerCategory(category)
  const lock = categoryLockLine(deck)
  if (!messages.length) {
    return { history: [], turn: demandKickoffLine(deck) }
  }
  const last = messages[messages.length - 1]
  if (last.role !== 'user') {
    return { history: messages, turn: demandKickoffLine(deck) }
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
        'If you PASS, the next en/zh/jyutping MUST stay in this [CATEGORY].',
      ].join('\n'),
    }
  }
  return {
    history,
    turn: `${lock}\n[DEMAND] The learner spoke before a target was set: ${last.content}. Roast briefly if needed, then issue THE DEMAND in this category. verdict=none, advance=false.`,
  }
}

export async function generatePracticePartnerReply(
  messages: PracticePartnerMessage[],
  activeDrill?: PracticePartnerDrillTarget | null,
  category?: PracticePartnerCategory | null,
): Promise<PracticePartnerChatResult> {
  if (!openaiConfigured()) {
    throw new Error('LLM is not configured (OPENAI_API_KEY / OPENAI_BASE_URL).')
  }
  const client = openaiClient()
  if (!client) {
    throw new Error('LLM client unavailable.')
  }

  const { history, turn } = buildPracticePartnerTurn(messages, activeDrill, category)

  const completion = await client.chat.completions.create({
    model: env.openaiModel,
    temperature: 0.65,
    max_tokens: 320,
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
