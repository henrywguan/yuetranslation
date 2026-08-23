import { lazy, Suspense } from 'react'
import { motion } from 'framer-motion'
import { SoftErrorBoundary } from '../components/SoftErrorBoundary'
import { Reveal } from './Reveal'
import { MagneticButton } from './MagneticButton'
import { LiveDemo } from './LiveDemo'
import { HomeFeaturesBento } from './HomeFeaturesBento'
import { ModesStage } from './ModesStage'
import { MarketingCtaBand } from './MarketingCtaBand'
import { MarketingFooter } from './MarketingFooter'
import { MarketingPageShell } from './MarketingPageShell'
import { openApp, openPricing, openTones } from '../lib/siteLinks'
import { BiText } from '../components/BiText'
import { DeepSeekMark } from '../components/DeepSeekMark'
import { ui, type Bi } from '../lib/uiCopy'
import { HeroEyebrow } from './HeroEyebrow'
import { LANDING_PLANS } from './plans'
import { inkEase } from '../lib/motion'
import './landing.css'
const HeroObject = lazy(() =>
  import('./HeroObject').then((m) => ({ default: m.HeroObject })),
)

const FEATURES_LEFT: { title: Bi; desc: Bi; aside?: Bi; href?: 'tones' }[] = [
  { title: ui.featJpTitle, desc: ui.featJpDesc, aside: ui.featJpAside, href: 'tones' },
  { title: ui.featHkTitle, desc: ui.featHkDesc },
]

const FEATURES_RIGHT: { title: Bi; desc: Bi }[] = [
  { title: ui.featFastTitle, desc: ui.featFastDesc },
  { title: ui.featHostTitle, desc: ui.featHostDesc },
]

function FeatureFlankItem({
  title,
  desc,
  aside,
  href,
}: {
  title: Bi
  desc: Bi
  aside?: Bi
  href?: 'tones'
}) {
  const inner = (
    <>
      <h3>
        <BiText copy={title} size="md" />
      </h3>
      <BiText copy={desc} size="sm" as="p" />
      {aside ? <BiText className="ln-feature-aside" copy={aside} size="sm" as="p" only="en" /> : null}
    </>
  )

  if (href === 'tones') {
    return (
      <button type="button" className="ln-modes-feat ln-modes-feat--link" onClick={() => openTones()}>
        {inner}
      </button>
    )
  }

  return <article className="ln-modes-feat">{inner}</article>
}

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export function Landing() {
  return (
    <MarketingPageShell onFeatures={() => scrollToId('features')}>
      <header className="ln-hero">
        <Suspense fallback={null}>
          <SoftErrorBoundary>
            <HeroObject />
          </SoftErrorBoundary>
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

        <div className="ln-modes-compose">
          <Reveal className="ln-modes-flank ln-modes-flank--left ln-modes-flank--desktop" x={-48} y={18} stagger={0.14}>
            {FEATURES_LEFT.map((f) => (
              <FeatureFlankItem key={f.title.en} {...f} />
            ))}
          </Reveal>

          <Reveal className="ln-modes-stage-wrap" y={28}>
            <ModesStage />
          </Reveal>

          <Reveal className="ln-modes-flank ln-modes-flank--right ln-modes-flank--desktop" x={48} y={18} stagger={0.14} delay={0.06}>
            {FEATURES_RIGHT.map((f) => (
              <FeatureFlankItem key={f.title.en} {...f} />
            ))}
          </Reveal>

          <Reveal className="ln-feat-bento-wrap" y={24} stagger={0.08}>
            <HomeFeaturesBento />
          </Reveal>
        </div>
      </section>

      <section className="ln-demo-band" id="demo">
        <div className="ln-demo-band-frame">
          <div className="ln-demo-band-wash" aria-hidden="true" />
          <div className="ln-demo-band-inner">
            <Reveal className="ln-demo-copy">
              <span className="ln-kicker">
                <BiText copy={ui.demoKicker} size="sm" />
              </span>
              <h2 className="ln-h2">
                <BiText copy={ui.demoTitle} size="lg" />
              </h2>
              <BiText className="ln-p" copy={ui.demoBody} size="sm" as="p" />
            </Reveal>
            <Reveal className="ln-demo-stage" y={36}>
              <LiveDemo />
            </Reveal>
          </div>
        </div>
      </section>

      <section className="ln-section ln-pricing" id="pricing">
        <Reveal className="ln-section-head ln-section-head--airy">
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

      <MarketingCtaBand
        title={ui.ctaReady}
        body={ui.ctaBody}
        button={ui.launchTranslator}
        onClick={() => openApp()}
      />

      <MarketingFooter showHomescreen />
    </MarketingPageShell>
  )
}
