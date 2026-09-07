/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core'
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'

declare let self: ServiceWorkerGlobalScope

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()
self.skipWaiting()
clientsClaim()

registerRoute(
  new NavigationRoute(createHandlerBoundToURL('index.html'), {
    denylist: [/^\/api\//],
  }),
)

type PushAction = { action: string; title: string; icon?: string }

type PushPayload = {
  title?: string
  body?: string
  icon?: string
  badge?: string
  image?: string
  tag?: string
  renotify?: boolean
  requireInteraction?: boolean
  silent?: boolean
  timestamp?: number
  lang?: string
  dir?: NotificationDirection
  vibrate?: number[]
  actions?: PushAction[]
  url?: string
  data?: Record<string, unknown>
}

function parsePushPayload(event: PushEvent): PushPayload {
  if (!event.data) {
    return { title: 'JyutTranslate', body: 'New update', url: '#/app' }
  }
  try {
    const json = event.data.json() as PushPayload
    return json && typeof json === 'object' ? json : { title: 'JyutTranslate', body: String(event.data.text()) }
  } catch {
    return { title: 'JyutTranslate', body: event.data.text(), url: '#/app' }
  }
}

self.addEventListener('push', (event) => {
  const payload = parsePushPayload(event)
  const title = (payload.title || 'JyutTranslate').trim() || 'JyutTranslate'
  const url = String(payload.url || payload.data?.url || '#/app')
  const options: NotificationOptions = {
    body: payload.body || '',
    icon: payload.icon || '/pwa-192.png',
    badge: payload.badge || '/pwa-192.png',
    image: payload.image || undefined,
    tag: payload.tag || undefined,
    renotify: Boolean(payload.renotify),
    requireInteraction: Boolean(payload.requireInteraction),
    silent: Boolean(payload.silent),
    timestamp: payload.timestamp || Date.now(),
    lang: payload.lang || undefined,
    dir: payload.dir || 'auto',
    vibrate: payload.vibrate,
    actions: (payload.actions || [])
      .filter((a) => a?.action && a?.title)
      .slice(0, 2)
      .map((a) => ({ action: a.action, title: a.title, icon: a.icon || undefined })),
    data: {
      ...(payload.data || {}),
      url,
    },
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const data = (event.notification.data || {}) as { url?: string }
  let target = String(data.url || '#/app')
  const action = event.action
  if (action && data && typeof data === 'object') {
    const actionUrl = (data as Record<string, unknown>)[`action:${action}`]
    if (typeof actionUrl === 'string' && actionUrl) target = actionUrl
  }

  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      for (const client of all) {
        if ('focus' in client) {
          await client.focus()
          if ('navigate' in client && typeof (client as WindowClient).navigate === 'function') {
            try {
              // Prefer hash updates for SPA when already on origin
              if (target.startsWith('#')) {
                await (client as WindowClient).navigate(`${self.location.origin}/${target}`)
              } else {
                await (client as WindowClient).navigate(target)
              }
            } catch {
              // ignore navigate failures
            }
          } else if (target.startsWith('#')) {
            ;(client as WindowClient).postMessage({ type: 'yue:push-navigate', url: target })
          }
          return
        }
      }
      const openUrl = target.startsWith('#')
        ? `${self.location.origin}/${target}`
        : target.startsWith('/')
          ? `${self.location.origin}${target}`
          : target
      await self.clients.openWindow(openUrl)
    })(),
  )
})

self.addEventListener('notificationclose', (_event) => {
  // reserved for analytics hooks
})

self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    (async () => {
      // Client will re-subscribe on next visit; nothing durable here without VAPID in SW.
    })(),
  )
})
