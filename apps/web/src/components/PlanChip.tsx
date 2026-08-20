import { BiText } from './BiText'
import { useYueStore } from '../lib/store'
import { openAuthScreen, supabaseEnabled } from '../lib/auth'
import { openBillingPortal, openUpgrade } from '../lib/billing'
import { ui } from '../lib/uiCopy'

function remainCopy(seconds: number) {
  if (seconds >= 3600) return ui.hoursLeft(Math.floor(seconds / 3600))
  if (seconds >= 60) return ui.minsLeft(Math.ceil(seconds / 60))
  return ui.secsLeft(seconds)
}

function planLabel(plan: string, requireLogin: boolean) {
  if (plan === 'pro') return ui.planPro
  if (plan === 'max') return ui.planMax
  if (plan === 'free') return ui.planFree
  return requireLogin ? ui.signIn : ui.planGuest
}

export function PlanChip() {
  const entitlement = useYueStore((s) => s.entitlement)
  const loadBootstrap = useYueStore((s) => s.loadBootstrap)

  if (!entitlement) {
    return (
      <span className="plan-chip muted">
        <BiText copy={ui.connecting} size="sm" />
      </span>
    )
  }

  const plan = entitlement.plan
  const label = planLabel(plan, entitlement.requireLogin)

  const onSignIn = (event: React.MouseEvent) => {
    if (!supabaseEnabled()) return
    event.preventDefault()
    openAuthScreen()
  }

  const onUpgrade = (event: React.MouseEvent) => {
    event.preventDefault()
    void openUpgrade('pro', 'month').catch(() => loadBootstrap())
  }

  const onBilling = (event: React.MouseEvent) => {
    event.preventDefault()
    void openBillingPortal().catch(() => loadBootstrap())
  }

  return (
    <div className="plan-chip-row">
      <span className={`plan-chip plan-${plan}`}>
        <BiText copy={label} size="sm" />
      </span>
      {entitlement.allowed.live ? (
        <span className="plan-remain">
          <BiText copy={remainCopy(entitlement.remaining.liveSeconds)} size="sm" />
        </span>
      ) : !entitlement.loggedIn && entitlement.requireLogin ? (
        supabaseEnabled() ? (
          <button type="button" className="plan-link" onClick={onSignIn}>
            <BiText copy={ui.signIn} size="sm" />
          </button>
        ) : null
      ) : entitlement.upgradeUrl ? (
        <button type="button" className="plan-link" onClick={onUpgrade}>
          <BiText copy={ui.upgrade} size="sm" />
        </button>
      ) : null}
      {entitlement.loggedIn && (plan === 'pro' || plan === 'max') ? (
        <button type="button" className="plan-link" onClick={onBilling}>
          <BiText copy={ui.manageBilling} size="sm" />
        </button>
      ) : null}
    </div>
  )
}
