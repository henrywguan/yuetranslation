import { useState } from 'react'
import { motion } from 'framer-motion'
import { Reveal } from './Reveal'
import { MagneticButton } from './MagneticButton'
import { MarketingCtaBand } from './MarketingCtaBand'
import { MarketingFooter } from './MarketingFooter'
import { MarketingPageShell } from './MarketingPageShell'
import { openApp, openHome, openPricing } from '../lib/siteLinks'
import { startCheckout } from '../lib/billing'
import { getAccessToken, openAuthScreen, supabaseEnabled } from '../lib/auth'
import { BiText } from '../components/BiText'
import { biPlain, ui, type Bi } from '../lib/uiCopy'
import { MARKETING_PLANS, type MarketingPlan } from './plans'
import { inkEase } from '../lib/motion'
import './landing.css'

type Billing = 'monthly' | 'annual'

type Row = { label: Bi; values: [Bi, Bi, Bi] }

const COMPARISON: Row[] = [
  { label: ui.cmpLive, values: [ui.val5m, ui.val20m, ui.val40h] },
  { label: ui.cmpText, values: [ui.valUnlimitedPlain, ui.valUnlimitedPlain, ui.valUnlimitedPlain] },
  { label: ui.cmpJp, values: [{ en: '✓', zh: '✓', jp: '' }, { en: '✓', zh: '✓', jp: '' }, { en: '✓', zh: '✓', jp: '' }] },
  { label: ui.cmpModes, values: [{ en: '✓', zh: '✓', jp: '' }, { en: '✓', zh: '✓', jp: '' }, { en: '✓', zh: '✓', jp: '' }] },
  {
    label: ui.cmpCamera,
    values: [ui.valCamFree, ui.valCamPro, ui.valCamMax],
  },
  {
    label: ui.cmpTts,
    values: [ui.valMetered, ui.valUnlimitedPlain, ui.valUnlimitedPlain],
  },
  {
    label: ui.cmpAutoSpeak,
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
      { en: '1', zh: '1', jp: '' },
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

function price(plan: MarketingPlan, billing: Billing): string {
  const value = billing === 'annual' ? plan.annual : plan.monthly
  return `$${value}`
}

/** Yearly charge shown under the effective $/mo on annual cards. */
function annualTotalLabel(plan: MarketingPlan): string {
  const total = Math.round(plan.annual * 12 * 100) / 100
  return Number.isInteger(total) ? String(total) : total.toFixed(2)
}

async function onPlanCta(plan: MarketingPlan, billing: Billing) {
  if (plan.unavailable) return
  if (plan.ctaOpens === 'app') {
    openApp()
    return
  }
  if (!supabaseEnabled()) {
    openPricing()
    return
  }
  const token = await getAccessToken()
  if (!token) {
    openAuthScreen()
    return
  }
  if (plan.id === 'pro' || plan.id === 'max') {
    await startCheckout(plan.id, billing === 'annual' ? 'year' : 'month')
    return
  }
  openPricing()
}

export function PricingPage() {
  const [billing, setBilling] = useState<Billing>('monthly')

  return (
    <MarketingPageShell className="pricing-page" background="orbital" onFeatures={() => openHome()}>
      <header className="pp-hero">
        <motion.div
          className="pp-hero-inner"
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.85, ease: inkEase }}
        >
          <span className="ln-eyebrow">
            <BiText copy={ui.ppEyebrow} size="sm" />
          </span>
          <h1 className="ln-title pp-title">
            <BiText copy={ui.ppTitle} size="lg" />
          </h1>
          <BiText className="ln-sub" copy={ui.ppSub} size="md" as="p" />

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
          {MARKETING_PLANS.map((plan) => (
            <article
              key={plan.id}
              className={[
                'ln-price-card',
                plan.featured ? 'featured' : '',
                plan.unavailable ? 'is-unavailable' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              aria-disabled={plan.unavailable || undefined}
              title={plan.unavailable ? ui.maxPlanUnavailable.en : undefined}
            >
              {plan.unavailable ? (
                <span className="ln-price-card__tip" role="tooltip">
                  {ui.maxPlanUnavailable.en}
                </span>
              ) : null}
              {plan.featured ? (
                <span className="ln-price-badge">
                  <BiText copy={ui.mostPopular} size="sm" />
                </span>
              ) : null}
              <h3>
                <BiText copy={plan.name} size="md" />
              </h3>
              <p className="pp-tagline">
                <BiText copy={plan.tagline} size="sm" />
              </p>
              <p className="ln-price">
                {price(plan, billing)}
                <span>{plan.monthly === 0 ? '' : '/mo'}</span>
              </p>
              {billing === 'annual' && plan.annual > 0 ? (
                <p className="pp-billed">
                  <BiText copy={ui.billedAnnuallyTotal(annualTotalLabel(plan))} size="sm" />
                </p>
              ) : (
                <p className="pp-billed">&nbsp;</p>
              )}
              <ul>
                {plan.features.map((f) => (
                  <li key={f.en}>
                    <BiText copy={f} size="sm" />
                  </li>
                ))}
              </ul>
              <MagneticButton
                className={`${plan.featured ? 'btn-primary' : 'btn-ghost'} full`}
                disabled={plan.unavailable}
                onClick={() => void onPlanCta(plan, billing)}
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
            <BiText copy={ui.compareTitle} size="lg" />
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
                <th className="pp-col-max">
                  <BiText copy={ui.planMax} size="sm" />
                </th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((row) => (
                <tr key={row.label.en} className={row.label.en === ui.cmpCamera.en ? 'pp-row-camera' : undefined}>
                  <th scope="row">
                    <BiText copy={row.label} size="sm" />
                  </th>
                  <td>
                    <BiText copy={row.values[0]} size="sm" />
                  </td>
                  <td className="pp-col-featured">
                    <BiText copy={row.values[1]} size="sm" />
                  </td>
                  <td className="pp-col-max">
                    <BiText copy={row.values[2]} size="sm" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="pp-note">
            <BiText copy={ui.fairUseNote} size="sm" />
          </p>
        </Reveal>
      </section>

      <section className="ln-section pp-cam-card-section" aria-labelledby="pp-cam-card-title">
        <Reveal className="pp-cam-card" y={28}>
          <div className="pp-cam-card-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="28" height="28">
              <path
                d="M9 7l1.2-2h3.6L15 7h3a2 2 0 012 2v8a2 2 0 01-2 2H6a2 2 0 01-2-2V9a2 2 0 012-2h3z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinejoin="round"
              />
              <circle cx="12" cy="13" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.7" />
            </svg>
          </div>
          <div className="pp-cam-card-copy">
            <h2 id="pp-cam-card-title" className="pp-cam-card-title">
              <BiText copy={ui.camMinutesCardTitle} size="md" />
            </h2>
            <BiText className="pp-cam-card-body" copy={ui.camMinutesCardBody} size="sm" as="p" />
          </div>
        </Reveal>
      </section>

      <section className="ln-section pp-faq">
        <Reveal className="ln-section-head">
          <span className="ln-kicker">
            <BiText copy={ui.faqKicker} size="sm" />
          </span>
          <h2 className="ln-h2">
            <BiText copy={ui.faqTitle} size="lg" />
          </h2>
        </Reveal>

        <Reveal className="pp-faq-grid" stagger={0.08} y={24}>
          {FAQ.map((item) => (
            <div className="pp-faq-item" key={item.q.en}>
              <h3>
                <BiText copy={item.q} size="md" />
              </h3>
              <BiText copy={item.a} size="sm" as="p" />
            </div>
          ))}
        </Reveal>
      </section>

      <MarketingCtaBand
        title={ui.stillQuestions}
        body={ui.stillBody}
        button={ui.backToApp}
        onClick={() => openApp()}
      />

      <MarketingFooter />
    </MarketingPageShell>
  )
}
