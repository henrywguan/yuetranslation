/**
 * iPhone / iPad WebKit WebGL is the Harbor crash surface.
 *
 * Failure modes we have shipped into:
 * 1. Lambert+cel with dozens of PointLights → GPU process death (black tab).
 * 2. Zoom-out of 4MB willow GLBs → Safari “A problem repeatedly occurred”.
 * 3. Orbit pan while zoomed out → frustum reveals a river of house-village
 *    GLBs; first-draw shader compile + fill-rate Jetsams the tab.
 * 4. Walk back to Save Shack after a mission → first-draws the always-live
 *    landmark GLB cluster (Save / Outfitter / Bank / Arena / Barber + hosts).
 *
 * On constrained GPUs: skip PointLights, skip scenic/bank/landmark V2 kits
 * (craft stays), skip NPC Scout GLBs, cap zoom, shorten far plane, thin
 * `place()`, hide chunk + landmark props beyond a player-centered radius.
 * Desktop unchanged.
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

/** Player-centered draw bubble (world units). Tightens as the sailor pinches out. */
export const HARBOR_IOS_DRAW_RADIUS = 22
export const HARBOR_IOS_DRAW_RADIUS_ZOOMED = 15

/** V2 kits iPhone may still instance (the canoe only). */
export const HARBOR_V2_IOS_KEEP = ['canoe'] as const

/** Kits we do not even fetch on iPhone — landmarks use craft so Save Shack is safe. */
export const HARBOR_V2_IOS_SKIP_PRELOAD = [
  'willow',
  'pier-module',
  'stall-market',
  'bridge-arch',
  'lantern-paper',
  'house-village',
  'save-shack',
  'outfitter',
] as const

/** Scenic willow / pine / cherry / ginkgo / poplar GLBs — iPhone uses craft. */
export function harborAllowV2ScenicTrees(): boolean {
  return !isHarborConstrainedGpu()
}

/**
 * Village houses, huts, stalls, piers, bridges, shore lanterns, pavilions.
 * iPhone uses the v1 craft fallback so a pan cannot submit a wall of GLBs.
 */
export function harborAllowV2BankMeshes(): boolean {
  return !isHarborConstrainedGpu()
}

/** Save / Outfitter / Bank / Arena / Barber shells — craft on iPhone. */
export function harborAllowV2Landmarks(): boolean {
  return !isHarborConstrainedGpu()
}

/** Pier + landmark hosts skip the Scout GLB on iPhone (procedural body stays). */
export function harborAllowNpcScoutGlb(): boolean {
  return !isHarborConstrainedGpu()
}

export function harborSkipBankGrass(): boolean {
  return isHarborConstrainedGpu()
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

/** Draw radius around the sailor — shrinks when pinched out so a pan stays cheap. */
export function harborIosDrawRadius(orbitDistance: number): number {
  const max = HARBOR_ORBIT_DISTANCE_MAX_IOS
  const mid = 8.6
  const t = Math.min(1, Math.max(0, (orbitDistance - mid) / Math.max(0.01, max - mid)))
  return HARBOR_IOS_DRAW_RADIUS + (HARBOR_IOS_DRAW_RADIUS_ZOOMED - HARBOR_IOS_DRAW_RADIUS) * t
}

/** Ground slabs / roads stay drawn — their origin is the chunk center, which
 *  sits outside the sailor bubble and used to vanish the whole bank. */
export function harborKeepLodChild(o: { userData?: { harborLodKeep?: boolean } }): boolean {
  return Boolean(o.userData?.harborLodKeep)
}
