import type { AdminBugReport } from './adminApi'

export type DiagnosisSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info'

export type DiagnosisFinding = {
  id: string
  label: string
  detail: string
  tone: 'bad' | 'warn' | 'ok' | 'neutral'
}

export type DiagnosisAction = {
  id: string
  title: string
  detail: string
}

export type ReportDiagnosis = {
  title: string
  summary: string
  severity: DiagnosisSeverity
  confidence: number
  categoryLabel: string
  findings: DiagnosisFinding[]
  actions: DiagnosisAction[]
  timeline: { t: number; kind: string; label: string; detail?: string }[]
  signals: { label: string; value: string }[]
  note: string | null
  screenshot: string | null
  lastError: string | null
}

const TYPE_META: Record<
  string,
  { label: string; title: string; baseSummary: string; severity: DiagnosisSeverity }
> = {
  translation: {
    label: 'Translation',
    title: 'Translation quality issue',
    baseSummary: 'User flagged wrong or missing Cantonese / English output.',
    severity: 'medium',
  },
  mic: {
    label: 'Mic / live',
    title: 'Live speech capture issue',
    baseSummary: 'User reported mic listening, STT, or live session problems.',
    severity: 'high',
  },
  tts: {
    label: 'Voice / TTS',
    title: 'Voice playback issue',
    baseSummary: 'Tap-to-play or auto-speak failed or sounded wrong.',
    severity: 'medium',
  },
  camera: {
    label: 'Camera / OCR',
    title: 'Camera translation issue',
    baseSummary: 'AR / upload scan, overlay, or camera quota problem.',
    severity: 'high',
  },
  account: {
    label: 'Account',
    title: 'Login or billing issue',
    baseSummary: 'Auth, plan, or billing friction reported.',
    severity: 'high',
  },
  ui: {
    label: 'UI / layout',
    title: 'Interface issue',
    baseSummary: 'Visual glitch or control that did not behave as expected.',
    severity: 'low',
  },
  crash: {
    label: 'Crash',
    title: 'Crash or freeze',
    baseSummary: 'App stuck, blank, or uncaught client failure.',
    severity: 'critical',
  },
  other: {
    label: 'Other',
    title: 'Uncategorized report',
    baseSummary: 'User chose Other — rely on note and diagnostics.',
    severity: 'info',
  },
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function str(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function humanizeKind(kind: string): string {
  const map: Record<string, string> = {
    api_error: 'API error',
    store_error: 'App error banner',
    error_clear: 'Error cleared',
    uncaught_error: 'Uncaught JS error',
    unhandled_rejection: 'Unhandled promise',
    mode_change: 'Mode changed',
    route_change: 'Route changed',
    live_start: 'Live mic started',
    live_stop: 'Live mic stopped',
    camera_start: 'Camera session started',
    camera_stop: 'Camera session stopped',
  }
  return map[kind] || kind.replace(/_/g, ' ')
}

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const s = Math.max(0, Math.floor(ms / 1000))
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 48) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

export function formatReportAge(iso: string): string {
  return relativeTime(iso)
}

export function shortReportId(id: string): string {
  const clean = id.replace(/-/g, '')
  return `rpt_${clean.slice(0, 6)}`
}

/** Interpret a stored bug report into a compact, solution-oriented diagnosis. */
export function diagnoseBugReport(report: AdminBugReport): ReportDiagnosis {
  const client = asRecord(report.client)
  const context = asRecord(report.context)
  const entitlement = asRecord(client.entitlement)
  const env = asRecord(client.env)
  const server = asRecord(context.server)
  const usage = asRecord(context.usage)
  const openai = asRecord(server.openai)
  const events = Array.isArray(client.events) ? client.events : []

  const meta = TYPE_META[report.issue_type] || TYPE_META.other
  const lastError = str(client.lastError)
  const note = str(client.note) || null
  const screenshot = str(client.screenshot)
  const plan = str(entitlement.plan) || 'unknown'
  const reason = str(entitlement.reason)
  const mode = str(client.mode) || report.mode || '—'
  const route = str(client.route) || report.route || '—'
  const live = Boolean(client.live)
  const translating = Boolean(client.translating)
  const demoMode = Boolean(client.demoMode)
  const loggedIn = Boolean(entitlement.loggedIn)
  const disabled = Boolean(entitlement.disabled)

  const findings: DiagnosisFinding[] = []
  const actions: DiagnosisAction[] = []
  let severity = meta.severity
  let confidence = 0.55
  let summary = meta.baseSummary

  const apiErrors = events.filter((e) => asRecord(e).kind === 'api_error')
  const uncaught = events.filter((e) => {
    const k = str(asRecord(e).kind)
    return k === 'uncaught_error' || k === 'unhandled_rejection'
  })

  if (lastError) {
    findings.push({
      id: 'last-error',
      label: 'Last visible error',
      detail: lastError.slice(0, 220),
      tone: 'bad',
    })
    confidence += 0.12
  }

  if (apiErrors.length) {
    const latest = asRecord(apiErrors[apiErrors.length - 1])
    findings.push({
      id: 'api',
      label: 'Recent API failure',
      detail: str(latest.detail) || `${apiErrors.length} failed request(s)`,
      tone: 'bad',
    })
    confidence += 0.1
    if (severity === 'low' || severity === 'info') severity = 'medium'
  }

  if (uncaught.length) {
    findings.push({
      id: 'uncaught',
      label: 'Client exception trail',
      detail: `${uncaught.length} uncaught error(s) before submit`,
      tone: 'bad',
    })
    severity = 'critical'
    confidence += 0.15
    summary = 'Client threw before the user submitted — treat as a crash path first.'
  }

  if (disabled) {
    findings.push({
      id: 'banned',
      label: 'Account disabled',
      detail: 'Profile is banned/disabled — product features will refuse.',
      tone: 'warn',
    })
    actions.push({
      id: 'check-ban',
      title: 'Review ban state',
      detail: 'Confirm whether this account should still be disabled, then re-test the flow.',
    })
    confidence += 0.1
  }

  if (reason === 'login_required') {
    findings.push({
      id: 'login',
      label: 'Login gate',
      detail: 'Entitlement reason is login_required.',
      tone: 'warn',
    })
  } else if (reason?.includes('quota') || reason?.includes('exhausted')) {
    findings.push({
      id: 'quota',
      label: 'Quota / entitlement',
      detail: `Reason: ${reason}`,
      tone: 'warn',
    })
    actions.push({
      id: 'quota-action',
      title: 'Check usage reset',
      detail: 'Open the user in Admin → Users and verify live / TTS / camera counters for this month.',
    })
    confidence += 0.08
  }

  if (demoMode) {
    findings.push({
      id: 'demo',
      label: 'Demo engine mode',
      detail: 'Client was in demoMode — OpenAI may be unconfigured or falling back.',
      tone: 'warn',
    })
    actions.push({
      id: 'engines',
      title: 'Verify API engines',
      detail: 'Confirm OpenAI / DeepSeek and Azure keys on the API deploy, then re-check /api/health.',
    })
  }

  if (server.cloudReady === false) {
    findings.push({
      id: 'cloud',
      label: 'Cloud not ready',
      detail: 'Server reported cloudReady=false at report time.',
      tone: 'bad',
    })
    severity = severity === 'critical' ? severity : 'high'
  }

  if (openai.configured === false) {
    findings.push({
      id: 'openai',
      label: 'Model not configured',
      detail: 'OpenAI/DeepSeek was not configured when this report was filed.',
      tone: 'warn',
    })
  }

  if (report.issue_type === 'mic') {
    actions.push({
      id: 'mic-check',
      title: 'Reproduce live mic',
      detail: 'Test Azure speech token + browser mic permission on the same device class (iOS/Android/desktop).',
    })
    if (live) {
      findings.push({
        id: 'live-on',
        label: 'Live was active',
        detail: 'User submitted while live listening was still on.',
        tone: 'neutral',
      })
    }
  }

  if (report.issue_type === 'camera') {
    actions.push({
      id: 'cam-check',
      title: 'Reproduce camera path',
      detail: 'Try AR capture and upload scan; verify Vision auth and camera minute remaining.',
    })
    if (server.azureVision === false) {
      findings.push({
        id: 'vision',
        label: 'Vision not configured',
        detail: 'Azure Vision was off — OCR will fail or degrade.',
        tone: 'bad',
      })
      confidence += 0.12
    }
  }

  if (report.issue_type === 'tts') {
    actions.push({
      id: 'tts-check',
      title: 'Test TTS endpoint',
      detail: 'Play a short Cantonese line while signed in as this plan; confirm remaining TTS chars.',
    })
  }

  if (report.issue_type === 'translation') {
    actions.push({
      id: 'mt-check',
      title: 'Compare lexicon vs model',
      detail: 'Re-run the same phrase offline (lexicon) and live; note direction and whether alternatives loaded.',
    })
  }

  if (report.issue_type === 'account') {
    actions.push({
      id: 'account-check',
      title: 'Inspect auth + Stripe',
      detail: 'Confirm session email, plan on profiles, and Stripe customer link if billing-related.',
    })
  }

  if (screenshot) {
    findings.push({
      id: 'shot',
      label: 'Screenshot attached',
      detail: 'User opted in to visual diagnostic capture.',
      tone: 'ok',
    })
    confidence += 0.05
  } else if (client.screenshotAllowed) {
    findings.push({
      id: 'shot-miss',
      label: 'Screenshot requested',
      detail: 'User allowed capture, but no image was stored (failed or too large).',
      tone: 'warn',
    })
  }

  if (note) {
    findings.push({
      id: 'note',
      label: 'User note',
      detail: note.slice(0, 240),
      tone: 'neutral',
    })
    confidence += 0.08
    summary = `${meta.baseSummary} User note adds context — read it before changing code.`
  }

  if (!findings.length) {
    findings.push({
      id: 'sparse',
      label: 'Sparse signal',
      detail: 'Little automatic evidence beyond issue type — ask for a repro or enable screenshot next time.',
      tone: 'neutral',
    })
    confidence = Math.min(confidence, 0.45)
  }

  if (!actions.length) {
    actions.push({
      id: 'default',
      title: 'Triage and reproduce',
      detail: 'Mark triaged, reproduce on the reported route/mode, then close with a short note once fixed or wontfix.',
    })
  }

  actions.push({
    id: 'status',
    title: 'Update report status',
    detail: 'Use open → triaged → closed as you work the queue so the dashboard stays scannable.',
  })

  const timeline = events
    .map((raw) => {
      const e = asRecord(raw)
      const kind = str(e.kind) || 'event'
      const detail = str(e.detail) || undefined
      const t = num(e.t) || 0
      return { t, kind, label: humanizeKind(kind), detail }
    })
    .filter((e) => e.t > 0)
    .sort((a, b) => a.t - b.t)
    .slice(-12)

  const viewport = asRecord(env.viewport)
  const signals: { label: string; value: string }[] = [
    { label: 'User', value: report.email || report.user_id.slice(0, 8) },
    { label: 'Plan', value: plan },
    { label: 'Route', value: route },
    { label: 'Mode', value: mode },
    { label: 'Live', value: live ? 'on' : 'off' },
    { label: 'Translating', value: translating ? 'yes' : 'no' },
    { label: 'Logged in', value: loggedIn ? 'yes' : 'no' },
    { label: 'Theme', value: str(env.theme) || '—' },
    {
      label: 'Viewport',
      value:
        num(viewport.w) && num(viewport.h) ? `${viewport.w}×${viewport.h}` : '—',
    },
    { label: 'App', value: str(client.appVersion) || '—' },
    {
      label: 'Engines',
      value: [
        server.cloudReady ? 'cloud' : 'no-cloud',
        openai.configured ? 'model' : 'no-model',
        server.azureVision ? 'vision' : 'no-vision',
      ].join(' · '),
    },
  ]

  if (num(usage.live_seconds) != null || num(usage.liveSeconds) != null) {
    const liveSec = num(usage.live_seconds) ?? num(usage.liveSeconds) ?? 0
    signals.push({ label: 'Live usage', value: `${Math.round(liveSec)}s` })
  }

  return {
    title: meta.title,
    summary,
    severity,
    confidence: Math.max(0.2, Math.min(0.95, confidence)),
    categoryLabel: meta.label,
    findings,
    actions,
    timeline,
    signals,
    note,
    screenshot,
    lastError,
  }
}
