import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { BiText } from './BiText'
import { GlowRotateButton } from './GlowRotateButton'
import { IosHomescreenGuideDialog, IosHomescreenHubButton } from './IosHomescreenGuide'
import { useYueStore } from '../lib/store'
import { getSession, openAuthScreen, signOut } from '../lib/auth'
import { openBillingPortal, openUpgrade } from '../lib/billing'
import { navigate } from '../lib/useHashRoute'
import { biPlain, ui, type Bi } from '../lib/uiCopy'
import { inkEase } from '../lib/motion'

const HUB_SHEET_MQ = '(max-width: 959px)'

function remainCopy(seconds: number): Bi {
  if (seconds >= 3600) return ui.hoursLeft(Math.floor(seconds / 3600))
  if (seconds >= 60) return ui.minsLeft(Math.ceil(seconds / 60))
  return ui.secsLeft(seconds)
}

function planLabel(plan: string): Bi {
  if (plan === 'pro') return ui.planPro
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

function voiceCopy(entitlement: {
  ttsUnlimited?: boolean
  plan: string
  usage: { ttsChars: number }
  remaining: { ttsChars: number }
}): Bi {
  const unlimited = Boolean(
    entitlement.ttsUnlimited || entitlement.plan === 'pro' || entitlement.plan === 'max',
  )
  if (unlimited) return ui.charsUsedUnlimited(formatChars(entitlement.usage.ttsChars))
  return ui.charsLeft(formatChars(entitlement.remaining.ttsChars))
}

function displayNameFromSession(email: string | undefined, meta: Record<string, unknown> | undefined) {
  const full =
    (typeof meta?.full_name === 'string' && meta.full_name.trim()) ||
    (typeof meta?.name === 'string' && meta.name.trim()) ||
    ''
  if (full) return full
  if (!email) return ''
  return email.split('@')[0] || email
}

/** Plan indicator that expands into an account hub (plan, usage, upgrade, sign out). */
export function PlanChip() {
  const entitlement = useYueStore((s) => s.entitlement)
  const loadBootstrap = useYueStore((s) => s.loadBootstrap)
  const [open, setOpen] = useState(false)
  const [homescreenOpen, setHomescreenOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [busy, setBusy] = useState(false)
  const [hubPos, setHubPos] = useState<{ top: number; right: number } | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const hubRef = useRef<HTMLDivElement>(null)
  const panelId = useId()
  const titleId = useId()

  useEffect(() => {
    let cancelled = false
    void getSession().then((session) => {
      if (cancelled) return
      const nextEmail = session?.user?.email?.trim() || ''
      const meta = session?.user?.user_metadata as Record<string, unknown> | undefined
      setEmail(nextEmail)
      setDisplayName(displayNameFromSession(nextEmail, meta))
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
      setHubPos({
        top: r.bottom + 10,
        right: Math.max(12, window.innerWidth - r.right),
      })
    }
    layout()
    window.addEventListener('resize', layout)
    window.addEventListener('scroll', layout, true)
    return () => {
      window.removeEventListener('resize', layout)
      window.removeEventListener('scroll', layout, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    const onPointer = (e: PointerEvent) => {
      const target = e.target
      if (!(target instanceof Node)) return
      if (rootRef.current?.contains(target)) return
      if (hubRef.current?.contains(target)) return
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
  const paid = plan === 'pro' || plan === 'max'
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
    void openUpgrade('pro', 'month').catch(() => loadBootstrap())
  }

  const onBilling = () => {
    setOpen(false)
    void openBillingPortal().catch(() => loadBootstrap())
  }

  const onSignOut = async () => {
    setBusy(true)
    try {
      await signOut()
      setOpen(false)
      setEmail('')
      setDisplayName('')
      await loadBootstrap()
    } finally {
      setBusy(false)
    }
  }

  const panel = (
    <div className="account-hub" id={panelId} role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <header className="account-hub-header">
        <div className="account-hub-titles">
          <p className="account-hub-kicker">
            <BiText copy={ui.accountHub} size="sm" />
          </p>
          <h2 id={titleId} className="account-hub-title">
            {displayName || email || biPlain(planLabel(plan))}
          </h2>
          {email && displayName && displayName !== email ? (
            <p className="account-hub-email">{email}</p>
          ) : null}
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
        <section className="account-hub-section" aria-label={biPlain(ui.accountPlan)}>
          <p className="account-hub-label">
            <BiText copy={ui.accountPlan} size="sm" />
          </p>
          <span className={`plan-chip plan-${plan} account-hub-plan-pill`}>
            <BiText copy={planLabel(plan)} size="sm" hideJp />
          </span>
        </section>

        <section className="account-hub-section" aria-label={biPlain(ui.accountUsage)}>
          <p className="account-hub-label">
            <BiText copy={ui.accountUsage} size="sm" />
          </p>
          <ul className="account-hub-stats">
            <li>
              <span className="account-hub-stat-label">
                <BiText copy={ui.accountLive} size="sm" />
              </span>
              <span className="account-hub-stat-value">
                <BiText copy={remainCopy(entitlement.remaining.liveSeconds)} size="sm" />
              </span>
            </li>
            {showVoiceQuota ? (
              <li>
                <span className="account-hub-stat-label">
                  <BiText copy={ui.accountVoice} size="sm" />
                </span>
                <span className="account-hub-stat-value">
                  <BiText copy={voiceCopy(entitlement)} size="sm" />
                </span>
              </li>
            ) : null}
          </ul>
        </section>

        <div className="account-hub-actions">
          {entitlement.isAdmin ? (
            <button
              type="button"
              className="account-hub-btn account-hub-btn--ghost"
              onClick={() => {
                setOpen(false)
                navigate('admin')
              }}
            >
              Admin
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
        <span className={`plan-chip plan-${plan}`}>
          <BiText copy={planLabel(plan)} size="sm" hideJp />
        </span>
        {paid && showVoiceQuota ? (
          <span className="plan-remain">
            <BiText copy={voiceCopy(entitlement)} size="sm" hideJp />
          </span>
        ) : entitlement.allowed.live ? (
          <span className="plan-remain">
            <BiText copy={remainCopy(entitlement.remaining.liveSeconds)} size="sm" hideJp />
          </span>
        ) : showVoiceQuota ? (
          <span className="plan-remain">
            <BiText copy={voiceCopy(entitlement)} size="sm" hideJp />
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
