import { ui, type Bi } from '../lib/uiCopy'

export type MarketingPlan = {
  id: 'free' | 'family' | 'business'
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
    id: 'business',
    name: ui.planBusiness,
    monthly: 20,
    annual: 15,
    tagline: ui.tagBusiness,
    cta: ui.goBusiness,
    ctaOpens: 'pricing',
    features: [
      ui.businessFeatLive40,
      ui.businessFeatCamera,
      ui.businessFeatPower,
      ui.businessFeatEverything,
      ui.businessFeatSupport,
    ],
  },
]

/** Homepage Free/Family teaser lives in `landingPlans.ts` (compact duo + demos). */
