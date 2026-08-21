/** iOS Home Screen / PWA display helpers. */

const TIP_DISMISS_KEY = 'yue.iosHomescreenTip.dismissed'

export function isDisplayStandalone(): boolean {
  if (typeof window === 'undefined') return false
  if (window.matchMedia('(display-mode: standalone)').matches) return true
  const nav = window.navigator as Navigator & { standalone?: boolean }
  return Boolean(nav.standalone)
}

/** iPhone / iPad (incl. iPadOS desktop UA with touch). */
export function isIosDevice(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  if (/iPad|iPhone|iPod/.test(ua)) return true
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
}

/** Show Home Screen install guidance when iOS and not already installed as PWA. */
export function shouldOfferIosHomescreenGuide(): boolean {
  return isIosDevice() && !isDisplayStandalone()
}

export function isIosHomescreenTipDismissed(): boolean {
  try {
    return localStorage.getItem(TIP_DISMISS_KEY) === '1'
  } catch {
    return false
  }
}

export function dismissIosHomescreenTip(): void {
  try {
    localStorage.setItem(TIP_DISMISS_KEY, '1')
  } catch {
    /* private mode / quota */
  }
}
