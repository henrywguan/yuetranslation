import type { ReactNode } from 'react'
import {
  ITALIAN_HONESTY_NOTE,
  detectItalianAddress,
  italianAddressChip,
  italianAddressLabel,
} from '../lib/italianPedagogy'

/**
 * Standard Italian line for Solo / Conversation / Cam.
 * Compact: accented Italian only (`lang="it-IT"`) — no IPA, Chao, or register chips.
 * Details (`showDetail`) add a tu/Lei chip when detectable plus a short honesty note.
 */
export function ItText({
  text,
  className,
  placeholder,
  onActivate,
  activateLabel,
  showDetail = false,
}: {
  text: string
  definition?: string
  definitions?: string[]
  className?: string
  placeholder?: ReactNode
  onActivate?: (text: string) => void
  activateLabel?: string
  /** Compact panes: false. Details can opt in. */
  showDetail?: boolean
}) {
  const trimmed = text.trim()
  if (!trimmed) return placeholder ? <>{placeholder}</> : null

  const address = showDetail ? detectItalianAddress(trimmed) : null

  const body = (
    <span className={`italian-block${showDetail ? ' italian-block--detail' : ''}`}>
      <span className={className || undefined} lang="it-IT">
        {trimmed}
      </span>
      {address ? (
        <span className="italian-address-row" aria-label="Address form">
          <span className="italian-address-scheme" aria-hidden="true">
            Address
          </span>
          <span
            className={`italian-address-chip italian-address-chip--${address}`}
            title={italianAddressLabel(address)}
            aria-label={italianAddressLabel(address)}
          >
            {italianAddressChip(address)}
          </span>
        </span>
      ) : null}
      {showDetail ? <span className="italian-honesty">{ITALIAN_HONESTY_NOTE}</span> : null}
    </span>
  )

  if (!onActivate) return body

  return (
    <button
      type="button"
      className="italian-activate"
      onClick={() => onActivate(trimmed)}
      aria-label={activateLabel || `${trimmed}. Open details.`}
    >
      {body}
    </button>
  )
}
