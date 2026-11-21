/**
 * Reliable contain-fit math for the `#/chat` companion intro.
 *
 * Portrait MP4 (1080×1920) must FIT every viewport — letterbox on landscape
 * desktops rather than cover-cropping head/legs. We size the element to the
 * exact contain rectangle in pixels and center it on the black stage.
 */
import { agentDebugLog } from './agentDebugLog'

export type IntroContainSize = {
  width: number
  height: number
  scale: number
}

/** @deprecated Alias — prefer IntroContainSize (contain fit, not cover). */
export type IntroCoverSize = IntroContainSize

/** Contain scale so the media fully fits inside `stageW`×`stageH` (may letterbox). */
export function introContainSize(
  stageW: number,
  stageH: number,
  mediaW: number,
  mediaH: number,
): IntroContainSize {
  const sw = Math.max(1, stageW)
  const sh = Math.max(1, stageH)
  const mw = Math.max(1, mediaW)
  const mh = Math.max(1, mediaH)
  const scale = Math.min(sw / mw, sh / mh)
  return {
    width: Math.floor(mw * scale),
    height: Math.floor(mh * scale),
    scale,
  }
}

/** @deprecated Prefer introContainSize. */
export const introCoverSize = introContainSize

/** True when the sized media fits entirely inside the stage (no overflow crop). */
export function introContainFitsStage(
  stageW: number,
  stageH: number,
  sized: Pick<IntroContainSize, 'width' | 'height'>,
): boolean {
  return sized.width <= stageW + 1 && sized.height <= stageH + 1
}

/** @deprecated Prefer introContainFitsStage. */
export const introCoverFillsStage = introContainFitsStage

const DEFAULT_INTRO_MEDIA_W = 1080
const DEFAULT_INTRO_MEDIA_H = 1920

/**
 * Apply pixel contain layout to a video (or fill) element inside a stage.
 * Call on metadata, resize, and orientation changes.
 */
export function layoutIntroContainElement(
  el: HTMLElement,
  stage: HTMLElement,
  mediaW?: number,
  mediaH?: number,
): IntroContainSize {
  const stageW = stage.clientWidth || stage.getBoundingClientRect().width || 1
  const stageH = stage.clientHeight || stage.getBoundingClientRect().height || 1
  const mw =
    mediaW && mediaW > 0
      ? mediaW
      : el instanceof HTMLVideoElement && el.videoWidth > 0
        ? el.videoWidth
        : DEFAULT_INTRO_MEDIA_W
  const mh =
    mediaH && mediaH > 0
      ? mediaH
      : el instanceof HTMLVideoElement && el.videoHeight > 0
        ? el.videoHeight
        : DEFAULT_INTRO_MEDIA_H
  const sized = introContainSize(stageW, stageH, mw, mh)
  // #region agent log
  agentDebugLog('D', 'chatDeepAvatarIntroLayout.ts:layoutIntroContainElement', 'contain layout applied', {
    stageW,
    stageH,
    mw,
    mh,
    scale: sized.scale,
    sizedW: sized.width,
    sizedH: sized.height,
    cropsW: sized.width > stageW + 1,
    cropsH: sized.height > stageH + 1,
    fits: introContainFitsStage(stageW, stageH, sized),
    mode: 'contain-min',
    runId: 'post-fix',
  })
  // #endregion
  el.style.position = 'absolute'
  el.style.left = '50%'
  el.style.top = '50%'
  el.style.width = `${sized.width}px`
  el.style.height = `${sized.height}px`
  el.style.maxWidth = '100%'
  el.style.maxHeight = '100%'
  el.style.transform = 'translate(-50%, -50%)'
  el.style.objectFit = 'contain'
  el.style.objectPosition = 'center center'
  return sized
}

/** @deprecated Prefer layoutIntroContainElement. */
export const layoutIntroCoverElement = layoutIntroContainElement
