import { IosHomescreenFooterLink } from '../components/IosHomescreenGuide'
import { JyutLogo } from '../components/JyutLogo'
import { openHome } from '../lib/siteLinks'
import { FooterLangPair } from './FooterLangPair'
import { FooterMeta } from './FooterMeta'

export function MarketingFooter({ showHomescreen = false }: { showHomescreen?: boolean }) {
  return (
    <footer className="ln-footer">
      <button type="button" className="ln-brand ln-brand-btn" onClick={() => openHome()}>
        <JyutLogo className="ln-brand-logo" />
      </button>
      {showHomescreen ? <IosHomescreenFooterLink /> : null}
      <FooterLangPair />
      <FooterMeta />
    </footer>
  )
}
