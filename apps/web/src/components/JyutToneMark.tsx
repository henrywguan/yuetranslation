import type { JyutTone } from '../lib/jyutping'

/** Pitch contours drawn as SVG (approx. Chao letter shapes at ruby size). */
const TONE_PATH: Record<JyutTone, string> = {
  // ˥ high level
  '1': 'M2.2 2.8 H7.8',
  // ˧˥ mid → high rise
  '2': 'M2.2 8.2 L7.8 2.8',
  // ˧ mid level
  '3': 'M2.2 7 H7.8',
  // ˨˩ low falling — the “checkmark” contour
  '4': 'M2.1 4.2 L4.6 9.4 L8 11.2',
  // ˩˧ low → mid rise
  '5': 'M2.2 11 L7.8 5.2',
  // ˨ low level
  '6': 'M2.2 10.4 H7.8',
}

/**
 * Non-text tone mark so inspect/select does not yield Unicode Chao letters.
 * Clipboard Chao still comes from `rubyJpSyllable` via the Family copy button.
 */
export function JyutToneMark({
  tone,
  className = '',
}: {
  tone: JyutTone
  className?: string
}) {
  return (
    <svg
      className={`jyut-tone-mark ${className}`.trim()}
      viewBox="0 0 10 14"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d={TONE_PATH[tone]}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.45"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
