/**
 * In-tab scheduled prompts for Harness mode (Phase 3).
 * Jobs run only while the `#/chat` tab is open — no server workers.
 */
export const CHAT_SCHEDULE_STORAGE_KEY = 'yue-deepseek-chat-schedule-v1'
export const CHAT_SCHEDULE_MAX_JOBS = 20

export type ChatScheduleCadence = 'once' | 'hourly' | 'daily' | 'weekly'

export type ChatScheduleJob = {
  id: string
  threadId: string
  prompt: string
  cadence: ChatScheduleCadence
  /** Next fire time (ms). */
  nextAt: number
  /** Optional label for the Workspace Scheduled list. */
  label?: string
  createdAt: number
  lastRunAt?: number
  enabled: boolean
}

function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `sch_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

function advanceNext(cadence: ChatScheduleCadence, from: number): number {
  const d = new Date(from)
  if (cadence === 'once') return from
  if (cadence === 'hourly') return from + 60 * 60 * 1000
  if (cadence === 'daily') {
    d.setDate(d.getDate() + 1)
    return d.getTime()
  }
  // weekly
  d.setDate(d.getDate() + 7)
  return d.getTime()
}

export function normalizeScheduleJobs(raw: unknown): ChatScheduleJob[] {
  if (!Array.isArray(raw)) return []
  const out: ChatScheduleJob[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const row = item as ChatScheduleJob
    const prompt = String(row.prompt || '').trim().slice(0, 4_000)
    const threadId = String(row.threadId || '').trim()
    if (!prompt || !threadId) continue
    const cadence: ChatScheduleCadence =
      row.cadence === 'hourly' || row.cadence === 'daily' || row.cadence === 'weekly' || row.cadence === 'once'
        ? row.cadence
        : 'once'
    out.push({
      id: typeof row.id === 'string' && row.id.trim() ? row.id : uid(),
      threadId,
      prompt,
      cadence,
      nextAt: Number(row.nextAt) || Date.now(),
      label: typeof row.label === 'string' && row.label.trim() ? row.label.trim().slice(0, 80) : undefined,
      createdAt: Number(row.createdAt) || Date.now(),
      lastRunAt: Number.isFinite(row.lastRunAt) ? Number(row.lastRunAt) : undefined,
      enabled: row.enabled !== false,
    })
    if (out.length >= CHAT_SCHEDULE_MAX_JOBS) break
  }
  return out.sort((a, b) => a.nextAt - b.nextAt)
}

export function readScheduleJobs(): ChatScheduleJob[] {
  try {
    const raw = localStorage.getItem(CHAT_SCHEDULE_STORAGE_KEY)
    if (!raw) return []
    return normalizeScheduleJobs(JSON.parse(raw) as unknown)
  } catch {
    return []
  }
}

export function writeScheduleJobs(jobs: ChatScheduleJob[]) {
  try {
    localStorage.setItem(
      CHAT_SCHEDULE_STORAGE_KEY,
      JSON.stringify(normalizeScheduleJobs(jobs).slice(0, CHAT_SCHEDULE_MAX_JOBS)),
    )
  } catch {
    /* ignore */
  }
}

export function addScheduleJob(input: {
  threadId: string
  prompt: string
  cadence: ChatScheduleCadence
  /** Delay before first run (ms). Default: cadence step or 60s for once. */
  delayMs?: number
  label?: string
}): ChatScheduleJob {
  const now = Date.now()
  const delay =
    input.delayMs ??
    (input.cadence === 'once' ? 60_000 : input.cadence === 'hourly' ? 3_600_000 : 60_000)
  const job: ChatScheduleJob = {
    id: uid(),
    threadId: input.threadId,
    prompt: input.prompt.trim().slice(0, 4_000),
    cadence: input.cadence,
    nextAt: now + Math.max(5_000, delay),
    label: input.label?.trim().slice(0, 80),
    createdAt: now,
    enabled: true,
  }
  const next = [...readScheduleJobs().filter((j) => j.id !== job.id), job]
  writeScheduleJobs(next)
  return job
}

export function removeScheduleJob(id: string) {
  writeScheduleJobs(readScheduleJobs().filter((j) => j.id !== id))
}

export function setScheduleJobEnabled(id: string, enabled: boolean) {
  writeScheduleJobs(
    readScheduleJobs().map((j) => (j.id === id ? { ...j, enabled } : j)),
  )
}

export function jobsForThread(threadId: string, jobs = readScheduleJobs()): ChatScheduleJob[] {
  return jobs.filter((j) => j.threadId === threadId)
}

/**
 * Collect due jobs and bump nextAt / disable once-jobs.
 * Returns jobs that should fire now (caller enqueues chat turns).
 */
export function claimDueScheduleJobs(now = Date.now()): ChatScheduleJob[] {
  const all = readScheduleJobs()
  const due: ChatScheduleJob[] = []
  const next = all.map((j) => {
    if (!j.enabled || j.nextAt > now) return j
    due.push(j)
    if (j.cadence === 'once') {
      return { ...j, enabled: false, lastRunAt: now, nextAt: now }
    }
    return {
      ...j,
      lastRunAt: now,
      nextAt: advanceNext(j.cadence, Math.max(now, j.nextAt)),
    }
  })
  if (due.length) writeScheduleJobs(next)
  return due
}

/** Heuristic: "every Friday summarize notes" → weekly job. */
export function parseScheduleIntent(text: string): {
  cadence: ChatScheduleCadence
  prompt: string
  label: string
} | null {
  const t = text.trim()
  if (!t) return null
  const lower = t.toLowerCase()
  if (!/\b(every|schedule|remind|weekly|daily|hourly)\b/i.test(lower)) return null
  let cadence: ChatScheduleCadence = 'daily'
  if (/\bhourly\b|\bevery hour\b/i.test(lower)) cadence = 'hourly'
  else if (/\bweekly\b|\bevery (monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i.test(lower)) {
    cadence = 'weekly'
  } else if (/\bdaily\b|\bevery day\b/i.test(lower)) cadence = 'daily'
  else if (/\bonce\b|\bin an? hour\b/i.test(lower)) cadence = 'once'
  const prompt = t
    .replace(/^(please\s+)?(schedule|remind me to|set up)\s+/i, '')
    .trim()
    .slice(0, 4_000)
  if (prompt.length < 8) return null
  return {
    cadence,
    prompt,
    label: prompt.length > 42 ? `${prompt.slice(0, 42)}…` : prompt,
  }
}
