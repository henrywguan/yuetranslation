import type { useYueStore } from './store'

type Entitlement = ReturnType<typeof useYueStore.getState>['entitlement']

/** Family / Business / admin / `allowed.chat` — DeepSeek Chat gate. */
export function canUseDeepseekChat(entitlement: Entitlement): boolean {
  if (!entitlement) return false
  if (entitlement.allowed?.chat) return true
  if (entitlement.isAdmin) return true
  return entitlement.plan === 'family' || entitlement.plan === 'business'
}
