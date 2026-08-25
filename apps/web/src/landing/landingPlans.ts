import { ui, type Bi } from '../lib/uiCopy'
import { MARKETING_PLANS, type MarketingPlan } from './plans'

export type LandingPlanDemo = 'text' | 'speak'

export type LandingPlan = MarketingPlan & {
  demo: LandingPlanDemo
  /** Short homepage feature lines (3 max). */
  teaserFeatures: Bi[]
}

/** Homepage Free / Pro duo — Max stays on the full pricing page. */
export const LANDING_PLANS: LandingPlan[] = [
  {
    ...MARKETING_PLANS.find((p) => p.id === 'free')!,
    demo: 'text',
    teaserFeatures: [ui.landFreeLive, ui.landFreeText, ui.landFreeModes],
  },
  {
    ...MARKETING_PLANS.find((p) => p.id === 'pro')!,
    demo: 'speak',
    teaserFeatures: [ui.landProLive, ui.landProSpeak, ui.landProQuality],
  },
]
