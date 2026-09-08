import { BiText } from '../components/BiText'
import { ui } from '../lib/uiCopy'

/**
 * Hero pill: English + Chinese; Jyutping or primary-language gloss via BiText.
 */
export function HeroEyebrow() {
  return (
    <span className="ln-eyebrow">
      <BiText copy={ui.heroEyebrow} className="ln-eyebrow-stack" />
    </span>
  )
}
