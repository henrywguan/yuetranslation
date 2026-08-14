import { useState } from 'react'
import { motion } from 'framer-motion'
import { Nav } from './Nav'
import { JadeGlassField } from '../components/JadeGlassField'
import { ScrollProgress } from './ScrollProgress'
import { Reveal } from './Reveal'
import { MagneticButton } from './MagneticButton'
import { useSmoothScroll } from './useSmoothScroll'
import { openApp, openHome } from '../lib/siteLinks'
import { BiText } from '../components/BiText'
import { biPlain, ui, type Bi } from '../lib/uiCopy'
import './landing.css'

type Billing = 'monthly' | 'annual'

type Plan = {
  id: string
  name: Bi
  monthly: number
  annual: number
  tagline: Bi
  cta: Bi
  featured?: boolean
  features: Bi[]
}

const PLANS: Plan[] = [
  {
    id: 'free',
    name: ui.planFree,
    monthly: 0,
    annual: 0,
    tagline: ui.tagFree,
    cta: ui.getStarted,
    features: [ui.freeFeatLive20, ui.freeFeatText, ui.freeFeatJp, ui.freeFeatModes],
  },
  {
    id: 'pro',
    name: ui.planPro,
    monthly: 9,
    annual: 7,
    tagline: ui.tagPro,
    cta: ui.goPro,
    featured: true,
    features: [ui.proFeatLive10, ui.proFeatTts, ui.proFeatQuality, ui.proFeatEverything],
  },
  {
    id: 'team',
    name: ui.planTeam,
    monthly: 29,
    annual: 24,
    tagline: ui.tagTeam,
    cta: ui.contactUs,
    features: [ui.teamFeatUnlimited, ui.teamFeatSeats, ui.teamFeatBilling, ui.teamFeatSupport],
  },
]

type Row = { label: Bi; values: [Bi, Bi, Bi] }

const COMPARISON: Row[] = [
  { label: ui.cmpLive, values: [ui.val20m, ui.val10h, ui.valUnlimited] },
  { label: ui.cmpText, values: [ui.valUnlimitedPlain, ui.valUnlimitedPlain, ui.valUnlimitedPlain] },
  { label: ui.cmpJp, values: [{ en: '✓', zh: '✓', jp: '' }, { en: '✓', zh: '✓', jp: '' }, { en: '✓', zh: '✓', jp: '' }] },
  { label: ui.cmpModes, values: [{ en: '✓', zh: '✓', jp: '' }, { en: '✓', zh: '✓', jp: '' }, { en: '✓', zh: '✓', jp: '' }] },
  {
    label: ui.cmpTts,
    values: [
      { en: '—', zh: '—', jp: '' },
      { en: '✓', zh: '✓', jp: '' },
      { en: '✓', zh: '✓', jp: '' },
    ],
  },
  { label: ui.cmpQuality, values: [ui.valStandard, ui.valPriority, ui.valPriority] },
  {
    label: ui.cmpSeats,
    values: [
      { en: '1', zh: '1', jp: '' },
      { en: '1', zh: '1', jp: '' },
      ui.valUpTo20,
    ],
  },
  { label: ui.cmpSupport, values: [ui.valCommunity, ui.valEmail, ui.valPriority] },
]

const FAQ = [
  { q: ui.faq1q, a: ui.faq1a },
  { q: ui.faq2q, a: ui.faq2a },
  { q: ui.faq3q, a: ui.faq3a },
  { q: ui.faq4q, a: ui.faq4a },
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
      <JadeGlassField variant="marketing" />
      <Nav onFeatures={() => openHome()} />

      <header className="pp-hero">
        <motion.div
          className="pp-hero-inner"
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="ln-eyebrow">
            <BiText copy={ui.ppEyebrow} size="sm" />
          </span>
          <h1 className="ln-title pp-title">
            <BiText copy={ui.ppTitle} layout="stack" size="lg" />
          </h1>
          <BiText className="ln-sub" copy={ui.ppSub} layout="stack" size="md" as="p" />

          <div className="pp-toggle" role="group" aria-label={biPlain(ui.monthly)}>
            <button
              type="button"
              className={billing === 'monthly' ? 'active' : ''}
              onClick={() => setBilling('monthly')}
            >
              <BiText copy={ui.monthly} size="sm" />
            </button>
            <button
              type="button"
              className={billing === 'annual' ? 'active' : ''}
              onClick={() => setBilling('annual')}
            >
              <BiText copy={ui.annual} size="sm" />{' '}
              <span className="pp-save">
                <BiText copy={ui.save20} size="sm" hideJp />
              </span>
            </button>
          </div>
        </motion.div>
      </header>

      <section className="ln-section pp-plans-section">
        <Reveal className="pp-plans" stagger={0.1} y={32}>
          {PLANS.map((plan) => (
            <article key={plan.id} className={`ln-price-card ${plan.featured ? 'featured' : ''}`}>
              {plan.featured ? (
                <span className="ln-price-badge">
                  <BiText copy={ui.mostPopular} size="sm" />
                </span>
              ) : null}
              <h3>
                <BiText copy={plan.name} size="md" />
              </h3>
              <p className="pp-tagline">
                <BiText copy={plan.tagline} layout="stack" size="sm" />
              </p>
              <p className="ln-price">
                {price(plan, billing)}
                <span>{plan.monthly === 0 ? '' : '/mo'}</span>
              </p>
              {billing === 'annual' && plan.annual > 0 ? (
                <p className="pp-billed">
                  <BiText copy={ui.billedAnnually} size="sm" />
                </p>
              ) : (
                <p className="pp-billed">&nbsp;</p>
              )}
              <ul>
                {plan.features.map((f) => (
                  <li key={f.en}>
                    <BiText copy={f} layout="stack" size="sm" />
                  </li>
                ))}
              </ul>
              <MagneticButton
                className={`${plan.featured ? 'btn-primary' : 'btn-ghost'} full`}
                onClick={() => openApp()}
              >
                <BiText copy={plan.cta} size="sm" />
              </MagneticButton>
            </article>
          ))}
        </Reveal>
      </section>

      <section className="ln-section pp-compare">
        <Reveal className="ln-section-head">
          <span className="ln-kicker">
            <BiText copy={ui.compareKicker} size="sm" />
          </span>
          <h2 className="ln-h2">
            <BiText copy={ui.compareTitle} layout="stack" size="lg" />
          </h2>
        </Reveal>

        <Reveal className="pp-table-wrap" y={30}>
          <table className="pp-table">
            <thead>
              <tr>
                <th />
                <th>
                  <BiText copy={ui.planFree} size="sm" />
                </th>
                <th className="pp-col-featured">
                  <BiText copy={ui.planPro} size="sm" />
                </th>
                <th>
                  <BiText copy={ui.planTeam} size="sm" />
                </th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((row) => (
                <tr key={row.label.en}>
                  <th scope="row">
                    <BiText copy={row.label} layout="stack" size="sm" />
                  </th>
                  <td>
                    <BiText copy={row.values[0]} size="sm" hideJp={!row.values[0].jp} />
                  </td>
                  <td className="pp-col-featured">
                    <BiText copy={row.values[1]} size="sm" hideJp={!row.values[1].jp} />
                  </td>
                  <td>
                    <BiText copy={row.values[2]} size="sm" hideJp={!row.values[2].jp} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="pp-note">
            <BiText copy={ui.fairUseNote} layout="stack" size="sm" />
          </p>
        </Reveal>
      </section>

      <section className="ln-section pp-faq">
        <Reveal className="ln-section-head">
          <span className="ln-kicker">
            <BiText copy={ui.faqKicker} size="sm" />
          </span>
          <h2 className="ln-h2">
            <BiText copy={ui.faqTitle} layout="stack" size="lg" />
          </h2>
        </Reveal>

        <Reveal className="pp-faq-grid" stagger={0.08} y={24}>
          {FAQ.map((item) => (
            <div className="pp-faq-item" key={item.q.en}>
              <h3>
                <BiText copy={item.q} layout="stack" size="md" />
              </h3>
              <BiText copy={item.a} layout="stack" size="sm" as="p" />
            </div>
          ))}
        </Reveal>
      </section>

      <section className="ln-cta-band">
        <Reveal>
          <h2 className="ln-h2">
            <BiText copy={ui.stillQuestions} layout="stack" size="lg" />
          </h2>
          <BiText className="ln-p" copy={ui.stillBody} layout="stack" size="sm" as="p" />
          <MagneticButton className="btn-primary" onClick={() => openApp()}>
            <BiText copy={ui.backToApp} size="sm" />
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
        <BiText copy={ui.footerTag} layout="stack" size="sm" as="p" />
      </footer>
    </div>
  )
}
