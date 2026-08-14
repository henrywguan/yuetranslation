import { useState } from 'react'
import { motion } from 'framer-motion'
import { Nav } from './Nav'
import { ShaderBackground } from './ShaderBackground'
import { ScrollProgress } from './ScrollProgress'
import { Reveal } from './Reveal'
import { MagneticButton } from './MagneticButton'
import { useSmoothScroll } from './useSmoothScroll'
import { openApp, openHome } from '../lib/siteLinks'
import './landing.css'

type Billing = 'monthly' | 'annual'

type Plan = {
  id: string
  name: string
  monthly: number
  annual: number
  tagline: string
  cta: string
  featured?: boolean
  features: string[]
}

const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    monthly: 0,
    annual: 0,
    tagline: 'For trying it out',
    cta: 'Get started',
    features: [
      '~20 minutes of live translation / month',
      'Unlimited text translation',
      'Jyutping on every line',
      'Solo, Face-to-face & Text modes',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    monthly: 9,
    annual: 7,
    tagline: 'For regular conversations',
    cta: 'Go Pro',
    featured: true,
    features: [
      '~10 hours of live translation / month',
      'Voice playback (auto-speak)',
      'Priority, natural Cantonese quality',
      'Everything in Free',
    ],
  },
  {
    id: 'team',
    name: 'Team',
    monthly: 29,
    annual: 24,
    tagline: 'For classes & businesses',
    cta: 'Contact us',
    features: [
      'Unlimited live translation (fair use)',
      'Up to 20 seats',
      'Shared billing & admin',
      'Priority support',
    ],
  },
]

type Row = { label: string; values: [string, string, string] }

const COMPARISON: Row[] = [
  { label: 'Live translation / month', values: ['20 minutes', '10 hours', 'Unlimited*'] },
  { label: 'Text translation', values: ['Unlimited', 'Unlimited', 'Unlimited'] },
  { label: 'Jyutping romanization', values: ['✓', '✓', '✓'] },
  { label: 'Solo · Face-to-face · Text', values: ['✓', '✓', '✓'] },
  { label: 'Voice playback (auto-speak)', values: ['—', '✓', '✓'] },
  { label: 'Cantonese quality', values: ['Standard', 'Priority', 'Priority'] },
  { label: 'Seats', values: ['1', '1', 'Up to 20'] },
  { label: 'Support', values: ['Community', 'Email', 'Priority'] },
]

const FAQ = [
  {
    q: 'Do I need my own API keys?',
    a: 'No. Paid plans include Cantonese speech and translation. If you self-host, you can plug in your own Azure/OpenAI keys instead.',
  },
  {
    q: 'What counts as a “live minute”?',
    a: 'Time the microphone is actively listening in Solo or Face-to-face mode. Text translation never uses live minutes.',
  },
  {
    q: 'Can I run it on my own server?',
    a: 'Yes — Jyut can run fully self-hosted (open-source speech + translation) or on WordPress with cloud APIs. Team plans include setup guidance.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Absolutely. Plans are month-to-month (or annual for a discount) and you can cancel whenever you like.',
  },
]

function price(plan: Plan, billing: Billing): string {
  const value = billing === 'annual' ? plan.annual : plan.monthly
  return `$${value}`
}

export function PricingPage() {
  useSmoothScroll(true)
  const [billing, setBilling] = useState<Billing>('monthly')

  return (
    <div className="landing pricing-page">
      <ScrollProgress />
      <ShaderBackground />
      <Nav onFeatures={() => openHome()} />

      <header className="pp-hero">
        <motion.div
          className="pp-hero-inner"
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="ln-eyebrow">Pricing</span>
          <h1 className="ln-title pp-title">Pricing that scales with your conversations</h1>
          <p className="ln-sub">
            Start free. Upgrade when you talk more. Text translation and Jyutping are always
            included.
          </p>

          <div className="pp-toggle" role="group" aria-label="Billing period">
            <button
              type="button"
              className={billing === 'monthly' ? 'active' : ''}
              onClick={() => setBilling('monthly')}
            >
              Monthly
            </button>
            <button
              type="button"
              className={billing === 'annual' ? 'active' : ''}
              onClick={() => setBilling('annual')}
            >
              Annual <span className="pp-save">save ~20%</span>
            </button>
          </div>
        </motion.div>
      </header>

      <section className="ln-section pp-plans-section">
        <Reveal className="pp-plans" stagger={0.1} y={32}>
          {PLANS.map((plan) => (
            <article key={plan.id} className={`ln-price-card ${plan.featured ? 'featured' : ''}`}>
              {plan.featured ? <span className="ln-price-badge">Most popular</span> : null}
              <h3>{plan.name}</h3>
              <p className="pp-tagline">{plan.tagline}</p>
              <p className="ln-price">
                {price(plan, billing)}
                <span>{plan.monthly === 0 ? '' : '/mo'}</span>
              </p>
              {billing === 'annual' && plan.annual > 0 ? (
                <p className="pp-billed">billed annually</p>
              ) : (
                <p className="pp-billed">&nbsp;</p>
              )}
              <ul>
                {plan.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <MagneticButton
                className={`${plan.featured ? 'btn-primary' : 'btn-ghost'} full`}
                onClick={() => openApp()}
              >
                {plan.cta}
              </MagneticButton>
            </article>
          ))}
        </Reveal>
      </section>

      <section className="ln-section pp-compare">
        <Reveal className="ln-section-head">
          <span className="ln-kicker">Compare</span>
          <h2 className="ln-h2">Every plan, side by side</h2>
        </Reveal>

        <Reveal className="pp-table-wrap" y={30}>
          <table className="pp-table">
            <thead>
              <tr>
                <th />
                <th>Free</th>
                <th className="pp-col-featured">Pro</th>
                <th>Team</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((row) => (
                <tr key={row.label}>
                  <th scope="row">{row.label}</th>
                  <td>{row.values[0]}</td>
                  <td className="pp-col-featured">{row.values[1]}</td>
                  <td>{row.values[2]}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="pp-note">* Unlimited under fair-use limits.</p>
        </Reveal>
      </section>

      <section className="ln-section pp-faq">
        <Reveal className="ln-section-head">
          <span className="ln-kicker">FAQ</span>
          <h2 className="ln-h2">Good questions</h2>
        </Reveal>

        <Reveal className="pp-faq-grid" stagger={0.08} y={24}>
          {FAQ.map((item) => (
            <div className="pp-faq-item" key={item.q}>
              <h3>{item.q}</h3>
              <p>{item.a}</p>
            </div>
          ))}
        </Reveal>
      </section>

      <section className="ln-cta-band">
        <Reveal>
          <h2 className="ln-h2">Start talking today</h2>
          <p className="ln-p">Free to try. Upgrade only when you need more live minutes.</p>
          <MagneticButton className="btn-primary" onClick={() => openApp()}>
            Launch translator
          </MagneticButton>
        </Reveal>
      </section>

      <footer className="ln-footer">
        <button type="button" className="ln-brand ln-brand-btn" onClick={() => openHome()}>
          <span className="ln-brand-mark" aria-hidden="true">
            粵
          </span>
          <span className="ln-brand-name">Jyut</span>
        </button>
        <p>English ↔ Cantonese, done beautifully.</p>
      </footer>
    </div>
  )
}
