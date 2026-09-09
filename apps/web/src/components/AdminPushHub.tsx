import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  fetchAdminPushSends,
  fetchAdminPushStats,
  sendAdminPush,
  type PushPayloadInput,
  type PushSendItem,
  type PushTargetMode,
} from '../lib/adminApi'
import { enablePushNotifications, pushPermission, pushSupported } from '../lib/pushNotifications'
import './AdminPushHub.css'

type Urgency = 'very-low' | 'low' | 'normal' | 'high'
type Plan = 'free' | 'family' | 'business'

type Notice = {
  tone: 'ok' | 'warn' | 'error'
  title: string
  summary: string
}

const PRESETS: { id: string; label: string; payload: Partial<PushPayloadInput> }[] = [
  {
    id: 'product',
    label: 'Product update',
    payload: {
      title: 'What’s new in JyutTranslate',
      body: 'Fresh polish just landed — open the app to try it.',
      url: '#/app',
      tag: 'product-update',
      renotify: true,
    },
  },
  {
    id: 'incident',
    label: 'Incident',
    payload: {
      title: 'We’re on it',
      body: 'JyutTranslate is experiencing issues. We’re working on a fix.',
      url: '#/app',
      tag: 'incident',
      requireInteraction: true,
    },
  },
  {
    id: 'promo',
    label: 'Upgrade nudge',
    payload: {
      title: 'Unlock live Conversation',
      body: 'Family adds shared seats and longer live minutes.',
      url: '#/pricing',
      tag: 'promo-pricing',
    },
  },
]

function emptyPayload(): PushPayloadInput {
  return {
    title: '',
    body: '',
    icon: '/pwa-192.png',
    badge: '/pwa-192.png',
    image: '',
    url: '#/app',
    tag: '',
    renotify: false,
    requireInteraction: false,
    silent: false,
    lang: '',
    dir: 'auto',
    vibrate: [80, 40, 80],
    actions: [
      { action: 'open', title: 'Open app' },
      { action: 'pricing', title: 'Pricing' },
    ],
    data: {},
  }
}

export function AdminPushHub() {
  const [configured, setConfigured] = useState(false)
  const [stats, setStats] = useState({
    total: 0,
    enabled: 0,
    signedIn: 0,
    guests: 0,
    byPlan: {} as Record<string, number>,
    byProvider: { apple: 0, fcm: 0, mozilla: 0, other: 0 } as Record<string, number>,
    byPlatform: {} as Record<string, number>,
  })
  const [sends, setSends] = useState<PushSendItem[]>([])
  const [payload, setPayload] = useState<PushPayloadInput>(emptyPayload)
  const [targetMode, setTargetMode] = useState<PushTargetMode>('self')
  const [plans, setPlans] = useState<Plan[]>(['family', 'business'])
  const [userIdsText, setUserIdsText] = useState('')
  const [emailsText, setEmailsText] = useState('')
  const [ttl, setTtl] = useState(60 * 60 * 24)
  const [urgency, setUrgency] = useState<Urgency>('high')
  const [topic, setTopic] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [notice, setNotice] = useState<Notice | null>(null)
  const [confirmBroadcast, setConfirmBroadcast] = useState(false)
  const [action2Url, setAction2Url] = useState('#/pricing')

  const previewJson = useMemo(() => {
    const actions = (payload.actions || []).filter((a) => a.action && a.title).slice(0, 2)
    const data: Record<string, unknown> = {
      ...(payload.data || {}),
      url: payload.url || '#/app',
    }
    if (actions[1]?.action) data[`action:${actions[1].action}`] = action2Url || '#/pricing'
    return JSON.stringify({ ...payload, actions, data }, null, 2)
  }, [payload, action2Url])

  const reload = useCallback(async () => {
    setBusy(true)
    setError('')
    try {
      const [st, hist] = await Promise.all([fetchAdminPushStats(), fetchAdminPushSends(30)])
      setConfigured(st.configured)
      setStats(st.stats)
      setSends(hist.sends)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load push hub')
    } finally {
      setBusy(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  const patchPayload = <K extends keyof PushPayloadInput>(key: K, value: PushPayloadInput[K]) => {
    setPayload((prev) => ({ ...prev, [key]: value }))
  }

  const applyPreset = (id: string) => {
    const preset = PRESETS.find((p) => p.id === id)
    if (!preset) return
    setPayload((prev) => ({ ...prev, ...emptyPayload(), ...preset.payload, actions: prev.actions }))
    if (id === 'incident') setUrgency('high')
    setMessage(`Applied “${preset.label}” preset`)
  }

  const parseUserIds = () =>
    userIdsText
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter(Boolean)

  const parseEmails = () =>
    emailsText
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter(Boolean)

  const runSend = async (dryRun: boolean) => {
    setError('')
    setMessage('')
    setNotice(null)
    if (!payload.title.trim()) {
      setError('Title is required.')
      return
    }
    if (!dryRun && targetMode === 'all' && !confirmBroadcast) {
      setError('Confirm full broadcast with the checkbox.')
      return
    }
    if (!dryRun && targetMode === 'all') {
      if (!window.confirm('Send this PWA notification to ALL enabled subscribers?')) return
    }

    setBusy(true)
    try {
      const actions = (payload.actions || []).filter((a) => a.action && a.title).slice(0, 2)
      const data: Record<string, unknown> = {
        ...(payload.data || {}),
        url: payload.url || '#/app',
      }
      if (actions[1]?.action) data[`action:${actions[1].action}`] = action2Url || '#/pricing'

      const result = await sendAdminPush({
        payload: {
          ...payload,
          title: payload.title.trim(),
          body: payload.body || '',
          actions,
          data,
          vibrate: payload.silent ? undefined : payload.vibrate,
        },
        targetMode,
        plans: targetMode === 'plans' ? plans : undefined,
        userIds: targetMode === 'user_ids' ? parseUserIds() : undefined,
        emails: targetMode === 'emails' ? parseEmails() : undefined,
        dryRun,
        ttl,
        urgency,
        topic: topic.trim() || undefined,
        confirm: true,
      })

      const apple = result.byProvider?.apple
      const appleBit =
        apple && (apple.targeted || apple.sent || apple.failed)
          ? ` · Apple ${apple.sent}/${apple.targeted}${apple.failed ? ` (${apple.failed} failed)` : ''}`
          : ''
      const summary = dryRun
        ? `Dry run · ${result.recipientCount} device${result.recipientCount === 1 ? '' : 's'} would be targeted${appleBit}`
        : `Sent ${result.sent} · failed ${result.failed} · pruned ${result.pruned} · of ${result.recipientCount}${appleBit}`

      setMessage(summary)
      setNotice({
        tone: result.status === 'failed' ? 'error' : result.status === 'partial' || result.failed ? 'warn' : 'ok',
        title: dryRun ? 'Dry run complete' : 'Push finished',
        summary,
      })
      if (!dryRun) setConfirmBroadcast(false)
      await reload()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Push send failed'
      setError(msg)
      setNotice({ tone: 'error', title: 'Push failed', summary: msg })
    } finally {
      setBusy(false)
    }
  }

  const onLocalPreview = async () => {
    setError('')
    if (!pushSupported()) {
      setError('This browser does not support notifications.')
      return
    }
    if (pushPermission() !== 'granted') {
      const enabled = await enablePushNotifications()
      if (!enabled.ok) {
        setError(enabled.message)
        return
      }
    }
    try {
      const reg = await navigator.serviceWorker.ready
      await reg.showNotification(payload.title.trim() || 'JyutTranslate', {
        body: payload.body || '',
        icon: payload.icon || '/pwa-192.png',
        badge: payload.badge || '/pwa-192.png',
        // image is supported in Chromium
        image: payload.image || undefined,
        tag: payload.tag || 'admin-preview',
        renotify: Boolean(payload.renotify) && Boolean((payload.tag || '').trim() || 'admin-preview'),
        requireInteraction: payload.requireInteraction,
        silent: payload.silent,
        lang: payload.lang || undefined,
        dir: payload.dir || 'auto',
        vibrate: payload.silent ? undefined : payload.vibrate,
        actions: (payload.actions || [])
          .filter((a) => a.action && a.title)
          .slice(0, 2)
          .map((a) => ({ action: a.action, title: a.title, icon: a.icon || undefined })),
        data: { url: payload.url || '#/app' },
      } as NotificationOptions)
      setMessage('Local preview notification shown on this device.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Local preview failed')
    }
  }

  const onEnableThisDevice = async () => {
    setBusy(true)
    setError('')
    try {
      const result = await enablePushNotifications()
      if (!result.ok) setError(result.message)
      else {
        setMessage('This device is subscribed for push.')
        await reload()
      }
    } finally {
      setBusy(false)
    }
  }

  const togglePlan = (plan: Plan) => {
    setPlans((prev) => (prev.includes(plan) ? prev.filter((p) => p !== plan) : [...prev, plan]))
  }

  return (
    <div className="push-hub">
      <div className="push-hub-top">
        <div>
          <h2 className="push-hub-title">PWA notifications</h2>
          <p className="push-hub-sub">
            Compose Web Push alerts for installed PWAs — full payload controls, targeting, dry-run,
            and send history. Users opt in from Account hub. iPhone only receives push from the Home
            Screen app (iOS 16.4+), not from a Safari tab — each device must enable Notifications
            separately.
          </p>
        </div>
        <div className="push-hub-top-actions">
          <button type="button" className="admin-btn admin-btn--secondary" disabled={busy} onClick={() => void reload()}>
            Reload
          </button>
          <button type="button" className="admin-btn" disabled={busy || !configured} onClick={() => void onEnableThisDevice()}>
            Enable on this device
          </button>
        </div>
      </div>

      {!configured ? (
        <p className="admin-error">
          Web Push is not configured. Set <code>VAPID_PUBLIC_KEY</code>, <code>VAPID_PRIVATE_KEY</code>, and{' '}
          <code>VAPID_SUBJECT</code> on the API (see docs/admin.md), then apply migration{' '}
          <code>024_push_notifications.sql</code>.
        </p>
      ) : null}
      {message ? <p className="push-hub-ok">{message}</p> : null}
      {error ? <p className="admin-error">{error}</p> : null}

      <section className="push-hub-stats" aria-label="Subscription stats">
        <div className="push-hub-stat">
          <strong>{stats.enabled}</strong>
          <span>Enabled</span>
        </div>
        <div className="push-hub-stat">
          <strong>{stats.signedIn}</strong>
          <span>Signed-in</span>
        </div>
        <div className="push-hub-stat">
          <strong>{stats.guests}</strong>
          <span>Guests</span>
        </div>
        <div className="push-hub-stat">
          <strong>{stats.byProvider?.apple || 0}</strong>
          <span>Apple</span>
        </div>
        <div className="push-hub-stat">
          <strong>{stats.byPlatform?.ios || 0}</strong>
          <span>iOS</span>
        </div>
        <div className="push-hub-stat">
          <strong>{stats.byPlan.family || 0}</strong>
          <span>Family</span>
        </div>
        <div className="push-hub-stat">
          <strong>{stats.byPlan.business || 0}</strong>
          <span>Business</span>
        </div>
        <div className="push-hub-stat">
          <strong>{stats.byPlan.free || 0}</strong>
          <span>Free</span>
        </div>
      </section>

      {(stats.byProvider?.apple || 0) === 0 ? (
        <p className="admin-muted">
          No Apple (web.push.apple.com) subscriptions yet. If your iPhone never shows a banner after a
          successful send, open the Home Screen app → Account → enable Notifications, then send to
          Self and confirm the Apple count above is at least 1.
        </p>
      ) : null}

      <div className="push-hub-workspace">
        <section className="push-hub-editor" aria-label="Compose notification">
          <div className="push-hub-editor-head">
            <h3>Compose</h3>
            <div className="push-hub-presets">
              {PRESETS.map((p) => (
                <button key={p.id} type="button" className="admin-btn admin-btn--secondary" onClick={() => applyPreset(p.id)}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <label className="push-hub-field">
            <span>Title</span>
            <input type="text" value={payload.title} onChange={(e) => patchPayload('title', e.target.value)} maxLength={120} />
          </label>
          <label className="push-hub-field">
            <span>Body</span>
            <textarea rows={4} value={payload.body || ''} onChange={(e) => patchPayload('body', e.target.value)} maxLength={2000} />
          </label>

          <div className="push-hub-grid-2">
            <label className="push-hub-field">
              <span>Deep link URL</span>
              <input
                type="text"
                value={payload.url || ''}
                onChange={(e) => patchPayload('url', e.target.value)}
                placeholder="#/app"
              />
            </label>
            <label className="push-hub-field">
              <span>Tag (collapse / replace)</span>
              <input type="text" value={payload.tag || ''} onChange={(e) => patchPayload('tag', e.target.value)} />
            </label>
          </div>

          <div className="push-hub-grid-3">
            <label className="push-hub-field">
              <span>Icon URL</span>
              <input type="text" value={payload.icon || ''} onChange={(e) => patchPayload('icon', e.target.value)} />
            </label>
            <label className="push-hub-field">
              <span>Badge URL</span>
              <input type="text" value={payload.badge || ''} onChange={(e) => patchPayload('badge', e.target.value)} />
            </label>
            <label className="push-hub-field">
              <span>Image URL</span>
              <input type="text" value={payload.image || ''} onChange={(e) => patchPayload('image', e.target.value)} />
            </label>
          </div>

          <div className="push-hub-flags">
            <label className="admin-check">
              <input
                type="checkbox"
                checked={Boolean(payload.renotify)}
                onChange={(e) => patchPayload('renotify', e.target.checked)}
              />
              Renotify
            </label>
            <label className="admin-check">
              <input
                type="checkbox"
                checked={Boolean(payload.requireInteraction)}
                onChange={(e) => patchPayload('requireInteraction', e.target.checked)}
              />
              Require interaction
            </label>
            <label className="admin-check">
              <input
                type="checkbox"
                checked={Boolean(payload.silent)}
                onChange={(e) => patchPayload('silent', e.target.checked)}
              />
              Silent
            </label>
          </div>

          <div className="push-hub-grid-3">
            <label className="push-hub-field">
              <span>Lang</span>
              <input type="text" value={payload.lang || ''} onChange={(e) => patchPayload('lang', e.target.value)} placeholder="en" />
            </label>
            <label className="push-hub-field">
              <span>Dir</span>
              <select value={payload.dir || 'auto'} onChange={(e) => patchPayload('dir', e.target.value as PushPayloadInput['dir'])}>
                <option value="auto">auto</option>
                <option value="ltr">ltr</option>
                <option value="rtl">rtl</option>
              </select>
            </label>
            <label className="push-hub-field">
              <span>Vibrate pattern</span>
              <input
                type="text"
                value={(payload.vibrate || []).join(',')}
                onChange={(e) => {
                  const nums = e.target.value
                    .split(/[,\s]+/)
                    .map((n) => Number(n))
                    .filter((n) => Number.isFinite(n) && n >= 0)
                    .slice(0, 16)
                  patchPayload('vibrate', nums)
                }}
                placeholder="80,40,80"
              />
            </label>
          </div>

          <div className="push-hub-actions-edit">
            <h4>Actions (max 2)</h4>
            {[0, 1].map((i) => {
              const action = payload.actions?.[i] || { action: '', title: '', icon: '' }
              return (
                <div key={i} className="push-hub-grid-3">
                  <label className="push-hub-field">
                    <span>Action id</span>
                    <input
                      type="text"
                      value={action.action}
                      onChange={(e) => {
                        const next = [...(payload.actions || [{ action: '', title: '' }, { action: '', title: '' }])]
                        while (next.length < 2) next.push({ action: '', title: '' })
                        next[i] = { ...next[i], action: e.target.value }
                        patchPayload('actions', next)
                      }}
                    />
                  </label>
                  <label className="push-hub-field">
                    <span>Label</span>
                    <input
                      type="text"
                      value={action.title}
                      onChange={(e) => {
                        const next = [...(payload.actions || [{ action: '', title: '' }, { action: '', title: '' }])]
                        while (next.length < 2) next.push({ action: '', title: '' })
                        next[i] = { ...next[i], title: e.target.value }
                        patchPayload('actions', next)
                      }}
                    />
                  </label>
                  <label className="push-hub-field">
                    <span>{i === 0 ? 'Uses deep link' : 'Action URL'}</span>
                    {i === 0 ? (
                      <input type="text" value={payload.url || '#/app'} disabled />
                    ) : (
                      <input type="text" value={action2Url} onChange={(e) => setAction2Url(e.target.value)} />
                    )}
                  </label>
                </div>
              )
            })}
          </div>

          <div className="push-hub-delivery">
            <h4>Delivery</h4>
            <div className="push-hub-grid-3">
              <label className="push-hub-field">
                <span>TTL (seconds)</span>
                <input
                  type="number"
                  min={0}
                  max={2419200}
                  value={ttl}
                  onChange={(e) => setTtl(Number(e.target.value) || 0)}
                />
              </label>
              <label className="push-hub-field">
                <span>Urgency</span>
                <select value={urgency} onChange={(e) => setUrgency(e.target.value as Urgency)}>
                  <option value="very-low">very-low</option>
                  <option value="low">low</option>
                  <option value="normal">normal</option>
                  <option value="high">high</option>
                </select>
              </label>
              <label className="push-hub-field">
                <span>Topic</span>
                <input type="text" value={topic} onChange={(e) => setTopic(e.target.value)} maxLength={32} placeholder="optional" />
              </label>
            </div>
          </div>

          <div className="push-hub-target">
            <h4>Audience</h4>
            <label className="push-hub-field">
              <span>Target</span>
              <select value={targetMode} onChange={(e) => setTargetMode(e.target.value as PushTargetMode)}>
                <option value="self">This admin only (test)</option>
                <option value="admins">Admins</option>
                <option value="signed_in">All signed-in subscribers</option>
                <option value="guests">Guest subscribers</option>
                <option value="plans">By plan</option>
                <option value="user_ids">Specific user IDs</option>
                <option value="emails">Specific emails</option>
                <option value="all">Everyone (all devices)</option>
              </select>
            </label>

            {targetMode === 'plans' ? (
              <div className="push-hub-flags">
                {(['free', 'family', 'business'] as Plan[]).map((p) => (
                  <label key={p} className="admin-check">
                    <input type="checkbox" checked={plans.includes(p)} onChange={() => togglePlan(p)} />
                    {p}
                  </label>
                ))}
              </div>
            ) : null}

            {targetMode === 'user_ids' ? (
              <label className="push-hub-field">
                <span>User IDs (comma / space separated UUIDs)</span>
                <textarea rows={3} value={userIdsText} onChange={(e) => setUserIdsText(e.target.value)} />
              </label>
            ) : null}

            {targetMode === 'emails' ? (
              <label className="push-hub-field">
                <span>Emails</span>
                <textarea rows={3} value={emailsText} onChange={(e) => setEmailsText(e.target.value)} />
              </label>
            ) : null}

            {targetMode === 'all' ? (
              <label className="admin-check">
                <input
                  type="checkbox"
                  checked={confirmBroadcast}
                  onChange={(e) => setConfirmBroadcast(e.target.checked)}
                />
                I understand this notifies every enabled device
              </label>
            ) : null}
          </div>

          <div className="push-hub-send-row">
            <button type="button" className="admin-btn admin-btn--secondary" disabled={busy} onClick={() => void onLocalPreview()}>
              Preview on this device
            </button>
            <button type="button" className="admin-btn admin-btn--secondary" disabled={busy || !configured} onClick={() => void runSend(true)}>
              Dry run
            </button>
            <button type="button" className="admin-btn" disabled={busy || !configured} onClick={() => void runSend(false)}>
              {busy ? 'Sending…' : 'Send push'}
            </button>
          </div>

          {notice ? (
            <div className={`push-hub-notice push-hub-notice--${notice.tone}`}>
              <strong>{notice.title}</strong>
              <p>{notice.summary}</p>
            </div>
          ) : null}
        </section>

        <section className="push-hub-side" aria-label="Preview and history">
          <div className="push-hub-phone" aria-hidden>
            <div className="push-hub-phone-notch" />
            <div className="push-hub-toast">
              <img src={payload.icon || '/pwa-192.png'} alt="" width={28} height={28} />
              <div>
                <strong>{payload.title || 'Notification title'}</strong>
                <p>{payload.body || 'Body preview appears here.'}</p>
              </div>
            </div>
            {payload.image ? <img className="push-hub-toast-image" src={payload.image} alt="" /> : null}
          </div>

          <div className="push-hub-json">
            <h3>Payload JSON</h3>
            <pre>{previewJson}</pre>
          </div>

          <div className="push-hub-history">
            <h3>Recent sends</h3>
            <ul>
              {sends.map((s) => (
                <li key={s.id}>
                  <div className="push-hub-history-row">
                    <strong>{s.title}</strong>
                    <span>{s.dry_run ? 'dry-run' : s.status}</span>
                  </div>
                  <p>
                    {new Date(s.created_at).toLocaleString()} · {s.target_mode} · {s.sent_count}/{s.recipient_count}
                    {s.failed_count ? ` · ${s.failed_count} failed` : ''}
                  </p>
                </li>
              ))}
              {!sends.length ? <li className="admin-muted">No sends yet.</li> : null}
            </ul>
          </div>
        </section>
      </div>
    </div>
  )
}
