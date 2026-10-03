import { useEffect, useState } from 'react'

/**
 * Which Practice Partner screen this browser shows.
 * Presence is the living companion. Orbital is the saved ring UI.
 */
export type PartnerLook = 'presence' | 'orbital'

export const PARTNER_LOOK_KEY = 'yue-partner-look'
export const PARTNER_LOOK_EVENT = 'yue-partner-look'

export function readPartnerLook(): PartnerLook {
  if (typeof localStorage === 'undefined') return 'presence'
  try {
    return localStorage.getItem(PARTNER_LOOK_KEY) === 'orbital' ? 'orbital' : 'presence'
  } catch {
    return 'presence'
  }
}

export function writePartnerLook(look: PartnerLook) {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(PARTNER_LOOK_KEY, look)
  } catch {
    /* private mode */
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(PARTNER_LOOK_EVENT))
  }
}

export function usePartnerLook(): PartnerLook {
  const [look, setLook] = useState<PartnerLook>(() => readPartnerLook())
  useEffect(() => {
    const sync = () => setLook(readPartnerLook())
    window.addEventListener('storage', sync)
    window.addEventListener(PARTNER_LOOK_EVENT, sync)
    return () => {
      window.removeEventListener('storage', sync)
      window.removeEventListener(PARTNER_LOOK_EVENT, sync)
    }
  }, [])
  return look
}
