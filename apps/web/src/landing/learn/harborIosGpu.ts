/**
 * iPhone / iPad WebKit WebGL is the Harbor black-screen surface.
 *
 * A river boot with 7 chunks × lanterns + landmark portals easily ships
 * 30+ PointLights. Three.js then compiles Lambert+cel with
 * `NUM_POINT_LIGHTS` that large; iOS Safari rejects the program or kills
 * the GPU process. The tab goes pitch-black (status bar only — no HUD).
 *
 * On constrained GPUs we skip PointLights (emissive lantern paper stays)
 * and boot a leaner chunk window. Desktop is unchanged.
 */
export function isHarborConstrainedGpu(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  if (/iPhone|iPad|iPod/i.test(ua)) return true
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
}
