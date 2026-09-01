import { ui, type Bi } from '../lib/uiCopy'

export type MarketingPlan = {
  id: 'free' | 'family' | 'max'
  name: Bi
  monthly: number
  /** Effective $/mo when billed annually (shown on the pricing toggle). */
  annual: number
  tagline: Bi
  cta: Bi
  featured?: boolean
  /** Shown greyed out with a tooltip; CTA disabled. */
  unavailable?: boolean
  /** Where the plan CTA should go. */
  ctaOpens: 'app' | 'pricing'
  features: Bi[]
}

/** Marketing prices (Stripe Price IDs hold the billed amounts). */
export const MARKETING_PLANS: MarketingPlan[] = [
  {
    id: 'free',
    name: ui.planFree,
    monthly: 0,
    annual: 0,
    tagline: ui.tagFree,
    cta: ui.getStarted,
    ctaOpens: 'app',
    features: [ui.freeFeatLive20, ui.freeFeatText, ui.freeFeatCamera, ui.freeFeatTts, ui.freeFeatModes],
  },
  {
    id: 'family',
    name: ui.planFamily,
    monthly: 10,
    annual: 8.99,
    tagline: ui.tagFamily,
    cta: ui.goFamily,
    featured: true,
    ctaOpens: 'pricing',
    features: [ui.familyFeatLive10, ui.familyFeatCamera, ui.familyFeatTts, ui.familyFeatQuality, ui.familyFeatEverything],
  },
  {
    id: 'max',
    name: ui.planMax,
    monthly: 20,
    annual: 15,
    tagline: ui.tagMax,
    cta: ui.goMax,
    ctaOpens: 'pricing',
    features: [ui.maxFeatLive40, ui.maxFeatCamera, ui.maxFeatPower, ui.maxFeatEverything, ui.maxFeatSupport],
  },
]

/** Homepage Free/Family teaser lives in `landingPlans.ts` (compact duo + demos). */
