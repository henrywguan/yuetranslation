import type { useYueStore } from './store'
import { hasChatGateSession } from './chatGateSession'

type Entitlement = ReturnType<typeof useYueStore.getState>['entitlement']

/** Family / Business / admin / `allowed.chat` / owner-fallback gate — DeepSeek Chat gate. */
export function canUseDeepseekChat(entitlement: Entitlement): boolean {
  if (hasChatGateSession()) return true
  if (!entitlement) return false
  if (entitlement.allowed?.chat) return true
  if (entitlement.isAdmin) return true
  return entitlement.plan === 'family' || entitlement.plan === 'business'
}
