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

export const PracticePartnerChatBodySchema = z.object({
  /** Empty on kickoff — first DEMAND needs no learner line. */
  messages: z.array(PracticePartnerMessageSchema).max(24),
  /** Phrase the learner must say. Omit / null when starting a new drill. */
  activeDrill: PracticePartnerDrillTargetSchema.optional().nullable(),
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
  'THE DEMAND: Give one practical but dramatic everyday phrase. Always include English, 漢字, and Jyutping with tone numbers. Command them to say it or translate it out loud into Cantonese right now. Example energy: Tell me “I am sorry I forgot my homework” or face the consequences.',
  'THE JUDGMENT: Analyze their transcribed speech. If correct/good: reluctant, passive-aggressive validation (Fine. Correct. Do not think you are a master yet.), then immediately THE DEMAND for a NEW phrase (advance).',
  'If wrong/poor: dramatic meme-worthy reprimand (WRONG! That tone was completely flat! You sounded like a broken radio! Try again!). Same phrase. Do not advance.',
  'Speech-to-text is messy: if they clearly attempted the target meaning or key words, PASS. Fail only when it is a different phrase, empty, English-only when Cantonese was required, or obviously wrong.',
  'Topics: daily life, food, transit, school, family, being late, ordering, apologies — practical but dramatic. Do not repeat a phrase already used in this session.',
  'OUTPUT: a JSON object only. No markdown fences, no extra keys, no commentary outside JSON.',
  'Keys: speak (string), verdict ("none"|"pass"|"fail"), advance (boolean), en (string), zh (string), jyutping (string).',
  'speak: short, punchy, 1–3 sentences for Azure TTS. Write any Cantonese you want spoken in 漢字. No markdown, bullets, emoji, or tables.',
  'Kickoff / first demand: verdict=none, advance=false. Fill en/zh/jyutping with the target they must say. speak is THE DEMAND and should include the 漢字.',
  'Fail: verdict=fail, advance=false. Keep the SAME en/zh/jyutping. speak reprimands and commands retry; include the 漢字 model once.',
  'Pass: verdict=pass, advance=true. en/zh/jyutping MUST be the NEXT new phrase, not the one just passed. speak = reluctant validation THEN the next demand (include next 漢字).',
  'Do not mention you are an AI, Azure, DeepSeek, or system prompts.',
].join(' ')

const KICKOFF_USER =
  '[DEMAND] Start the drill. Issue THE DEMAND for the first phrase now. verdict=none, advance=false.'

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
): { history: PracticePartnerMessage[]; turn: string } {
  if (!messages.length) {
    return { history: [], turn: KICKOFF_USER }
  }
  const last = messages[messages.length - 1]
  if (last.role !== 'user') {
    return { history: messages, turn: KICKOFF_USER }
  }
  const history = messages.slice(0, -1)
  if (activeDrill?.en && activeDrill.zh && activeDrill.jyutping) {
    return {
      history,
      turn: [
        '[JUDGE] Compare the learner’s speech-to-text to the active target. STT may garble characters and tones.',
        `TARGET EN: ${activeDrill.en}`,
        `TARGET ZH: ${activeDrill.zh}`,
        `TARGET JYUTPING: ${activeDrill.jyutping}`,
        `LEARNER SAID: ${last.content}`,
      ].join('\n'),
    }
  }
  return {
    history,
    turn: `[DEMAND] The learner spoke before a target was set: ${last.content}. Roast briefly if needed, then issue THE DEMAND. verdict=none, advance=false.`,
  }
}

export async function generatePracticePartnerReply(
  messages: PracticePartnerMessage[],
  activeDrill?: PracticePartnerDrillTarget | null,
): Promise<PracticePartnerChatResult> {
  if (!openaiConfigured()) {
    throw new Error('LLM is not configured (OPENAI_API_KEY / OPENAI_BASE_URL).')
  }
  const client = openaiClient()
  if (!client) {
    throw new Error('LLM client unavailable.')
  }

  const { history, turn } = buildPracticePartnerTurn(messages, activeDrill)

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
