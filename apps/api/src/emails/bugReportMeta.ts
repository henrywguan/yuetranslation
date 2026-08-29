/** Plain .ts helpers — safe for Vercel Node boot (no JSX / React Email). */

const ISSUE_LABELS: Record<string, string> = {
  translation: 'Translation wrong',
  mic: 'Mic / live speech',
  tts: 'Voice / TTS',
  camera: 'Camera / OCR',
  account: 'Login / billing',
  ui: 'UI / layout',
  crash: 'Crash / freeze',
  other: 'Other',
}

export function issueTypeLabel(type: string): string {
  return ISSUE_LABELS[type] || type
}

export function shortReportId(id: string): string {
  return `rpt_${id.replace(/-/g, '').slice(0, 6)}`
}
