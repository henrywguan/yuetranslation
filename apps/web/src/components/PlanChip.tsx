import { BiText } from './BiText'
import { useYueStore } from '../lib/store'
import { ui } from '../lib/uiCopy'

function remainCopy(seconds: number) {
  if (seconds >= 3600) return ui.hoursLeft(Math.floor(seconds / 3600))
  if (seconds >= 60) return ui.minsLeft(Math.ceil(seconds / 60))
  return ui.secsLeft(seconds)
}

export function PlanChip() {
  const entitlement = useYueStore((s) => s.entitlement)
  if (!entitlement) {
    return (
      <span className="plan-chip muted">
        <BiText copy={ui.connecting} size="sm" />
      </span>
    )
  }

  const plan = entitlement.plan
  const label =
    plan === 'pro' ? ui.planPro : plan === 'free' ? ui.planFree : entitlement.requireLogin ? ui.signIn : ui.planGuest

  return (
    <div className="plan-chip-row">
      <span className={`plan-chip plan-${plan}`}>
        <BiText copy={label} size="sm" />
      </span>
      {entitlement.allowed.live ? (
        <span className="plan-remain">
          <BiText copy={remainCopy(entitlement.remaining.liveSeconds)} size="sm" />
        </span>
      ) : entitlement.loginUrl && !entitlement.loggedIn ? (
        <a className="plan-link" href={entitlement.loginUrl} target="_top" rel="noreferrer">
          <BiText copy={ui.signIn} size="sm" />
        </a>
      ) : entitlement.upgradeUrl ? (
        <a className="plan-link" href={entitlement.upgradeUrl} target="_top" rel="noreferrer">
          <BiText copy={ui.upgrade} size="sm" />
        </a>
      ) : null}
    </div>
  )
}
