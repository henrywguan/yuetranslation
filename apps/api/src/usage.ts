import { getAdmin } from './supabase.js'

export type UsageRow = {
  user_id: string
  month: string
  live_seconds: number
  tts_chars: number
  translate_count: number
}

export function currentMonthKey(): string {
  return new Date().toISOString().slice(0, 7).replace('-', '_')
}

export function emptyUsage(month = currentMonthKey()) {
  return { month, liveSeconds: 0, ttsChars: 0, translateCount: 0 }
}

export async function getUsage(userId: string, month = currentMonthKey()) {
  const client = getAdmin()
  if (!client) return emptyUsage(month)
  const { data } = await client
    .from('usage_months')
    .select('*')
    .eq('user_id', userId)
    .eq('month', month)
    .maybeSingle()
  if (!data) return emptyUsage(month)
  const row = data as UsageRow
  return {
    month: row.month,
    liveSeconds: row.live_seconds,
    ttsChars: row.tts_chars,
    translateCount: row.translate_count,
  }
}

/** All usage months for one user (newest first). */
export async function listUsageMonths(userId: string) {
  const client = getAdmin()
  if (!client) return []
  const { data } = await client
    .from('usage_months')
    .select('*')
    .eq('user_id', userId)
    .order('month', { ascending: false })
  return ((data as UsageRow[]) || []).map((row) => ({
    month: row.month,
    liveSeconds: row.live_seconds,
    ttsChars: row.tts_chars,
    translateCount: row.translate_count,
  }))
}

/** Usage rows for many users in one month. */
export async function getUsageForMonth(month = currentMonthKey()): Promise<Map<string, UsageRow>> {
  const client = getAdmin()
  const map = new Map<string, UsageRow>()
  if (!client) return map
  const { data } = await client.from('usage_months').select('*').eq('month', month)
  for (const row of (data as UsageRow[]) || []) {
    map.set(row.user_id, row)
  }
  return map
}

async function upsertUsage(userId: string, patch: Partial<UsageRow>) {
  const client = getAdmin()
  if (!client) return
  const month = patch.month ?? currentMonthKey()
  const { data: existing } = await client
    .from('usage_months')
    .select('*')
    .eq('user_id', userId)
    .eq('month', month)
    .maybeSingle()

  const base: UsageRow = existing
    ? (existing as UsageRow)
    : { user_id: userId, month, live_seconds: 0, tts_chars: 0, translate_count: 0 }

  await client.from('usage_months').upsert(
    {
      user_id: userId,
      month,
      live_seconds: patch.live_seconds ?? base.live_seconds,
      tts_chars: patch.tts_chars ?? base.tts_chars,
      translate_count: patch.translate_count ?? base.translate_count,
    },
    { onConflict: 'user_id,month' },
  )
}

export async function addLiveSeconds(userId: string, seconds: number) {
  const month = currentMonthKey()
  const usage = await getUsage(userId, month)
  await upsertUsage(userId, { month, live_seconds: usage.liveSeconds + seconds })
}

export async function addTtsChars(userId: string, chars: number) {
  const month = currentMonthKey()
  const usage = await getUsage(userId, month)
  await upsertUsage(userId, { month, tts_chars: usage.ttsChars + chars })
}

export async function addTranslateCount(userId: string, count = 1) {
  const month = currentMonthKey()
  const usage = await getUsage(userId, month)
  await upsertUsage(userId, { month, translate_count: usage.translateCount + count })
}

/** Zero live / TTS / translate counters for a month (default: current). */
export async function resetUsageMonth(userId: string, month = currentMonthKey()) {
  await upsertUsage(userId, {
    month,
    live_seconds: 0,
    tts_chars: 0,
    translate_count: 0,
  })
}
