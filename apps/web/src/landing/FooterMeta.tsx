import { BiText } from '../components/BiText'
import { ui } from '../lib/uiCopy'

const CONTACT_MAILTO = 'mailto:henrywguan@gmail.com'

/** Quiet legal / contact line at the bottom of marketing footers. */
export function FooterMeta() {
  return (
    <p className="ln-footer-meta">
      <BiText copy={ui.footerCopyright} size="sm" hideJp only="en" />
      <span className="ln-footer-meta-sep" aria-hidden="true">
        ·
      </span>
      <a className="ln-footer-contact" href={CONTACT_MAILTO}>
        <BiText copy={ui.footerContact} size="sm" hideJp />
      </a>
    </p>
  )
}
