import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { BiText } from './BiText'
import { GlowRotateButton } from './GlowRotateButton'
import { RoleBadge } from './RoleBadge'
import { UsageMeters } from './UsageMeters'
import './RoleBadge.css'
import { IosHomescreenGuideDialog, IosHomescreenHubButton } from './IosHomescreenGuide'
import { useYueStore } from '../lib/store'
import { getSession, openAuthScreen, signOut } from '../lib/auth'
import { openBillingPortal, openUpgrade, type BillingError } from '../lib/billing'
import { openBugReportOrAuth } from '../lib/bugReport'
import {
  readBadgeUsageMetric,
  writeBadgeUsageMetric,
  type BadgeUsageMetric,
} from '../lib/badgeUsagePref'
import {
  saveTtsVoicePrefs,
  saveUsername,
  sendHouseholdInvite,
  revokeHouseholdInvite,
  removeHouseholdMember,
} from '../lib/api'
import {
  EN_VOICES,
  PREVIEW_EN,
  PREVIEW_YUE,
  YUE_VOICES,
  readLocalEnVoice,
  readLocalYueVoice,
  resolveEnVoice,
  resolveYueVoice,
  writeLocalEnVoice,
  writeLocalYueVoice,
  type EnVoiceId,
  type YueVoiceId,
} from '../lib/ttsVoices'
import { speakText, unlockTtsPlayback } from '../lib/tts'
import { openPricing } from '../lib/siteLinks'
import { navigate } from '../lib/useHashRoute'
import { biPlain, ui, type Bi } from '../lib/uiCopy'
import { inkEase } from '../lib/motion'
import type { Entitlement } from '../lib/types'

const HUB_SHEET_MQ = '(max-width: 959px)'

function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds))
  if (s >= 3600) return `${Math.floor(s / 3600)}h`
  if (s >= 60) return `${Math.ceil(s / 60)}m`
  return `${s}s`
}

function planLabel(plan: string): Bi {
  if (plan === 'family') return ui.planFamily
  if (plan === 'max') return ui.planMax
  if (plan === 'free') return ui.planFree
  return ui.planGuest
}

function formatChars(n: number): string {
  if (n >= 1000) {
    const k = n / 1000
    return `${k >= 10 ? Math.round(k) : Math.round(k * 10) / 10}k`
  }
  return String(Math.max(0, Math.round(n)))
}

function voiceCopy(entitlement: Entitlement): Bi {
  const unlimited = Boolean(
    entitlement.ttsUnlimited || entitlement.plan === 'family' || entitlement.plan === 'max',
  )
  if (unlimited) return ui.charsUsedUnlimited(formatChars(entitlement.usage.ttsChars))
  return ui.charsLeft(formatChars(entitlement.remaining.ttsChars))
}

function liveCopy(entitlement: Entitlement): Bi {
  const used = entitlement.usage.liveSeconds ?? 0
  const left = Math.max(0, entitlement.remaining.liveSeconds ?? 0)
  return ui.liveUsedRemaining(formatDuration(used), formatDuration(left))
}

function cameraCopy(entitlement: Entitlement): Bi {
  const unlimited = Boolean(entitlement.cameraUnlimited)
  const used = entitlement.usage.cameraSeconds ?? 0
  if (unlimited) return ui.camMinutesUsedUnlimited(formatDuration(used))
  const left = Math.max(0, entitlement.remaining.cameraSeconds ?? 0)
  return ui.camMinutesLeft(formatDuration(left))
}

function displayNameFromSession(meta: Record<string, unknown> | undefined) {
  // OAuth names are only a soft fallback for signed-out/guest title; logged-in
  // Account Hub title uses the custom username once set.
  const full =
    (typeof meta?.full_name === 'string' && meta.full_name.trim()) ||
    (typeof meta?.name === 'string' && meta.name.trim()) ||
    ''
  return full
}

function HubSep() {
  return <div className="account-hub-sep" role="separator" aria-hidden="true" />
}

function canShowMetric(metric: BadgeUsageMetric, entitlement: Entitlement, showVoiceQuota: boolean): boolean {
  if (metric === 'live') return Boolean(entitlement.allowed.live) || entitlement.loggedIn
  if (metric === 'voice') return showVoiceQuota
  if (metric === 'camera') return entitlement.loggedIn
  return false
}

function resolveBadgeMetric(
  preferred: BadgeUsageMetric,
  entitlement: Entitlement,
  showVoiceQuota: boolean,
): BadgeUsageMetric | null {
  if (canShowMetric(preferred, entitlement, showVoiceQuota)) return preferred
  const order: BadgeUsageMetric[] = ['live', 'voice', 'camera']
  return order.find((m) => canShowMetric(m, entitlement, showVoiceQuota)) ?? null
}

function badgeCopyFor(
  metric: BadgeUsageMetric,
  entitlement: Entitlement,
): Bi {
  if (metric === 'voice') return voiceCopy(entitlement)
  if (metric === 'camera') return cameraCopy(entitlement)
  return liveCopy(entitlement)
}

/** Plan indicator that expands into an account hub (plan, usage, upgrade, sign out). */
export function PlanChip() {
  const entitlement = useYueStore((s) => s.entitlement)
  const loadBootstrap = useYueStore((s) => s.loadBootstrap)
  const [open, setOpen] = useState(false)
  const [homescreenOpen, setHomescreenOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [oauthName, setOauthName] = useState('')
  const [username, setUsername] = useState('')
  const [usernameDraft, setUsernameDraft] = useState('')
  const [usernameEditing, setUsernameEditing] = useState(false)
  const [usernameBusy, setUsernameBusy] = useState(false)
  const [usernameError, setUsernameError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [hubPos, setHubPos] = useState<{ top: number; right: number } | null>(null)
  const [badgeMetric, setBadgeMetric] = useState<BadgeUsageMetric>(() => readBadgeUsageMetric())
  const [yueVoice, setYueVoice] = useState<YueVoiceId>(() => readLocalYueVoice())
  const [enVoice, setEnVoice] = useState<EnVoiceId>(() => readLocalEnVoice())
  const [voiceBusy, setVoiceBusy] = useState(false)
  const [previewBusy, setPreviewBusy] = useState<'yue' | 'en' | null>(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteBusy, setInviteBusy] = useState(false)
  const [inviteSentTo, setInviteSentTo] = useState<string | null>(null)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const hubRef = useRef<HTMLDivElement>(null)
  const panelId = useId()
  const titleId = useId()
  const badgePrefId = useId()
  const voicePrefId = useId()

  useEffect(() => {
    const prefs = entitlement?.prefs
    if (prefs?.ttsVoiceYue) {
      const v = resolveYueVoice(prefs.ttsVoiceYue)
      setYueVoice(v)
      writeLocalYueVoice(v)
    }
    if (prefs?.ttsVoiceEn) {
      const v = resolveEnVoice(prefs.ttsVoiceEn)
      setEnVoice(v)
      writeLocalEnVoice(v)
    }
    if (prefs?.username) {
      setUsername(prefs.username)
      setUsernameDraft(prefs.username)
    } else if (entitlement?.loggedIn) {
      setUsername('')
    }
  }, [
    entitlement?.prefs?.ttsVoiceYue,
    entitlement?.prefs?.ttsVoiceEn,
    entitlement?.prefs?.username,
    entitlement?.loggedIn,
  ])

  useEffect(() => {
    let cancelled = false
    void getSession().then((session) => {
      if (cancelled) return
      const nextEmail = session?.user?.email?.trim() || ''
      const meta = session?.user?.user_metadata as Record<string, unknown> | undefined
      setEmail(nextEmail)
      setOauthName(displayNameFromSession(meta))
    })
    return () => {
      cancelled = true
    }
  }, [entitlement?.loggedIn, entitlement?.plan])

  useLayoutEffect(() => {
    if (!open) return
    const layout = () => {
      if (window.matchMedia(HUB_SHEET_MQ).matches) {
        setHubPos(null)
        return
      }
      const el = triggerRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const right = Math.max(12, window.innerWidth - r.right)
      let top = r.bottom + 10
      const hub = hubRef.current
      if (hub) {
        const hh = hub.getBoundingClientRect().height
        const maxTop = window.innerHeight - hh - 12
        if (Number.isFinite(hh) && hh > 0 && maxTop < top) {
          top = Math.max(12, maxTop)
        }
      }
      setHubPos({ top, right })
    }
    layout()
    const raf = window.requestAnimationFrame(layout)
    const hub = hubRef.current
    let ro: ResizeObserver | null = null
    if (hub && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => layout())
      ro.observe(hub)
    }
    window.addEventListener('resize', layout)
    window.addEventListener('scroll', layout, true)
    return () => {
      window.cancelAnimationFrame(raf)
      ro?.disconnect()
      window.removeEventListener('resize', layout)
      window.removeEventListener('scroll', layout, true)
    }
  }, [open, badgeMetric, entitlement?.usage?.aiVisionCount, enVoice, yueVoice])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (document.querySelector('.usage-detail-layer')) return
      setOpen(false)
    }
    const onPointer = (e: PointerEvent) => {
      const target = e.target
      if (!(target instanceof Node)) return
      if (rootRef.current?.contains(target)) return
      if (hubRef.current?.contains(target)) return
      if (target instanceof Element && target.closest('.usage-detail-layer')) return
      setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onPointer)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onPointer)
    }
  }, [open])

  if (!entitlement) {
    return (
      <span className="plan-chip muted">
        <BiText copy={ui.connecting} size="sm" />
      </span>
    )
  }

  const plan = entitlement.plan
  const showSignIn = !entitlement.loggedIn && entitlement.requireLogin
  const paid = plan === 'family' || plan === 'max'
  const ttsUnlimited = Boolean(entitlement.ttsUnlimited || paid)
  const showVoiceQuota = entitlement.loggedIn && (ttsUnlimited || entitlement.limits.tts_chars > 0)

  if (showSignIn) {
    return (
      <GlowRotateButton className="plan-sign-in" onClick={() => openAuthScreen()}>
        <BiText copy={ui.signIn} size="sm" hideJp />
      </GlowRotateButton>
    )
  }

  const onUpgrade = () => {
    setOpen(false)
    void openUpgrade('family', 'month').catch((err: unknown) => {
      const message = err instanceof Error ? err.message : 'Upgrade failed'
      useYueStore.setState({ error: message })
      void loadBootstrap()
    })
  }

  const onBilling = () => {
    setOpen(false)
    void openBillingPortal().catch((err: unknown) => {
      const billingErr = err as BillingError
      const noCustomer =
        billingErr?.code === 'no_stripe_customer' ||
        billingErr?.status === 400 ||
        /no stripe billing account|upgrade first/i.test(billingErr?.message || '')
      if (noCustomer) {
        useYueStore.setState({
          error: billingErr.message || 'No Stripe billing account yet. Open Pricing to subscribe.',
        })
        openPricing()
        return
      }
      useYueStore.setState({
        error: billingErr?.message || 'Could not open billing portal',
      })
      void loadBootstrap()
    })
  }

  const onSignOut = async () => {
    setBusy(true)
    try {
      await signOut()
      setOpen(false)
      setEmail('')
      setOauthName('')
      setUsername('')
      setUsernameDraft('')
      setUsernameEditing(false)
      setUsernameError(null)
      await loadBootstrap()
    } finally {
      setBusy(false)
    }
  }

  const onBadgeMetricChange = (metric: BadgeUsageMetric) => {
    setBadgeMetric(metric)
    writeBadgeUsageMetric(metric)
  }

  const persistVoices = async (next: { yue?: YueVoiceId; en?: EnVoiceId }) => {
    const yue = next.yue ?? yueVoice
    const en = next.en ?? enVoice
    writeLocalYueVoice(yue)
    writeLocalEnVoice(en)
    setYueVoice(yue)
    setEnVoice(en)
    if (!entitlement.loggedIn) return
    setVoiceBusy(true)
    try {
      const data = await saveTtsVoicePrefs({ ttsVoiceYue: yue, ttsVoiceEn: en })
      if (data.entitlement) {
        useYueStore.setState({ entitlement: data.entitlement })
      } else {
        useYueStore.setState({
          entitlement: {
            ...entitlement,
            prefs: data.prefs,
          },
        })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not sync voice preferences'
      useYueStore.setState({ error: message })
    } finally {
      setVoiceBusy(false)
    }
  }

  const onPreview = async (kind: 'yue' | 'en') => {
    unlockTtsPlayback()
    setPreviewBusy(kind)
    try {
      if (kind === 'yue') await speakText(PREVIEW_YUE, 'yue', yueVoice)
      else await speakText(PREVIEW_EN, 'en', enVoice)
    } finally {
      setPreviewBusy(null)
    }
  }

  const hubTitle = entitlement.loggedIn
    ? username || biPlain(ui.accountUsernamePlaceholder)
    : oauthName || email || biPlain(planLabel(plan))

  const startUsernameEdit = () => {
    if (!entitlement.loggedIn) return
    setUsernameError(null)
    setUsernameDraft(username)
    setUsernameEditing(true)
  }

  const cancelUsernameEdit = () => {
    setUsernameEditing(false)
    setUsernameDraft(username)
    setUsernameError(null)
  }

  const persistUsername = async () => {
    if (!entitlement.loggedIn) return
    const next = usernameDraft.trim()
    setUsernameBusy(true)
    setUsernameError(null)
    try {
      const data = await saveUsername(next)
      const saved = data.prefs?.username || next
      setUsername(saved)
      setUsernameDraft(saved)
      setUsernameEditing(false)
      if (data.entitlement) {
        useYueStore.setState({ entitlement: data.entitlement })
      } else {
        useYueStore.setState({
          entitlement: {
            ...entitlement,
            prefs: {
              ttsVoiceYue: entitlement.prefs?.ttsVoiceYue || yueVoice,
              ttsVoiceEn: entitlement.prefs?.ttsVoiceEn || enVoice,
              ...data.prefs,
            },
          },
        })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not save username'
      setUsernameError(message)
    } finally {
      setUsernameBusy(false)
    }
  }

  const activeBadgeMetric = resolveBadgeMetric(badgeMetric, entitlement, showVoiceQuota)
  const badgeOptions: Array<{ id: BadgeUsageMetric; copy: Bi; available: boolean }> = [
    { id: 'live', copy: ui.accountBadgeLive, available: canShowMetric('live', entitlement, showVoiceQuota) },
    { id: 'voice', copy: ui.accountBadgeVoice, available: canShowMetric('voice', entitlement, showVoiceQuota) },
    {
      id: 'camera',
      copy: ui.accountBadgeCamera,
      available: canShowMetric('camera', entitlement, showVoiceQuota),
    },
  ]

  const panel = (
    <div className="account-hub" id={panelId} role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <header className="account-hub-header">
        <div className="account-hub-titles">
          <p className="account-hub-kicker">
            <BiText copy={ui.accountHub} size="sm" />
          </p>
          {entitlement.loggedIn && usernameEditing ? (
            <div className="account-hub-username-edit">
              <label className="account-hub-username-field" htmlFor={`${panelId}-username`}>
                <span className="account-hub-label">
                  <BiText copy={ui.accountUsername} size="sm" />
                </span>
                <input
                  id={`${panelId}-username`}
                  className="account-hub-username-input"
                  value={usernameDraft}
                  onChange={(e) => setUsernameDraft(e.target.value)}
                  placeholder={biPlain(ui.accountUsernamePlaceholder)}
                  maxLength={24}
                  autoComplete="username"
                  autoCapitalize="off"
                  spellCheck={false}
                  disabled={usernameBusy}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      void persistUsername()
                    } else if (e.key === 'Escape') {
                      e.preventDefault()
                      cancelUsernameEdit()
                    }
                  }}
                />
              </label>
              <p className="account-hub-hint">
                <BiText copy={ui.accountUsernameHint} size="sm" />
              </p>
              {usernameError ? (
                <p className="account-hub-username-error" role="alert">
                  {usernameError}
                </p>
              ) : null}
              <div className="account-hub-username-actions">
                <button
                  type="button"
                  className="account-hub-btn account-hub-btn--primary account-hub-btn--compact"
                  disabled={usernameBusy || !usernameDraft.trim()}
                  onClick={() => void persistUsername()}
                >
                  <BiText copy={ui.accountUsernameSave} size="sm" hideJp />
                </button>
                <button
                  type="button"
                  className="account-hub-btn account-hub-btn--compact"
                  disabled={usernameBusy}
                  onClick={cancelUsernameEdit}
                >
                  <BiText copy={ui.accountUsernameCancel} size="sm" hideJp />
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="account-hub-title-row">
                {entitlement.loggedIn ? (
                  <button
                    type="button"
                    id={titleId}
                    className={`account-hub-title account-hub-title--btn${!username ? ' is-placeholder' : ''}`}
                    onClick={startUsernameEdit}
                    aria-label={biPlain(ui.accountUsernameEdit)}
                  >
                    {hubTitle}
                  </button>
                ) : (
                  <h2 id={titleId} className="account-hub-title">
                    {hubTitle}
                  </h2>
                )}
                {entitlement.role ? (
                  <div className="account-hub-header-role">
                    <RoleBadge role={entitlement.role} />
                  </div>
                ) : null}
              </div>
              {email ? <p className="account-hub-email">{email}</p> : null}
            </>
          )}
        </div>
        <button
          type="button"
          className="account-hub-close"
          aria-label={biPlain(ui.accountClose)}
          onClick={() => setOpen(false)}
        >
          ×
        </button>
      </header>

      <div className="account-hub-body">
        <div className="account-hub-meta-grid">
          <section className="account-hub-section account-hub-meta-col" aria-label={biPlain(ui.accountPlan)}>
            <p className="account-hub-label">
              <BiText copy={ui.accountPlan} size="sm" />
            </p>
            <span className={`plan-chip plan-${plan} account-hub-plan-pill`}>
              <BiText copy={planLabel(plan)} size="sm" hideJp />
            </span>
          </section>
          <section className="account-hub-section account-hub-meta-col" aria-label={biPlain(ui.accountRole)}>
            <p className="account-hub-label">
              <BiText copy={ui.accountRole} size="sm" />
            </p>
            {entitlement.role ? (
              <div className="account-hub-role-slot">
                <RoleBadge role={entitlement.role} />
              </div>
            ) : (
              <span className="account-hub-role-empty">—</span>
            )}
          </section>
        </div>

        <HubSep />

        <section className="account-hub-section" aria-label={biPlain(ui.accountUsage)}>
          <p className="account-hub-label">
            <BiText
              copy={entitlement.household?.pooled ? ui.accountUsagePooled : ui.accountUsage}
              size="sm"
            />
          </p>
          {entitlement.household?.pooled ? (
            <p className="account-hub-hint">
              <BiText copy={ui.accountHouseholdPooledHint} size="sm" />
            </p>
          ) : null}
          <UsageMeters entitlement={entitlement} />
        </section>

        {entitlement.loggedIn &&
        (entitlement.plan === 'family' ||
          entitlement.plan === 'max' ||
          entitlement.household) ? (
          <section className="account-hub-section" aria-label={biPlain(ui.accountHousehold)}>
            <p className="account-hub-label">
              <BiText copy={ui.accountHousehold} size="sm" />
            </p>
            <p className="account-hub-seats">
              <BiText
                copy={ui.accountSeatsUsed(
                  String(entitlement.household?.seatUsed ?? 1),
                  String(
                    entitlement.household?.seatLimit ??
                      (entitlement.plan === 'max' ? 10 : 4),
                  ),
                )}
                size="sm"
              />
            </p>

            {inviteSentTo ? (
              <div className="account-hub-invite-sent" role="status">
                <span className="account-hub-invite-sent-badge">
                  <BiText copy={ui.accountInviteSent} size="sm" />
                </span>
                <p className="account-hub-invite-sent-msg">
                  <BiText copy={ui.accountInviteSentTo(inviteSentTo)} size="sm" />
                </p>
              </div>
            ) : null}

            {(!entitlement.household || entitlement.household.role === 'owner') ? (
              <form
                className="account-hub-invite-form"
                onSubmit={(e) => {
                  e.preventDefault()
                  const next = inviteEmail.trim()
                  if (!next || inviteBusy) return
                  setInviteBusy(true)
                  setInviteError(null)
                  void sendHouseholdInvite(next)
                    .then(async (res) => {
                      setInviteSentTo(res.invite?.email || next)
                      setInviteEmail('')
                      await loadBootstrap()
                    })
                    .catch((err: unknown) => {
                      setInviteError(
                        err instanceof Error ? err.message : biPlain(ui.accountInviteError),
                      )
                    })
                    .finally(() => setInviteBusy(false))
                }}
              >
                <label className="account-hub-invite-field">
                  <span className="account-hub-voice-lang">
                    <BiText copy={ui.accountInviteEmail} size="sm" />
                  </span>
                  <input
                    type="email"
                    className="account-hub-select account-hub-invite-input"
                    value={inviteEmail}
                    onChange={(e) => {
                      setInviteEmail(e.target.value)
                      setInviteSentTo(null)
                    }}
                    placeholder={biPlain(ui.accountInvitePlaceholder)}
                    autoComplete="email"
                    required
                  />
                </label>
                <button
                  type="submit"
                  className="account-hub-btn account-hub-btn--primary account-hub-invite-btn"
                  disabled={inviteBusy || !inviteEmail.trim()}
                >
                  <BiText copy={ui.accountInviteSend} size="sm" />
                </button>
              </form>
            ) : null}

            {inviteError ? <p className="account-hub-invite-error">{inviteError}</p> : null}

            {entitlement.household ? (
              <ul className="account-hub-member-list">
                {entitlement.household.members.map((m) => (
                  <li key={m.userId} className="account-hub-member-row">
                    <span className="account-hub-member-email">
                      {m.email || m.userId.slice(0, 8)}
                      {m.role === 'owner' ? (
                        <span className="account-hub-member-tag">
                          {' '}
                          · <BiText copy={ui.accountMemberOwner} size="sm" />
                        </span>
                      ) : null}
                    </span>
                    {entitlement.household?.role === 'owner' && m.role === 'member' ? (
                      <button
                        type="button"
                        className="account-hub-member-action"
                        onClick={() => {
                          void removeHouseholdMember(m.userId)
                            .then(async () => {
                              await loadBootstrap()
                            })
                            .catch(() => undefined)
                        }}
                      >
                        <BiText copy={ui.accountMemberRemove} size="sm" />
                      </button>
                    ) : null}
                  </li>
                ))}
                {entitlement.household.pendingInvites.map((inv) => (
                  <li key={inv.id} className="account-hub-member-row is-pending">
                    <span className="account-hub-member-email">
                      {inv.email}
                      <span className="account-hub-member-tag">
                        {' '}
                        · <BiText copy={ui.accountInvitePending} size="sm" />
                      </span>
                    </span>
                    {entitlement.household?.role === 'owner' ? (
                      <button
                        type="button"
                        className="account-hub-member-action"
                        onClick={() => {
                          void revokeHouseholdInvite(inv.id)
                            .then(async () => {
                              await loadBootstrap()
                            })
                            .catch(() => undefined)
                        }}
                      >
                        <BiText copy={ui.accountInviteRevoke} size="sm" />
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        ) : null}

        {badgeOptions.some((o) => o.available) ? (
          <>
            <HubSep />
            <section className="account-hub-section" aria-labelledby={badgePrefId}>
            <p className="account-hub-label" id={badgePrefId}>
              <BiText copy={ui.accountBadgeDisplay} size="sm" />
            </p>
            <p className="account-hub-hint">
              <BiText copy={ui.accountBadgeHint} size="sm" />
            </p>
            <div className="account-hub-seg" role="radiogroup" aria-labelledby={badgePrefId}>
              {badgeOptions.map((opt) =>
                opt.available ? (
                  <label
                    key={opt.id}
                    className={`account-hub-seg-opt${badgeMetric === opt.id ? ' is-on' : ''}`}
                  >
                    <input
                      type="radio"
                      name="badge-usage-metric"
                      checked={badgeMetric === opt.id}
                      onChange={() => onBadgeMetricChange(opt.id)}
                    />
                    <BiText copy={opt.copy} size="sm" hideJp />
                  </label>
                ) : null,
              )}
            </div>
          </section>
          </>
        ) : null}

        <HubSep />

        <section className="account-hub-section" aria-labelledby={voicePrefId}>
          <p className="account-hub-label" id={voicePrefId}>
            <BiText copy={ui.accountTtsVoices} size="sm" />
          </p>
          <div className="account-hub-voice-row">
            <label className="account-hub-voice-field">
              <span className="account-hub-voice-lang">
                <BiText copy={ui.accountTtsYue} size="sm" hideJp />
              </span>
              <select
                className="account-hub-select"
                value={yueVoice}
                disabled={voiceBusy}
                onChange={(e) => void persistVoices({ yue: resolveYueVoice(e.target.value) })}
                aria-label={biPlain(ui.accountTtsYue)}
              >
                {YUE_VOICES.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.labelEn} · {v.labelZh}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="account-hub-voice-preview"
              disabled={previewBusy !== null || !entitlement.allowed.tts}
              onClick={() => void onPreview('yue')}
            >
              <BiText copy={ui.accountTtsPreview} size="sm" hideJp />
            </button>
          </div>
          <div className="account-hub-voice-row">
            <label className="account-hub-voice-field">
              <span className="account-hub-voice-lang">
                <BiText copy={ui.accountTtsEn} size="sm" hideJp />
              </span>
              <select
                className="account-hub-select"
                value={enVoice}
                disabled={voiceBusy}
                onChange={(e) => void persistVoices({ en: resolveEnVoice(e.target.value) })}
                aria-label={biPlain(ui.accountTtsEn)}
              >
                {EN_VOICES.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.labelEn} · {v.labelZh}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="account-hub-voice-preview"
              disabled={previewBusy !== null || !entitlement.allowed.tts}
              onClick={() => void onPreview('en')}
            >
              <BiText copy={ui.accountTtsPreview} size="sm" hideJp />
            </button>
          </div>
        </section>

        <HubSep />

        <div className="account-hub-actions">
          {entitlement.isAdmin ? (
            <button
              type="button"
              className="account-hub-btn account-hub-btn--admin"
              onClick={() => {
                setOpen(false)
                navigate('admin')
              }}
            >
              <span className="account-hub-admin-shimmer" aria-hidden="true" />
              <span className="account-hub-admin-glow" aria-hidden="true" />
              <span className="account-hub-admin-label">Admin</span>
            </button>
          ) : null}
          {!paid ? (
            <button type="button" className="account-hub-btn account-hub-btn--primary" onClick={onUpgrade}>
              <BiText copy={ui.upgrade} size="sm" />
            </button>
          ) : (
            <button type="button" className="account-hub-btn account-hub-btn--primary" onClick={onBilling}>
              <BiText copy={ui.manageBilling} size="sm" />
            </button>
          )}
          <IosHomescreenHubButton
            onOpen={() => {
              setOpen(false)
              setHomescreenOpen(true)
            }}
          />
          {entitlement.loggedIn ? (
            <button
              type="button"
              className="account-hub-btn account-hub-btn--bug"
              onClick={() => {
                setOpen(false)
                void openBugReportOrAuth()
              }}
            >
              <span className="account-hub-bug-shimmer" aria-hidden="true" />
              <span className="account-hub-bug-glow" aria-hidden="true" />
              <span className="account-hub-bug-label">
                <svg
                  className="account-hub-bug-icon"
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  aria-hidden="true"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M8 9V7a4 4 0 0 1 8 0v2" />
                  <rect x="7" y="9" width="10" height="10" rx="3" />
                  <path d="M12 13v3" />
                  <path d="M5 12H3" />
                  <path d="M21 12h-2" />
                  <path d="M6.5 8.5 4.5 6.5" />
                  <path d="M17.5 8.5l2-2" />
                  <path d="M6.5 17.5 4.5 19.5" />
                  <path d="M17.5 17.5l2 2" />
                </svg>
                <BiText copy={ui.bugReportLink} size="sm" />
              </span>
            </button>
          ) : null}
          {entitlement.loggedIn ? (
            <button
              type="button"
              className="account-hub-btn account-hub-btn--ghost"
              disabled={busy}
              onClick={() => void onSignOut()}
            >
              <BiText copy={ui.signOut} size="sm" />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )

  return (
    <div className={`plan-chip-wrap${open ? ' is-open' : ''}`} ref={rootRef}>
      <button
        type="button"
        ref={triggerRef}
        className={`plan-chip-trigger${open ? ' is-open' : ''}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((v) => !v)}
      >
        {entitlement.role ? (
          <RoleBadge role={entitlement.role} />
        ) : (
          <span className={`plan-chip plan-${plan}`}>
            <BiText copy={planLabel(plan)} size="sm" hideJp />
          </span>
        )}
        {activeBadgeMetric ? (
          <span className="plan-remain">
            <BiText copy={badgeCopyFor(activeBadgeMetric, entitlement)} size="sm" hideJp />
          </span>
        ) : null}
      </button>

      {createPortal(
        <AnimatePresence>
          {open ? (
            <>
              <motion.button
                type="button"
                key="account-hub-backdrop"
                className="account-hub-backdrop"
                aria-label={biPlain(ui.accountClose)}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                onClick={() => setOpen(false)}
              />
              <motion.div
                key="account-hub-panel"
                ref={hubRef}
                className="account-hub-shell"
                style={hubPos ? { top: hubPos.top, right: hubPos.right } : undefined}
                initial={{ opacity: 0, y: -8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.98 }}
                transition={{ duration: 0.22, ease: inkEase }}
              >
                {panel}
              </motion.div>
            </>
          ) : null}
        </AnimatePresence>,
        document.body,
      )}

      <IosHomescreenGuideDialog open={homescreenOpen} onClose={() => setHomescreenOpen(false)} />
    </div>
  )
}
