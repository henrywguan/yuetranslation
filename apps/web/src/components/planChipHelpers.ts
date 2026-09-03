import {
  type BadgeUsageMetric,
} from '../lib/badgeUsagePref'
import { formatExactDuration } from '../lib/formatDuration'
import { formatChars } from '../lib/formatChars'
import { ui, type Bi } from '../lib/uiCopy'
import type { Entitlement } from '../lib/types'

export function planLabel(plan: string): Bi {
  if (plan === 'family') return ui.planFamily
  if (plan === 'business') return ui.planBusiness
  if (plan === 'free') return ui.planFree
  return ui.planGuest
}

export function voiceCopy(entitlement: Entitlement): Bi {
  const unlimited = Boolean(
    entitlement.ttsUnlimited || entitlement.plan === 'family' || entitlement.plan === 'business',
  )
  if (unlimited) return ui.charsUsedUnlimited(formatChars(entitlement.usage.ttsChars))
  return ui.charsLeft(formatChars(entitlement.remaining.ttsChars))
}

export function liveCopy(entitlement: Entitlement): Bi {
  const used = entitlement.usage.liveSeconds ?? 0
  const left = Math.max(0, entitlement.remaining.liveSeconds ?? 0)
  return ui.liveUsedRemaining(formatExactDuration(used), formatExactDuration(left))
}

export function cameraCopy(entitlement: Entitlement): Bi {
  const unlimited = Boolean(entitlement.cameraUnlimited)
  const used = entitlement.usage.cameraSeconds ?? 0
  if (unlimited) return ui.camMinutesUsedUnlimited(formatExactDuration(used))
  const left = Math.max(0, entitlement.remaining.cameraSeconds ?? 0)
  return ui.camMinutesLeft(formatExactDuration(left))
}

export function displayNameFromSession(meta: Record<string, unknown> | undefined) {
  // OAuth names are only a soft fallback for signed-out/guest title; logged-in
  // Account Hub title uses the custom username once set.
  const full =
    (typeof meta?.full_name === 'string' && meta.full_name.trim()) ||
    (typeof meta?.name === 'string' && meta.name.trim()) ||
    ''
  return full
}

export function canShowMetric(metric: BadgeUsageMetric, entitlement: Entitlement, showVoiceQuota: boolean): boolean {
  if (metric === 'live') return Boolean(entitlement.allowed.live) || entitlement.loggedIn
  if (metric === 'voice') return showVoiceQuota
  if (metric === 'camera') return entitlement.loggedIn
  return false
}

export function resolveBadgeMetric(
  preferred: BadgeUsageMetric,
  entitlement: Entitlement,
  showVoiceQuota: boolean,
): BadgeUsageMetric | null {
  if (canShowMetric(preferred, entitlement, showVoiceQuota)) return preferred
  const order: BadgeUsageMetric[] = ['live', 'voice', 'camera']
  return order.find((m) => canShowMetric(m, entitlement, showVoiceQuota)) ?? null
}

export function badgeCopyFor(
  metric: BadgeUsageMetric,
  entitlement: Entitlement,
): Bi {
  if (metric === 'voice') return voiceCopy(entitlement)
  if (metric === 'camera') return cameraCopy(entitlement)
  return liveCopy(entitlement)
}
