import { ui, type Bi } from '../lib/uiCopy'

export type MarketingPlan = {
  id: 'free' | 'pro' | 'max'
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

/** Prices from DeepSeek V4-Pro + Azure live-speech COGS (Pro $15 / Max $35). */
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
    id: 'pro',
    name: ui.planPro,
    monthly: 15,
    annual: 12,
    tagline: ui.tagPro,
    cta: ui.goPro,
    featured: true,
    ctaOpens: 'pricing',
    features: [ui.proFeatLive10, ui.proFeatCamera, ui.proFeatTts, ui.proFeatQuality, ui.proFeatEverything],
  },
  {
    id: 'max',
    name: ui.planMax,
    monthly: 35,
    annual: 28,
    tagline: ui.tagMax,
    cta: ui.goMax,
    ctaOpens: 'pricing',
    unavailable: true,
    features: [ui.maxFeatLive40, ui.maxFeatPower, ui.maxFeatEverything, ui.maxFeatSupport],
  },
]

/** Homepage Free/Pro teaser lives in `landingPlans.ts` (compact duo + demos). */
