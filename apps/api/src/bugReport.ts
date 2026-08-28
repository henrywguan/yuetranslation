import type { Response } from 'express'
import { z } from 'zod'
import { requireAuth, type AuthedRequest } from './auth.js'
import { cloudReady, openaiStatus, visionConfigured } from './env.js'
import { notifyBugReport } from './notify.js'
import { getAuthUserById, insertBugReport, countRecentBugReports } from './supabase.js'
import { getUsage } from './usage.js'

const IssueType = z.enum([
  'translation',
  'mic',
  'tts',
  'camera',
  'account',
  'ui',
  'crash',
  'other',
])

const Body = z.object({
  issueType: IssueType,
  client: z.record(z.unknown()),
  note: z.string().max(2000).optional(),
})

const RATE_LIMIT_PER_HOUR = 10

export async function submitBugReport(req: AuthedRequest, res: Response) {
  const auth = requireAuth(req, res)
  if (!auth) return

  const parsed = Body.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ message: 'Invalid bug report payload' })
    return
  }

  try {
    const recent = await countRecentBugReports(auth.userId, 60)
    if (recent >= RATE_LIMIT_PER_HOUR) {
      res.status(429).json({ message: 'Too many reports — try again later.' })
      return
    }

    const user = await getAuthUserById(auth.userId)
    const clientPayload = parsed.data.client as Record<string, unknown>
    const note = parsed.data.note?.trim()
    const client = note ? { ...clientPayload, note } : clientPayload
    const mode = typeof client.mode === 'string' ? client.mode : null
    const route = typeof client.route === 'string' ? client.route : null

    const usage = await getUsage(auth.userId)
    const context = {
      server: {
        cloudReady: cloudReady(),
        azureVision: visionConfigured(),
        openai: openaiStatus(),
      },
      usage,
    }

    const row = await insertBugReport({
      issueType: parsed.data.issueType,
      userId: auth.userId,
      email: user?.email ?? auth.email,
      route,
      mode,
      client,
      context,
    })

    notifyBugReport({
      reportId: row.id,
      issueType: parsed.data.issueType,
      email: user?.email ?? auth.email,
      userId: auth.userId,
      route,
      mode,
    })

    res.json({ ok: true, reportId: row.id })
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to save report' })
  }
}
