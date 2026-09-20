/**
 * iPhone / iPad WebKit WebGL is the Harbor crash surface.
 *
 * Two failure modes we have shipped into:
 * 1. Lambert+cel with dozens of PointLights → GPU process death (black tab).
 * 2. Zoom-out / chunk stream of 4MB willow GLBs → Safari
 *    “A problem repeatedly occurred” (Jetsam / GPU watchdog).
 *
 * On constrained GPUs we skip PointLights, skip scenic willow GLBs
 * (craft canopy stays), cap zoom-out, shorten the far plane, and
 * thin decorative `place()` counts. Desktop is unchanged.
 */
export function isHarborConstrainedGpu(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  if (/iPhone|iPad|iPod/i.test(ua)) return true
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
}

/** Desktop pinch/wheel max — bird’s-eye river / Guan lagoon. */
export const HARBOR_ORBIT_DISTANCE_MAX = 16.5
/**
 * iPhone max — still past the default 8.6 mid-zoom, short of the
 * 16.5 bird’s-eye that puts 3–4 high-poly chunks on screen at once.
 */
export const HARBOR_ORBIT_DISTANCE_MAX_IOS = 10.8

/** Camera far plane. iPhone matches a tighter fog veil. */
export const HARBOR_CAMERA_FAR = 180
export const HARBOR_CAMERA_FAR_IOS = 95

/** Scenic willow / pine / cherry / ginkgo / poplar GLBs — iPhone uses craft. */
export function harborAllowV2ScenicTrees(): boolean {
  return !isHarborConstrainedGpu()
}

/** Thin bank scatter on iPhone (houses/trees/grass `place()` counts). */
export function harborPlaceCount(n: number): number {
  if (!isHarborConstrainedGpu() || n <= 1) return n
  return Math.max(1, Math.round(n * 0.5))
}

export function harborOrbitDistanceMax(): number {
  return isHarborConstrainedGpu() ? HARBOR_ORBIT_DISTANCE_MAX_IOS : HARBOR_ORBIT_DISTANCE_MAX
}

export function harborCameraFar(): number {
  return isHarborConstrainedGpu() ? HARBOR_CAMERA_FAR_IOS : HARBOR_CAMERA_FAR
}
