import { BiText } from '../components/BiText'
import { ui } from '../lib/uiCopy'

/** Footer tagline: English + Chinese with Jyutping or primary-language gloss. */
export function FooterLangPair() {
  return (
    <p className="ln-footer-langs">
      <span className="ln-footer-langs-row">
        <BiText copy={ui.footerTagline} className="ln-footer-lang-stack" />
      </span>
    </p>
  )
}
