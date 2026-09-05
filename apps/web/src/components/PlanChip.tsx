import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { BiText } from './BiText'
import { GlowRotateButton } from './GlowRotateButton'
import { RoleBadge } from './RoleBadge'
import { UsageMeters } from './UsageMeters'
import './RoleBadge.css'
import { IosHomescreenGuideDialog, IosHomescreenHubButton } from './IosHomescreenGuide'
import { AccountHubHousehold } from './AccountHubHousehold'
import { AccountHubVoice } from './AccountHubVoice'
import {
  badgeCopyFor,
  canShowMetric,
  displayNameFromSession,
  planLabel,
  resolveBadgeMetric,
} from './planChipHelpers'

function HubSep() {
  return <div className="account-hub-sep" role="separator" aria-hidden="true" />
}
import { useYueStore } from '../lib/store'
import { getSession, openAuthScreen, signOut } from '../lib/auth'
import { openBillingPortal, openUpgrade, type BillingError } from '../lib/billing'
import { openBugReportOrAuth } from '../lib/bugReport'
import {
  readBadgeUsageMetric,
  writeBadgeUsageMetric,
  type BadgeUsageMetric,
} from '../lib/badgeUsagePref'
import { saveTtsVoicePrefs, saveUsername } from '../lib/api'
import {
  PREVIEW_CMN,
  PREVIEW_EN,
  PREVIEW_TL,
  PREVIEW_YUE,
  readLocalCmnVoice,
  readLocalEnVoice,
  readLocalTlVoice,
  readLocalYueVoice,
  resolveCmnVoice,
  resolveEnVoice,
  resolveTlVoice,
  resolveYueVoice,
  writeLocalCmnVoice,
  writeLocalEnVoice,
  writeLocalTlVoice,
  writeLocalYueVoice,
  type CmnVoiceId,
  type EnVoiceId,
  type TlVoiceId,
  type YueVoiceId,
} from '../lib/ttsVoices'
import { speakText, unlockTtsPlayback } from '../lib/tts'
import { openPricing } from '../lib/siteLinks'
import { navigate } from '../lib/useHashRoute'
import { biPlain, ui, type Bi } from '../lib/uiCopy'
import { inkEase } from '../lib/motion'

/** Plan indicator that expands into an account hub (plan, usage, upgrade, sign out). */
export function PlanChip() {
  const entitlement = useYueStore((s) => s.entitlement)
  const loadBootstrap = useYueStore((s) => s.loadBootstrap)
  const autoSpeak = useYueStore((s) => s.autoSpeak)
  const setAutoSpeak = useYueStore((s) => s.setAutoSpeak)
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
  const [badgeMetric, setBadgeMetric] = useState<BadgeUsageMetric>(() => readBadgeUsageMetric())
  const [yueVoice, setYueVoice] = useState<YueVoiceId>(() => readLocalYueVoice())
  const [enVoice, setEnVoice] = useState<EnVoiceId>(() => readLocalEnVoice())
  const [cmnVoice, setCmnVoice] = useState<CmnVoiceId>(() => readLocalCmnVoice())
  const [tlVoice, setTlVoice] = useState<TlVoiceId>(() => readLocalTlVoice())
  const [voiceBusy, setVoiceBusy] = useState(false)
  const [previewBusy, setPreviewBusy] = useState<'yue' | 'en' | 'cmn' | 'tl' | null>(null)
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
    if (prefs?.ttsVoiceCmn) {
      const v = resolveCmnVoice(prefs.ttsVoiceCmn)
      setCmnVoice(v)
      writeLocalCmnVoice(v)
    }
    if (prefs?.ttsVoiceTl) {
      const v = resolveTlVoice(prefs.ttsVoiceTl)
      setTlVoice(v)
      writeLocalTlVoice(v)
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
    entitlement?.prefs?.ttsVoiceCmn,
    entitlement?.prefs?.ttsVoiceTl,
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
  const paid = plan === 'family' || plan === 'business'
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

  const persistVoices = async (next: {
    yue?: YueVoiceId
    en?: EnVoiceId
    cmn?: CmnVoiceId
    tl?: TlVoiceId
  }) => {
    const yue = next.yue ?? yueVoice
    const en = next.en ?? enVoice
    const cmn = next.cmn ?? cmnVoice
    const tl = next.tl ?? tlVoice
    writeLocalYueVoice(yue)
    writeLocalEnVoice(en)
    writeLocalCmnVoice(cmn)
    writeLocalTlVoice(tl)
    setYueVoice(yue)
    setEnVoice(en)
    setCmnVoice(cmn)
    setTlVoice(tl)
    if (!entitlement.loggedIn) return
    setVoiceBusy(true)
    try {
      const data = await saveTtsVoicePrefs({
        ttsVoiceYue: yue,
        ttsVoiceEn: en,
        ttsVoiceCmn: cmn,
        ttsVoiceTl: tl,
      })
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

  const onPreview = async (kind: 'yue' | 'en' | 'cmn' | 'tl') => {
    unlockTtsPlayback()
    setPreviewBusy(kind)
    try {
      if (kind === 'yue') await speakText(PREVIEW_YUE, 'yue', yueVoice)
      else if (kind === 'en') await speakText(PREVIEW_EN, 'en', enVoice)
      else if (kind === 'cmn') await speakText(PREVIEW_CMN, 'cmn', cmnVoice)
      else await speakText(PREVIEW_TL, 'tl', tlVoice)
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
              ttsVoiceCmn: entitlement.prefs?.ttsVoiceCmn || cmnVoice,
              ttsVoiceTl: entitlement.prefs?.ttsVoiceTl || tlVoice,
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

  const canAutoSpeak = Boolean(entitlement?.allowed.autoSpeak)
  const speakOn = Boolean(autoSpeak && canAutoSpeak)

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
        <section
          className="account-hub-section account-hub-area-autospeak"
          aria-label={biPlain(canAutoSpeak ? ui.autoSpeak : ui.autoSpeakFamily)}
        >
          <div className="account-hub-autospeak-row">
            <div className="account-hub-autospeak-copy">
              <p className="account-hub-label">
                <BiText copy={canAutoSpeak ? ui.autoSpeak : ui.autoSpeakFamily} size="sm" />
              </p>
              <p className="account-hub-hint">
                <BiText copy={ui.autoSpeakHint} size="sm" />
              </p>
            </div>
            <label
              className={`account-hub-autospeak-switch${speakOn ? ' is-on' : ''}${!canAutoSpeak ? ' is-disabled' : ''}`}
            >
              <input
                type="checkbox"
                checked={speakOn}
                disabled={!canAutoSpeak}
                onChange={(e) => setAutoSpeak(e.target.checked)}
                aria-label={biPlain(canAutoSpeak ? ui.autoSpeak : ui.autoSpeakFamily)}
              />
              <span className="account-hub-autospeak-ui" aria-hidden="true">
                <span className="account-hub-autospeak-thumb" />
              </span>
            </label>
          </div>
        </section>

        <HubSep />

        <div className="account-hub-meta-grid account-hub-area-meta">
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

        <section
          className="account-hub-section account-hub-area-usage"
          aria-label={biPlain(ui.accountUsage)}
        >
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

        <AccountHubHousehold
          entitlement={entitlement}
          inviteEmail={inviteEmail}
          setInviteEmail={setInviteEmail}
          inviteBusy={inviteBusy}
          setInviteBusy={setInviteBusy}
          inviteSentTo={inviteSentTo}
          setInviteSentTo={setInviteSentTo}
          inviteError={inviteError}
          setInviteError={setInviteError}
          loadBootstrap={loadBootstrap}
        />

        {badgeOptions.some((o) => o.available) ? (
          <>
            <HubSep />
            <section
              className="account-hub-section account-hub-area-badge"
              aria-labelledby={badgePrefId}
            >
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

        <AccountHubVoice
          voicePrefId={voicePrefId}
          entitlement={entitlement}
          yueVoice={yueVoice}
          enVoice={enVoice}
          cmnVoice={cmnVoice}
          tlVoice={tlVoice}
          voiceBusy={voiceBusy}
          previewBusy={previewBusy}
          persistVoices={persistVoices}
          onPreview={onPreview}
        />

        <HubSep />

        <div className="account-hub-actions account-hub-area-actions">
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
                initial={{ opacity: 0, y: 14, scale: 0.985 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.985 }}
                transition={{ duration: 0.24, ease: inkEase }}
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
