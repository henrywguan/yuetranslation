/**
 * Harbor Quest · cinematic VO lines (Higgsfield Seed Audio).
 * Public URLs under `/assets/harbor-quest/`.
 */
import { playHarborSample, preloadHarborSamples } from './harborSampleAudio'

export const HARBOR_VO_SRC = {
  welcome: '/assets/harbor-quest/vo-scout-welcome.wav',
  outfitter: '/assets/harbor-quest/vo-outfitter-dressup.wav',
  pierCleared: '/assets/harbor-quest/vo-pier-cleared.wav',
  niceCatch: '/assets/harbor-quest/vo-nice-catch.wav',
  saveShack: '/assets/harbor-quest/vo-save-shack.wav',
  maleSail: '/assets/harbor-quest/vo-male-sail.wav',
} as const

export type HarborVoId = keyof typeof HARBOR_VO_SRC

export function preloadHarborVo(): void {
  preloadHarborSamples(Object.values(HARBOR_VO_SRC))
}

export function playHarborVo(id: HarborVoId, gain = 0.92): void {
  playHarborSample(HARBOR_VO_SRC[id], { gain, channel: 'harbor-vo' })
}
