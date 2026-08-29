import type { ComponentType } from 'react'

export type BugReportEmailProps = {
  reportId: string
  shortId: string
  issueType: string
  issueLabel: string
  email: string | null
  userId: string
  route: string | null
  mode: string | null
  plan: string | null
  lastError: string | null
  note: string | null
  appVersion: string | null
  theme: string | null
  viewport: string | null
  live: boolean
  translating: boolean
  demoMode: boolean
  cloudReady: boolean | null
  modelConfigured: boolean | null
  visionConfigured: boolean | null
  recentEvents: string[]
  adminUrl: string
  appUrl?: string
  logoSrc?: string
  hasScreenshot: boolean
}

export const BugReportEmail: ComponentType<BugReportEmailProps>
export default BugReportEmail
