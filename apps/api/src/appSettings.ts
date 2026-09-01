import { getAdmin } from './supabase.js'

const INCIDENT_BANNER_KEY = 'incident_banner'

export type IncidentBannerSettings = {
  enabled: boolean
  messageEn: string
  messageZh: string
}

export const DEFAULT_INCIDENT_BANNER: IncidentBannerSettings = {
  enabled: false,
  messageEn: 'The app is currently experiencing issues and is being worked on.',
  messageZh: '應用程式目前出現問題，我們正在處理中。',
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

export function normalizeIncidentBanner(raw: unknown): IncidentBannerSettings {
  const v = asRecord(raw)
  const messageEn =
    typeof v.messageEn === 'string' && v.messageEn.trim()
      ? v.messageEn.trim()
      : DEFAULT_INCIDENT_BANNER.messageEn
  const messageZh =
    typeof v.messageZh === 'string' && v.messageZh.trim()
      ? v.messageZh.trim()
      : DEFAULT_INCIDENT_BANNER.messageZh
  return {
    enabled: Boolean(v.enabled),
    messageEn,
    messageZh,
  }
}

export async function getIncidentBanner(): Promise<IncidentBannerSettings> {
  const client = getAdmin()
  if (!client) return { ...DEFAULT_INCIDENT_BANNER }
  const { data, error } = await client
    .from('app_settings')
    .select('value')
    .eq('key', INCIDENT_BANNER_KEY)
    .maybeSingle()
  if (error || !data) return { ...DEFAULT_INCIDENT_BANNER }
  return normalizeIncidentBanner(data.value)
}

export async function setIncidentBanner(
  patch: Partial<IncidentBannerSettings>,
  updatedBy: string,
): Promise<IncidentBannerSettings> {
  const client = getAdmin()
  if (!client) throw new Error('Database is not configured.')
  const current = await getIncidentBanner()
  const next = normalizeIncidentBanner({ ...current, ...patch })
  const { error } = await client.from('app_settings').upsert({
    key: INCIDENT_BANNER_KEY,
    value: next,
    updated_at: new Date().toISOString(),
    updated_by: updatedBy,
  })
  if (error) throw new Error(error.message || 'Failed to save incident banner')
  return next
}
