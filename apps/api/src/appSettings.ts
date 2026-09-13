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

/** Short TTL so /api/health can share a banner read across concurrent boots. */
const INCIDENT_BANNER_CACHE_MS = 30_000
let incidentBannerCache: { at: number; value: IncidentBannerSettings } | null = null

export async function getIncidentBanner(): Promise<IncidentBannerSettings> {
  const now = Date.now()
  if (incidentBannerCache && now - incidentBannerCache.at < INCIDENT_BANNER_CACHE_MS) {
    return { ...incidentBannerCache.value }
  }
  const client = getAdmin()
  if (!client) {
    const fallback = { ...DEFAULT_INCIDENT_BANNER }
    incidentBannerCache = { at: now, value: fallback }
    return { ...fallback }
  }
  const { data, error } = await client
    .from('app_settings')
    .select('value')
    .eq('key', INCIDENT_BANNER_KEY)
    .maybeSingle()
  const value =
    error || !data ? { ...DEFAULT_INCIDENT_BANNER } : normalizeIncidentBanner(data.value)
  incidentBannerCache = { at: now, value }
  return { ...value }
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
  incidentBannerCache = { at: Date.now(), value: next }
  return next
}
