/** Lucide-style glyphs for Agent / Ask / Plan — no lucide-react dependency. */

import type { ReactNode } from 'react'

function IconShell({
  size,
  children,
}: {
  size: number
  children: ReactNode
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="aui-mode-icon"
    >
      {children}
    </svg>
  )
}

/** Bot — Agent mode */
export function AgentModeIcon({ size = 14 }: { size?: number }) {
  return (
    <IconShell size={size}>
      <path d="M12 8V4H8" />
      <rect width="16" height="12" x="4" y="8" rx="2" />
      <path d="M2 14h2" />
      <path d="M20 14h2" />
      <path d="M15 13v2" />
      <path d="M9 13v2" />
    </IconShell>
  )
}

/** Message circle — Ask mode */
export function AskModeIcon({ size = 14 }: { size?: number }) {
  return (
    <IconShell size={size}>
      <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <path d="M12 17h.01" />
    </IconShell>
  )
}

/** List checks — Plan mode */
export function PlanModeIcon({ size = 14 }: { size?: number }) {
  return (
    <IconShell size={size}>
      <path d="M13 5h8" />
      <path d="M13 12h8" />
      <path d="M13 19h8" />
      <path d="m3 17 2 2 4-4" />
      <path d="m3 7 2 2 4-4" />
    </IconShell>
  )
}

/** Chevron for Tools collapse */
export function ToolsChevronIcon({ size = 12 }: { size?: number }) {
  return (
    <IconShell size={size}>
      <path d="m6 9 6 6 6-6" />
    </IconShell>
  )
}
