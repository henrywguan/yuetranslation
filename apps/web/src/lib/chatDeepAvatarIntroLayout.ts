/**
 * Reliable fullscreen cover math for the `#/chat` companion intro.
 *
 * CSS `width/height: 100%` + `object-fit: cover` on `<video>` is flaky across
 * desktop viewports (grid + replaced-element sizing). We size the element to
 * the exact cover rectangle in pixels and let the stage `overflow: hidden`
 * crop — guaranteed fill, no letterbox / half-screen gaps.
 */

export type IntroCoverSize = {
  width: number
  height: number
  scale: number
}

/** Cover scale so the media fully paints `stageW`×`stageH` (may overflow). */
export function introCoverSize(
  stageW: number,
  stageH: number,
  mediaW: number,
  mediaH: number,
): IntroCoverSize {
  const sw = Math.max(1, stageW)
  const sh = Math.max(1, stageH)
  const mw = Math.max(1, mediaW)
  const mh = Math.max(1, mediaH)
  const scale = Math.max(sw / mw, sh / mh)
  return {
    width: Math.ceil(mw * scale),
    height: Math.ceil(mh * scale),
    scale,
  }
}

/** True when the sized media fully covers the stage (no letterbox gaps). */
export function introCoverFillsStage(
  stageW: number,
  stageH: number,
  sized: Pick<IntroCoverSize, 'width' | 'height'>,
): boolean {
  return sized.width >= stageW - 1 && sized.height >= stageH - 1
}

const DEFAULT_INTRO_MEDIA_W = 1080
const DEFAULT_INTRO_MEDIA_H = 1920

/**
 * Apply pixel cover layout to a video (or fill) element inside an overflow-hidden stage.
 * Call on metadata, resize, and orientation changes.
 */
export function layoutIntroCoverElement(
  el: HTMLElement,
  stage: HTMLElement,
  mediaW?: number,
  mediaH?: number,
): IntroCoverSize {
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
  const sized = introCoverSize(stageW, stageH, mw, mh)
  el.style.position = 'absolute'
  el.style.left = '50%'
  el.style.top = '50%'
  el.style.width = `${sized.width}px`
  el.style.height = `${sized.height}px`
  el.style.maxWidth = 'none'
  el.style.maxHeight = 'none'
  el.style.transform = 'translate(-50%, -50%)'
  el.style.objectFit = 'cover'
  el.style.objectPosition = 'center center'
  return sized
}
