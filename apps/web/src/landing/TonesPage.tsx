import { motion } from 'framer-motion'
import { BiText } from '../components/BiText'
import { openApp, openHome } from '../lib/siteLinks'
import { inkEase } from '../lib/motion'
import { ui } from '../lib/uiCopy'
import { MarketingCtaBand } from './MarketingCtaBand'
import { MarketingFooter } from './MarketingFooter'
import { MarketingPageShell } from './MarketingPageShell'
import { Reveal } from './Reveal'
import { ToneTheater } from './tones/ToneTheater'
import { ToneTwinsStory } from './tones/ToneTwinsStory'
import './landing.css'
import './tones.css'

/** Cinematic ELI5 explainer for the six Cantonese tones. */
export function TonesPage() {
  return (
    <MarketingPageShell className="tones-page" onFeatures={() => openHome()}>
      <header className="tones-hero tones-hero--compact">
        <div className="tones-hero-wash" aria-hidden="true" />
        <motion.div
          className="tones-hero-inner"
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.85, ease: inkEase }}
        >
          <span className="ln-kicker">
            <BiText copy={ui.tonesKicker} size="sm" />
          </span>
          <h1 className="tones-hero-title">
            <BiText copy={ui.tonesHeroTitle} size="lg" />
          </h1>
          <p className="tones-hero-sub">
            <BiText copy={ui.tonesHeroSub} size="md" hideJp />
          </p>
        </motion.div>
      </header>

      <section className="tones-act tones-act--theater" aria-label={ui.navTones.en}>
        <Reveal y={36}>
          <ToneTheater />
        </Reveal>
      </section>

      <Reveal className="tones-act tones-act--story" y={36}>
        <ToneTwinsStory />
      </Reveal>

      <MarketingCtaBand
        className="tones-cta"
        title={ui.tonesCtaTitle}
        body={ui.tonesCtaBody}
        button={ui.tonesOpenApp}
        onClick={() => openApp()}
      />

      <MarketingFooter />
    </MarketingPageShell>
  )
}
