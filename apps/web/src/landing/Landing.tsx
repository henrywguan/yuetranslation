import { lazy, Suspense } from 'react'
import { MotionConfig, motion } from 'framer-motion'
import { JadeGlassField } from '../components/JadeGlassField'
import { ScrollProgress } from './ScrollProgress'
import { Reveal } from './Reveal'
import { MagneticButton } from './MagneticButton'
import { LiveDemo } from './LiveDemo'
import { Nav } from './Nav'
import { useSmoothScroll } from './useSmoothScroll'
import { openApp, openPricing } from '../lib/siteLinks'
import { BiText } from '../components/BiText'
import { DeepSeekMark } from '../components/DeepSeekMark'
import { JyutLogo } from '../components/JyutLogo'
import { ui } from '../lib/uiCopy'
import { HeroEyebrow } from './HeroEyebrow'
import { FooterLangPair } from './FooterLangPair'
import { LANDING_PLANS } from './plans'
import { inkEase } from '../lib/motion'
import './landing.css'
const HeroObject = lazy(() =>
  import('./HeroObject').then((m) => ({ default: m.HeroObject })),
)

const MODES = [
  { title: ui.modeSolo, desc: ui.soloDesc },
  { title: ui.modeFace, desc: ui.faceDesc },
  { title: ui.modeText, desc: ui.textDesc },
]

const FEATURES = [
  { title: ui.featJpTitle, desc: ui.featJpDesc },
  { title: ui.featHkTitle, desc: ui.featHkDesc },
  { title: ui.featFastTitle, desc: ui.featFastDesc },
  { title: ui.featHostTitle, desc: ui.featHostDesc },
]

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export function Landing() {
  useSmoothScroll(true)

  return (
    <MotionConfig reducedMotion="user">
    <div className="landing">
      <ScrollProgress />
      <JadeGlassField variant="marketing" />

      <Nav onFeatures={() => scrollToId('features')} />

      <header className="ln-hero">
        <Suspense fallback={null}>
          <HeroObject />
        </Suspense>
        <motion.div
          className="ln-hero-inner"
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: inkEase }}
        >
          <HeroEyebrow />
          <h1 className="ln-title">
            <BiText copy={ui.heroTitle} size="lg" />
          </h1>
          <BiText className="ln-sub" copy={ui.heroSub} size="md" as="p" />
          <div className="ln-hero-cta">
            <MagneticButton className="btn-primary" onClick={() => openApp()}>
              <BiText copy={ui.launchTranslator} size="sm" />
            </MagneticButton>
            <MagneticButton className="btn-ghost" onClick={() => scrollToId('demo')}>
              <BiText copy={ui.tryDemo} size="sm" />
            </MagneticButton>
          </div>
          <div className="ln-hero-stats">
            <div className="ln-hero-stat ln-hero-stat--deepseek">
              <span className="ln-hero-stat-icon" aria-hidden="true">
                <DeepSeekMark className="ln-deepseek-mark" />
              </span>
              <BiText copy={ui.statDeepseek} size="sm" />
            </div>
            <div className="ln-hero-stat">
              <span className="ln-hero-stat-icon" aria-hidden="true">
                <strong>3</strong>
              </span>
              <BiText copy={ui.statModes} size="sm" />
            </div>
            <div className="ln-hero-stat">
              <span className="ln-hero-stat-icon" aria-hidden="true">
                <strong>粵</strong>
              </span>
              <BiText copy={ui.statJyutping} size="sm" />
            </div>
          </div>
        </motion.div>
        <div className="ln-scroll-hint" aria-hidden="true">
          <span />
        </div>
      </header>

      <section className="ln-section" id="features">
        <Reveal className="ln-section-head">
          <span className="ln-kicker">
            <BiText copy={ui.modesKicker} size="sm" />
          </span>
          <h2 className="ln-h2">
            <BiText copy={ui.modesTitle} size="lg" />
          </h2>
        </Reveal>

        <Reveal className="ln-mode-grid" stagger={0.12} y={34}>
          {MODES.map((m) => (
            <article className="ln-mode-card" key={m.title.en}>
              <h3>
                <BiText copy={m.title} size="md" />
              </h3>
              <BiText copy={m.desc} size="sm" as="p" />
            </article>
          ))}
        </Reveal>

        <Reveal className="ln-feature-grid" stagger={0.08} y={24}>
          {FEATURES.map((f) => (
            <div className="ln-feature" key={f.title.en}>
              <span className="ln-feature-dot" aria-hidden="true" />
              <div>
                <h4>
                  <BiText copy={f.title} size="md" />
                </h4>
                <BiText copy={f.desc} size="sm" as="p" />
              </div>
            </div>
          ))}
        </Reveal>
      </section>

      <section className="ln-section ln-demo" id="demo">
        <Reveal className="ln-demo-copy">
          <span className="ln-kicker">
            <BiText copy={ui.demoKicker} size="sm" />
          </span>
          <h2 className="ln-h2">
            <BiText copy={ui.demoTitle} size="lg" />
          </h2>
          <BiText className="ln-p" copy={ui.demoBody} size="sm" as="p" />
          <MagneticButton className="btn-primary" onClick={() => openApp()}>
            <BiText copy={ui.openFullApp} size="sm" />
          </MagneticButton>
        </Reveal>
        <Reveal className="ln-demo-stage" y={40}>
          <LiveDemo />
        </Reveal>
      </section>

      <section className="ln-section" id="pricing">
        <Reveal className="ln-section-head">
          <span className="ln-kicker">
            <BiText copy={ui.pricingKicker} size="sm" />
          </span>
          <h2 className="ln-h2">
            <BiText copy={ui.pricingTitle} size="lg" />
          </h2>
        </Reveal>

        <Reveal className="ln-price-grid" stagger={0.12} y={34}>
          {LANDING_PLANS.map((plan) => (
            <article key={plan.id} className={`ln-price-card${plan.featured ? ' featured' : ''}`}>
              {plan.featured ? (
                <span className="ln-price-badge">
                  <BiText copy={ui.mostPopular} size="sm" />
                </span>
              ) : null}
              <h3>
                <BiText copy={plan.name} size="md" />
              </h3>
              <p className="ln-price">
                ${plan.monthly}
                <span>
                  <BiText copy={ui.perMonth} size="sm" hideJp />
                </span>
              </p>
              <ul>
                {plan.features.map((f) => (
                  <li key={f.en}>
                    <BiText copy={f} size="sm" />
                  </li>
                ))}
              </ul>
              <MagneticButton
                className={`${plan.featured ? 'btn-primary' : 'btn-ghost'} full`}
                onClick={() => (plan.ctaOpens === 'app' ? openApp() : openPricing())}
              >
                <BiText copy={plan.cta} size="sm" />
              </MagneticButton>
            </article>
          ))}
        </Reveal>

        <Reveal className="ln-price-more">
          <button type="button" className="ln-textlink" onClick={() => openPricing()}>
            <BiText copy={ui.comparePlans} size="sm" />
          </button>
        </Reveal>
      </section>

      <section className="ln-cta-band">
        <Reveal className="ln-cta-inner">
          <div className="ln-cta-glow" aria-hidden="true" />
          <JyutLogo variant="mark" className="ln-cta-mark" />
          <h2 className="ln-h2">
            <BiText copy={ui.ctaReady} size="lg" />
          </h2>
          <BiText className="ln-p" copy={ui.ctaBody} size="sm" as="p" />
          <MagneticButton className="btn-primary" onClick={() => openApp()}>
            <BiText copy={ui.launchTranslator} size="sm" />
          </MagneticButton>
        </Reveal>
      </section>

      <footer className="ln-footer">
        <div className="ln-brand">
          <JyutLogo className="ln-brand-logo" />
        </div>
        <FooterLangPair />
      </footer>
    </div>
    </MotionConfig>
  )
}
