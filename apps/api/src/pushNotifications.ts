/**
 * Web Push (PWA) — subscribe store + admin fan-out via web-push + VAPID.
 */
import webpush from 'web-push'
import { z } from 'zod'
import { env } from './env.js'
import { getAdmin, listAuthUsers } from './supabase.js'

export const PushUrgencySchema = z.enum(['very-low', 'low', 'normal', 'high'])
export const PushTargetModeSchema = z.enum([
  'all',
  'signed_in',
  'guests',
  'plans',
  'user_ids',
  'emails',
  'admins',
  'self',
])

export const PushActionSchema = z.object({
  action: z.string().min(1).max(64),
  title: z.string().min(1).max(64),
  icon: z.string().url().optional().or(z.literal('')),
})

export const PushPayloadSchema = z.object({
  title: z.string().min(1).max(120),
  body: z.string().max(2000).default(''),
  icon: z.string().max(500).optional().default(''),
  badge: z.string().max(500).optional().default(''),
  image: z.string().max(500).optional().default(''),
  url: z.string().max(500).optional().default('#/app'),
  tag: z.string().max(120).optional().default(''),
  renotify: z.boolean().optional().default(false),
  requireInteraction: z.boolean().optional().default(false),
  silent: z.boolean().optional().default(false),
  timestamp: z.number().int().optional(),
  lang: z.string().max(32).optional().default(''),
  dir: z.enum(['auto', 'ltr', 'rtl']).optional().default('auto'),
  vibrate: z.array(z.number().int().nonnegative()).max(16).optional(),
  actions: z.array(PushActionSchema).max(2).optional().default([]),
  data: z.record(z.unknown()).optional(),
})

export type PushPayload = z.infer<typeof PushPayloadSchema>
export type PushTargetMode = z.infer<typeof PushTargetModeSchema>
export type PushUrgency = z.infer<typeof PushUrgencySchema>

export type PushSubscriptionRow = {
  id: string
  created_at: string
  updated_at: string
  user_id: string | null
  endpoint: string
  p256dh: string
  auth: string
  expiration_time: string | null
  user_agent: string
  locale: string
  platform: string
  enabled: boolean
}

export type PushSendRow = {
  id: string
  created_at: string
  actor_id: string | null
  actor_email: string | null
  title: string
  body: string
  target_mode: string
  dry_run: boolean
  recipient_count: number
  sent_count: number
  failed_count: number
  pruned_count: number
  status: string
  payload: Record<string, unknown>
  detail: Record<string, unknown>
}

let vapidReady = false

export function pushConfigured(): boolean {
  return Boolean(env.vapidPublicKey && env.vapidPrivateKey)
}

function ensureVapid(): void {
  if (!pushConfigured()) {
    throw new Error(
      'Web Push is not configured. Set VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, and VAPID_SUBJECT on the API.',
    )
  }
  const subject = env.vapidSubject
  if (!/^(mailto:|https:)/i.test(subject)) {
    throw new Error(
      'VAPID_SUBJECT must be a mailto: or https: URI (Apple rejects bare email addresses).',
    )
  }
  if (!vapidReady) {
    webpush.setVapidDetails(subject, env.vapidPublicKey, env.vapidPrivateKey)
    vapidReady = true
  }
}

export function publicPushConfig() {
  return {
    configured: pushConfigured(),
    publicKey: pushConfigured() ? env.vapidPublicKey : null,
    subject: env.vapidSubject || null,
  }
}

function absoluteAsset(pathOrUrl: string): string {
  const raw = pathOrUrl.trim()
  if (!raw) return ''
  if (/^https?:\/\//i.test(raw) || raw.startsWith('data:')) return raw
  const base = env.appUrl.replace(/\/+$/, '')
  if (raw.startsWith('/')) return `${base}${raw}`
  return `${base}/${raw}`
}

export type PushProvider = 'apple' | 'fcm' | 'mozilla' | 'other'

export function pushProviderForEndpoint(endpoint: string): PushProvider {
  const e = endpoint.toLowerCase()
  if (e.includes('web.push.apple.com')) return 'apple'
  if (e.includes('fcm.googleapis.com') || e.includes('android.googleapis.com/gcm')) return 'fcm'
  if (e.includes('updates.push.services.mozilla.com') || e.includes('push.services.mozilla.com')) {
    return 'mozilla'
  }
  return 'other'
}

function inferPlatform(userAgent: string, platformHint?: string): string {
  const ua = userAgent || ''
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios'
  if (/Android/i.test(ua)) return 'android'
  if (/Mac OS X/i.test(ua) && /Mobile/i.test(ua)) return 'ios'
  if (/Mac OS X/i.test(ua)) return 'macos'
  if (/Windows/i.test(ua)) return 'windows'
  if (/Linux/i.test(ua)) return 'linux'
  const hint = (platformHint || '').trim()
  return hint ? hint.slice(0, 64) : 'unknown'
}

/** Keep the encrypted record under Apple's ~4KB ceiling. */
function wirePushBody(payload: PushPayload): string {
  const full = {
    title: payload.title,
    body: payload.body || '',
    icon: payload.icon || '',
    badge: payload.badge || '',
    image: payload.image || '',
    url: payload.url || '#/app',
    tag: payload.tag || '',
    renotify: Boolean(payload.renotify) && Boolean((payload.tag || '').trim()),
    requireInteraction: Boolean(payload.requireInteraction),
    silent: Boolean(payload.silent),
    lang: payload.lang || '',
    dir: payload.dir || 'auto',
    vibrate: payload.silent ? undefined : payload.vibrate,
    actions: (payload.actions || []).slice(0, 2),
    data: {
      ...(payload.data || {}),
      url: payload.url || '#/app',
    },
  }
  let body = JSON.stringify(full)
  if (Buffer.byteLength(body) <= 3500) return body
  const slim = {
    title: payload.title.slice(0, 120),
    body: (payload.body || '').slice(0, 500),
    url: payload.url || '#/app',
    tag: payload.tag || '',
    data: { url: payload.url || '#/app' },
  }
  body = JSON.stringify(slim)
  if (Buffer.byteLength(body) > 3500) {
    slim.body = slim.body.slice(0, 200)
    body = JSON.stringify(slim)
  }
  return body
}

function urgencyForEndpoint(endpoint: string, requested?: PushUrgency): PushUrgency {
  // Apple often defers or drops low-urgency web pushes while the device is idle.
  if (pushProviderForEndpoint(endpoint) === 'apple') {
    if (!requested || requested === 'very-low' || requested === 'low') return 'high'
    return requested
  }
  return requested || 'normal'
}

export function normalizePushPayload(input: PushPayload): PushPayload {
  const app = env.appUrl.replace(/\/+$/, '')
  const icon = absoluteAsset(input.icon || '/pwa-192.png') || `${app}/pwa-192.png`
  const badge = absoluteAsset(input.badge || '/pwa-192.png') || icon
  const image = absoluteAsset(input.image || '')
  let url = (input.url || '#/app').trim() || '#/app'
  if (url.startsWith('/#') || url.startsWith('#')) {
    // keep hash deep links relative — SW resolves against origin
  } else if (url.startsWith('/')) {
    url = `${app}${url}`
  } else if (!/^https?:\/\//i.test(url)) {
    url = url.startsWith('#') ? url : `#/${url.replace(/^\/+/, '')}`
  }
  return {
    ...input,
    icon,
    badge,
    image,
    url,
    renotify: Boolean(input.renotify) && Boolean((input.tag || '').trim()),
    actions: (input.actions || [])
      .filter((a) => a.action && a.title)
      .slice(0, 2)
      .map((a) => ({
        action: a.action.trim(),
        title: a.title.trim(),
        icon: a.icon ? absoluteAsset(a.icon) : '',
      })),
  }
}

export async function upsertPushSubscription(input: {
  userId: string | null
  endpoint: string
  p256dh: string
  auth: string
  expirationTime?: number | null
  userAgent?: string
  locale?: string
  platform?: string
}): Promise<PushSubscriptionRow> {
  const db = getAdmin()
  if (!db) throw new Error('Database is not configured.')
  const expiration =
    typeof input.expirationTime === 'number' && Number.isFinite(input.expirationTime)
      ? new Date(input.expirationTime).toISOString()
      : null
  const row = {
    user_id: input.userId,
    endpoint: input.endpoint.trim(),
    p256dh: input.p256dh.trim(),
    auth: input.auth.trim(),
    expiration_time: expiration,
    user_agent: (input.userAgent || '').slice(0, 400),
    locale: (input.locale || '').slice(0, 32),
    platform: inferPlatform(input.userAgent || '', input.platform).slice(0, 64),
    enabled: true,
    updated_at: new Date().toISOString(),
  }
  const { data, error } = await db
    .from('push_subscriptions')
    .upsert(row, { onConflict: 'endpoint' })
    .select('*')
    .single()
  if (error) throw new Error(error.message || 'Failed to save push subscription')
  return data as PushSubscriptionRow
}

export async function disablePushSubscription(endpoint: string, userId?: string | null): Promise<void> {
  const db = getAdmin()
  if (!db) return
  let q = db.from('push_subscriptions').update({ enabled: false, updated_at: new Date().toISOString() }).eq('endpoint', endpoint)
  if (userId) q = q.eq('user_id', userId)
  await q
}

export async function deletePushSubscription(endpoint: string): Promise<void> {
  const db = getAdmin()
  if (!db) return
  await db.from('push_subscriptions').delete().eq('endpoint', endpoint)
}

export async function pushSubscriptionStats(): Promise<{
  total: number
  enabled: number
  signedIn: number
  guests: number
  byPlan: Record<string, number>
  byProvider: Record<PushProvider, number>
  byPlatform: Record<string, number>
}> {
  const emptyProvider: Record<PushProvider, number> = { apple: 0, fcm: 0, mozilla: 0, other: 0 }
  const db = getAdmin()
  if (!db) {
    return {
      total: 0,
      enabled: 0,
      signedIn: 0,
      guests: 0,
      byPlan: {},
      byProvider: emptyProvider,
      byPlatform: {},
    }
  }
  const { data, error } = await db
    .from('push_subscriptions')
    .select('id, user_id, enabled, endpoint, platform')
    .limit(5000)
  if (error || !data) {
    return {
      total: 0,
      enabled: 0,
      signedIn: 0,
      guests: 0,
      byPlan: {},
      byProvider: emptyProvider,
      byPlatform: {},
    }
  }
  const rows = data as Pick<PushSubscriptionRow, 'id' | 'user_id' | 'enabled' | 'endpoint' | 'platform'>[]
  const enabledRows = rows.filter((r) => r.enabled)
  const userIds = [...new Set(enabledRows.map((r) => r.user_id).filter(Boolean))] as string[]
  const byPlan: Record<string, number> = { free: 0, family: 0, business: 0, unknown: 0 }
  const byProvider: Record<PushProvider, number> = { apple: 0, fcm: 0, mozilla: 0, other: 0 }
  const byPlatform: Record<string, number> = {}
  for (const r of enabledRows) {
    const provider = pushProviderForEndpoint(r.endpoint)
    byProvider[provider] = (byProvider[provider] || 0) + 1
    const plat = (r.platform || 'unknown').slice(0, 32) || 'unknown'
    byPlatform[plat] = (byPlatform[plat] || 0) + 1
  }
  if (userIds.length) {
    const { data: profiles } = await db.from('profiles').select('id, plan').in('id', userIds)
    const planByUser = new Map<string, string>()
    for (const p of profiles || []) {
      planByUser.set(String((p as { id: string }).id), String((p as { plan?: string }).plan || 'free'))
    }
    for (const r of enabledRows) {
      if (!r.user_id) continue
      const plan = planByUser.get(r.user_id) || 'unknown'
      byPlan[plan] = (byPlan[plan] || 0) + 1
    }
  }
  return {
    total: rows.length,
    enabled: enabledRows.length,
    signedIn: enabledRows.filter((r) => r.user_id).length,
    guests: enabledRows.filter((r) => !r.user_id).length,
    byPlan,
    byProvider,
    byPlatform,
  }
}

async function resolveAdminUserIds(): Promise<Set<string>> {
  const ids = new Set<string>()
  const db = getAdmin()
  if (db) {
    const { data } = await db.from('profiles').select('id, role').eq('role', 'admin').limit(500)
    for (const row of data || []) ids.add(String((row as { id: string }).id))
  }
  try {
    const users = await listAuthUsers()
    for (const u of users) {
      if (u.email && env.adminEmails.includes(u.email.toLowerCase())) ids.add(u.id)
    }
  } catch {
    // ignore
  }
  return ids
}

async function resolveUserIdsByEmails(emails: string[]): Promise<Set<string>> {
  const ids = new Set<string>()
  const want = new Set(emails.map((e) => e.trim().toLowerCase()).filter(Boolean))
  if (!want.size) return ids
  try {
    const users = await listAuthUsers()
    for (const u of users) {
      if (u.email && want.has(u.email.toLowerCase())) ids.add(u.id)
    }
  } catch {
    // ignore
  }
  return ids
}

async function resolveUserIdsByPlans(plans: string[]): Promise<Set<string>> {
  const db = getAdmin()
  const ids = new Set<string>()
  if (!db || !plans.length) return ids
  const { data } = await db.from('profiles').select('id, plan').in('plan', plans).limit(5000)
  for (const row of data || []) ids.add(String((row as { id: string }).id))
  return ids
}

export async function listTargetSubscriptions(input: {
  mode: PushTargetMode
  plans?: string[]
  userIds?: string[]
  emails?: string[]
  actorUserId?: string | null
}): Promise<PushSubscriptionRow[]> {
  const db = getAdmin()
  if (!db) return []
  const { data, error } = await db
    .from('push_subscriptions')
    .select('*')
    .eq('enabled', true)
    .limit(5000)
  if (error || !data) return []
  let rows = data as PushSubscriptionRow[]

  switch (input.mode) {
    case 'all':
      break
    case 'signed_in':
      rows = rows.filter((r) => Boolean(r.user_id))
      break
    case 'guests':
      rows = rows.filter((r) => !r.user_id)
      break
    case 'self':
      rows = rows.filter((r) => r.user_id && r.user_id === input.actorUserId)
      break
    case 'admins': {
      const adminIds = await resolveAdminUserIds()
      // Also include allowlisted emails via actor matching profiles — admin role only here
      rows = rows.filter((r) => r.user_id && adminIds.has(r.user_id))
      break
    }
    case 'plans': {
      const planIds = await resolveUserIdsByPlans(input.plans || [])
      rows = rows.filter((r) => r.user_id && planIds.has(r.user_id))
      break
    }
    case 'user_ids': {
      const want = new Set((input.userIds || []).map((s) => s.trim()).filter(Boolean))
      rows = rows.filter((r) => r.user_id && want.has(r.user_id))
      break
    }
    case 'emails': {
      const emails = (input.emails || []).map((e) => e.trim().toLowerCase()).filter(Boolean)
      const ids = await resolveUserIdsByEmails(emails)
      rows = rows.filter((r) => r.user_id && ids.has(r.user_id))
      break
    }
    default:
      break
  }
  return rows
}

export async function listPushSends(limit = 40): Promise<PushSendRow[]> {
  const db = getAdmin()
  if (!db) return []
  const { data, error } = await db
    .from('push_sends')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(Math.min(100, Math.max(1, limit)))
  if (error || !data) return []
  return data as PushSendRow[]
}

async function logPushSend(entry: {
  actorId: string
  actorEmail: string | null
  title: string
  body: string
  targetMode: string
  dryRun: boolean
  recipientCount: number
  sentCount: number
  failedCount: number
  prunedCount: number
  status: string
  payload: Record<string, unknown>
  detail: Record<string, unknown>
}): Promise<void> {
  const db = getAdmin()
  if (!db) return
  await db.from('push_sends').insert({
    actor_id: entry.actorId,
    actor_email: entry.actorEmail,
    title: entry.title,
    body: entry.body,
    target_mode: entry.targetMode,
    dry_run: entry.dryRun,
    recipient_count: entry.recipientCount,
    sent_count: entry.sentCount,
    failed_count: entry.failedCount,
    pruned_count: entry.prunedCount,
    status: entry.status,
    payload: entry.payload,
    detail: entry.detail,
  })
}

export async function sendPushCampaign(input: {
  actorId: string
  actorEmail: string | null
  payload: PushPayload
  targetMode: PushTargetMode
  plans?: string[]
  userIds?: string[]
  emails?: string[]
  dryRun?: boolean
  ttl?: number
  urgency?: PushUrgency
  topic?: string
}): Promise<{
  dryRun: boolean
  recipientCount: number
  sent: number
  failed: number
  pruned: number
  status: string
  errors: { endpoint: string; statusCode?: number; message: string; provider?: PushProvider }[]
  byProvider: Record<PushProvider, { targeted: number; sent: number; failed: number; pruned: number }>
}> {
  const payload = normalizePushPayload(input.payload)
  const emptyByProvider = (): Record<
    PushProvider,
    { targeted: number; sent: number; failed: number; pruned: number }
  > => ({
    apple: { targeted: 0, sent: 0, failed: 0, pruned: 0 },
    fcm: { targeted: 0, sent: 0, failed: 0, pruned: 0 },
    mozilla: { targeted: 0, sent: 0, failed: 0, pruned: 0 },
    other: { targeted: 0, sent: 0, failed: 0, pruned: 0 },
  })
  const byProvider = emptyByProvider()
  const subs = await listTargetSubscriptions({
    mode: input.targetMode,
    plans: input.plans,
    userIds: input.userIds,
    emails: input.emails,
    actorUserId: input.actorId,
  })
  for (const sub of subs) {
    byProvider[pushProviderForEndpoint(sub.endpoint)].targeted += 1
  }

  if (input.dryRun) {
    await logPushSend({
      actorId: input.actorId,
      actorEmail: input.actorEmail,
      title: payload.title,
      body: payload.body,
      targetMode: input.targetMode,
      dryRun: true,
      recipientCount: subs.length,
      sentCount: 0,
      failedCount: 0,
      prunedCount: 0,
      status: 'dry_run',
      payload: payload as unknown as Record<string, unknown>,
      detail: {
        plans: input.plans || [],
        userIds: input.userIds || [],
        emails: input.emails || [],
        ttl: input.ttl ?? null,
        urgency: input.urgency || 'normal',
        topic: input.topic || null,
        byProvider,
      },
    })
    return {
      dryRun: true,
      recipientCount: subs.length,
      sent: 0,
      failed: 0,
      pruned: 0,
      status: 'dry_run',
      errors: [],
      byProvider,
    }
  }

  ensureVapid()
  const body = wirePushBody(payload)

  let sent = 0
  let failed = 0
  let pruned = 0
  const errors: {
    endpoint: string
    statusCode?: number
    message: string
    provider?: PushProvider
  }[] = []

  for (const sub of subs) {
    const provider = pushProviderForEndpoint(sub.endpoint)
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        body,
        {
          TTL: typeof input.ttl === 'number' ? input.ttl : 60 * 60 * 24,
          urgency: urgencyForEndpoint(sub.endpoint, input.urgency),
          topic: input.topic?.trim() || undefined,
        },
      )
      sent += 1
      byProvider[provider].sent += 1
    } catch (e) {
      const err = e as { statusCode?: number; message?: string; body?: string }
      const statusCode = err.statusCode
      const message = err.message || String(e)
      if (statusCode === 404 || statusCode === 410) {
        pruned += 1
        byProvider[provider].pruned += 1
        await deletePushSubscription(sub.endpoint)
      } else {
        failed += 1
        byProvider[provider].failed += 1
        if (errors.length < 40) {
          errors.push({
            endpoint: sub.endpoint.slice(0, 80),
            statusCode,
            message: message.slice(0, 200),
            provider,
          })
        }
      }
    }
  }

  const status =
    sent === 0 && failed > 0 ? 'failed' : failed > 0 || pruned > 0 ? 'partial' : 'sent'

  await logPushSend({
    actorId: input.actorId,
    actorEmail: input.actorEmail,
    title: payload.title,
    body: payload.body,
    targetMode: input.targetMode,
    dryRun: false,
    recipientCount: subs.length,
    sentCount: sent,
    failedCount: failed,
    prunedCount: pruned,
    status,
    payload: payload as unknown as Record<string, unknown>,
    detail: {
      plans: input.plans || [],
      userIds: input.userIds || [],
      emails: input.emails || [],
      ttl: input.ttl ?? null,
      urgency: input.urgency || 'normal',
      topic: input.topic || null,
      errors,
      byProvider,
    },
  })

  return {
    dryRun: false,
    recipientCount: subs.length,
    sent,
    failed,
    pruned,
    status,
    errors,
    byProvider,
  }
}
