import { isIdleStatus, statusChipLabel } from '../../../lib/chatInbox'

/**
 * Compact status affordance: colored dot + short label.
 * Idle hides at all densities (sidebar rows + agent strip) until hover/focus —
 * desktop rows stay quiet (Phase 1 / Wave B).
 */
export function StatusChip({ status }: { status: string }) {
  const label = statusChipLabel(status)
  const idle = isIdleStatus(status)
  return (
    <span
      className={`inbox-agent-status is-${status}${idle ? ' is-idle' : ''}`}
      title={label}
      aria-label={idle ? undefined : label}
    >
      <span className="inbox-agent-status-dot" aria-hidden />
      <span className="inbox-agent-status-label">{label}</span>
    </span>
  )
}
