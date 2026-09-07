import { BiText } from '../components/BiText'
import { MagneticButton } from './MagneticButton'
import { MarketingFooter } from './MarketingFooter'
import { MarketingPageShell } from './MarketingPageShell'
import { openApp, openHome, openPricing } from '../lib/siteLinks'
import { useDocumentMeta } from '../lib/useDocumentMeta'
import { ui } from '../lib/uiCopy'
import './landing.css'

/** Marketing 404 for unknown hash routes. */
export function NotFoundPage() {
  useDocumentMeta({
    title: 'Page not found — JyutTranslate',
    description: 'That page is missing. Head home or open the translator.',
    path: '/#/404',
  })

  return (
    <MarketingPageShell background="orbital" onFeatures={() => openHome()}>
      <section className="ln-section ln-not-found">
        <p className="ln-kicker">404</p>
        <h1 className="ln-h2">
          <BiText
            copy={{
              en: 'This page floated away',
              zh: '搵唔到呢頁',
              jp: 'wan2 m4 dou2 ni1 jip6',
            }}
            size="lg"
          />
        </h1>
        <p className="ln-sub" style={{ marginInline: 0 }}>
          <BiText
            copy={{
              en: 'The link may be old, or the page never existed. Try home, pricing, or the translator.',
              zh: '連結可能過期，或者根本冇呢頁。試下返主頁、價錢，或者開翻譯器。',
              jp: 'lin4 git3 ho2 nang4 gwo3 kei4, waak6 ze2 gan1 bun2 mou5 ni1 jip6.',
            }}
            size="md"
            as="span"
          />
        </p>
        <div className="ln-hero-cta" style={{ justifyContent: 'flex-start', marginTop: 28 }}>
          <MagneticButton className="btn-primary" onClick={() => openHome()}>
            <BiText copy={ui.backHome} size="sm" />
          </MagneticButton>
          <MagneticButton className="btn-ghost" onClick={() => openApp()}>
            <BiText copy={ui.launchTranslator} size="sm" />
          </MagneticButton>
          <MagneticButton className="btn-ghost" onClick={() => openPricing()}>
            <BiText copy={ui.navPricing} size="sm" />
          </MagneticButton>
        </div>
      </section>
      <MarketingFooter />
    </MarketingPageShell>
  )
}
