import { env, isAdminEmail } from './env.js'
import type { AuthContext } from './auth.js'
import {
  ensureOwnerHousehold,
  getHouseholdSummary,
  getHouseholdUsage,
  getMembershipForUser,
  type HouseholdSummary,
} from './household.js'
import { getProfile, supabaseConfigured } from './supabase.js'
import { emptyUsage, getUsage } from './usage.js'
import {
  DEFAULT_EN_VOICE,
  DEFAULT_YUE_VOICE,
  resolveEnVoice,
  resolveYueVoice,
} from './ttsVoices.js'

export type Entitlement = {
  loggedIn: boolean
  requireLogin: boolean
  plan: 'guest' | 'free' | 'family' | 'max'
  isAdmin: boolean
  /** Assignable profile role shown as a badge (admin or 家). */
  role: 'admin' | 'family' | null
  disabled: boolean
  limits: {
    plan: string
    live_minutes: number
    /** 0 when TTS is unlimited (Family/Max) or disabled. */
    tts_chars: number
    /** 0 when camera is unlimited (Max) or disabled. */
    camera_minutes: number
    /** 0 when docs are unlimited (Max) or disabled. */
    docs_pages: number
    auto_speak: boolean
    can_live: boolean
    can_camera: boolean
    can_docs: boolean
    text_translate: boolean
  }
  usage: {
    month: string
    liveSeconds: number
    ttsChars: number
    translateCount: number
    cameraSeconds: number
    cameraTranslateCount: number
    docsPages: number
    /** Multimodal LLM OCR fallback calls this month (view-only). */
    aiVisionCount: number
  }
  remaining: {
    liveSeconds: number
    ttsChars: number
    cameraSeconds: number
    docsPages: number
  }
  /** Family/Max: usage is tracked but never gates the speaker. */
  ttsUnlimited: boolean
  /** Max: usage is tracked but never gates camera. */
  cameraUnlimited: boolean
  /** Max: usage is tracked but never gates documents. */
  docsUnlimited: boolean
  upgradeUrl: string
  loginUrl: string
  allowed: {
    live: boolean
    autoSpeak: boolean
    textTranslate: boolean
    tts: boolean
    camera: boolean
    docs: boolean
  }
  reason: string | null
  /** Synced TTS voice preferences (Azure Neural ids). */
  prefs: {
    ttsVoiceYue: string
    ttsVoiceEn: string
  }
  /** Present when the user owns or belongs to a Family/Max household with pooled usage. */
  household: HouseholdSummary | null
}

type PlanKey = 'guest' | 'free' | 'family' | 'max'

function appBaseUrl(): string {
  return env.appUrl.replace(/\/+$/, '')
}

function loginUrl(): string {
  // Query must come before the hash or the router treats `#/app?auth=1` as home.
  return `${appBaseUrl()}/?auth=1#/app`
}

function upgradeUrl(): string {
  return `${appBaseUrl()}/#/pricing`
}

function limitsForPlan(plan: PlanKey): Entitlement['limits'] {
  if (plan === 'family') {
    return {
      plan: 'family',
      live_minutes: env.familyLiveMinutes,
      // Unlimited TTS — usage is still metered; 0 means no hard cap.
      tts_chars: 0,
      camera_minutes: env.familyCameraMinutes,
      docs_pages: env.familyDocsPages,
      auto_speak: true,
      can_live: true,
      can_camera: true,
      can_docs: true,
      text_translate: true,
    }
  }
  if (plan === 'max') {
    return {
      plan: 'max',
      live_minutes: env.maxLiveMinutes,
      tts_chars: 0,
      camera_minutes: 0,
      docs_pages: 0,
      auto_speak: true,
      can_live: true,
      can_camera: true,
      can_docs: true,
      text_translate: true,
    }
  }
  if (plan === 'guest') {
    const mins = env.guestLiveMinutes
    return {
      plan: 'guest',
      live_minutes: mins,
      // Guests can tap-to-play without an account (no persistent meter).
      tts_chars: 0,
      camera_minutes: 0,
      docs_pages: 0,
      auto_speak: false,
      can_live: mins > 0 && !env.requireLogin,
      can_camera: false,
      can_docs: false,
      text_translate: true,
    }
  }
  return {
    plan: 'free',
    live_minutes: env.freeLiveMinutes,
    tts_chars: env.freeAllowTts ? env.freeTtsChars : 0,
    camera_minutes: env.freeAllowCamera ? env.freeCameraMinutes : 0,
    docs_pages: env.freeAllowCamera ? env.freeDocsPages : 0,
    auto_speak: false,
    can_live: env.freeAllowLive,
    can_camera: env.freeAllowCamera,
    can_docs: env.freeAllowCamera,
    text_translate: true,
  }
}

/**
 * Tap-to-play TTS access.
 * - Free: hard char quota.
 * - Family/Max (`unlimited`): always on; usage still counted separately.
 * - Auto-speak follows the plan flag (and still requires TTS access).
 */
export function voiceAccess(
  ttsLimit: number,
  ttsUsed: number,
  autoSpeakPlan: boolean,
  unlimited = false,
) {
  if (unlimited) {
    return { tts: true, autoSpeak: autoSpeakPlan, ttsRemaining: -1, unlimited: true }
  }
  const ttsRemaining = Math.max(0, ttsLimit - ttsUsed)
  const tts = ttsLimit > 0 && ttsRemaining > 0
  return { tts, autoSpeak: autoSpeakPlan && tts, ttsRemaining, unlimited: false }
}

export function cameraAccess(cameraLimitSeconds: number, cameraUsed: number, unlimited = false) {
  if (unlimited) {
    return { camera: true, cameraRemaining: -1, unlimited: true }
  }
  const cameraRemaining = Math.max(0, cameraLimitSeconds - cameraUsed)
  const camera = cameraLimitSeconds > 0 && cameraRemaining > 0
  return { camera, cameraRemaining, unlimited: false }
}

export function docsAccess(docsLimit: number, docsUsed: number, unlimited = false) {
  if (unlimited) {
    return { docs: true, docsRemaining: -1, unlimited: true }
  }
  const docsRemaining = Math.max(0, docsLimit - docsUsed)
  const docs = docsLimit > 0 && docsRemaining > 0
  return { docs, docsRemaining, unlimited: false }
}

function buildSnapshot(
  plan: PlanKey,
  loggedIn: boolean,
  usage: Entitlement['usage'],
  opts: {
    isAdmin?: boolean
    disabled?: boolean
    role?: 'admin' | 'family' | null
    ttsVoiceYue?: string | null
    ttsVoiceEn?: string | null
    household?: HouseholdSummary | null
  } = {},
): Entitlement {
  const isAdmin = Boolean(opts.isAdmin)
  const role = opts.role ?? null
  const disabled = Boolean(opts.disabled)
  const requireLogin = env.requireLogin
  const household = opts.household ?? null
  const prefs = {
    ttsVoiceYue: resolveYueVoice(opts.ttsVoiceYue),
    ttsVoiceEn: resolveEnVoice(opts.ttsVoiceEn),
  }

  if (disabled && loggedIn) {
    const limits = limitsForPlan('free')
    limits.can_live = false
    limits.can_camera = false
    limits.can_docs = false
    limits.tts_chars = 0
    limits.camera_minutes = 0
    limits.docs_pages = 0
    limits.auto_speak = false
    limits.text_translate = false
    return {
      loggedIn: true,
      requireLogin,
      plan: 'free',
      isAdmin,
      role,
      disabled: true,
      limits,
      usage,
      remaining: { liveSeconds: 0, ttsChars: 0, cameraSeconds: 0, docsPages: 0 },
      ttsUnlimited: false,
      cameraUnlimited: false,
      docsUnlimited: false,
      upgradeUrl: upgradeUrl(),
      loginUrl: loginUrl(),
      allowed: {
        live: false,
        autoSpeak: false,
        textTranslate: false,
        tts: false,
        camera: false,
        docs: false,
      },
      reason: 'account_disabled',
      prefs,
      household: null,
    }
  }

  if (requireLogin && !loggedIn) {
    const limits = limitsForPlan('guest')
    limits.can_live = false
    limits.can_camera = false
    limits.can_docs = false
    return {
      loggedIn: false,
      requireLogin: true,
      plan: 'guest',
      isAdmin: false,
      role: null,
      disabled: false,
      limits,
      usage,
      remaining: { liveSeconds: 0, ttsChars: 0, cameraSeconds: 0, docsPages: 0 },
      ttsUnlimited: false,
      cameraUnlimited: false,
      docsUnlimited: false,
      upgradeUrl: upgradeUrl(),
      loginUrl: loginUrl(),
      allowed: {
        live: false,
        autoSpeak: false,
        textTranslate: true,
        // Guests may tap-to-play without signing in (no persistent meter).
        tts: true,
        camera: false,
        docs: false,
      },
      reason: 'login_required',
      prefs: { ttsVoiceYue: DEFAULT_YUE_VOICE, ttsVoiceEn: DEFAULT_EN_VOICE },
      household: null,
    }
  }

  const limits = limitsForPlan(plan)
  const liveLimit = Math.max(0, limits.live_minutes) * 60
  const cameraLimit = Math.max(0, limits.camera_minutes) * 60
  const docsLimit = Math.max(0, limits.docs_pages)
  const ttsUnlimited = plan === 'family' || plan === 'max'
  const cameraUnlimited = plan === 'max'
  const docsUnlimited = plan === 'max'
  const ttsLimit = Math.max(0, limits.tts_chars)
  const liveRemaining = Math.max(0, liveLimit - usage.liveSeconds)
  const voice = voiceAccess(ttsLimit, usage.ttsChars, limits.auto_speak, ttsUnlimited)
  const cam = cameraAccess(cameraLimit, usage.cameraSeconds, cameraUnlimited)
  const docs = docsAccess(docsLimit, usage.docsPages, docsUnlimited)
  const canLive = limits.can_live && liveRemaining > 0
  const canCamera = limits.can_camera && (cameraUnlimited || cam.camera)
  const canDocs = limits.can_docs && (docsUnlimited || docs.docs)

  let reason: string | null = null
  if (!canLive) reason = liveLimit <= 0 ? 'no_live_quota' : 'live_quota_exhausted'
  else if (!voice.tts) reason = ttsLimit <= 0 ? 'no_tts_quota' : 'tts_quota_exhausted'
  else if (!canCamera && loggedIn) {
    reason = cameraLimit <= 0 ? 'no_camera_quota' : 'camera_quota_exhausted'
  } else if (!canDocs && loggedIn) {
    reason = docsLimit <= 0 ? 'no_docs_quota' : 'docs_quota_exhausted'
  }

  return {
    loggedIn,
    requireLogin,
    plan,
    isAdmin,
    role,
    disabled: false,
    limits,
    usage,
    remaining: {
      liveSeconds: liveRemaining,
      ttsChars: Math.max(0, voice.ttsRemaining),
      cameraSeconds: cameraUnlimited ? -1 : Math.max(0, cam.cameraRemaining),
      docsPages: docsUnlimited ? -1 : Math.max(0, docs.docsRemaining),
    },
    ttsUnlimited,
    cameraUnlimited,
    docsUnlimited,
    upgradeUrl: upgradeUrl(),
    loginUrl: loginUrl(),
    allowed: {
      live: canLive,
      autoSpeak: voice.autoSpeak,
      textTranslate: limits.text_translate,
      tts: voice.tts,
      camera: canCamera,
      docs: canDocs,
    },
    reason,
    prefs,
    household,
  }
}

/** Local-dev soft entitlements (pro-like when YUE_OPEN_MODE=1). */
function localEntitlement(): Entitlement {
  const month = new Date().toISOString().slice(0, 7).replace('-', '_')

  if (env.openMode) {
    return {
      loggedIn: true,
      requireLogin: false,
      plan: 'family',
      isAdmin: false,
      role: null,
      disabled: false,
      limits: {
        plan: 'family',
        live_minutes: 9999,
        tts_chars: 999999,
        camera_minutes: 0,
        docs_pages: 0,
        auto_speak: true,
        can_live: true,
        can_camera: true,
        can_docs: true,
        text_translate: true,
      },
      usage: {
        month,
        liveSeconds: 0,
        ttsChars: 0,
        translateCount: 0,
        cameraSeconds: 0,
        cameraTranslateCount: 0,
        docsPages: 0,
        aiVisionCount: 0,
      },
      remaining: { liveSeconds: 9999 * 60, ttsChars: 999999, cameraSeconds: -1, docsPages: -1 },
      ttsUnlimited: true,
      cameraUnlimited: true,
      docsUnlimited: true,
      upgradeUrl: '',
      loginUrl: '',
      allowed: {
        live: true,
        autoSpeak: true,
        textTranslate: true,
        tts: true,
        camera: true,
        docs: true,
      },
      reason: null,
      prefs: { ttsVoiceYue: DEFAULT_YUE_VOICE, ttsVoiceEn: DEFAULT_EN_VOICE },
      household: null,
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
  const role = profile?.role ?? null
  const personalPlan = (profile?.plan ?? 'free') as PlanKey

  // Paid owners get a household; members inherit the owner's plan + pooled meters.
  let membership = await getMembershipForUser(auth.userId)
  if (!membership && (personalPlan === 'family' || personalPlan === 'max')) {
    await ensureOwnerHousehold(auth.userId, personalPlan)
    membership = await getMembershipForUser(auth.userId)
  }

  let plan: PlanKey = personalPlan
  let usage = await getUsage(auth.userId)
  let household: HouseholdSummary | null = null

  if (membership) {
    plan = membership.household.plan
    usage = await getHouseholdUsage(membership.household.id)
    household = await getHouseholdSummary(auth.userId)
    // Keep owner household seat_limit / plan in sync with Stripe profile plan.
    if (
      membership.membership.member_role === 'owner' &&
      (personalPlan === 'family' || personalPlan === 'max') &&
      membership.household.plan !== personalPlan
    ) {
      await ensureOwnerHousehold(auth.userId, personalPlan)
      membership = await getMembershipForUser(auth.userId)
      if (membership) {
        plan = membership.household.plan
        usage = await getHouseholdUsage(membership.household.id)
        household = await getHouseholdSummary(auth.userId)
      }
    }
  }

  return buildSnapshot(plan, true, usage, {
    isAdmin: isAdminEmail(auth.email) || role === 'admin',
    role,
    disabled: Boolean(profile?.disabled),
    ttsVoiceYue: profile?.tts_voice_yue,
    ttsVoiceEn: profile?.tts_voice_en,
    household,
  })
}
