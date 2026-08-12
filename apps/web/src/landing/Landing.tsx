import { lazy, Suspense } from 'react'
import { motion } from 'framer-motion'
import { ShaderBackground } from './ShaderBackground'
import { ScrollProgress } from './ScrollProgress'
import { Reveal } from './Reveal'
import { MagneticButton } from './MagneticButton'
import { LiveDemo } from './LiveDemo'
import { Nav } from './Nav'
import { useSmoothScroll } from './useSmoothScroll'
import { navigate } from '../lib/useHashRoute'
import './landing.css'

// three.js is heavy — code-split it so it never blocks first paint.
const HeroObject = lazy(() =>
  import('./HeroObject').then((m) => ({ default: m.HeroObject })),
)

const MODES = [
  {
    title: 'Solo',
    zh: '獨白',
    desc: 'Speak English or Cantonese and watch the translation appear full‑screen, instantly.',
  },
  {
    title: 'Face to face',
    zh: '面對面',
    desc: 'One phone between two people — a split, mirrored view so each side reads their language.',
  },
  {
    title: 'Text',
    zh: '文字',
    desc: 'Type either direction. Perfect for menus, signs, and messages you want to get right.',
  },
]

const FEATURES = [
  { title: 'Jyutping built in', desc: 'Romanization under every Cantonese line so you can say it, not just read it.' },
  { title: 'Hong Kong Cantonese', desc: 'Tuned for colloquial 粵語 (係, 唔, 喺, 咗) — not Mandarin or formal written Chinese.' },
  { title: 'Fast & fluid', desc: 'Interim results while you speak, refined finals when you pause.' },
  { title: 'Yours to host', desc: 'Runs on WordPress with cloud speech, or fully self‑hosted when you want.' },
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
          <span className="ln-eyebrow">English ↔ 廣東話 · live translator</span>
          <h1 className="ln-title">
            Speak. <span className="ln-title-accent">See.</span> Understand.
          </h1>
          <p className="ln-sub">
            Real‑time English and Cantonese translation with Jyutping — beautiful enough to
            live on your website, fast enough for a real conversation.
          </p>
          <div className="ln-hero-cta">
            <MagneticButton className="btn-primary" onClick={() => navigate('app')}>
              Launch translator
            </MagneticButton>
            <MagneticButton className="btn-ghost" onClick={() => scrollToId('demo')}>
              Try the demo ↓
            </MagneticButton>
          </div>
          <div className="ln-hero-stats">
            <div>
              <strong>2</strong>
              <span>languages, done well</span>
            </div>
            <div>
              <strong>3</strong>
              <span>modes</span>
            </div>
            <div>
              <strong>粵</strong>
              <span>Jyutping on every line</span>
            </div>
          </div>
        </motion.div>
        <div className="ln-scroll-hint" aria-hidden="true">
          <span />
        </div>
      </header>

      <section className="ln-section" id="features">
        <Reveal className="ln-section-head">
          <span className="ln-kicker">Three ways to talk</span>
          <h2 className="ln-h2">One app, every conversation</h2>
        </Reveal>

        <Reveal className="ln-mode-grid" stagger={0.12} y={34}>
          {MODES.map((m) => (
            <article className="ln-mode-card" key={m.title}>
              <span className="ln-mode-zh" aria-hidden="true">
                {m.zh}
              </span>
              <h3>{m.title}</h3>
              <p>{m.desc}</p>
            </article>
          ))}
        </Reveal>

        <Reveal className="ln-feature-grid" stagger={0.08} y={24}>
          {FEATURES.map((f) => (
            <div className="ln-feature" key={f.title}>
              <span className="ln-feature-dot" aria-hidden="true" />
              <div>
                <h4>{f.title}</h4>
                <p>{f.desc}</p>
              </div>
            </div>
          ))}
        </Reveal>
      </section>

      <section className="ln-section ln-demo" id="demo">
        <Reveal className="ln-demo-copy">
          <span className="ln-kicker">Try it now</span>
          <h2 className="ln-h2">Translate a phrase, live</h2>
          <p className="ln-p">
            This runs against the real translation API. Type anything or tap a sample and watch the
            Cantonese — with Jyutping — appear underneath.
          </p>
          <MagneticButton className="btn-primary" onClick={() => navigate('app')}>
            Open the full app
          </MagneticButton>
        </Reveal>
        <Reveal className="ln-demo-stage" y={40}>
          <LiveDemo />
        </Reveal>
      </section>

      <section className="ln-section" id="pricing">
        <Reveal className="ln-section-head">
          <span className="ln-kicker">Simple pricing</span>
          <h2 className="ln-h2">Start free. Upgrade when you talk more.</h2>
        </Reveal>

        <Reveal className="ln-price-grid" stagger={0.12} y={34}>
          <article className="ln-price-card">
            <h3>Free</h3>
            <p className="ln-price">
              $0<span>/month</span>
            </p>
            <ul>
              <li>~20 minutes of live translation / month</li>
              <li>Unlimited text translation</li>
              <li>Jyutping on every line</li>
              <li>Solo, Face‑to‑face & Text modes</li>
            </ul>
            <MagneticButton className="btn-ghost full" onClick={() => navigate('app')}>
              Get started
            </MagneticButton>
          </article>

          <article className="ln-price-card featured">
            <span className="ln-price-badge">Most popular</span>
            <h3>Pro</h3>
            <p className="ln-price">
              $9<span>/month</span>
            </p>
            <ul>
              <li>~10 hours of live translation / month</li>
              <li>Voice playback (auto‑speak)</li>
              <li>Priority, natural Cantonese quality</li>
              <li>Everything in Free</li>
            </ul>
            <MagneticButton className="btn-primary full" onClick={() => navigate('app')}>
              Go Pro
            </MagneticButton>
          </article>
        </Reveal>

        <Reveal className="ln-price-more">
          <button type="button" className="ln-textlink" onClick={() => navigate('pricing')}>
            Compare all plans →
          </button>
        </Reveal>
      </section>

      <section className="ln-cta-band">
        <Reveal>
          <h2 className="ln-h2">Ready to be understood?</h2>
          <p className="ln-p">Open Yue and have your first bilingual conversation in seconds.</p>
          <MagneticButton className="btn-primary" onClick={() => navigate('app')}>
            Launch translator
          </MagneticButton>
        </Reveal>
      </section>

      <footer className="ln-footer">
        <div className="ln-brand">
          <span className="ln-brand-mark" aria-hidden="true">
            粵
          </span>
          <span className="ln-brand-name">Yue</span>
        </div>
        <p>English ↔ Cantonese, done beautifully.</p>
      </footer>
    </div>
  )
}
