import type { ReactNode } from 'react'
import {
  FRENCH_HONESTY_NOTE,
  detectFrenchAddress,
  frenchAddressChip,
  frenchAddressLabel,
} from '../lib/frenchPedagogy'

/**
 * Metropolitan French line for Solo / Conversation / Cam.
 * Compact: accented French only (`lang="fr-FR"`) — no IPA, Chao, or register chips.
 * Details (`showDetail`) add a tu/vous chip when detectable plus a short honesty note.
 */
export function FrText({
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

  const address = showDetail ? detectFrenchAddress(trimmed) : null

  const body = (
    <span className={`french-block${showDetail ? ' french-block--detail' : ''}`}>
      <span className={className || undefined} lang="fr-FR">
        {trimmed}
      </span>
      {address ? (
        <span className="french-address-row" aria-label="Address form">
          <span className="french-address-scheme" aria-hidden="true">
            Address
          </span>
          <span
            className={`french-address-chip french-address-chip--${address}`}
            title={frenchAddressLabel(address)}
            aria-label={frenchAddressLabel(address)}
          >
            {frenchAddressChip(address)}
          </span>
        </span>
      ) : null}
      {showDetail ? <span className="french-honesty">{FRENCH_HONESTY_NOTE}</span> : null}
    </span>
  )

  if (!onActivate) return body

  return (
    <button
      type="button"
      className="french-activate"
      onClick={() => onActivate(trimmed)}
      aria-label={activateLabel || `${trimmed}. Open details.`}
    >
      {body}
    </button>
  )
}
