import { lazy, Suspense } from 'react'
import { motion } from 'framer-motion'
import { ShaderBackground } from './ShaderBackground'
import { ScrollProgress } from './ScrollProgress'
import { Reveal } from './Reveal'
import { MagneticButton } from './MagneticButton'
import { LiveDemo } from './LiveDemo'
import { Nav } from './Nav'
import { useSmoothScroll } from './useSmoothScroll'
import { openApp, openPricing } from '../lib/siteLinks'
import { BiText } from '../components/BiText'
import { ui } from '../lib/uiCopy'
import './landing.css'

// three.js is heavy — code-split it so it never blocks first paint.
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
    <div className="landing">
      <ScrollProgress />
      <ShaderBackground />

      <Nav onFeatures={() => scrollToId('features')} />

      <header className="ln-hero">
        <Suspense fallback={null}>
          <HeroObject />
        </Suspense>
        <motion.div
          className="ln-hero-inner"
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="ln-eyebrow">
            <BiText copy={ui.heroEyebrow} size="sm" />
          </span>
          <h1 className="ln-title">
            <BiText copy={ui.heroTitleSpeak} size="lg" />{' '}
            <span className="ln-title-accent">
              <BiText copy={ui.heroTitleSee} size="lg" />
            </span>{' '}
            <BiText copy={ui.heroTitleUnderstand} size="lg" />
          </h1>
          <BiText className="ln-sub" copy={ui.heroSub} layout="stack" size="md" as="p" />
          <div className="ln-hero-cta">
            <MagneticButton className="btn-primary" onClick={() => openApp()}>
              <BiText copy={ui.launchTranslator} size="sm" />
            </MagneticButton>
            <MagneticButton className="btn-ghost" onClick={() => scrollToId('demo')}>
              <BiText copy={ui.tryDemo} size="sm" />
            </MagneticButton>
          </div>
          <div className="ln-hero-stats">
            <div>
              <strong>2</strong>
              <BiText copy={ui.statLangs} layout="stack" size="sm" />
            </div>
            <div>
              <strong>3</strong>
              <BiText copy={ui.statModes} layout="stack" size="sm" />
            </div>
            <div>
              <strong>粵</strong>
              <BiText copy={ui.statJyutping} layout="stack" size="sm" />
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
            <BiText copy={ui.modesTitle} layout="stack" size="lg" />
          </h2>
        </Reveal>

        <Reveal className="ln-mode-grid" stagger={0.12} y={34}>
          {MODES.map((m) => (
            <article className="ln-mode-card" key={m.title.en}>
              <h3>
                <BiText copy={m.title} size="md" />
              </h3>
              <BiText copy={m.desc} layout="stack" size="sm" as="p" />
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
                <BiText copy={f.desc} layout="stack" size="sm" as="p" />
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
            <BiText copy={ui.demoTitle} layout="stack" size="lg" />
          </h2>
          <BiText className="ln-p" copy={ui.demoBody} layout="stack" size="sm" as="p" />
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
            <BiText copy={ui.pricingTitle} layout="stack" size="lg" />
          </h2>
        </Reveal>

        <Reveal className="ln-price-grid" stagger={0.12} y={34}>
          <article className="ln-price-card">
            <h3>
              <BiText copy={ui.planFree} size="md" />
            </h3>
            <p className="ln-price">
              $0
              <span>
                <BiText copy={ui.perMonth} size="sm" />
              </span>
            </p>
            <ul>
              <li>
                <BiText copy={ui.freeFeatLive20} layout="stack" size="sm" />
              </li>
              <li>
                <BiText copy={ui.freeFeatText} layout="stack" size="sm" />
              </li>
              <li>
                <BiText copy={ui.freeFeatJp} layout="stack" size="sm" />
              </li>
              <li>
                <BiText copy={ui.freeFeatModes} layout="stack" size="sm" />
              </li>
            </ul>
            <MagneticButton className="btn-ghost full" onClick={() => openApp()}>
              <BiText copy={ui.getStarted} size="sm" />
            </MagneticButton>
          </article>

          <article className="ln-price-card featured">
            <span className="ln-price-badge">
              <BiText copy={ui.mostPopular} size="sm" />
            </span>
            <h3>
              <BiText copy={ui.planPro} size="md" />
            </h3>
            <p className="ln-price">
              $9
              <span>
                <BiText copy={ui.perMonth} size="sm" />
              </span>
            </p>
            <ul>
              <li>
                <BiText copy={ui.proFeatLive10} layout="stack" size="sm" />
              </li>
              <li>
                <BiText copy={ui.proFeatTts} layout="stack" size="sm" />
              </li>
              <li>
                <BiText copy={ui.proFeatQuality} layout="stack" size="sm" />
              </li>
              <li>
                <BiText copy={ui.proFeatEverything} layout="stack" size="sm" />
              </li>
            </ul>
            <MagneticButton className="btn-primary full" onClick={() => openPricing()}>
              <BiText copy={ui.goPro} size="sm" />
            </MagneticButton>
          </article>
        </Reveal>

        <Reveal className="ln-price-more">
          <button type="button" className="ln-textlink" onClick={() => openPricing()}>
            <BiText copy={ui.comparePlans} size="sm" />
          </button>
        </Reveal>
      </section>

      <section className="ln-cta-band">
        <Reveal>
          <h2 className="ln-h2">
            <BiText copy={ui.ctaReady} layout="stack" size="lg" />
          </h2>
          <BiText className="ln-p" copy={ui.ctaBody} layout="stack" size="sm" as="p" />
          <MagneticButton className="btn-primary" onClick={() => openApp()}>
            <BiText copy={ui.launchTranslator} size="sm" />
          </MagneticButton>
        </Reveal>
      </section>

      <footer className="ln-footer">
        <div className="ln-brand">
          <span className="ln-brand-mark" aria-hidden="true">
            粵
          </span>
          <span className="ln-brand-name">Jyut</span>
        </div>
        <BiText copy={ui.footerTag} layout="stack" size="sm" as="p" />
      </footer>
    </div>
  )
}
