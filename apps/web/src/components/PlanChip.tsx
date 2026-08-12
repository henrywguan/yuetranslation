import { useYueStore } from '../lib/store'

function formatRemain(seconds: number) {
  if (seconds >= 3600) return `${Math.floor(seconds / 3600)}h left`
  if (seconds >= 60) return `${Math.ceil(seconds / 60)}m left`
  return `${seconds}s left`
}

export function PlanChip() {
  const entitlement = useYueStore((s) => s.entitlement)
  if (!entitlement) return <span className="plan-chip muted">Connecting…</span>

  const plan = entitlement.plan
  const label =
    plan === 'pro' ? 'Pro' : plan === 'free' ? 'Free' : entitlement.requireLogin ? 'Sign in' : 'Guest'

  return (
    <div className="plan-chip-row">
      <span className={`plan-chip plan-${plan}`}>{label}</span>
      {entitlement.allowed.live ? (
        <span className="plan-remain">{formatRemain(entitlement.remaining.liveSeconds)}</span>
      ) : entitlement.loginUrl && !entitlement.loggedIn ? (
        <a className="plan-link" href={entitlement.loginUrl} target="_top" rel="noreferrer">
          Log in
        </a>
      ) : entitlement.upgradeUrl ? (
        <a className="plan-link" href={entitlement.upgradeUrl} target="_top" rel="noreferrer">
          Upgrade
        </a>
      ) : null}
    </div>
  )
}
