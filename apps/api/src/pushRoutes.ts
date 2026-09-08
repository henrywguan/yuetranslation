/**
 * Public Web Push subscribe / unsubscribe (optional auth).
 */
import type { Response } from 'express'
import { z } from 'zod'
import type { AuthedRequest } from './auth.js'
import { publicPushConfig } from './pushNotifications.js'

export async function getPushConfig(_req: AuthedRequest, res: Response) {
  res.json(publicPushConfig())
}

export async function subscribePush(req: AuthedRequest, res: Response) {
  const parsed = z
    .object({
      endpoint: z.string().url(),
      keys: z.object({
        p256dh: z.string().min(1),
        auth: z.string().min(1),
      }),
      expirationTime: z.number().nullable().optional(),
      locale: z.string().max(32).optional(),
      platform: z.string().max(64).optional(),
    })
    .safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ message: 'Invalid push subscription' })
    return
  }
  if (!publicPushConfig().configured) {
    res.status(503).json({ message: 'Web Push is not configured on the server.' })
    return
  }
  try {
    const { upsertPushSubscription } = await import('./pushNotifications.js')
    const saved = await upsertPushSubscription({
      userId: req.auth?.userId || null,
      endpoint: parsed.data.endpoint,
      p256dh: parsed.data.keys.p256dh,
      auth: parsed.data.keys.auth,
      expirationTime: parsed.data.expirationTime ?? null,
      userAgent: String(req.headers['user-agent'] || ''),
      locale: parsed.data.locale,
      platform: parsed.data.platform,
    })
    res.json({ ok: true, id: saved.id })
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Subscribe failed' })
  }
}

export async function unsubscribePush(req: AuthedRequest, res: Response) {
  const parsed = z
    .object({
      endpoint: z.string().url(),
      deleteRow: z.boolean().optional(),
    })
    .safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ message: 'endpoint required' })
    return
  }
  try {
    const { deletePushSubscription, disablePushSubscription } = await import('./pushNotifications.js')
    if (parsed.data.deleteRow) {
      await deletePushSubscription(parsed.data.endpoint)
    } else {
      await disablePushSubscription(parsed.data.endpoint, req.auth?.userId || null)
    }
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Unsubscribe failed' })
  }
}
