import type { ReactNode } from 'react'
import {
  TURKISH_HONESTY_NOTE,
  detectTurkishAddress,
  turkishAddressChip,
  turkishAddressLabel,
} from '../lib/turkishPedagogy'

/**
 * Turkish line for Solo / Conversation / Cam.
 * Compact: Turkish orthography only (`lang="tr-TR"`, so CSS casing keeps ı / İ) — no IPA, Chao, or chips.
 * Details (`showDetail`) add a sen/siz chip when detectable plus a vowel-harmony honesty note.
 */
export function TrText({
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

  const address = showDetail ? detectTurkishAddress(trimmed) : null

  const body = (
    <span className={`turkish-block${showDetail ? ' turkish-block--detail' : ''}`}>
      <span className={className || undefined} lang="tr-TR">
        {trimmed}
      </span>
      {address ? (
        <span className="turkish-address-row" aria-label="Address form">
          <span className="turkish-address-scheme" aria-hidden="true">
            Address
          </span>
          <span
            className={`turkish-address-chip turkish-address-chip--${address}`}
            title={turkishAddressLabel(address)}
            aria-label={turkishAddressLabel(address)}
          >
            {turkishAddressChip(address)}
          </span>
        </span>
      ) : null}
      {showDetail ? <span className="turkish-honesty">{TURKISH_HONESTY_NOTE}</span> : null}
    </span>
  )

  if (!onActivate) return body

  return (
    <button
      type="button"
      className="turkish-activate"
      onClick={() => onActivate(trimmed)}
      aria-label={activateLabel || `${trimmed}. Open details.`}
    >
      {body}
    </button>
  )
}
