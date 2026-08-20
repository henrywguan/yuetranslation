/**
 * Compact “admin” plan badge with rotating border glow
 * (inspired by https://uiverse.io/augustin_4687/modern-husky-6 — MIT)
 * and a tiny crown with twinkling stars centered above the label.
 */
export function AdminPlanBadge({ className = '' }: { className?: string }) {
  return (
    <span className={`admin-plan-badge ${className}`.trim()} title="Admin allowlist">
      <span className="admin-plan-badge-ring" aria-hidden="true">
        <span className="admin-plan-badge-spin" />
      </span>
      <span className="admin-plan-badge-inner">
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
        <span className="admin-plan-label">admin</span>
      </span>
    </span>
  )
}
