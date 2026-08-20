/**
 * Compact “admin” plan badge — neo-brutalist offset stack + dotted fill
 * from https://uiverse.io/augustin_4687/modern-husky-6 (MIT), recolored
 * to Jyut jade / mint / harbor. Crown + twinkling stars sit above “admin”.
 * Clickable when `onClick` is set so allowlisted admins can still change plan.
 */
export function AdminPlanBadge({
  className = '',
  plan,
  onClick,
}: {
  className?: string
  /** Current billed plan (shown under the badge). */
  plan?: 'free' | 'pro' | 'max'
  onClick?: () => void
}) {
  const title = onClick
    ? `Admin allowlist — click to change plan (currently ${plan || 'free'})`
    : 'Admin allowlist'
  const face = (
    <span className="admin-plan-badge-face">
      <span className="admin-plan-badge-label">
        <span className="admin-plan-crown" aria-hidden="true">
          <svg className="admin-plan-crown-svg" viewBox="0 0 24 16" width="14" height="10">
            <path
              d="M2 13.5 4.2 5.2 8.1 9.4 12 2.5l3.9 6.9 3.9-4.2 2.2 8.3Z"
              fill="currentColor"
            />
            <path d="M2 13.5h20v1.8H2z" fill="currentColor" opacity="0.9" />
            <circle cx="4.2" cy="5" r="1.15" fill="currentColor" />
            <circle cx="12" cy="2.4" r="1.25" fill="currentColor" />
            <circle cx="19.8" cy="5" r="1.15" fill="currentColor" />
          </svg>
          <span className="admin-plan-star admin-plan-star--a" />
          <span className="admin-plan-star admin-plan-star--b" />
          <span className="admin-plan-star admin-plan-star--c" />
        </span>
        <span className="admin-plan-word">admin</span>
      </span>
    </span>
  )

  const badge = onClick ? (
    <button
      type="button"
      className={`admin-plan-badge admin-plan-badge--btn ${className}`.trim()}
      title={title}
      aria-label={title}
      onClick={onClick}
    >
      {face}
    </button>
  ) : (
    <span className={`admin-plan-badge ${className}`.trim()} title={title}>
      {face}
    </span>
  )

  return (
    <span className="admin-plan-wrap">
      {badge}
      {plan ? <span className="admin-plan-current">{plan}</span> : null}
    </span>
  )
}
