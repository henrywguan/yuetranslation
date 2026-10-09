import type { ReactNode } from 'react'
import {
  ARABIC_DIACRITIC_NOTE,
  type ArabicVariant,
  arabicHonestyNote,
  arabicHtmlLang,
  hasTashkeel,
} from '../lib/arabicPedagogy'

/**
 * Arabic line for Solo / Conversation / Cam — Egyptian (`ar`, ar-EG) or MSA (`arsa`, ar-SA).
 * Compact: Arabic script only, `dir="rtl"` — no IPA, Chao, tone, or register chips.
 * Details (`showDetail`) add the variant honesty note, plus a tashkeel note when vowel marks are present.
 */
export function ArText({
  text,
  className,
  placeholder,
  onActivate,
  activateLabel,
  showDetail = false,
  variant = 'ar',
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
  variant?: ArabicVariant
}) {
  const trimmed = text.trim()
  if (!trimmed) return placeholder ? <>{placeholder}</> : null

  const body = (
    <span
      className={`arabic-block arabic-block--${variant}${showDetail ? ' arabic-block--detail' : ''}`}
      dir="rtl"
    >
      <span className={className || undefined} lang={arabicHtmlLang(variant)} dir="rtl">
        {trimmed}
      </span>
      {showDetail ? (
        <span className="arabic-honesty" lang="en" dir="ltr">
          {arabicHonestyNote(variant)}
        </span>
      ) : null}
      {showDetail && hasTashkeel(trimmed) ? (
        <span className="arabic-diacritic-note" lang="en" dir="ltr">
          {ARABIC_DIACRITIC_NOTE}
        </span>
      ) : null}
    </span>
  )

  if (!onActivate) return body

  return (
    <button
      type="button"
      className="arabic-activate"
      dir="rtl"
      onClick={() => onActivate(trimmed)}
      aria-label={activateLabel || `${trimmed}. Open details.`}
    >
      {body}
    </button>
  )
}
