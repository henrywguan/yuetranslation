import type { Entitlement, Mode } from './types'

export type DiagnosticEvent = {
  t: number
  kind: string
  detail?: string
  status?: number
}

const MAX_EVENTS = 30
const events: DiagnosticEvent[] = []

let lastError: string | null = null
let initialized = false

export function captureDiagnostic(kind: string, detail?: string, status?: number) {
  events.push({ t: Date.now(), kind, detail, status })
  while (events.length > MAX_EVENTS) events.shift()
  if (kind === 'error' && detail) lastError = detail
  if (kind === 'error_clear') lastError = null
}

export function setDiagnosticError(message: string | null) {
  lastError = message
  if (message) captureDiagnostic('store_error', message.slice(0, 240))
  else captureDiagnostic('error_clear')
}

export function getDiagnosticEvents(): DiagnosticEvent[] {
  return [...events]
}

export function getLastDiagnosticError(): string | null {
  return lastError
}

function readTheme(): 'light' | 'dark' | 'unknown' {
  if (typeof document === 'undefined') return 'unknown'
  const t = document.documentElement.getAttribute('data-theme')
  if (t === 'light' || t === 'dark') return t
  return 'unknown'
}

function readRoute(): string {
  if (typeof window === 'undefined') return ''
  const hash = window.location.hash.replace(/^#/, '') || '/'
  const view = new URLSearchParams(window.location.search).get('view')
  return view ? `${hash}?view=${view}` : hash
}

function envSnapshot() {
  if (typeof window === 'undefined') {
    return { userAgent: '', viewport: { w: 0, h: 0 }, dpr: 1, theme: 'unknown' as const }
  }
  return {
    userAgent: navigator.userAgent,
    viewport: { w: window.innerWidth, h: window.innerHeight },
    dpr: window.devicePixelRatio || 1,
    theme: readTheme(),
    standalone: Boolean(
      (navigator as Navigator & { standalone?: boolean }).standalone ||
        window.matchMedia('(display-mode: standalone)').matches,
    ),
    online: navigator.onLine,
    language: navigator.language,
  }
}

export type ReportClientPayload = {
  route: string
  mode: Mode | null
  demoMode: boolean
  live: boolean
  translating: boolean
  lastError: string | null
  entitlement: Partial<Entitlement> | null
  env: ReturnType<typeof envSnapshot>
  events: DiagnosticEvent[]
  appVersion: string
}

export function buildReportClientPayload(input: {
  mode: Mode
  demoMode: boolean
  live: boolean
  translating: boolean
  entitlement: Entitlement | null
}): ReportClientPayload {
  const ent = input.entitlement
  return {
    route: readRoute(),
    mode: input.mode,
    demoMode: input.demoMode,
    live: input.live,
    translating: input.translating,
    lastError: getLastDiagnosticError(),
    entitlement: ent
      ? {
          loggedIn: ent.loggedIn,
          plan: ent.plan,
          role: ent.role ?? null,
          isAdmin: ent.isAdmin,
          disabled: ent.disabled,
          reason: ent.reason,
          allowed: ent.allowed,
          usage: ent.usage,
          limits: ent.limits,
        }
      : null,
    env: envSnapshot(),
    events: getDiagnosticEvents(),
    appVersion: (import.meta.env.VITE_APP_VERSION as string | undefined) || 'web-dev',
  }
}

export function initDiagnostics() {
  if (initialized || typeof window === 'undefined') return
  initialized = true

  window.addEventListener('error', (event) => {
    captureDiagnostic(
      'uncaught_error',
      `${event.message} @ ${event.filename || '?'}:${event.lineno || 0}`,
    )
  })

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason
    const msg =
      reason instanceof Error
        ? reason.message
        : typeof reason === 'string'
          ? reason
          : 'Unhandled rejection'
    captureDiagnostic('unhandled_rejection', msg.slice(0, 240))
  })
}
