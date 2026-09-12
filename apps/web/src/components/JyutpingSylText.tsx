import {
  JYUTPING_UI_SVG_TONES,
  parseJyutpingTone,
  rubyJpSyllable,
} from '../lib/jyutping'
import { JyutToneMark } from './JyutToneMark'

/**
 * One Jyutping syllable for on-screen ruby / rows.
 * When `JYUTPING_UI_SVG_TONES` is on: `teng1` + SVG contour (no Chao in the DOM).
 * When off: classic Unicode Chao (`teng1˥`) — set the flag false to reverse.
 */
export function JyutpingSylText({ jp }: { jp: string }) {
  const trimmed = jp.trim()
  if (!trimmed) return '\u00a0'

  if (!JYUTPING_UI_SVG_TONES) {
    return rubyJpSyllable(trimmed)
  }

  const parsed = parseJyutpingTone(trimmed)
  if (!parsed) return trimmed

  return (
    <span className="jyut-syl-ui">
      <span className="jyut-syl-roman">{parsed.roman}</span>
      <JyutToneMark tone={parsed.tone} />
    </span>
  )
}
