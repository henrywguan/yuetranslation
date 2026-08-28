import { getSession } from './auth'
import { buildReportClientPayload } from './diagnostics'
import { resolveApiBase } from './api'
import { getAccessToken } from './auth'
import type { Entitlement, Mode } from './types'

export type BugIssueType =
  | 'translation'
  | 'mic'
  | 'tts'
  | 'camera'
  | 'account'
  | 'ui'
  | 'crash'
  | 'other'

export type BugIssueOption = {
  id: BugIssueType
  labelEn: string
  labelZh: string
}

export const BUG_ISSUE_OPTIONS: BugIssueOption[] = [
  { id: 'translation', labelEn: 'Translation wrong', labelZh: '翻譯有問題' },
  { id: 'mic', labelEn: 'Mic / live speech', labelZh: '咪高峰／即時語音' },
  { id: 'tts', labelEn: 'Voice / TTS', labelZh: '語音播放' },
  { id: 'camera', labelEn: 'Camera / OCR', labelZh: '相機／掃描' },
  { id: 'account', labelEn: 'Login / billing', labelZh: '登入／帳單' },
  { id: 'ui', labelEn: 'UI / layout', labelZh: '介面顯示' },
  { id: 'crash', labelEn: 'Crash / freeze', labelZh: '當機／卡住' },
  { id: 'other', labelEn: 'Other', labelZh: '其他' },
]

const BUG_REPORT_EVENT = 'yue-bug-report-screen'
let bugReportOpen = false

export function subscribeBugReportScreen(callback: () => void) {
  window.addEventListener(BUG_REPORT_EVENT, callback)
  return () => window.removeEventListener(BUG_REPORT_EVENT, callback)
}

export function isBugReportScreenOpen(): boolean {
  return bugReportOpen
}

export function openBugReportScreen() {
  bugReportOpen = true
  window.dispatchEvent(new Event(BUG_REPORT_EVENT))
}

export function closeBugReportScreen() {
  bugReportOpen = false
  window.dispatchEvent(new Event(BUG_REPORT_EVENT))
}

/** Opens report modal when signed in; otherwise opens auth. */
export async function openBugReportOrAuth() {
  const session = await getSession()
  if (!session) {
    const { openAuthScreen } = await import('./auth')
    openAuthScreen()
    return
  }
  openBugReportScreen()
}

export async function submitBugReport(
  issueType: BugIssueType,
  snapshot: {
    mode: Mode
    demoMode: boolean
    live: boolean
    translating: boolean
    entitlement: Entitlement | null
  },
  note?: string,
): Promise<{ reportId: string }> {
  const token = await getAccessToken()
  if (!token) {
    throw new Error('Sign in required to send a report.')
  }

  const client = buildReportClientPayload(snapshot)
  const res = await fetch(`${resolveApiBase()}/bug-report`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ issueType, client, note: note?.trim() || undefined }),
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error((data as { message?: string }).message || 'Failed to send report')
  }
  return data as { reportId: string }
}
