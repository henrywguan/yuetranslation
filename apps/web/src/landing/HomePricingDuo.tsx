import { BiText } from '../components/BiText'
import { openApp, openPricing } from '../lib/siteLinks'
import { ui } from '../lib/uiCopy'
import { LANDING_PLANS } from './landingPlans'
import { MagneticButton } from './MagneticButton'
import { PriceDemo, PriceFeatIcon } from './PriceDemos'
import { Reveal } from './Reveal'

/** Compact Free / Pro duo with micro-demos — studio teaser, not a full table. */
export function HomePricingDuo() {
  return (
    <section className="ln-section ln-pricing" id="pricing">
      <Reveal className="ln-section-head ln-section-head--tight">
        <span className="ln-kicker">
          <BiText copy={ui.pricingKicker} size="sm" />
        </span>
        <h2 className="ln-h2">
          <BiText copy={ui.pricingTitle} size="lg" />
        </h2>
      </Reveal>

      <Reveal className="ln-price-grid ln-price-grid--duo" stagger={0.1} y={22}>
        {LANDING_PLANS.map((plan) => (
          <article
            key={plan.id}
            className={`ln-price-card ln-price-card--spotlight${plan.featured ? ' featured' : ''}`}
          >
            {plan.featured ? (
              <span className="ln-price-badge">
                <BiText copy={ui.mostPopular} size="sm" />
              </span>
            ) : null}

            <div className="ln-price-card-top">
              <div className="ln-price-name">
                <h3>
                  <BiText copy={plan.name} size="md" />
                </h3>
              </div>
              <div className="ln-price-rule" aria-hidden="true" />
              <div className="ln-price-block">
                <p className="ln-price">${plan.monthly}</p>
                <p className="ln-price-period">
                  /month<span className="ln-price-period-zh">(月)</span>
                </p>
                {plan.id === 'pro' ? (
                  <p className="ln-price-annual">
                    <BiText copy={ui.landAnnualHint} size="sm" hideJp />
                  </p>
                ) : null}
              </div>
            </div>

            <PriceDemo kind={plan.demo} />

            <ul className="ln-price-feats">
              {plan.teaserFeatures.map((f, i) => (
                <li key={f.en}>
                  <PriceFeatIcon planId={plan.id === 'pro' ? 'pro' : 'free'} index={i} />
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
  )
}
