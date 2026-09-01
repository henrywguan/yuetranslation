/** iOS Home Screen / PWA display helpers. */

const TIP_DISMISS_KEY = 'yue.iosHomescreenTip.dismissed'
const TIP_FORCE_KEY = 'yue.iosHomescreenTip.force'

function isForcePreview(): boolean {
  if (typeof window === 'undefined') return false
  try {
    if (new URLSearchParams(window.location.search).get('iosHs') === '1') return true
    if (localStorage.getItem(TIP_FORCE_KEY) === '1') return true
  } catch {
    /* ignore */
  }
  return false
}

/** True when running as an installed Home Screen / standalone web app. */
export function isDisplayStandalone(): boolean {
  if (typeof window === 'undefined') return false
  if (window.matchMedia('(display-mode: standalone)').matches) return true
  const nav = window.navigator as Navigator & { standalone?: boolean }
  return Boolean(nav.standalone)
}

/** iPhone / iPad (incl. iPadOS desktop UA with touch). */
function isIosDevice(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  if (/iPad|iPhone|iPod/.test(ua)) return true
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
}

/** Show Home Screen install guidance when iOS and not already installed as PWA. */
export function shouldOfferIosHomescreenGuide(): boolean {
  if (isForcePreview()) return true
  return isIosDevice() && !isDisplayStandalone()
}

export function isIosHomescreenTipDismissed(): boolean {
  if (isForcePreview()) return false
  try {
    return localStorage.getItem(TIP_DISMISS_KEY) === '1'
  } catch {
    return false
  }
}

export function dismissIosHomescreenTip(): void {
  if (isForcePreview()) return
  try {
    localStorage.setItem(TIP_DISMISS_KEY, '1')
  } catch {
    /* private mode / quota */
  }
}
