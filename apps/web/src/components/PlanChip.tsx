import { BiText } from './BiText'
import { GlowRotateButton } from './GlowRotateButton'
import { useYueStore } from '../lib/store'
import { openAuthScreen } from '../lib/auth'
import { openBillingPortal, openUpgrade } from '../lib/billing'
import { ui } from '../lib/uiCopy'

function remainCopy(seconds: number) {
  if (seconds >= 3600) return ui.hoursLeft(Math.floor(seconds / 3600))
  if (seconds >= 60) return ui.minsLeft(Math.ceil(seconds / 60))
  return ui.secsLeft(seconds)
}

function planLabel(plan: string) {
  if (plan === 'pro') return ui.planPro
  if (plan === 'max') return ui.planMax
  if (plan === 'free') return ui.planFree
  return ui.planGuest
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
  const showSignIn = !entitlement.loggedIn && entitlement.requireLogin

  const onUpgrade = (event: React.MouseEvent) => {
    event.preventDefault()
    void openUpgrade('pro', 'month').catch(() => loadBootstrap())
  }

  const onBilling = (event: React.MouseEvent) => {
    event.preventDefault()
    void openBillingPortal().catch(() => loadBootstrap())
  }

  if (showSignIn) {
    return (
      <GlowRotateButton className="plan-sign-in" onClick={() => openAuthScreen()}>
        <BiText copy={ui.signIn} size="sm" layout="inline" />
      </GlowRotateButton>
    )
  }

  return (
    <div className="plan-chip-row">
      <span className={`plan-chip plan-${plan}`}>
        <BiText copy={planLabel(plan)} size="sm" />
      </span>
      {entitlement.allowed.live ? (
        <span className="plan-remain">
          <BiText copy={remainCopy(entitlement.remaining.liveSeconds)} size="sm" />
        </span>
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
