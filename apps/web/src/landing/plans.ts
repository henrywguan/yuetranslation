import { ui, type Bi } from '../lib/uiCopy'

export type MarketingPlan = {
  id: 'free' | 'pro' | 'team'
  name: Bi
  monthly: number
  annual: number
  tagline: Bi
  cta: Bi
  featured?: boolean
  /** Where the plan CTA should go. */
  ctaOpens: 'app' | 'pricing'
  features: Bi[]
}

export const MARKETING_PLANS: MarketingPlan[] = [
  {
    id: 'free',
    name: ui.planFree,
    monthly: 0,
    annual: 0,
    tagline: ui.tagFree,
    cta: ui.getStarted,
    ctaOpens: 'app',
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
    ctaOpens: 'pricing',
    features: [ui.proFeatLive10, ui.proFeatTts, ui.proFeatQuality, ui.proFeatEverything],
  },
  {
    id: 'team',
    name: ui.planTeam,
    monthly: 29,
    annual: 24,
    tagline: ui.tagTeam,
    cta: ui.contactUs,
    ctaOpens: 'pricing',
    features: [ui.teamFeatUnlimited, ui.teamFeatSeats, ui.teamFeatBilling, ui.teamFeatSupport],
  },
]

export const LANDING_PLANS = MARKETING_PLANS.filter((p) => p.id !== 'team')
