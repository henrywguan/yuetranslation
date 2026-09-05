import { env, isAdminEmail } from './env.js'
import type { AuthContext } from './auth.js'
import {
  ensureOwnerHousehold,
  getHouseholdSummary,
  getMembershipForUser,
  resolveHouseholdUsage,
  type HouseholdSummary,
} from './household.js'
import { getProfile, supabaseConfigured } from './supabase.js'
import { emptyUsage, getGuestUsage, getUsage, type UsageSnapshot } from './usage.js'
import {
  DEFAULT_EN_VOICE,
  DEFAULT_YUE_VOICE,
  resolveEnVoice,
  resolveYueVoice,
} from './ttsVoices.js'

export type Entitlement = {
  loggedIn: boolean
  requireLogin: boolean
  plan: 'guest' | 'free' | 'family' | 'business'
  isAdmin: boolean
  /** Assignable profile role shown as a badge (admin or 家). */
  role: 'admin' | 'family' | null
  disabled: boolean
  limits: {
    plan: string
    live_minutes: number
    /** 0 when TTS is unlimited (Family/Business) or disabled. */
    tts_chars: number
    /** 0 when camera is unlimited (Business) or disabled. */
    camera_minutes: number
    /** 0 when docs are unlimited (Business) or disabled. */
    docs_pages: number
    /** Monthly hard cap for multimodal LLM OCR fallback (Cam + Documents). */
    ai_vision_count: number
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
    /** Multimodal LLM OCR fallback calls this month. */
    aiVisionCount: number
  }
  /** Your share of pooled household usage this month (Family/Business only). */
  usageSelf?: {
    month: string
    liveSeconds: number
    ttsChars: number
    translateCount: number
    cameraSeconds: number
    cameraTranslateCount: number
    docsPages: number
    aiVisionCount: number
  } | null
  remaining: {
    liveSeconds: number
    ttsChars: number
    cameraSeconds: number
    docsPages: number
    /** Remaining AI vision LLM fallbacks this month. */
    aiVisionCount: number
  }
  /** Family/Business: usage is tracked but never gates the speaker. */
  ttsUnlimited: boolean
  /** Business: usage is tracked but never gates camera. */
  cameraUnlimited: boolean
  /** Business: usage is tracked but never gates documents. */
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
    /** Multimodal LLM OCR fallback within monthly hard cap. */
    aiVision: boolean
  }
  reason: string | null
  /** Synced account preferences. */
  prefs: {
    ttsVoiceYue: string
    ttsVoiceEn: string
    /** Custom display username; null until the user sets one. */
    username: string | null
    /** ISO timestamp of last username change; null if never set. */
    usernameChangedAt: string | null
  }
  /** Present when the user owns or belongs to a Family/Business household with pooled usage. */
  household: HouseholdSummary | null
}

type PlanKey = 'guest' | 'free' | 'family' | 'business'

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
      ai_vision_count: env.familyAiVisionCount,
      auto_speak: true,
      can_live: true,
      can_camera: true,
      can_docs: true,
      text_translate: true,
    }
  }
  if (plan === 'business') {
    return {
      plan: 'business',
      live_minutes: env.businessLiveMinutes,
      tts_chars: 0,
      camera_minutes: 0,
      docs_pages: 0,
      ai_vision_count: env.businessAiVisionCount,
      auto_speak: true,
      can_live: true,
      can_camera: true,
      can_docs: true,
      text_translate: true,
    }
  }
  if (plan === 'guest') {
    const liveMins = Math.max(0, env.guestLiveMinutes)
    const cameraMins = Math.max(0, env.guestCameraMinutes)
    return {
      plan: 'guest',
      live_minutes: liveMins,
      // Unlimited TTS for guests — still counted via guest_usage_months.
      tts_chars: 0,
      camera_minutes: cameraMins,
      docs_pages: 0,
      ai_vision_count: 0,
      auto_speak: false,
      can_live: liveMins > 0,
      can_camera: cameraMins > 0,
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
    ai_vision_count: env.freeAllowCamera ? env.freeAiVisionCount : 0,
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
 * - Family/Business (`unlimited`): always on; usage still counted separately.
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

/** Hard monthly cap for multimodal LLM OCR fallback (never unlimited — abuse brake). */
export function aiVisionAccess(limit: number, used: number) {
  const remaining = Math.max(0, limit - used)
  return { aiVision: limit > 0 && remaining > 0, aiVisionRemaining: remaining }
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
    username?: string | null
    usernameChangedAt?: string | null
    usageSelf?: Entitlement['usageSelf']
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
    username: opts.username?.trim() || null,
    usernameChangedAt: opts.usernameChangedAt || null,
  }

  if (disabled && loggedIn) {
    const limits = limitsForPlan('free')
    limits.can_live = false
    limits.can_camera = false
    limits.can_docs = false
    limits.tts_chars = 0
    limits.camera_minutes = 0
    limits.docs_pages = 0
    limits.ai_vision_count = 0
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
      remaining: { liveSeconds: 0, ttsChars: 0, cameraSeconds: 0, docsPages: 0, aiVisionCount: 0 },
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
        aiVision: false,
      },
      reason: 'account_disabled',
      prefs,
      household: null,
    }
  }

  // Guests get a metered trial (live + cam). Docs stay sign-in only.
  // Text + TTS stay unlimited but counted when a guest id is present.
  if (!loggedIn) {
    const limits = limitsForPlan('guest')
    limits.can_docs = false
    limits.docs_pages = 0
    const liveLimit = Math.max(0, limits.live_minutes) * 60
    const cameraLimit = Math.max(0, limits.camera_minutes) * 60
    const liveRemaining = Math.max(0, liveLimit - usage.liveSeconds)
    const cameraRemaining = Math.max(0, cameraLimit - usage.cameraSeconds)
    const canLive = limits.can_live && liveRemaining > 0
    const canCamera = limits.can_camera && cameraRemaining > 0
    // TTS unlimited for guests (same pattern as Family) — still metered in usage.
    const voice = voiceAccess(0, usage.ttsChars, false, true)

    let reason: string | null = null
    if (!canLive && limits.can_live) reason = 'guest_trial_exhausted'
    else if (!canCamera && limits.can_camera) reason = 'guest_trial_exhausted'
    else if (!canLive && !canCamera) reason = requireLogin ? 'guest_trial_exhausted' : 'no_live_quota'
    // Docs always need an account when requireLogin is on (or always for guests).
    if (!reason && requireLogin) {
      // Soft signal for docs/UI: sign-in available, trial still active for live/cam.
      reason = null
    }

    return {
      loggedIn: false,
      requireLogin,
      plan: 'guest',
      isAdmin: false,
      role: null,
      disabled: false,
      limits,
      usage,
      remaining: {
        liveSeconds: liveRemaining,
        ttsChars: -1,
        cameraSeconds: cameraRemaining,
        docsPages: 0,
        aiVisionCount: 0,
      },
      ttsUnlimited: true,
      cameraUnlimited: false,
      docsUnlimited: false,
      upgradeUrl: upgradeUrl(),
      loginUrl: loginUrl(),
      allowed: {
        live: canLive,
        autoSpeak: false,
        textTranslate: true,
        tts: voice.tts,
        camera: canCamera,
        docs: false,
        aiVision: false,
      },
      reason,
      prefs: {
        ttsVoiceYue: DEFAULT_YUE_VOICE,
        ttsVoiceEn: DEFAULT_EN_VOICE,
        username: null,
        usernameChangedAt: null,
      },
      household: null,
    }
  }

  const limits = limitsForPlan(plan)
  const liveLimit = Math.max(0, limits.live_minutes) * 60
  const cameraLimit = Math.max(0, limits.camera_minutes) * 60
  const docsLimit = Math.max(0, limits.docs_pages)
  const ttsUnlimited = plan === 'family' || plan === 'business'
  const cameraUnlimited = plan === 'business'
  const docsUnlimited = plan === 'business'
  const ttsLimit = Math.max(0, limits.tts_chars)
  const liveRemaining = Math.max(0, liveLimit - usage.liveSeconds)
  const voice = voiceAccess(ttsLimit, usage.ttsChars, limits.auto_speak, ttsUnlimited)
  const cam = cameraAccess(cameraLimit, usage.cameraSeconds, cameraUnlimited)
  const docs = docsAccess(docsLimit, usage.docsPages, docsUnlimited)
  const aiVisionLimit = Math.max(0, limits.ai_vision_count)
  const vision = aiVisionAccess(aiVisionLimit, usage.aiVisionCount)
  const canLive = limits.can_live && liveRemaining > 0
  const canCamera = limits.can_camera && (cameraUnlimited || cam.camera)
  const canDocs = limits.can_docs && (docsUnlimited || docs.docs)
  const canAiVision = vision.aiVision

  let reason: string | null = null
  if (!canLive) reason = liveLimit <= 0 ? 'no_live_quota' : 'live_quota_exhausted'
  else if (!voice.tts) reason = ttsLimit <= 0 ? 'no_tts_quota' : 'tts_quota_exhausted'
  else if (!canCamera && loggedIn) {
    reason = cameraLimit <= 0 ? 'no_camera_quota' : 'camera_quota_exhausted'
  } else if (!canDocs && loggedIn) {
    reason = docsLimit <= 0 ? 'no_docs_quota' : 'docs_quota_exhausted'
  } else if (!canAiVision && loggedIn && aiVisionLimit > 0 && usage.aiVisionCount >= aiVisionLimit) {
    reason = 'ai_vision_quota_exhausted'
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
      aiVisionCount: vision.aiVisionRemaining,
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
      aiVision: canAiVision,
    },
    reason,
    prefs,
    household,
    usageSelf: opts.usageSelf ?? null,
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
        ai_vision_count: 999999,
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
      remaining: { liveSeconds: 9999 * 60, ttsChars: 999999, cameraSeconds: -1, docsPages: -1, aiVisionCount: 999999 },
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
        aiVision: true,
      },
      reason: null,
      prefs: {
        ttsVoiceYue: DEFAULT_YUE_VOICE,
        ttsVoiceEn: DEFAULT_EN_VOICE,
        username: null,
        usernameChangedAt: null,
      },
      household: null,
    }
  }

  return buildSnapshot('free', false, emptyUsage(month))
}

export async function resolveEntitlement(
  auth?: AuthContext,
  guestId?: string | null,
): Promise<Entitlement> {
  if (env.openMode) return localEntitlement()

  if (!supabaseConfigured()) {
    return localEntitlement()
  }

  if (!auth?.userId) {
    const usage = guestId ? await getGuestUsage(guestId) : emptyUsage()
    return buildSnapshot('guest', false, usage)
  }

  const profile = await getProfile(auth.userId)
  const role = profile?.role ?? null
  const personalPlan = (profile?.plan ?? 'free') as PlanKey

  // Paid owners get a household; members inherit the owner's plan + pooled meters.
  let membership = await getMembershipForUser(auth.userId)
  if (!membership && (personalPlan === 'family' || personalPlan === 'business')) {
    await ensureOwnerHousehold(auth.userId, personalPlan)
    membership = await getMembershipForUser(auth.userId)
  }

  let plan: PlanKey = personalPlan
  let usage = await getUsage(auth.userId)
  let household: HouseholdSummary | null = null

  let usageSelf: Entitlement['usageSelf'] = null

  if (membership) {
    plan = membership.household.plan
    usage = await resolveHouseholdUsage(membership.household.id)
    usageSelf = await getUsage(auth.userId)
    household = await getHouseholdSummary(auth.userId)
    // Keep owner household seat_limit / plan in sync with Stripe profile plan.
    if (
      membership.membership.member_role === 'owner' &&
      (personalPlan === 'family' || personalPlan === 'business') &&
      membership.household.plan !== personalPlan
    ) {
      await ensureOwnerHousehold(auth.userId, personalPlan)
      membership = await getMembershipForUser(auth.userId)
      if (membership) {
        plan = membership.household.plan
        usage = await resolveHouseholdUsage(membership.household.id)
        household = await getHouseholdSummary(auth.userId)
      }
    }
  }

  // Solo household (1 seat): all pooled usage is yours — legacy backfill zeroed attribution rows.
  if (household && household.seatUsed <= 1) {
    usageSelf = { ...usage }
  }

  return buildSnapshot(plan, true, usage, {
    isAdmin: isAdminEmail(auth.email) || role === 'admin',
    role,
    disabled: Boolean(profile?.disabled),
    ttsVoiceYue: profile?.tts_voice_yue,
    ttsVoiceEn: profile?.tts_voice_en,
    household,
    username: profile?.username,
    usernameChangedAt: profile?.username_changed_at,
    usageSelf,
  })
}
