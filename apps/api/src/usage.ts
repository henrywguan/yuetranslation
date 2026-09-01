import { getMembershipForUser, incrementHouseholdUsage } from './household.js'
import { getAdmin } from './supabase.js'

export type UsageRow = {
  user_id: string
  month: string
  live_seconds: number
  tts_chars: number
  translate_count: number
  camera_seconds?: number
  camera_translate_count?: number
  docs_pages?: number
  ai_vision_count?: number
}

export type UsageSnapshot = {
  month: string
  liveSeconds: number
  ttsChars: number
  translateCount: number
  cameraSeconds: number
  cameraTranslateCount: number
  docsPages: number
  /** Multimodal LLM OCR fallback invocations (view-only meter). */
  aiVisionCount: number
}

function asInt(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0
}

export function currentMonthKey(): string {
  return new Date().toISOString().slice(0, 7).replace('-', '_')
}

export function emptyUsage(month = currentMonthKey()): UsageSnapshot {
  return {
    month,
    liveSeconds: 0,
    ttsChars: 0,
    translateCount: 0,
    cameraSeconds: 0,
    cameraTranslateCount: 0,
    docsPages: 0,
    aiVisionCount: 0,
  }
}

function rowToSnapshot(row: UsageRow): UsageSnapshot {
  return {
    month: row.month,
    liveSeconds: asInt(row.live_seconds),
    ttsChars: asInt(row.tts_chars),
    translateCount: asInt(row.translate_count),
    cameraSeconds: asInt(row.camera_seconds),
    cameraTranslateCount: asInt(row.camera_translate_count),
    docsPages: asInt(row.docs_pages),
    aiVisionCount: asInt(row.ai_vision_count),
  }
}

export async function getUsage(userId: string, month = currentMonthKey()): Promise<UsageSnapshot> {
  const client = getAdmin()
  if (!client) return emptyUsage(month)
  const { data, error } = await client
    .from('usage_months')
    .select('*')
    .eq('user_id', userId)
    .eq('month', month)
    .maybeSingle()
  if (error) {
    console.error('[usage] getUsage failed', error.message)
    return emptyUsage(month)
  }
  if (!data) return emptyUsage(month)
  return rowToSnapshot(data as UsageRow)
}

/** All usage months for one user (newest first). */
export async function listUsageMonths(userId: string): Promise<UsageSnapshot[]> {
  const client = getAdmin()
  if (!client) return []
  const { data, error } = await client
    .from('usage_months')
    .select('*')
    .eq('user_id', userId)
    .order('month', { ascending: false })
  if (error) {
    console.error('[usage] listUsageMonths failed', error.message)
    return []
  }
  return ((data as UsageRow[]) || []).map(rowToSnapshot)
}

/** Usage rows for many users in one month. */
export async function getUsageForMonth(month = currentMonthKey()): Promise<Map<string, UsageRow>> {
  const client = getAdmin()
  const map = new Map<string, UsageRow>()
  if (!client) return map
  const { data, error } = await client.from('usage_months').select('*').eq('month', month)
  if (error) {
    console.error('[usage] getUsageForMonth failed', error.message)
    return map
  }
  for (const row of (data as UsageRow[]) || []) {
    map.set(row.user_id, {
      ...row,
      live_seconds: asInt(row.live_seconds),
      tts_chars: asInt(row.tts_chars),
      translate_count: asInt(row.translate_count),
      camera_seconds: asInt(row.camera_seconds),
      camera_translate_count: asInt(row.camera_translate_count),
      docs_pages: asInt(row.docs_pages),
      ai_vision_count: asInt(row.ai_vision_count),
    })
  }
  return map
}

/**
 * Prefer atomic Postgres RPC so concurrent TTS / live / translate / camera cannot wipe
 * each other. Falls back to a single-column upsert if the migration is not applied.
 */
async function incrementUsage(
  userId: string,
  delta: {
    liveSeconds?: number
    ttsChars?: number
    translateCount?: number
    cameraSeconds?: number
    cameraTranslateCount?: number
    docsPages?: number
    aiVisionCount?: number
  },
) {
  const client = getAdmin()
  if (!client) return
  const liveSeconds = asInt(delta.liveSeconds)
  const ttsChars = asInt(delta.ttsChars)
  const translateCount = asInt(delta.translateCount)
  const cameraSeconds = asInt(delta.cameraSeconds)
  const cameraTranslateCount = asInt(delta.cameraTranslateCount)
  const docsPages = asInt(delta.docsPages)
  const aiVisionCount = asInt(delta.aiVisionCount)
  if (
    liveSeconds +
      ttsChars +
      translateCount +
      cameraSeconds +
      cameraTranslateCount +
      docsPages +
      aiVisionCount <=
    0
  ) {
    return
  }

  const month = currentMonthKey()

  // Household seats share one pooled meter for the month.
  const membership = await getMembershipForUser(userId)
  if (membership) {
    await incrementHouseholdUsage(membership.household.id, {
      liveSeconds,
      ttsChars,
      translateCount,
      cameraSeconds,
      cameraTranslateCount,
      docsPages,
      aiVisionCount,
    })
    await incrementPersonalAttribution(userId, month, {
      liveSeconds,
      ttsChars,
      translateCount,
      cameraSeconds,
      cameraTranslateCount,
      docsPages,
      aiVisionCount,
    })
    return
  }

  const { error: rpcError } = await client.rpc('increment_usage', {
    p_user_id: userId,
    p_month: month,
    p_live_seconds: liveSeconds,
    p_tts_chars: ttsChars,
    p_translate_count: translateCount,
    p_camera_seconds: cameraSeconds,
    p_camera_translate_count: cameraTranslateCount,
    p_docs_pages: docsPages,
    p_ai_vision_count: aiVisionCount,
  })
  if (!rpcError) return

  console.warn('[usage] increment_usage RPC unavailable, using column upsert:', rpcError.message)
  const usage = await getUsage(userId, month)
  const patch: Record<string, string | number> = { user_id: userId, month }
  if (liveSeconds) patch.live_seconds = usage.liveSeconds + liveSeconds
  if (ttsChars) patch.tts_chars = usage.ttsChars + ttsChars
  if (translateCount) patch.translate_count = usage.translateCount + translateCount
  if (cameraSeconds) patch.camera_seconds = usage.cameraSeconds + cameraSeconds
  if (cameraTranslateCount) {
    patch.camera_translate_count = usage.cameraTranslateCount + cameraTranslateCount
  }
  if (docsPages) patch.docs_pages = usage.docsPages + docsPages
  if (aiVisionCount) patch.ai_vision_count = usage.aiVisionCount + aiVisionCount

  const { error: profileError } = await client.from('profiles').upsert(
    { id: userId, plan: 'free' },
    { onConflict: 'id', ignoreDuplicates: true },
  )
  if (profileError) {
    console.error('[usage] ensure profile failed', profileError.message)
  }

  const { error: upsertError } = await client
    .from('usage_months')
    .upsert(patch, { onConflict: 'user_id,month' })
  if (upsertError) {
    console.error('[usage] upsert failed', upsertError.message, patch)
  }
}

/**
 * Per-member attribution for pooled households (display only; limits use the pool).
 */
async function incrementPersonalAttribution(
  userId: string,
  month: string,
  delta: {
    liveSeconds?: number
    ttsChars?: number
    translateCount?: number
    cameraSeconds?: number
    cameraTranslateCount?: number
    docsPages?: number
    aiVisionCount?: number
  },
) {
  const client = getAdmin()
  if (!client) return

  const liveSeconds = asInt(delta.liveSeconds)
  const ttsChars = asInt(delta.ttsChars)
  const translateCount = asInt(delta.translateCount)
  const cameraSeconds = asInt(delta.cameraSeconds)
  const cameraTranslateCount = asInt(delta.cameraTranslateCount)
  const docsPages = asInt(delta.docsPages)
  const aiVisionCount = asInt(delta.aiVisionCount)
  if (
    liveSeconds +
      ttsChars +
      translateCount +
      cameraSeconds +
      cameraTranslateCount +
      docsPages +
      aiVisionCount <=
    0
  ) {
    return
  }

  const { error: rpcError } = await client.rpc('increment_usage', {
    p_user_id: userId,
    p_month: month,
    p_live_seconds: liveSeconds,
    p_tts_chars: ttsChars,
    p_translate_count: translateCount,
    p_camera_seconds: cameraSeconds,
    p_camera_translate_count: cameraTranslateCount,
    p_docs_pages: docsPages,
    p_ai_vision_count: aiVisionCount,
  })
  if (!rpcError) return

  console.warn('[usage] increment_usage attribution fallback:', rpcError.message)
  const usage = await getUsage(userId, month)
  const patch: Record<string, string | number> = { user_id: userId, month }
  if (liveSeconds) patch.live_seconds = usage.liveSeconds + liveSeconds
  if (ttsChars) patch.tts_chars = usage.ttsChars + ttsChars
  if (translateCount) patch.translate_count = usage.translateCount + translateCount
  if (cameraSeconds) patch.camera_seconds = usage.cameraSeconds + cameraSeconds
  if (cameraTranslateCount) {
    patch.camera_translate_count = usage.cameraTranslateCount + cameraTranslateCount
  }
  if (docsPages) patch.docs_pages = usage.docsPages + docsPages
  if (aiVisionCount) patch.ai_vision_count = usage.aiVisionCount + aiVisionCount

  const { error: upsertError } = await client
    .from('usage_months')
    .upsert(patch, { onConflict: 'user_id,month' })
  if (upsertError) {
    console.error('[usage] attribution upsert failed', upsertError.message, patch)
  }
}

export async function addLiveSeconds(userId: string, seconds: number) {
  await incrementUsage(userId, { liveSeconds: seconds })
}

export async function addTtsChars(userId: string, chars: number) {
  await incrementUsage(userId, { ttsChars: chars })
}

export async function addTranslateCount(userId: string, count = 1) {
  await incrementUsage(userId, { translateCount: count })
}

export async function addCameraSeconds(userId: string, seconds: number) {
  await incrementUsage(userId, { cameraSeconds: seconds })
}

export async function addCameraTranslateCount(userId: string, count = 1) {
  await incrementUsage(userId, { cameraTranslateCount: count })
}

/** Bill document pages only after a successful job. */
export async function addDocsPages(userId: string, pages = 1) {
  await incrementUsage(userId, { docsPages: pages })
}

/** Count multimodal LLM OCR fallback invocations (no hard cap). */
export async function addAiVisionCount(userId: string, count = 1) {
  await incrementUsage(userId, { aiVisionCount: count })
}

export type UsagePatch = {
  liveSeconds?: number
  ttsChars?: number
  cameraSeconds?: number
  docsPages?: number
}

async function ensureUsageProfile(userId: string) {
  const client = getAdmin()
  if (!client) return
  const { error: profileError } = await client.from('profiles').upsert(
    { id: userId, plan: 'free' },
    { onConflict: 'id', ignoreDuplicates: true },
  )
  if (profileError) {
    console.error('[usage] ensure profile failed', profileError.message)
  }
}

/** Set selected usage counters for a month (default: current). */
export async function setUsageMonth(
  userId: string,
  month = currentMonthKey(),
  patch: UsagePatch,
) {
  const client = getAdmin()
  if (!client) return
  await ensureUsageProfile(userId)

  const current = await getUsage(userId, month)
  const row = {
    user_id: userId,
    month,
    live_seconds: patch.liveSeconds ?? current.liveSeconds,
    tts_chars: patch.ttsChars ?? current.ttsChars,
    translate_count: current.translateCount,
    camera_seconds: patch.cameraSeconds ?? current.cameraSeconds,
    camera_translate_count: current.cameraTranslateCount,
    docs_pages: patch.docsPages ?? current.docsPages,
    ai_vision_count: current.aiVisionCount,
  }

  const { error } = await client.from('usage_months').upsert(row, { onConflict: 'user_id,month' })
  if (error) console.error('[usage] setUsageMonth failed', error.message)
}

/** Zero live / TTS / translate / camera / docs counters for a month (default: current). */
export async function resetUsageMonth(userId: string, month = currentMonthKey()) {
  const client = getAdmin()
  if (!client) return
  await ensureUsageProfile(userId)
  const { error } = await client.from('usage_months').upsert(
    {
      user_id: userId,
      month,
      live_seconds: 0,
      tts_chars: 0,
      translate_count: 0,
      camera_seconds: 0,
      camera_translate_count: 0,
      docs_pages: 0,
      ai_vision_count: 0,
    },
    { onConflict: 'user_id,month' },
  )
  if (error) console.error('[usage] resetUsageMonth failed', error.message)
}
