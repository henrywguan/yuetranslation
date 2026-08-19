import { env } from './env.js'
import type { AuthContext } from './auth.js'
import { getProfile, supabaseConfigured } from './supabase.js'
import { emptyUsage, getUsage } from './usage.js'

export type Entitlement = {
  loggedIn: boolean
  requireLogin: boolean
  plan: 'guest' | 'free' | 'pro' | 'max'
  limits: {
    plan: string
    live_minutes: number
    tts_chars: number
    auto_speak: boolean
    can_live: boolean
    text_translate: boolean
  }
  usage: { month: string; liveSeconds: number; ttsChars: number; translateCount: number }
  remaining: { liveSeconds: number; ttsChars: number }
  upgradeUrl: string
  loginUrl: string
  allowed: { live: boolean; autoSpeak: boolean; textTranslate: boolean; tts: boolean }
  reason: string | null
}

type PlanKey = 'guest' | 'free' | 'pro' | 'max'

function appBaseUrl(): string {
  return env.appUrl.replace(/\/+$/, '')
}

function loginUrl(): string {
  return `${appBaseUrl()}/#/app?auth=1`
}

function upgradeUrl(): string {
  return `${appBaseUrl()}/#/pricing`
}

function limitsForPlan(plan: PlanKey): Entitlement['limits'] {
  if (plan === 'pro') {
    return {
      plan: 'pro',
      live_minutes: env.proLiveMinutes,
      tts_chars: env.proTtsChars,
      auto_speak: true,
      can_live: true,
      text_translate: true,
    }
  }
  if (plan === 'max') {
    return {
      plan: 'max',
      live_minutes: env.maxLiveMinutes,
      tts_chars: env.maxTtsChars,
      auto_speak: true,
      can_live: true,
      text_translate: true,
    }
  }
  if (plan === 'guest') {
    const mins = env.guestLiveMinutes
    return {
      plan: 'guest',
      live_minutes: mins,
      tts_chars: 0,
      auto_speak: false,
      can_live: mins > 0 && !env.requireLogin,
      text_translate: true,
    }
  }
  return {
    plan: 'free',
    live_minutes: env.freeLiveMinutes,
    tts_chars: env.freeTtsChars,
    auto_speak: env.freeAllowTts && env.freeTtsChars > 0,
    can_live: env.freeAllowLive,
    text_translate: true,
  }
}

function buildSnapshot(
  plan: PlanKey,
  loggedIn: boolean,
  usage: Entitlement['usage'],
): Entitlement {
  const requireLogin = env.requireLogin
  if (requireLogin && !loggedIn) {
    const limits = limitsForPlan('guest')
    limits.can_live = false
    return {
      loggedIn: false,
      requireLogin: true,
      plan: 'guest',
      limits,
      usage,
      remaining: { liveSeconds: 0, ttsChars: 0 },
      upgradeUrl: upgradeUrl(),
      loginUrl: loginUrl(),
      allowed: {
        live: false,
        autoSpeak: false,
        textTranslate: true,
        tts: false,
      },
      reason: 'login_required',
    }
  }

  const limits = limitsForPlan(plan)
  const liveLimit = Math.max(0, limits.live_minutes) * 60
  const ttsLimit = Math.max(0, limits.tts_chars)
  const liveRemaining = Math.max(0, liveLimit - usage.liveSeconds)
  const ttsRemaining = Math.max(0, ttsLimit - usage.ttsChars)
  const canLive = limits.can_live && liveRemaining > 0
  const canTts = limits.auto_speak && ttsRemaining > 0

  return {
    loggedIn,
    requireLogin,
    plan,
    limits,
    usage,
    remaining: { liveSeconds: liveRemaining, ttsChars: ttsRemaining },
    upgradeUrl: upgradeUrl(),
    loginUrl: loginUrl(),
    allowed: {
      live: canLive,
      autoSpeak: canTts,
      textTranslate: limits.text_translate,
      tts: canTts,
    },
    reason: !canLive ? (liveLimit <= 0 ? 'no_live_quota' : 'live_quota_exhausted') : null,
  }
}

/** Local-dev soft entitlements (pro-like when YUE_OPEN_MODE=1). */
export function localEntitlement(): Entitlement {
  const month = new Date().toISOString().slice(0, 7).replace('-', '_')

  if (env.openMode) {
    return {
      loggedIn: true,
      requireLogin: false,
      plan: 'pro',
      limits: {
        plan: 'pro',
        live_minutes: 9999,
        tts_chars: 999999,
        auto_speak: true,
        can_live: true,
        text_translate: true,
      },
      usage: { month, liveSeconds: 0, ttsChars: 0, translateCount: 0 },
      remaining: { liveSeconds: 9999 * 60, ttsChars: 999999 },
      upgradeUrl: '',
      loginUrl: '',
      allowed: { live: true, autoSpeak: true, textTranslate: true, tts: true },
      reason: null,
    }
  }

  return buildSnapshot('free', false, emptyUsage(month))
}

export async function resolveEntitlement(auth?: AuthContext): Promise<Entitlement> {
  if (env.openMode) return localEntitlement()

  if (!supabaseConfigured()) {
    return localEntitlement()
  }

  if (!auth?.userId) {
    return buildSnapshot('guest', false, emptyUsage())
  }

  const profile = await getProfile(auth.userId)
  const plan = (profile?.plan ?? 'free') as PlanKey
  const usage = await getUsage(auth.userId)
  return buildSnapshot(plan, true, usage)
}
