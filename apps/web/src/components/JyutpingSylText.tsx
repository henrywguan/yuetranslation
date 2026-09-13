import { withChaoFace } from '../lib/chaoFace'
import {
  JYUTPING_SELECT_COPY_TRAP,
  JYUTPING_UI_TONE_MODE,
  chaoContourForTone,
  parseJyutpingTone,
  planAllowsJyutpingCopy,
} from '../lib/jyutping'
import { useYueStore } from '../lib/store'
import { biPlain, ui } from '../lib/uiCopy'
import { JyutChaoGlyph } from './JyutChaoGlyph'
import { JyutToneMark } from './JyutToneMark'

/**
 * One Jyutping syllable for on-screen ruby / rows.
 *
 * - `unicode` (default): `teng1` + `.chao-face` Chao (Noto Sans)
 * - `obfuscated`: `teng1` + canvas Chao (no Chao text nodes)
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

  const parsedEarly = parseJyutpingTone(trimmed)

  if (JYUTPING_UI_TONE_MODE === 'unicode') {
    if (parsedEarly) {
      return (
        <span className="jyut-syl-ui jyut-syl-ui--unicode" {...trapProps}>
          <span className="jyut-syl-roman">{parsedEarly.roman}</span>
          <span className="chao-face" aria-hidden="true">
            {chaoContourForTone(parsedEarly.tone)}
          </span>
        </span>
      )
    }
    return (
      <span className="jyut-syl-ui jyut-syl-ui--unicode" {...trapProps}>
        {withChaoFace(trimmed)}
      </span>
    )
  }

  const parsed = parsedEarly
  if (!parsed) return withChaoFace(trimmed)

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
