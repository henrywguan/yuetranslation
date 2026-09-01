import { ui, type Bi } from '../lib/uiCopy'
import { MARKETING_PLANS, type MarketingPlan } from './plans'

export type LandingPlanDemo = 'text' | 'speak'

export type LandingPlan = MarketingPlan & {
  demo: LandingPlanDemo
  /** Short homepage feature lines (3 max). */
  teaserFeatures: Bi[]
}

/** Homepage Free / Family duo — Business stays on the full pricing page. */
export const LANDING_PLANS: LandingPlan[] = [
  {
    ...MARKETING_PLANS.find((p) => p.id === 'free')!,
    demo: 'text',
    teaserFeatures: [ui.landFreeLive, ui.landFreeText, ui.landFreeCam],
  },
  {
    ...MARKETING_PLANS.find((p) => p.id === 'family')!,
    demo: 'speak',
    teaserFeatures: [ui.landFamilyLive, ui.landFamilyCam, ui.landFamilySpeak],
  },
]
