import {
  JYUTPING_SELECT_COPY_TRAP,
  JYUTPING_UI_TONE_MODE,
  parseJyutpingTone,
  planAllowsJyutpingCopy,
  rubyJpSyllable,
} from '../lib/jyutping'
import { useYueStore } from '../lib/store'
import { biPlain, ui } from '../lib/uiCopy'
import { JyutChaoGlyph } from './JyutChaoGlyph'
import { JyutToneMark } from './JyutToneMark'

/**
 * One Jyutping syllable for on-screen ruby / rows.
 *
 * - `obfuscated` (default): `teng1` + canvas Chao (Noto look; no Chao text nodes)
 * - `unicode`: classic `teng1˥` string in the DOM
 * - `svg`: digit + SVG stroke (easy reverse; weaker letterforms)
 *
 * Family clipboard Chao still comes from `rubyJpSyllable()` via Copy.
 */
export function JyutpingSylText({ jp }: { jp: string }) {
  const trimmed = jp.trim()
  const entitlement = useYueStore((s) => s.entitlement)
  const showGotcha =
    JYUTPING_SELECT_COPY_TRAP &&
    !planAllowsJyutpingCopy(entitlement?.plan, Boolean(entitlement))

  if (!trimmed) return '\u00a0'

  const trapProps = showGotcha
    ? { 'data-jyutping-notice': biPlain(ui.jyutpingSelectCopyTrap) }
    : {}

  if (JYUTPING_UI_TONE_MODE === 'unicode') {
    return (
      <span className="jyut-syl-ui jyut-syl-ui--unicode" {...trapProps}>
        {rubyJpSyllable(trimmed)}
      </span>
    )
  }

  const parsed = parseJyutpingTone(trimmed)
  if (!parsed) return trimmed

  if (JYUTPING_UI_TONE_MODE === 'svg') {
    return (
      <span className="jyut-syl-ui" {...trapProps}>
        <span className="jyut-syl-roman">{parsed.roman}</span>
        <JyutToneMark tone={parsed.tone} />
      </span>
    )
  }

  return (
    <span className="jyut-syl-ui jyut-syl-ui--obfuscated" {...trapProps}>
      <span className="jyut-syl-roman">{parsed.roman}</span>
      <JyutChaoGlyph tone={parsed.tone} />
    </span>
  )
}
