import {
  JYUTPING_SELECT_COPY_TRAP,
  JYUTPING_UI_SVG_TONES,
  parseJyutpingTone,
  planAllowsJyutpingCopy,
  rubyJpSyllable,
} from '../lib/jyutping'
import { useYueStore } from '../lib/store'
import { biPlain, ui } from '../lib/uiCopy'
import { JyutToneMark } from './JyutToneMark'

/**
 * One Jyutping syllable for on-screen ruby / rows.
 * When `JYUTPING_UI_SVG_TONES` is on: `teng1` + SVG contour (no Chao in the DOM).
 * When off: classic Unicode Chao (`teng1˥`) — set the flag false to reverse.
 */
export function JyutpingSylText({ jp }: { jp: string }) {
  const trimmed = jp.trim()
  const entitlement = useYueStore((s) => s.entitlement)
  const showGotcha =
    JYUTPING_SELECT_COPY_TRAP &&
    !planAllowsJyutpingCopy(entitlement?.plan, Boolean(entitlement))

  if (!trimmed) return '\u00a0'

  if (!JYUTPING_UI_SVG_TONES) {
    return (
      <span
        className="jyut-syl-ui jyut-syl-ui--unicode"
        {...(showGotcha
          ? { 'data-jyutping-notice': biPlain(ui.jyutpingSelectCopyTrap) }
          : {})}
      >
        {rubyJpSyllable(trimmed)}
      </span>
    )
  }

  const parsed = parseJyutpingTone(trimmed)
  if (!parsed) return trimmed

  return (
    <span
      className="jyut-syl-ui"
      {...(showGotcha
        ? { 'data-jyutping-notice': biPlain(ui.jyutpingSelectCopyTrap) }
        : {})}
    >
      <span className="jyut-syl-roman">{parsed.roman}</span>
      <JyutToneMark tone={parsed.tone} />
    </span>
  )
}
