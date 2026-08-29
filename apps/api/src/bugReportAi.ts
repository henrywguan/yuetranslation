/**
 * Admin AI triage for bug reports — on-demand DeepSeek/OpenAI answer.
 * Does not run at submit time; only when an admin clicks Generate.
 */
import { z } from 'zod'
import { env, isAdminEmail, llmChatExtras, openaiConfigured } from './env.js'
import { openaiClient } from './openaiClient.js'
import { getBugReportById, countRecentBugReports, type BugReportRow } from './supabase.js'

export type AiVerdict = 'test' | 'real' | 'unclear'
export type AiSuggestedStatus = 'open' | 'triaged' | 'closed'

export type BugReportAiAnswer = {
  verdict: AiVerdict
  suggestedStatus: AiSuggestedStatus
  headline: string
  analysis: string
  likelyCause: string | null
  nextSteps: string[]
  confidence: number
  heuristics: {
    likelyTest: boolean
    reasons: string[]
  }
  model: string
  generatedAt: string
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function str(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

const TEST_NOTE_RE =
  /^(test|testing|teste?r?|asdf+|xxx+|foo|bar|baz|hi+|hello|hey|123+|ok|okay|check|checking)(\s*[!.]*)?$/i

/** Shared heuristics — also mirrored lightly on the web diagnosis. */
export function detectLikelyTestReport(report: BugReportRow): {
  likelyTest: boolean
  reasons: string[]
} {
  const client = asRecord(report.client)
  const note = str(client.note)
  const lastError = str(client.lastError)
  const events = Array.isArray(client.events) ? client.events : []
  const apiErrors = events.filter((e) => asRecord(e).kind === 'api_error')
  const uncaught = events.filter((e) => {
    const k = str(asRecord(e).kind)
    return k === 'uncaught_error' || k === 'unhandled_rejection'
  })
  const reasons: string[] = []

  if (note && TEST_NOTE_RE.test(note)) {
    reasons.push(`Note looks like a smoke test (“${note.slice(0, 40)}”).`)
  }
  if (note && /\b(test report|just testing|ignore this|admin test)\b/i.test(note)) {
    reasons.push('Note explicitly says this is a test.')
  }
  if (!note && !lastError && !apiErrors.length && !uncaught.length) {
    reasons.push('No user note and no error trail — sparse signal common in admin smoke tests.')
  }
  if (isAdminEmail(report.email) && (!note || TEST_NOTE_RE.test(note || '') || !lastError)) {
    reasons.push('Filed by an admin allowlist email with little product evidence.')
  }
  if (
    report.issue_type === 'other' &&
    !lastError &&
    (!note || (note && note.length < 12))
  ) {
    reasons.push('Type “other” with almost no description.')
  }

  // Need at least one strong reason, or two weak ones.
  const strong = reasons.some((r) => /smoke test|explicitly|admin allowlist/i.test(r))
  const likelyTest = strong || reasons.length >= 2
  return { likelyTest, reasons }
}

function buildContextBlob(report: BugReportRow, recentFromUser: number): string {
  const client = asRecord(report.client)
  const context = asRecord(report.context)
  const entitlement = asRecord(client.entitlement)
  const envSnap = asRecord(client.env)
  const server = asRecord(context.server)
  const openai = asRecord(server.openai)
  const events = Array.isArray(client.events) ? client.events : []
  const trail = events
    .slice(-10)
    .map((raw) => {
      const e = asRecord(raw)
      return `- ${str(e.kind) || 'event'}${str(e.detail) ? `: ${str(e.detail)}` : ''}`
    })
    .join('\n')

  const heuristics = detectLikelyTestReport(report)

  return [
    `Report id: ${report.id}`,
    `Created: ${report.created_at}`,
    `Status: ${report.status}`,
    `Issue type: ${report.issue_type}`,
    `Reporter email: ${report.email || '(none)'}`,
    `Reporter is admin allowlist: ${isAdminEmail(report.email) ? 'yes' : 'no'}`,
    `Route: ${str(client.route) || report.route || '—'}`,
    `Mode: ${str(client.mode) || report.mode || '—'}`,
    `Plan: ${str(entitlement.plan) || '—'}`,
    `Logged in: ${entitlement.loggedIn ? 'yes' : 'no'}`,
    `Demo mode: ${client.demoMode ? 'yes' : 'no'}`,
    `Live mic on: ${client.live ? 'yes' : 'no'}`,
    `Translating: ${client.translating ? 'yes' : 'no'}`,
    `Last error: ${str(client.lastError) || '(none)'}`,
    `User note: ${str(client.note) || '(none)'}`,
    `Screenshot attached: ${typeof client.screenshot === 'string' ? 'yes' : 'no'}`,
    `Theme: ${str(envSnap.theme) || '—'}`,
    `UA: ${(str(envSnap.userAgent) || '—').slice(0, 160)}`,
    `Server cloudReady: ${server.cloudReady === true ? 'yes' : server.cloudReady === false ? 'no' : '—'}`,
    `Model configured: ${openai.configured === true ? 'yes' : openai.configured === false ? 'no' : '—'}`,
    `Azure Vision: ${server.azureVision === true ? 'yes' : server.azureVision === false ? 'no' : '—'}`,
    `Reports from this user in last hour: ${recentFromUser}`,
    `Heuristic likelyTest: ${heuristics.likelyTest ? 'yes' : 'no'}`,
    `Heuristic reasons: ${heuristics.reasons.length ? heuristics.reasons.join(' | ') : '(none)'}`,
    `Recent trail:\n${trail || '(empty)'}`,
  ].join('\n')
}

const AnswerSchema = z.object({
  verdict: z.enum(['test', 'real', 'unclear']),
  suggestedStatus: z.enum(['open', 'triaged', 'closed']),
  headline: z.string().min(1).max(200),
  analysis: z.string().min(1).max(2000),
  likelyCause: z.string().max(500).nullable().optional(),
  nextSteps: z.array(z.string().max(300)).max(6),
  confidence: z.number().min(0).max(1).optional(),
})

function parseModelJson(raw: string): z.infer<typeof AnswerSchema> {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
  const parsed = AnswerSchema.safeParse(JSON.parse(cleaned))
  if (!parsed.success) throw new Error('Model returned invalid triage JSON')
  return parsed.data
}

function fallbackFromHeuristics(
  report: BugReportRow,
  heuristics: ReturnType<typeof detectLikelyTestReport>,
): BugReportAiAnswer {
  if (heuristics.likelyTest) {
    return {
      verdict: 'test',
      suggestedStatus: 'closed',
      headline: 'Looks like a test / smoke report',
      analysis:
        'Diagnostics and the note pattern point to an admin or developer check-in rather than a real user failure. Safe to close unless you intended to keep it as a fixture.',
      likelyCause: heuristics.reasons[0] || 'Sparse test-like signal',
      nextSteps: [
        'Mark closed',
        'If you need a fixture, leave one open report labeled clearly in the note',
      ],
      confidence: 0.72,
      heuristics,
      model: 'heuristics',
      generatedAt: new Date().toISOString(),
    }
  }

  const client = asRecord(report.client)
  const note = str(client.note)
  return {
    verdict: note ? 'real' : 'unclear',
    suggestedStatus: note ? 'triaged' : 'open',
    headline: note
      ? 'User-reported issue — review note and engines'
      : 'Sparse report — need more signal',
    analysis: note
      ? `User note: “${note.slice(0, 280)}”. Without the exact translation pair in the payload (privacy), treat the note as the primary clue and reproduce on ${report.mode || 'the reported mode'} / ${report.route || 'the reported route'}.`
      : 'Little automatic evidence. Ask the user for the source phrase, expected vs actual output, and a screenshot on the next report.',
    likelyCause: str(client.lastError),
    nextSteps: [
      'Reproduce on the same mode and direction',
      'Check /api/health engines if demoMode or model-off was flagged',
      'Mark triaged while investigating',
    ],
    confidence: 0.4,
    heuristics,
    model: 'heuristics',
    generatedAt: new Date().toISOString(),
  }
}

export async function generateBugReportAiAnswer(reportId: string): Promise<BugReportAiAnswer> {
  const report = await getBugReportById(reportId)
  if (!report) throw new Error('Report not found')

  const heuristics = detectLikelyTestReport(report)
  const recentFromUser = await countRecentBugReports(report.user_id, 60)
  const client = openaiClient()

  if (!client || !openaiConfigured()) {
    return fallbackFromHeuristics(report, heuristics)
  }

  const system = [
    'You triage bug reports for JyutTranslate, an English ↔ Hong Kong Cantonese app.',
    'Return ONLY valid JSON with keys:',
    '{"verdict":"test"|"real"|"unclear","suggestedStatus":"open"|"triaged"|"closed","headline":"string","analysis":"string","likelyCause":"string|null","nextSteps":["..."],"confidence":0-1}',
    'Rules:',
    '- verdict=test when this is clearly an admin/developer smoke test (notes like “test”, empty note + no errors, allowlist admin with no product evidence). suggestedStatus should be closed.',
    '- verdict=real for genuine user problems. For translation complaints, reason about what likely went wrong from note + mode + engines. Do NOT invent exact source/target phrases that are not in the note or errors (privacy — reports omit translation text).',
    '- If a user mentions a phrase (e.g. “happy birthday”) and a bad Cantonese/English result, explain plausible failure modes: lexicon miss, model tone/register, STT misheard English, wrong speak direction, demo/fallback engine, etc.',
    '- Keep analysis to 2–4 short sentences. nextSteps: 2–4 concrete admin actions.',
    '- Prefer suggestedStatus closed for tests, triaged for real bugs needing work, open when unclear.',
  ].join('\n')

  const user = buildContextBlob(report, recentFromUser)

  try {
    const completion = await client.chat.completions.create({
      model: env.openaiModel,
      temperature: 0.25,
      max_tokens: 700,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      response_format: { type: 'json_object' },
      ...llmChatExtras(),
    })
    const raw = completion.choices[0]?.message?.content?.trim() || ''
    const parsed = parseModelJson(raw)

    // Soft-guard: if heuristics strongly say test, don't let the model mark it "real" as open.
    let verdict = parsed.verdict
    let suggestedStatus = parsed.suggestedStatus
    if (heuristics.likelyTest && verdict === 'real' && !str(asRecord(report.client).lastError)) {
      verdict = 'test'
      suggestedStatus = 'closed'
    }

    return {
      verdict,
      suggestedStatus,
      headline: parsed.headline.trim(),
      analysis: parsed.analysis.trim(),
      likelyCause: parsed.likelyCause?.trim() || null,
      nextSteps: parsed.nextSteps.map((s) => s.trim()).filter(Boolean).slice(0, 5),
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.7,
      heuristics,
      model: env.openaiModel,
      generatedAt: new Date().toISOString(),
    }
  } catch (e) {
    console.warn('[bug-report-ai] model failed, using heuristics', e)
    return fallbackFromHeuristics(report, heuristics)
  }
}
