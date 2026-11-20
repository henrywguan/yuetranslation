import cors from 'cors'
import express from 'express'
import { ZodError } from 'zod'
import { cloudReady, env, openaiStatus, visionConfigured, visionLlmConfigured } from './env.js'
import { corsOriginDelegate } from './corsOrigins.js'
import { resolveEntitlement } from './entitlements.js'
import { attachAuth, type AuthedRequest } from './auth.js'
import { attachGuest, type GuestRequest } from './guest.js'
import { allowGuestIpOrReject } from './guestRateLimit.js'
import { queueResendAudienceContact } from './resendAudience.js'
import { handleBillingWebhook, startCheckout, startPortal } from './billing.js'
import {
  deleteHouseholdInvite,
  deleteHouseholdMember,
  getHousehold,
  postHouseholdAccept,
  postHouseholdInvite,
} from './householdRoutes.js'
import { handleSignupNotify } from './signupNotify.js'
import { handleAuthSendEmail } from './authSendEmail.js'
import { issueSpeechToken, synthesize, SPEECH_TOKEN_MAX_TTL_S, SPEECH_TOKEN_MIN_REMAINING_S, SPEECH_TOKEN_PREPAY_S } from './azure.js'
import { parseTtsPerformance, spokenPerformanceChars } from './practicePartnerPerformance.js'
import { breakdown } from './breakdown.js'
import { enrichDictionaryEntry } from './detailsEnrich.js'
import { translate } from './translate.js'
import { cameraScan } from './cameraScan.js'
import {
  addCameraSeconds,
  addCameraTranslateCount,
  addDocsPages,
  addLiveSeconds,
  addTtsChars,
  addTranslateCount,
  addAiVisionCount,
  addGuestCameraSeconds,
  addGuestCameraTranslateCount,
  addGuestLiveSeconds,
  addGuestTtsChars,
  addGuestTranslateCount,
  addGuestAiVisionCount,
} from './usage.js'
import { submitBugReport } from './bugReport.js'
import { getHistory, putHistory } from './history.js'
import {
  getHarborQuest,
  getHarborQuestLeaderboard,
  postHarborQuestGift,
  putHarborQuest,
} from './harborQuest.js'
import {
  getPracticePartnerLeaderboard,
  putPracticePartnerLeaderboard,
} from './practicePartnerLeaderboard.js'
import { peekDocPages, translateDocumentFile, translateDocSegments } from './docs/handler.js'
import {
  upsertProfilePlan,
  normalizeUsernameInput,
  isUsernameTaken,
  getProfile,
} from './supabase.js'
import {
  isCmnVoice,
  isEnVoice,
  isEsVoice,
  isEsesVoice,
  isTlVoice,
  isViVoice,
  isThVoice,
  isLoVoice,
  isKoVoice, isJaVoice, isIdVoice, isMsVoice, isPtVoice, isFrVoice, isHiVoice, isKmVoice, isMyVoice, isJvVoice, isItVoice, isDeVoice, isNlVoice, isArVoice, isArsaVoice, isTaVoice, isPtptVoice, isTrVoice, isBnVoice, isTeVoice, isGuVoice, isKnVoice, isPlVoice, isRoVoice, isCsVoice, isElVoice, isHuVoice, isSvVoice, isRuVoice, isUkVoice, isHeVoice, isFaVoice, isUrVoice, isMlVoice, isMrVoice, isPaVoice, isOrVoice, isSiVoice, isNeVoice, isDaVoice, isNbVoice, isFiVoice, isSkVoice, isHrVoice, isCaVoice, isAzVoice, isKkVoice, isUzVoice, isBgVoice, isSrVoice, isSwVoice, isAfVoice, isEtVoice, isLvVoice, isLtVoice, isGaVoice, isCyVoice, isEuVoice, isGlVoice, isMtVoice, isIsVoice, isBsVoice, isSqVoice, isZuVoice, isSoVoice, isAsVoice, isMkVoice, isMnVoice, isHyVoice, isKaVoice, isAmVoice, isPsVoice, 
  isYueVoice,
} from './ttsVoices.js'
import {
  adminArchiveEmailTemplate,
  adminBugReportAiAnswer,
  adminBugReportResendEmail,
  adminGetIncidentBanner,
  adminPatchIncidentBanner,
  adminExportUsersCsv,
  adminListAudit,
  adminListBugReports,
  adminDraftEmail,
  adminListEmailContacts,
  adminListEmailSends,
  adminListEmailTemplates,
  adminListUsers,
  adminMe,
  adminPatchBugReportStatus,
  adminPreviewEmail,
  adminPushStats,
  adminListPushSends,
  adminSendPush,
  adminPracticePartnerChat,
  adminResetUsage,
  adminSaveEmailTemplate,
  adminSendEmail,
  adminSetDisabled,
  adminSetPlan,
  adminSetRole,
  adminSyncResendAudience,
  adminBackfillHouseholdUsage,
  adminUserUsage,
} from './admin.js'
import { getPushConfig, subscribePush, unsubscribePush } from './pushRoutes.js'
import { scheduleHouseholdUsageBackfillOnStartup } from './startupBackfill.js'
import { postDeepseekChat } from './deepseekChatRoutes.js'
import { postDeepseekChatFile } from './deepseekChatFiles.js'
import { postDeepseekChatOcr } from './deepseekChatOcr.js'
import { postDeepseekChatAsr, postDeepseekChatTts } from './deepseekChatVoice.js'
import {
  deleteChatSandbox,
  getChatSandbox,
  getChatSandboxes,
  postChatSandbox,
  postChatSandboxExec,
  postChatSandboxFsList,
  postChatSandboxFsRead,
  postChatSandboxFsWrite,
} from './chatSandboxRoutes.js'
import {
  getChatGithubRepos,
  getChatGithubPrChecks,
  getChatGithubStatus,
  postChatGithubClone,
  postChatGithubPr,
} from './chatGithubRoutes.js'
import {
  getDeepseekChatGeneratedImage,
  getDeepseekChatPluginKeys,
  getDeepseekChatPlugins,
  putDeepseekChatPluginKeys,
} from './deepseekChatPluginsRoutes.js'
import { getIncidentBanner } from './appSettings.js'
import { pushConfigured } from './pushNotifications.js'
import { getOfflinePack, isOfflinePackId, offlinePackManifest } from './offlinePack.js'

export const app = express()
app.disable('x-powered-by')
// Vercel (and local tunnels) sit one hop in front — needed so req.ip / guest RL
// cannot be trivially spoofed via a client-prepended X-Forwarded-For.
app.set('trust proxy', 1)
app.use(cors({ origin: corsOriginDelegate, credentials: true }))

/** Performance-safe baseline headers (mirror vercel.json; API responses need these too). */
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  // Clickjacking only — no script-src rewrite (Vite / AUI stay intact).
  res.setHeader('Content-Security-Policy', "frame-ancestors 'self'")
  // Cam + Solo/Conversation mic need self; deny unused powerful features.
  res.setHeader(
    'Permissions-Policy',
    'camera=(self), microphone=(self), geolocation=(), payment=(), usb=(), interest-cohort=()',
  )
  if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
  }
  next()
})

// Stripe webhook must read the raw body before JSON parsing.
app.post('/api/billing/webhook', express.raw({ type: 'application/json' }), handleBillingWebhook)
app.post(
  '/api/internal/signup-notify',
  express.raw({ type: 'application/json' }),
  handleSignupNotify,
)
app.post(
  '/api/internal/auth-send-email',
  express.raw({ type: 'application/json' }),
  handleAuthSendEmail,
)

// Default JSON body limit is small; Cam/Docs keep a larger parser (images / files).
const jsonSmall = express.json({ limit: '256kb' })
const jsonLarge = express.json({ limit: '12mb' })
const jsonChatFile = express.json({ limit: '8mb' })
app.use((req, res, next) => {
  if (
    req.method === 'POST' &&
    (req.path === '/api/camera/scan' ||
      req.path === '/api/docs/translate' ||
      req.path === '/api/docs/segments' ||
      req.path === '/api/docs/commit')
  ) {
    return jsonLarge(req, res, next)
  }
  if (req.method === 'POST' && req.path === '/api/chat/files') {
    return jsonChatFile(req, res, next)
  }
  return jsonSmall(req, res, next)
})
app.use(attachAuth)
app.use(attachGuest)

async function entitlementFor(req: AuthedRequest) {
  if (req.auth?.email) {
    queueResendAudienceContact({
      email: req.auth.email,
      userId: req.auth.userId,
    })
  }
  const guestId = (req as GuestRequest).guestId
  return resolveEntitlement(req.auth, guestId)
}

function guestTrialMessage(kind: 'live' | 'camera') {
  return kind === 'live'
    ? 'Guest live minutes used up. Sign in to continue on the Free plan.'
    : 'Guest camera scans used up. Sign in to continue on the Free plan.'
}

app.get('/api/health', async (req: AuthedRequest, res) => {
  try {
    const openai = openaiStatus()
    // Public readiness only — keep entitlement + demo flag for SPA bootstrap.
    // Omit model names, lexicon dumps, notify config, and other targeting aids.
    // Parallelize banner + entitlement (both may hit Supabase).
    const [incidentBanner, entitlement] = await Promise.all([
      getIncidentBanner(),
      entitlementFor(req),
    ])
    res.json({
      ok: true,
      product: 'jyut',
      service: 'jyut-api',
      mode: env.openMode ? 'open' : 'cloud',
      cloudReady: cloudReady(),
      engines: {
        azureSpeech: Boolean(env.azureSpeechKey),
        azureVision: visionConfigured(),
        visionLlm: visionLlmConfigured(),
        openai: openai.configured,
        demo: !openai.configured,
        dictionary: true,
        lexicon: true,
      },
      push: {
        configured: pushConfigured(),
      },
      incidentBanner,
      entitlement,
    })
  } catch (err) {
    // Express 4 does not answer a rejected async route — the browser then sits
    // on PlanChip "Connecting…" until the socket times out.
    console.error('[health]', err)
    if (!res.headersSent) res.status(503).json({ ok: false, message: 'health failed' })
  }
})

app.get('/api/entitlement', async (req: AuthedRequest, res) => {
  res.json(await entitlementFor(req))
})

app.get('/api/auth-config', (_req, res) => {
  const url = env.supabaseUrl
  const anonKey = env.supabaseAnonKey
  res.json({
    enabled: Boolean(url && anonKey),
    url: url || null,
    anonKey: url && anonKey ? anonKey : null,
  })
})

app.get('/api/speech-token', async (req: AuthedRequest, res) => {
  if (!allowGuestIpOrReject(req, res, 'speechToken')) return
  const ent = await entitlementFor(req)
  if (!ent.allowed.live) {
    const login = ent.reason === 'login_required'
    const guestDone = ent.reason === 'guest_trial_exhausted'
    res.status(login || guestDone ? 401 : 402).json({
      message:
        login
          ? 'Please log in to use live translation.'
          : guestDone
            ? guestTrialMessage('live')
            : ent.reason === 'account_disabled'
              ? 'This account has been disabled.'
              : 'Live listening requires a Family plan or free minutes.',
      entitlement: ent,
    })
    return
  }
  if (!env.azureSpeechKey) {
    res.status(503).json({ message: 'Azure Speech is not configured' })
    return
  }
  // Prepaid debit closes the "mint tokens without heartbeats" hole.
  const remaining = ent.remaining.liveSeconds
  if (!env.openMode && remaining < SPEECH_TOKEN_MIN_REMAINING_S) {
    res.status(402).json({
      message: 'Live minutes exhausted for this month.',
      entitlement: ent,
    })
    return
  }
  const ttl = env.openMode
    ? SPEECH_TOKEN_MAX_TTL_S
    : Math.min(
        SPEECH_TOKEN_MAX_TTL_S,
        Math.max(
          SPEECH_TOKEN_MIN_REMAINING_S,
          // Token lifetime must not exceed prepaid debit (closes 180s-with-60s-debit hole).
          Math.min(SPEECH_TOKEN_PREPAY_S, remaining),
        ),
      )
  const debit = env.openMode ? 0 : Math.min(SPEECH_TOKEN_PREPAY_S, remaining, ttl)
  try {
    const token = await issueSpeechToken({ expiresIn: ttl })
    if (debit > 0) {
      if (req.auth?.userId) await addLiveSeconds(req.auth.userId, debit)
      else if ((req as GuestRequest).guestId) {
        await addGuestLiveSeconds((req as GuestRequest).guestId!, debit)
      }
    }
    res.json({ ...token, prepaidSeconds: debit, entitlement: await entitlementFor(req) })
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Token error' })
  }
})

app.post('/api/translate', async (req: AuthedRequest, res) => {
  if (!allowGuestIpOrReject(req, res, 'translate')) return
  const ent = await entitlementFor(req)
  if (!ent.allowed.textTranslate) {
    res
      .status(ent.reason === 'login_required' ? 401 : ent.reason === 'account_disabled' ? 403 : 402)
      .json({
        message:
          ent.reason === 'login_required'
            ? 'Please log in to use translation.'
            : ent.reason === 'account_disabled'
              ? 'This account has been disabled.'
              : 'Translation not allowed on your plan.',
        entitlement: ent,
      })
    return
  }
  try {
    const result = await translate(req.body)
    if (!env.openMode) {
      if (req.auth?.userId) await addTranslateCount(req.auth.userId, 1)
      else if ((req as GuestRequest).guestId) {
        await addGuestTranslateCount((req as GuestRequest).guestId!, 1)
      }
    }
    res.json(result)
  } catch (e) {
    res.status(400).json({ message: e instanceof Error ? e.message : 'Translate error' })
  }
})

app.post('/api/breakdown', async (req: AuthedRequest, res) => {
  if (!allowGuestIpOrReject(req, res, 'breakdown')) return
  const ent = await entitlementFor(req)
  if (!ent.allowed.textTranslate) {
    res
      .status(ent.reason === 'login_required' ? 401 : ent.reason === 'account_disabled' ? 403 : 402)
      .json({
        message:
          ent.reason === 'login_required'
            ? 'Please log in to use character breakdown.'
            : ent.reason === 'account_disabled'
              ? 'This account has been disabled.'
              : 'Character breakdown is not available on your plan.',
        entitlement: ent,
      })
    return
  }
  try {
    const result = await breakdown(req.body)
    // Same guest/signed-in metering as translate — breakdown also hits the model.
    if (!env.openMode) {
      if (req.auth?.userId) await addTranslateCount(req.auth.userId, 1)
      else if ((req as GuestRequest).guestId) {
        await addGuestTranslateCount((req as GuestRequest).guestId!, 1)
      }
    }
    res.json(result)
  } catch (e) {
    res.status(400).json({ message: e instanceof Error ? e.message : 'Breakdown error' })
  }
})

/** Unified dictionary entry for Details (senses / examples / usage / keyless visuals). */
app.post('/api/details/enrich', async (req: AuthedRequest, res) => {
  if (!allowGuestIpOrReject(req, res, 'breakdown')) return
  const ent = await entitlementFor(req)
  if (!ent.allowed.textTranslate) {
    res
      .status(ent.reason === 'login_required' ? 401 : ent.reason === 'account_disabled' ? 403 : 402)
      .json({
        message:
          ent.reason === 'login_required'
            ? 'Please log in to use dictionary details.'
            : ent.reason === 'account_disabled'
              ? 'This account has been disabled.'
              : 'Dictionary details are not available on your plan.',
        entitlement: ent,
      })
    return
  }
  try {
    const entry = await enrichDictionaryEntry(req.body)
    if (!env.openMode && entry.engine !== 'offline') {
      if (req.auth?.userId) await addTranslateCount(req.auth.userId, 1)
      else if ((req as GuestRequest).guestId) {
        await addGuestTranslateCount((req as GuestRequest).guestId!, 1)
      }
    }
    res.json({ entry })
  } catch (e) {
    if (e instanceof ZodError) {
      res.status(400).json({ message: 'Invalid details enrich payload' })
      return
    }
    res.status(400).json({ message: e instanceof Error ? e.message : 'Details enrich error' })
  }
})

app.post('/api/tts', async (req: AuthedRequest, res) => {
  const ent = await entitlementFor(req)
  if (!ent.allowed.tts) {
    res.status(402).json({
      message:
        ent.reason === 'account_disabled'
          ? 'This account has been disabled.'
          : ent.reason === 'tts_quota_exhausted' || ent.reason === 'no_tts_quota'
            ? 'Voice playback needs remaining TTS quota.'
            : 'Voice playback is not available.',
      entitlement: ent,
    })
    return
  }
  try {
    const text = String(req.body?.text || '').trim()
    const lang = String(req.body?.lang || 'yue')
    const voiceOverride = typeof req.body?.voice === 'string' ? req.body.voice.trim() : null
    const loud = Boolean(req.body?.loud)
    const performance = parseTtsPerformance(req.body?.performance)
    if (!text && !performance) {
      res.status(400).json({ message: 'text required' })
      return
    }
    // Bound Azure TTS spend per request (matches translate max length).
    // Performance meters spoken characters, not SSML tags.
    const spokenChars = performance ? spokenPerformanceChars(performance) : text.length
    if (text.length > 2000 || spokenChars > 2000) {
      res.status(400).json({ message: 'text too long (max 2000 characters)' })
      return
    }
    const azureLang =
      lang === 'en' || lang === 'en-US'
        ? 'en'
        : lang === 'cmn' || lang === 'zh-CN' || lang === 'zh-Hans'
          ? 'zh-CN'
          : lang === 'wuu' || lang === 'wuu-CN'
            ? 'wuu-CN'
            : lang === 'sichuan' || lang === 'zh-CN-sichuan'
              ? 'zh-CN-sichuan'
              : lang === 'tl' || lang === 'fil' || lang === 'fil-PH'
                ? 'fil-PH'
                : lang === 'eses' || lang === 'es-ES' || lang === 'es-es'
                  ? 'es-ES'
                  : lang === 'es' || lang === 'es-MX' || lang === 'es-mx'
                    ? 'es-MX'
                    : lang === 'vi' || lang === 'vi-VN' || lang === 'vi-vn'
                      ? 'vi-VN'
                      : lang === 'th' || lang === 'th-TH' || lang === 'th-th'
                        ? 'th-TH'
                        : lang === 'lo' || lang === 'lo-LA' || lang === 'lo-la'
                          ? 'lo-LA'
                          : lang === 'ko' || lang === 'ko-KR' || lang === 'ko-kr'
                            ? 'ko-KR'
                          : lang === 'ja' || lang === 'ja-JP' || lang === 'ja-jp'
                            ? 'ja-JP'
                          : lang === 'id' || lang === 'id-ID' || lang === 'id-id'
                            ? 'id-ID'
                          : lang === 'ms' || lang === 'ms-MY' || lang === 'ms-my'
                            ? 'ms-MY'
                          : lang === 'ptpt' || lang === 'pt-PT' || lang === 'pt-pt'
                            ? 'pt-PT'
                          : lang === 'pt' || lang === 'pt-BR' || lang === 'pt-br'
                            ? 'pt-BR'
                          : lang === 'fr' || lang === 'fr-FR' || lang === 'fr-fr'
                            ? 'fr-FR'
                          : lang === 'hi' || lang === 'hi-IN' || lang === 'hi-in'
                            ? 'hi-IN'
                          : lang === 'km' || lang === 'km-KH' || lang === 'km-kh'
                            ? 'km-KH'
                          : lang === 'my' || lang === 'my-MM' || lang === 'my-mm'
                            ? 'my-MM'
                          : lang === 'jv' || lang === 'jv-ID' || lang === 'jv-id'
                            ? 'jv-ID'
                          : lang === 'it' || lang === 'it-IT' || lang === 'it-it'
                            ? 'it-IT'
                          : lang === 'de' || lang === 'de-DE' || lang === 'de-de'
                            ? 'de-DE'
                          : lang === 'nl' || lang === 'nl-NL' || lang === 'nl-nl'
                            ? 'nl-NL'
                          : lang === 'ar' || lang === 'ar-EG' || lang === 'ar-eg'
                            ? 'ar-EG'
                          : lang === 'arsa' || lang === 'ar-SA' || lang === 'ar-sa'
                            ? 'ar-SA'
                          : lang === 'ta' || lang === 'ta-IN' || lang === 'ta-in'
                            ? 'ta-IN'
                          : lang === 'tr' || lang === 'tr-TR' || lang === 'tr-tr'
                            ? 'tr-TR'
                          : lang === 'bn' || lang === 'bn-IN' || lang === 'bn-in'
                            ? 'bn-IN'
                          : lang === 'te' || lang === 'te-IN' || lang === 'te-in'
                            ? 'te-IN'
                          : lang === 'gu' || lang === 'gu-IN' || lang === 'gu-in'
                            ? 'gu-IN'
                          : lang === 'kn' || lang === 'kn-IN' || lang === 'kn-in'
                            ? 'kn-IN'
                          : lang === 'pl' || lang === 'pl-PL' || lang === 'pl-pl'
                            ? 'pl-PL'
                          : lang === 'ro' || lang === 'ro-RO' || lang === 'ro-ro'
                            ? 'ro-RO'
                          : lang === 'cs' || lang === 'cs-CZ' || lang === 'cs-cz'
                            ? 'cs-CZ'
                          : lang === 'el' || lang === 'el-GR' || lang === 'el-gr'
                            ? 'el-GR'
                          : lang === 'hu' || lang === 'hu-HU' || lang === 'hu-hu'
                            ? 'hu-HU'
                          : lang === 'sv' || lang === 'sv-SE' || lang === 'sv-se'
                            ? 'sv-SE'
                          : lang === 'ru' || lang === 'ru-RU' || lang === 'ru-ru'
                            ? 'ru-RU'
                          : lang === 'uk' || lang === 'uk-UA' || lang === 'uk-ua'
                            ? 'uk-UA'
                          : lang === 'he' || lang === 'he-IL' || lang === 'he-il'
                            ? 'he-IL'
                          : lang === 'fa' || lang === 'fa-IR' || lang === 'fa-ir'
                            ? 'fa-IR'
                          : lang === 'ur' || lang === 'ur-IN' || lang === 'ur-in'
                            ? 'ur-IN'
                          : lang === 'ml' || lang === 'ml-IN' || lang === 'ml-in'
                            ? 'ml-IN'
                          : lang === 'mr' || lang === 'mr-IN' || lang === 'mr-in'
                            ? 'mr-IN'
                          : lang === 'pa' || lang === 'pa-IN' || lang === 'pa-in'
                            ? 'pa-IN'
                          : lang === 'or' || lang === 'or-IN' || lang === 'or-in'
                            ? 'or-IN'
                          : lang === 'si' || lang === 'si-LK' || lang === 'si-lk'
                            ? 'si-LK'
                          : lang === 'ne' || lang === 'ne-NP' || lang === 'ne-np'
                            ? 'ne-NP'
                          : lang === 'da' || lang === 'da-DK' || lang === 'da-dk'
                            ? 'da-DK'
                          : lang === 'nb' || lang === 'nb-NO' || lang === 'nb-no'
                            ? 'nb-NO'
                          : lang === 'fi' || lang === 'fi-FI' || lang === 'fi-fi'
                            ? 'fi-FI'
                          : lang === 'sk' || lang === 'sk-SK' || lang === 'sk-sk'
                            ? 'sk-SK'
                          : lang === 'hr' || lang === 'hr-HR' || lang === 'hr-hr'
                            ? 'hr-HR'
                          : lang === 'ca' || lang === 'ca-ES' || lang === 'ca-es'
                            ? 'ca-ES'
                          : lang === 'az' || lang === 'az-AZ' || lang === 'az-az'
                            ? 'az-AZ'
                          : lang === 'kk' || lang === 'kk-KZ' || lang === 'kk-kz'
                            ? 'kk-KZ'
                          : lang === 'uz' || lang === 'uz-UZ' || lang === 'uz-uz'
                            ? 'uz-UZ'
                          : lang === 'bg' || lang === 'bg-BG' || lang === 'bg-bg'
                            ? 'bg-BG'
                          : lang === 'sr' || lang === 'sr-RS' || lang === 'sr-rs'
                            ? 'sr-RS'
                          : lang === 'sw' || lang === 'sw-KE' || lang === 'sw-ke'
                            ? 'sw-KE'
                          : lang === 'af' || lang === 'af-ZA' || lang === 'af-za'
                            ? 'af-ZA'
                          : lang === 'et' || lang === 'et-EE' || lang === 'et-ee'
                            ? 'et-EE'
                          : lang === 'lv' || lang === 'lv-LV' || lang === 'lv-lv'
                            ? 'lv-LV'
                          : lang === 'lt' || lang === 'lt-LT' || lang === 'lt-lt'
                            ? 'lt-LT'
                          : lang === 'ga' || lang === 'ga-IE' || lang === 'ga-ie'
                            ? 'ga-IE'
                          : lang === 'cy' || lang === 'cy-GB' || lang === 'cy-gb'
                            ? 'cy-GB'
                          : lang === 'eu' || lang === 'eu-ES' || lang === 'eu-es'
                            ? 'eu-ES'
                          : lang === 'gl' || lang === 'gl-ES' || lang === 'gl-es'
                            ? 'gl-ES'
                          : lang === 'mt' || lang === 'mt-MT' || lang === 'mt-mt'
                            ? 'mt-MT'
                          : lang === 'is' || lang === 'is-IS' || lang === 'is-is'
                            ? 'is-IS'
                          : lang === 'bs' || lang === 'bs-BA' || lang === 'bs-ba'
                            ? 'bs-BA'
                          : lang === 'sq' || lang === 'sq-AL' || lang === 'sq-al'
                            ? 'sq-AL'
                          : lang === 'zu' || lang === 'zu-ZA' || lang === 'zu-za'
                            ? 'zu-ZA'
                          : lang === 'so' || lang === 'so-SO' || lang === 'so-so'
                            ? 'so-SO'
                          : lang === 'as' || lang === 'as-IN' || lang === 'as-in'
                            ? 'as-IN'
                          : lang === 'mk' || lang === 'mk-MK' || lang === 'mk-mk'
                            ? 'mk-MK'
                          : lang === 'mn' || lang === 'mn-MN' || lang === 'mn-mn'
                            ? 'mn-MN'
                          : lang === 'hy' || lang === 'hy-AM' || lang === 'hy-am'
                            ? 'hy-AM'
                          : lang === 'ka' || lang === 'ka-GE' || lang === 'ka-ge'
                            ? 'ka-GE'
                          : lang === 'am' || lang === 'am-ET' || lang === 'am-et'
                            ? 'am-ET'
                          : lang === 'ps' || lang === 'ps-AF' || lang === 'ps-af'
                            ? 'ps-AF'
                          : 'zh-HK'
    const audio = await synthesize(text, azureLang, {
      voice: voiceOverride,
      preferredYue: ent.prefs?.ttsVoiceYue,
      preferredEn: ent.prefs?.ttsVoiceEn,
      preferredCmn: ent.prefs?.ttsVoiceCmn,
      preferredWuu: null,
      preferredSichuan: null,
      preferredTl: ent.prefs?.ttsVoiceTl,
      preferredEs: ent.prefs?.ttsVoiceEs,
      preferredEses: ent.prefs?.ttsVoiceEses,
      preferredVi: ent.prefs?.ttsVoiceVi,
      preferredTh: ent.prefs?.ttsVoiceTh,
      preferredLo: ent.prefs?.ttsVoiceLo,
      preferredKo: ent.prefs?.ttsVoiceKo,
      preferredJa: ent.prefs?.ttsVoiceJa,
      preferredId: ent.prefs?.ttsVoiceId,
      preferredMs: ent.prefs?.ttsVoiceMs,
      preferredPt: ent.prefs?.ttsVoicePt,
      preferredFr: ent.prefs?.ttsVoiceFr,
      preferredHi: ent.prefs?.ttsVoiceHi,
      preferredKm: ent.prefs?.ttsVoiceKm,
      preferredMy: ent.prefs?.ttsVoiceMy,
      preferredJv: ent.prefs?.ttsVoiceJv,
      preferredIt: ent.prefs?.ttsVoiceIt,
      preferredDe: ent.prefs?.ttsVoiceDe,
      preferredNl: ent.prefs?.ttsVoiceNl,
      preferredAr: ent.prefs?.ttsVoiceAr,
      preferredArsa: ent.prefs?.ttsVoiceArsa,
      preferredTa: ent.prefs?.ttsVoiceTa,
      preferredPtpt: ent.prefs?.ttsVoicePtpt,
      preferredTr: ent.prefs?.ttsVoiceTr,
      preferredBn: ent.prefs?.ttsVoiceBn,
      preferredTe: ent.prefs?.ttsVoiceTe,
      preferredGu: ent.prefs?.ttsVoiceGu,
      preferredKn: ent.prefs?.ttsVoiceKn,
      preferredPl: ent.prefs?.ttsVoicePl,
      preferredRo: ent.prefs?.ttsVoiceRo,
      preferredCs: ent.prefs?.ttsVoiceCs,
      preferredEl: ent.prefs?.ttsVoiceEl,
      preferredHu: ent.prefs?.ttsVoiceHu,
      preferredSv: ent.prefs?.ttsVoiceSv,
      preferredRu: ent.prefs?.ttsVoiceRu,
      preferredUk: ent.prefs?.ttsVoiceUk,
      preferredHe: ent.prefs?.ttsVoiceHe,
      preferredFa: ent.prefs?.ttsVoiceFa,
      preferredUr: ent.prefs?.ttsVoiceUr,
      preferredMl: ent.prefs?.ttsVoiceMl,
      preferredMr: ent.prefs?.ttsVoiceMr,
      preferredPa: ent.prefs?.ttsVoicePa,
      preferredOr: ent.prefs?.ttsVoiceOr,
      preferredSi: ent.prefs?.ttsVoiceSi,
      preferredNe: ent.prefs?.ttsVoiceNe,
      preferredDa: ent.prefs?.ttsVoiceDa,
      preferredNb: ent.prefs?.ttsVoiceNb,
      preferredFi: ent.prefs?.ttsVoiceFi,
      preferredSk: ent.prefs?.ttsVoiceSk,
      preferredHr: ent.prefs?.ttsVoiceHr,
      preferredCa: ent.prefs?.ttsVoiceCa,
      preferredAz: ent.prefs?.ttsVoiceAz,
      preferredKk: ent.prefs?.ttsVoiceKk,
      preferredUz: ent.prefs?.ttsVoiceUz,
      preferredBg: ent.prefs?.ttsVoiceBg,
      preferredSr: ent.prefs?.ttsVoiceSr,
      preferredSw: ent.prefs?.ttsVoiceSw,
      preferredAf: ent.prefs?.ttsVoiceAf,
      preferredEt: ent.prefs?.ttsVoiceEt,
      preferredLv: ent.prefs?.ttsVoiceLv,
      preferredLt: ent.prefs?.ttsVoiceLt,
      preferredGa: ent.prefs?.ttsVoiceGa,
      preferredCy: ent.prefs?.ttsVoiceCy,
      preferredEu: ent.prefs?.ttsVoiceEu,
      preferredGl: ent.prefs?.ttsVoiceGl,
      preferredMt: ent.prefs?.ttsVoiceMt,
      preferredIs: ent.prefs?.ttsVoiceIs,
      preferredBs: ent.prefs?.ttsVoiceBs,
      preferredSq: ent.prefs?.ttsVoiceSq,
      preferredZu: ent.prefs?.ttsVoiceZu,
      preferredSo: ent.prefs?.ttsVoiceSo,
      preferredAs: ent.prefs?.ttsVoiceAs,
      preferredMk: ent.prefs?.ttsVoiceMk,
      preferredMn: ent.prefs?.ttsVoiceMn,
      preferredHy: ent.prefs?.ttsVoiceHy,
      preferredKa: ent.prefs?.ttsVoiceKa,
      preferredAm: ent.prefs?.ttsVoiceAm,
      preferredPs: ent.prefs?.ttsVoicePs,
      loud,
      performance,
    })
    // Meter Free (hard cap), Family/Business (unlimited), and guest trial (unlimited).
    if (!env.openMode) {
      if (req.auth?.userId) await addTtsChars(req.auth.userId, spokenChars)
      else if ((req as GuestRequest).guestId) {
        await addGuestTtsChars((req as GuestRequest).guestId!, spokenChars)
      }
    }
    res.setHeader('Content-Type', 'audio/mpeg')
    res.send(audio)
  } catch (e) {
    if (e instanceof ZodError) {
      res.status(400).json({ message: 'Invalid voice performance' })
      return
    }
    res.status(500).json({ message: e instanceof Error ? e.message : 'TTS error' })
  }
})

/** Save cross-device TTS voice preferences (signed-in only). */
app.patch('/api/prefs/tts-voices', async (req: AuthedRequest, res) => {
  const ent = await entitlementFor(req)
  const body = req.body || {}
  const patch: {
    tts_voice_yue?: string
    tts_voice_en?: string
    tts_voice_cmn?: string
    tts_voice_tl?: string
    tts_voice_es?: string
    tts_voice_eses?: string
    tts_voice_vi?: string
    tts_voice_th?: string
    tts_voice_lo?: string
    tts_voice_ko?: string
    tts_voice_ja?: string
    tts_voice_id?: string
    tts_voice_ms?: string
    tts_voice_pt?: string
    tts_voice_fr?: string
    tts_voice_hi?: string
    tts_voice_km?: string
    tts_voice_my?: string
    tts_voice_jv?: string
    tts_voice_it?: string
    tts_voice_de?: string
    tts_voice_nl?: string
    tts_voice_ar?: string
    tts_voice_arsa?: string
    tts_voice_ta?: string
    tts_voice_ptpt?: string
    tts_voice_tr?: string
    tts_voice_bn?: string
    tts_voice_te?: string
    tts_voice_gu?: string
    tts_voice_kn?: string
    tts_voice_pl?: string
    tts_voice_ro?: string
    tts_voice_cs?: string
    tts_voice_el?: string
    tts_voice_hu?: string
    tts_voice_sv?: string
    tts_voice_ru?: string
    tts_voice_uk?: string
    tts_voice_he?: string
    tts_voice_fa?: string
    tts_voice_ur?: string
    tts_voice_ml?: string
    tts_voice_mr?: string
    tts_voice_pa?: string
    tts_voice_or?: string
    tts_voice_si?: string
    tts_voice_ne?: string
    tts_voice_da?: string
    tts_voice_nb?: string
    tts_voice_fi?: string
    tts_voice_sk?: string
    tts_voice_hr?: string
    tts_voice_ca?: string
    tts_voice_az?: string
    tts_voice_kk?: string
    tts_voice_uz?: string
    tts_voice_bg?: string
    tts_voice_sr?: string
    tts_voice_sw?: string
    tts_voice_af?: string
    tts_voice_et?: string
    tts_voice_lv?: string
    tts_voice_lt?: string
    tts_voice_ga?: string
    tts_voice_cy?: string
    tts_voice_eu?: string
    tts_voice_gl?: string
    tts_voice_mt?: string
    tts_voice_is?: string
    tts_voice_bs?: string
    tts_voice_sq?: string
    tts_voice_zu?: string
    tts_voice_so?: string
    tts_voice_as?: string
    tts_voice_mk?: string
    tts_voice_mn?: string
    tts_voice_hy?: string
    tts_voice_ka?: string
    tts_voice_am?: string
    tts_voice_ps?: string
  } = {}
  if (body.ttsVoiceYue != null) {
    const v = String(body.ttsVoiceYue).trim()
    if (!isYueVoice(v)) {
      res.status(400).json({ message: 'Invalid Cantonese voice.' })
      return
    }
    patch.tts_voice_yue = v
  }
  if (body.ttsVoiceEn != null) {
    const v = String(body.ttsVoiceEn).trim()
    if (!isEnVoice(v)) {
      res.status(400).json({ message: 'Invalid English voice.' })
      return
    }
    patch.tts_voice_en = v
  }
  if (body.ttsVoiceCmn != null) {
    const v = String(body.ttsVoiceCmn).trim()
    if (!isCmnVoice(v)) {
      res.status(400).json({ message: 'Invalid Mandarin voice.' })
      return
    }
    patch.tts_voice_cmn = v
  }
  if (body.ttsVoiceTl != null) {
    const v = String(body.ttsVoiceTl).trim()
    if (!isTlVoice(v)) {
      res.status(400).json({ message: 'Invalid Tagalog voice.' })
      return
    }
    patch.tts_voice_tl = v
  }
  if (body.ttsVoiceEs != null) {
    const v = String(body.ttsVoiceEs).trim()
    if (!isEsVoice(v)) {
      res.status(400).json({ message: 'Invalid Mexican Spanish voice.' })
      return
    }
    patch.tts_voice_es = v
  }
  if (body.ttsVoiceEses != null) {
    const v = String(body.ttsVoiceEses).trim()
    if (!isEsesVoice(v)) {
      res.status(400).json({ message: 'Invalid Peninsular Spanish voice.' })
      return
    }
    patch.tts_voice_eses = v
  }
  if (body.ttsVoiceVi != null) {
    const v = String(body.ttsVoiceVi).trim()
    if (!isViVoice(v)) {
      res.status(400).json({ message: 'Invalid Vietnamese voice.' })
      return
    }
    patch.tts_voice_vi = v
  }
  if (body.ttsVoiceTh != null) {
    const v = String(body.ttsVoiceTh).trim()
    if (!isThVoice(v)) {
      res.status(400).json({ message: 'Invalid Thai voice.' })
      return
    }
    patch.tts_voice_th = v
  }
  if (body.ttsVoiceLo != null) {
    const v = String(body.ttsVoiceLo).trim()
    if (!isLoVoice(v)) {
      res.status(400).json({ message: 'Invalid Lao voice.' })
      return
    }
    patch.tts_voice_lo = v
  }
  if (body.ttsVoiceKo != null) {
    const v = String(body.ttsVoiceKo).trim()
    if (!isKoVoice(v)) {
      res.status(400).json({ message: 'Invalid Korean voice.' })
      return
    }
    patch.tts_voice_ko = v
  }
  if (body.ttsVoiceJa != null) {
    const v = String(body.ttsVoiceJa).trim()
    if (!isJaVoice(v)) {
      res.status(400).json({ message: 'Invalid Japanese voice.' })
      return
    }
    patch.tts_voice_ja = v
  }
  if (body.ttsVoiceId != null) {
    const v = String(body.ttsVoiceId).trim()
    if (!isIdVoice(v)) {
      res.status(400).json({ message: 'Invalid Indonesian voice.' })
      return
    }
    patch.tts_voice_id = v
  }
  if (body.ttsVoiceMs != null) {
    const v = String(body.ttsVoiceMs).trim()
    if (!isMsVoice(v)) {
      res.status(400).json({ message: 'Invalid Malay voice.' })
      return
    }
    patch.tts_voice_ms = v
  }
  if (body.ttsVoicePt != null) {
    const v = String(body.ttsVoicePt).trim()
    if (!isPtVoice(v)) {
      res.status(400).json({ message: 'Invalid Portuguese (BR) voice.' })
      return
    }
    patch.tts_voice_pt = v
  }
  if (body.ttsVoiceFr != null) {
    const v = String(body.ttsVoiceFr).trim()
    if (!isFrVoice(v)) {
      res.status(400).json({ message: 'Invalid French voice.' })
      return
    }
    patch.tts_voice_fr = v
  }
  if (body.ttsVoiceHi != null) {
    const v = String(body.ttsVoiceHi).trim()
    if (!isHiVoice(v)) {
      res.status(400).json({ message: 'Invalid Hindi voice.' })
      return
    }
    patch.tts_voice_hi = v
  }
  if (body.ttsVoiceKm != null) {
    const v = String(body.ttsVoiceKm).trim()
    if (!isKmVoice(v)) {
      res.status(400).json({ message: 'Invalid Khmer voice.' })
      return
    }
    patch.tts_voice_km = v
  }
  if (body.ttsVoiceMy != null) {
    const v = String(body.ttsVoiceMy).trim()
    if (!isMyVoice(v)) {
      res.status(400).json({ message: 'Invalid Burmese voice.' })
      return
    }
    patch.tts_voice_my = v
  }
  if (body.ttsVoiceJv != null) {
    const v = String(body.ttsVoiceJv).trim()
    if (!isJvVoice(v)) {
      res.status(400).json({ message: 'Invalid Javanese voice.' })
      return
    }
    patch.tts_voice_jv = v
  }
  if (body.ttsVoiceIt != null) {
    const v = String(body.ttsVoiceIt).trim()
    if (!isItVoice(v)) {
      res.status(400).json({ message: 'Invalid Italian voice.' })
      return
    }
    patch.tts_voice_it = v
  }
  if (body.ttsVoiceDe != null) {
    const v = String(body.ttsVoiceDe).trim()
    if (!isDeVoice(v)) {
      res.status(400).json({ message: 'Invalid German voice.' })
      return
    }
    patch.tts_voice_de = v
  }
  if (body.ttsVoiceNl != null) {
    const v = String(body.ttsVoiceNl).trim()
    if (!isNlVoice(v)) {
      res.status(400).json({ message: 'Invalid Dutch voice.' })
      return
    }
    patch.tts_voice_nl = v
  }
  if (body.ttsVoiceAr != null) {
    const v = String(body.ttsVoiceAr).trim()
    if (!isArVoice(v)) {
      res.status(400).json({ message: 'Invalid Egyptian Arabic voice.' })
      return
    }
    patch.tts_voice_ar = v
  }
  if (body.ttsVoiceArsa != null) {
    const v = String(body.ttsVoiceArsa).trim()
    if (!isArsaVoice(v)) {
      res.status(400).json({ message: 'Invalid Modern Standard Arabic voice.' })
      return
    }
    patch.tts_voice_arsa = v
  }
  if (body.ttsVoiceTa != null) {
    const v = String(body.ttsVoiceTa).trim()
    if (!isTaVoice(v)) {
      res.status(400).json({ message: 'Invalid Tamil voice.' })
      return
    }
    patch.tts_voice_ta = v
  }
  if (body.ttsVoicePtpt != null) {
    const v = String(body.ttsVoicePtpt).trim()
    if (!isPtptVoice(v)) {
      res.status(400).json({ message: 'Invalid European Portuguese voice.' })
      return
    }
    patch.tts_voice_ptpt = v
  }
  if (body.ttsVoiceTr != null) {
    const v = String(body.ttsVoiceTr).trim()
    if (!isTrVoice(v)) {
      res.status(400).json({ message: 'Invalid Turkish voice.' })
      return
    }
    patch.tts_voice_tr = v
  }
  if (body.ttsVoiceBn != null) {
    const v = String(body.ttsVoiceBn).trim()
    if (!isBnVoice(v)) {
      res.status(400).json({ message: 'Invalid Bengali voice.' })
      return
    }
    patch.tts_voice_bn = v
  }
  if (body.ttsVoiceTe != null) {
    const v = String(body.ttsVoiceTe).trim()
    if (!isTeVoice(v)) {
      res.status(400).json({ message: 'Invalid Telugu voice.' })
      return
    }
    patch.tts_voice_te = v
  }
  if (body.ttsVoiceGu != null) {
    const v = String(body.ttsVoiceGu).trim()
    if (!isGuVoice(v)) {
      res.status(400).json({ message: 'Invalid Gujarati voice.' })
      return
    }
    patch.tts_voice_gu = v
  }
  if (body.ttsVoiceKn != null) {
    const v = String(body.ttsVoiceKn).trim()
    if (!isKnVoice(v)) {
      res.status(400).json({ message: 'Invalid Kannada voice.' })
      return
    }
    patch.tts_voice_kn = v
  }
  if (body.ttsVoicePl != null) {
    const v = String(body.ttsVoicePl).trim()
    if (!isPlVoice(v)) {
      res.status(400).json({ message: 'Invalid Polish voice.' })
      return
    }
    patch.tts_voice_pl = v
  }
  if (body.ttsVoiceRo != null) {
    const v = String(body.ttsVoiceRo).trim()
    if (!isRoVoice(v)) {
      res.status(400).json({ message: 'Invalid Romanian voice.' })
      return
    }
    patch.tts_voice_ro = v
  }
  if (body.ttsVoiceCs != null) {
    const v = String(body.ttsVoiceCs).trim()
    if (!isCsVoice(v)) {
      res.status(400).json({ message: 'Invalid Czech voice.' })
      return
    }
    patch.tts_voice_cs = v
  }
  if (body.ttsVoiceEl != null) {
    const v = String(body.ttsVoiceEl).trim()
    if (!isElVoice(v)) {
      res.status(400).json({ message: 'Invalid Greek voice.' })
      return
    }
    patch.tts_voice_el = v
  }
  if (body.ttsVoiceHu != null) {
    const v = String(body.ttsVoiceHu).trim()
    if (!isHuVoice(v)) {
      res.status(400).json({ message: 'Invalid Hungarian voice.' })
      return
    }
    patch.tts_voice_hu = v
  }
  if (body.ttsVoiceSv != null) {
    const v = String(body.ttsVoiceSv).trim()
    if (!isSvVoice(v)) {
      res.status(400).json({ message: 'Invalid Swedish voice.' })
      return
    }
    patch.tts_voice_sv = v
  }
  if (body.ttsVoiceRu != null) {
    const v = String(body.ttsVoiceRu).trim()
    if (!isRuVoice(v)) {
      res.status(400).json({ message: 'Invalid Russian voice.' })
      return
    }
    patch.tts_voice_ru = v
  }
  if (body.ttsVoiceUk != null) {
    const v = String(body.ttsVoiceUk).trim()
    if (!isUkVoice(v)) {
      res.status(400).json({ message: 'Invalid Ukrainian voice.' })
      return
    }
    patch.tts_voice_uk = v
  }
  if (body.ttsVoiceHe != null) {
    const v = String(body.ttsVoiceHe).trim()
    if (!isHeVoice(v)) {
      res.status(400).json({ message: 'Invalid Hebrew voice.' })
      return
    }
    patch.tts_voice_he = v
  }
  if (body.ttsVoiceFa != null) {
    const v = String(body.ttsVoiceFa).trim()
    if (!isFaVoice(v)) {
      res.status(400).json({ message: 'Invalid Persian voice.' })
      return
    }
    patch.tts_voice_fa = v
  }
  if (body.ttsVoiceUr != null) {
    const v = String(body.ttsVoiceUr).trim()
    if (!isUrVoice(v)) {
      res.status(400).json({ message: 'Invalid Urdu voice.' })
      return
    }
    patch.tts_voice_ur = v
  }
  if (body.ttsVoiceMl != null) {
    const v = String(body.ttsVoiceMl).trim()
    if (!isMlVoice(v)) {
      res.status(400).json({ message: 'Invalid Malayalam voice.' })
      return
    }
    patch.tts_voice_ml = v
  }
  if (body.ttsVoiceMr != null) {
    const v = String(body.ttsVoiceMr).trim()
    if (!isMrVoice(v)) {
      res.status(400).json({ message: 'Invalid Marathi voice.' })
      return
    }
    patch.tts_voice_mr = v
  }
  if (body.ttsVoicePa != null) {
    const v = String(body.ttsVoicePa).trim()
    if (!isPaVoice(v)) {
      res.status(400).json({ message: 'Invalid Punjabi voice.' })
      return
    }
    patch.tts_voice_pa = v
  }
  if (body.ttsVoiceOr != null) {
    const v = String(body.ttsVoiceOr).trim()
    if (!isOrVoice(v)) {
      res.status(400).json({ message: 'Invalid Odia voice.' })
      return
    }
    patch.tts_voice_or = v
  }
  if (body.ttsVoiceSi != null) {
    const v = String(body.ttsVoiceSi).trim()
    if (!isSiVoice(v)) {
      res.status(400).json({ message: 'Invalid Sinhala voice.' })
      return
    }
    patch.tts_voice_si = v
  }
  if (body.ttsVoiceNe != null) {
    const v = String(body.ttsVoiceNe).trim()
    if (!isNeVoice(v)) {
      res.status(400).json({ message: 'Invalid Nepali voice.' })
      return
    }
    patch.tts_voice_ne = v
  }
  if (body.ttsVoiceDa != null) {
    const v = String(body.ttsVoiceDa).trim()
    if (!isDaVoice(v)) {
      res.status(400).json({ message: 'Invalid Danish voice.' })
      return
    }
    patch.tts_voice_da = v
  }
  if (body.ttsVoiceNb != null) {
    const v = String(body.ttsVoiceNb).trim()
    if (!isNbVoice(v)) {
      res.status(400).json({ message: 'Invalid Norwegian Bokmål voice.' })
      return
    }
    patch.tts_voice_nb = v
  }
  if (body.ttsVoiceFi != null) {
    const v = String(body.ttsVoiceFi).trim()
    if (!isFiVoice(v)) {
      res.status(400).json({ message: 'Invalid Finnish voice.' })
      return
    }
    patch.tts_voice_fi = v
  }
  if (body.ttsVoiceSk != null) {
    const v = String(body.ttsVoiceSk).trim()
    if (!isSkVoice(v)) {
      res.status(400).json({ message: 'Invalid Slovak voice.' })
      return
    }
    patch.tts_voice_sk = v
  }
  if (body.ttsVoiceHr != null) {
    const v = String(body.ttsVoiceHr).trim()
    if (!isHrVoice(v)) {
      res.status(400).json({ message: 'Invalid Croatian voice.' })
      return
    }
    patch.tts_voice_hr = v
  }
  if (body.ttsVoiceCa != null) {
    const v = String(body.ttsVoiceCa).trim()
    if (!isCaVoice(v)) {
      res.status(400).json({ message: 'Invalid Catalan voice.' })
      return
    }
    patch.tts_voice_ca = v
  }
  if (body.ttsVoiceAz != null) {
    const v = String(body.ttsVoiceAz).trim()
    if (!isAzVoice(v)) {
      res.status(400).json({ message: 'Invalid Azerbaijani voice.' })
      return
    }
    patch.tts_voice_az = v
  }
  if (body.ttsVoiceKk != null) {
    const v = String(body.ttsVoiceKk).trim()
    if (!isKkVoice(v)) {
      res.status(400).json({ message: 'Invalid Kazakh voice.' })
      return
    }
    patch.tts_voice_kk = v
  }
  if (body.ttsVoiceUz != null) {
    const v = String(body.ttsVoiceUz).trim()
    if (!isUzVoice(v)) {
      res.status(400).json({ message: 'Invalid Uzbek voice.' })
      return
    }
    patch.tts_voice_uz = v
  }
  if (body.ttsVoiceBg != null) {
    const v = String(body.ttsVoiceBg).trim()
    if (!isBgVoice(v)) {
      res.status(400).json({ message: 'Invalid Bulgarian voice.' })
      return
    }
    patch.tts_voice_bg = v
  }
  if (body.ttsVoiceSr != null) {
    const v = String(body.ttsVoiceSr).trim()
    if (!isSrVoice(v)) {
      res.status(400).json({ message: 'Invalid Serbian voice.' })
      return
    }
    patch.tts_voice_sr = v
  }
  if (body.ttsVoiceSw != null) {
    const v = String(body.ttsVoiceSw).trim()
    if (!isSwVoice(v)) {
      res.status(400).json({ message: 'Invalid Swahili voice.' })
      return
    }
    patch.tts_voice_sw = v
  }
  if (body.ttsVoiceAf != null) {
    const v = String(body.ttsVoiceAf).trim()
    if (!isAfVoice(v)) {
      res.status(400).json({ message: 'Invalid Afrikaans voice.' })
      return
    }
    patch.tts_voice_af = v
  }
  if (body.ttsVoiceEt != null) {
    const v = String(body.ttsVoiceEt).trim()
    if (!isEtVoice(v)) {
      res.status(400).json({ message: 'Invalid Estonian voice.' })
      return
    }
    patch.tts_voice_et = v
  }
  if (body.ttsVoiceLv != null) {
    const v = String(body.ttsVoiceLv).trim()
    if (!isLvVoice(v)) {
      res.status(400).json({ message: 'Invalid Latvian voice.' })
      return
    }
    patch.tts_voice_lv = v
  }
  if (body.ttsVoiceLt != null) {
    const v = String(body.ttsVoiceLt).trim()
    if (!isLtVoice(v)) {
      res.status(400).json({ message: 'Invalid Lithuanian voice.' })
      return
    }
    patch.tts_voice_lt = v
  }
  if (body.ttsVoiceGa != null) {
    const v = String(body.ttsVoiceGa).trim()
    if (!isGaVoice(v)) {
      res.status(400).json({ message: 'Invalid Irish voice.' })
      return
    }
    patch.tts_voice_ga = v
  }
  if (body.ttsVoiceCy != null) {
    const v = String(body.ttsVoiceCy).trim()
    if (!isCyVoice(v)) {
      res.status(400).json({ message: 'Invalid Welsh voice.' })
      return
    }
    patch.tts_voice_cy = v
  }
  if (body.ttsVoiceEu != null) {
    const v = String(body.ttsVoiceEu).trim()
    if (!isEuVoice(v)) {
      res.status(400).json({ message: 'Invalid Basque voice.' })
      return
    }
    patch.tts_voice_eu = v
  }
  if (body.ttsVoiceGl != null) {
    const v = String(body.ttsVoiceGl).trim()
    if (!isGlVoice(v)) {
      res.status(400).json({ message: 'Invalid Galician voice.' })
      return
    }
    patch.tts_voice_gl = v
  }
  if (body.ttsVoiceMt != null) {
    const v = String(body.ttsVoiceMt).trim()
    if (!isMtVoice(v)) {
      res.status(400).json({ message: 'Invalid Maltese voice.' })
      return
    }
    patch.tts_voice_mt = v
  }
  if (body.ttsVoiceIs != null) {
    const v = String(body.ttsVoiceIs).trim()
    if (!isIsVoice(v)) {
      res.status(400).json({ message: 'Invalid Icelandic voice.' })
      return
    }
    patch.tts_voice_is = v
  }
  if (body.ttsVoiceBs != null) {
    const v = String(body.ttsVoiceBs).trim()
    if (!isBsVoice(v)) {
      res.status(400).json({ message: 'Invalid Bosnian voice.' })
      return
    }
    patch.tts_voice_bs = v
  }
  if (body.ttsVoiceSq != null) {
    const v = String(body.ttsVoiceSq).trim()
    if (!isSqVoice(v)) {
      res.status(400).json({ message: 'Invalid Albanian voice.' })
      return
    }
    patch.tts_voice_sq = v
  }
  if (body.ttsVoiceZu != null) {
    const v = String(body.ttsVoiceZu).trim()
    if (!isZuVoice(v)) {
      res.status(400).json({ message: 'Invalid Zulu voice.' })
      return
    }
    patch.tts_voice_zu = v
  }
  if (body.ttsVoiceSo != null) {
    const v = String(body.ttsVoiceSo).trim()
    if (!isSoVoice(v)) {
      res.status(400).json({ message: 'Invalid Somali voice.' })
      return
    }
    patch.tts_voice_so = v
  }
  if (body.ttsVoiceAs != null) {
    const v = String(body.ttsVoiceAs).trim()
    if (!isAsVoice(v)) {
      res.status(400).json({ message: 'Invalid Assamese voice.' })
      return
    }
    patch.tts_voice_as = v
  }
  if (body.ttsVoiceMk != null) {
    const v = String(body.ttsVoiceMk).trim()
    if (!isMkVoice(v)) {
      res.status(400).json({ message: 'Invalid Macedonian voice.' })
      return
    }
    patch.tts_voice_mk = v
  }
  if (body.ttsVoiceMn != null) {
    const v = String(body.ttsVoiceMn).trim()
    if (!isMnVoice(v)) {
      res.status(400).json({ message: 'Invalid Mongolian voice.' })
      return
    }
    patch.tts_voice_mn = v
  }
  if (body.ttsVoiceHy != null) {
    const v = String(body.ttsVoiceHy).trim()
    if (!isHyVoice(v)) {
      res.status(400).json({ message: 'Invalid Armenian voice.' })
      return
    }
    patch.tts_voice_hy = v
  }
  if (body.ttsVoiceKa != null) {
    const v = String(body.ttsVoiceKa).trim()
    if (!isKaVoice(v)) {
      res.status(400).json({ message: 'Invalid Georgian voice.' })
      return
    }
    patch.tts_voice_ka = v
  }
  if (body.ttsVoiceAm != null) {
    const v = String(body.ttsVoiceAm).trim()
    if (!isAmVoice(v)) {
      res.status(400).json({ message: 'Invalid Amharic voice.' })
      return
    }
    patch.tts_voice_am = v
  }
  if (body.ttsVoicePs != null) {
    const v = String(body.ttsVoicePs).trim()
    if (!isPsVoice(v)) {
      res.status(400).json({ message: 'Invalid Pashto voice.' })
      return
    }
    patch.tts_voice_ps = v
  }
  if (!Object.keys(patch).length) {
    res.status(400).json({ message: 'No voice preferences provided.' })
    return
  }

  // Open / local-dev mode: validate + echo prefs (no Supabase user session).
  if (env.openMode || !req.auth?.userId) {
    if (!ent.loggedIn && !env.openMode) {
      res.status(401).json({ message: 'Sign in to sync voice preferences.', entitlement: ent })
      return
    }
    if (env.openMode) {
      const prefs = {
        ttsVoiceYue: patch.tts_voice_yue || ent.prefs.ttsVoiceYue,
        ttsVoiceEn: patch.tts_voice_en || ent.prefs.ttsVoiceEn,
        ttsVoiceCmn: patch.tts_voice_cmn || ent.prefs.ttsVoiceCmn,
        ttsVoiceTl: patch.tts_voice_tl || ent.prefs.ttsVoiceTl,
        ttsVoiceEs: patch.tts_voice_es || ent.prefs.ttsVoiceEs,
        ttsVoiceEses: patch.tts_voice_eses || ent.prefs.ttsVoiceEses,
        ttsVoiceVi: patch.tts_voice_vi || ent.prefs.ttsVoiceVi,
        ttsVoiceTh: patch.tts_voice_th || ent.prefs.ttsVoiceTh,
        ttsVoiceLo: patch.tts_voice_lo || ent.prefs.ttsVoiceLo,
        ttsVoiceKo: patch.tts_voice_ko || ent.prefs.ttsVoiceKo,
        ttsVoiceJa: patch.tts_voice_ja || ent.prefs.ttsVoiceJa,
        ttsVoiceId: patch.tts_voice_id || ent.prefs.ttsVoiceId,
        ttsVoiceMs: patch.tts_voice_ms || ent.prefs.ttsVoiceMs,
        ttsVoicePt: patch.tts_voice_pt || ent.prefs.ttsVoicePt,
        ttsVoiceFr: patch.tts_voice_fr || ent.prefs.ttsVoiceFr,
        ttsVoiceHi: patch.tts_voice_hi || ent.prefs.ttsVoiceHi,
        ttsVoiceKm: patch.tts_voice_km || ent.prefs.ttsVoiceKm,
        ttsVoiceMy: patch.tts_voice_my || ent.prefs.ttsVoiceMy,
        ttsVoiceJv: patch.tts_voice_jv || ent.prefs.ttsVoiceJv,
        ttsVoiceIt: patch.tts_voice_it || ent.prefs.ttsVoiceIt,
        ttsVoiceDe: patch.tts_voice_de || ent.prefs.ttsVoiceDe,
        ttsVoiceNl: patch.tts_voice_nl || ent.prefs.ttsVoiceNl,
        ttsVoiceAr: patch.tts_voice_ar || ent.prefs.ttsVoiceAr,
        ttsVoiceArsa: patch.tts_voice_arsa || ent.prefs.ttsVoiceArsa,
        ttsVoiceTa: patch.tts_voice_ta || ent.prefs.ttsVoiceTa,
        ttsVoicePtpt: patch.tts_voice_ptpt || ent.prefs.ttsVoicePtpt,
        ttsVoiceTr: patch.tts_voice_tr || ent.prefs.ttsVoiceTr,
        ttsVoiceBn: patch.tts_voice_bn || ent.prefs.ttsVoiceBn,
        ttsVoiceTe: patch.tts_voice_te || ent.prefs.ttsVoiceTe,
        ttsVoiceGu: patch.tts_voice_gu || ent.prefs.ttsVoiceGu,
        ttsVoiceKn: patch.tts_voice_kn || ent.prefs.ttsVoiceKn,
        ttsVoicePl: patch.tts_voice_pl || ent.prefs.ttsVoicePl,
        ttsVoiceRo: patch.tts_voice_ro || ent.prefs.ttsVoiceRo,
        ttsVoiceCs: patch.tts_voice_cs || ent.prefs.ttsVoiceCs,
        ttsVoiceEl: patch.tts_voice_el || ent.prefs.ttsVoiceEl,
        ttsVoiceHu: patch.tts_voice_hu || ent.prefs.ttsVoiceHu,
        ttsVoiceSv: patch.tts_voice_sv || ent.prefs.ttsVoiceSv,
        ttsVoiceRu: patch.tts_voice_ru || ent.prefs.ttsVoiceRu,
        ttsVoiceUk: patch.tts_voice_uk || ent.prefs.ttsVoiceUk,
        ttsVoiceHe: patch.tts_voice_he || ent.prefs.ttsVoiceHe,
        ttsVoiceFa: patch.tts_voice_fa || ent.prefs.ttsVoiceFa,
        ttsVoiceUr: patch.tts_voice_ur || ent.prefs.ttsVoiceUr,
        ttsVoiceMl: patch.tts_voice_ml || ent.prefs.ttsVoiceMl,
        ttsVoiceMr: patch.tts_voice_mr || ent.prefs.ttsVoiceMr,
        ttsVoicePa: patch.tts_voice_pa || ent.prefs.ttsVoicePa,
        ttsVoiceOr: patch.tts_voice_or || ent.prefs.ttsVoiceOr,
        ttsVoiceSi: patch.tts_voice_si || ent.prefs.ttsVoiceSi,
        ttsVoiceNe: patch.tts_voice_ne || ent.prefs.ttsVoiceNe,
        ttsVoiceDa: patch.tts_voice_da || ent.prefs.ttsVoiceDa,
        ttsVoiceNb: patch.tts_voice_nb || ent.prefs.ttsVoiceNb,
        ttsVoiceFi: patch.tts_voice_fi || ent.prefs.ttsVoiceFi,
        ttsVoiceSk: patch.tts_voice_sk || ent.prefs.ttsVoiceSk,
        ttsVoiceHr: patch.tts_voice_hr || ent.prefs.ttsVoiceHr,
        ttsVoiceCa: patch.tts_voice_ca || ent.prefs.ttsVoiceCa,
        ttsVoiceAz: patch.tts_voice_az || ent.prefs.ttsVoiceAz,
        ttsVoiceKk: patch.tts_voice_kk || ent.prefs.ttsVoiceKk,
        ttsVoiceUz: patch.tts_voice_uz || ent.prefs.ttsVoiceUz,
        ttsVoiceBg: patch.tts_voice_bg || ent.prefs.ttsVoiceBg,
        ttsVoiceSr: patch.tts_voice_sr || ent.prefs.ttsVoiceSr,
        ttsVoiceSw: patch.tts_voice_sw || ent.prefs.ttsVoiceSw,
        ttsVoiceAf: patch.tts_voice_af || ent.prefs.ttsVoiceAf,
        ttsVoiceEt: patch.tts_voice_et || ent.prefs.ttsVoiceEt,
        ttsVoiceLv: patch.tts_voice_lv || ent.prefs.ttsVoiceLv,
        ttsVoiceLt: patch.tts_voice_lt || ent.prefs.ttsVoiceLt,
        ttsVoiceGa: patch.tts_voice_ga || ent.prefs.ttsVoiceGa,
        ttsVoiceCy: patch.tts_voice_cy || ent.prefs.ttsVoiceCy,
        ttsVoiceEu: patch.tts_voice_eu || ent.prefs.ttsVoiceEu,
        ttsVoiceGl: patch.tts_voice_gl || ent.prefs.ttsVoiceGl,
        ttsVoiceMt: patch.tts_voice_mt || ent.prefs.ttsVoiceMt,
        ttsVoiceIs: patch.tts_voice_is || ent.prefs.ttsVoiceIs,
        ttsVoiceBs: patch.tts_voice_bs || ent.prefs.ttsVoiceBs,
        ttsVoiceSq: patch.tts_voice_sq || ent.prefs.ttsVoiceSq,
        ttsVoiceZu: patch.tts_voice_zu || ent.prefs.ttsVoiceZu,
        ttsVoiceSo: patch.tts_voice_so || ent.prefs.ttsVoiceSo,
        ttsVoiceAs: patch.tts_voice_as || ent.prefs.ttsVoiceAs,
        ttsVoiceMk: patch.tts_voice_mk || ent.prefs.ttsVoiceMk,
        ttsVoiceMn: patch.tts_voice_mn || ent.prefs.ttsVoiceMn,
        ttsVoiceHy: patch.tts_voice_hy || ent.prefs.ttsVoiceHy,
        ttsVoiceKa: patch.tts_voice_ka || ent.prefs.ttsVoiceKa,
        ttsVoiceAm: patch.tts_voice_am || ent.prefs.ttsVoiceAm,
        ttsVoicePs: patch.tts_voice_ps || ent.prefs.ttsVoicePs,
        autoSpeak: ent.prefs.autoSpeak,
        primaryLang: ent.prefs.primaryLang,
        username: ent.prefs.username,
        usernameChangedAt: ent.prefs.usernameChangedAt,
      }
      res.json({ ok: true, prefs, entitlement: { ...ent, prefs } })
      return
    }
    res.status(401).json({ message: 'Sign in to sync voice preferences.', entitlement: ent })
    return
  }

  try {
    await upsertProfilePlan(req.auth.userId, patch)
    const next = await entitlementFor(req)
    res.json({
      ok: true,
      prefs: next.prefs,
      entitlement: next,
    })
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to save preferences' })
  }
})

/** Save cross-device Auto-speak preference (signed-in only). */
app.patch('/api/prefs/auto-speak', async (req: AuthedRequest, res) => {
  const ent = await entitlementFor(req)
  if (typeof req.body?.autoSpeak !== 'boolean') {
    res.status(400).json({ message: 'autoSpeak boolean is required.' })
    return
  }
  const autoSpeak = Boolean(req.body.autoSpeak)

  if (env.openMode || !req.auth?.userId) {
    if (!ent.loggedIn && !env.openMode) {
      res.status(401).json({ message: 'Sign in to sync Auto-speak.', entitlement: ent })
      return
    }
    if (env.openMode) {
      const prefs = { ...ent.prefs, autoSpeak }
      res.json({ ok: true, prefs, entitlement: { ...ent, prefs } })
      return
    }
    res.status(401).json({ message: 'Sign in to sync Auto-speak.', entitlement: ent })
    return
  }

  try {
    await upsertProfilePlan(req.auth.userId, { auto_speak: autoSpeak })
    const next = await entitlementFor(req)
    res.json({
      ok: true,
      prefs: next.prefs,
      entitlement: next,
    })
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to save Auto-speak' })
  }
})

/** Save cross-device primary language preference (signed-in only). */
app.patch('/api/prefs/primary-lang', async (req: AuthedRequest, res) => {
  const ent = await entitlementFor(req)
  const { normalizePrimaryLang, PRIMARY_LANGS, isPrimaryLang } = await import('./entitlements.js')
  const raw = req.body?.primaryLang
  if (typeof raw !== 'string' || !isPrimaryLang(raw)) {
    res
      .status(400)
      .json({ message: `primaryLang must be one of: ${PRIMARY_LANGS.join(', ')}.` })
    return
  }
  const primaryLang = normalizePrimaryLang(raw)

  if (env.openMode || !req.auth?.userId) {
    if (!ent.loggedIn && !env.openMode) {
      res.status(401).json({ message: 'Sign in to sync primary language.', entitlement: ent })
      return
    }
    if (env.openMode) {
      const prefs = { ...ent.prefs, primaryLang }
      res.json({ ok: true, prefs, entitlement: { ...ent, prefs } })
      return
    }
    res.status(401).json({ message: 'Sign in to sync primary language.', entitlement: ent })
    return
  }

  try {
    await upsertProfilePlan(req.auth.userId, { primary_lang: primaryLang })
    const next = await entitlementFor(req)
    res.json({
      ok: true,
      prefs: next.prefs,
      entitlement: next,
    })
  } catch (e) {
    res.status(500).json({
      message: e instanceof Error ? e.message : 'Failed to save primary language',
    })
  }
})

const USERNAME_COOLDOWN_MS = 60 * 60 * 1000

/** Set / change Account Hub username (once per hour). */
app.patch('/api/prefs/username', async (req: AuthedRequest, res) => {
  const ent = await entitlementFor(req)
  if (!ent.loggedIn || !req.auth?.userId) {
    res.status(401).json({ message: 'Sign in to set a username.', entitlement: ent })
    return
  }

  const normalized = normalizeUsernameInput(String(req.body?.username || ''))
  if (!normalized) {
    res.status(400).json({
      message: 'Username must be 3–24 characters: letters, numbers, . _ - (start with a letter or number).',
    })
    return
  }

  if (env.openMode) {
    const prefs = {
      ...ent.prefs,
      username: normalized,
      usernameChangedAt: new Date().toISOString(),
    }
    res.json({ ok: true, prefs, entitlement: { ...ent, prefs } })
    return
  }

  try {
    const profile = await getProfile(req.auth.userId)
    const current = profile?.username || null
    if (current && current.toLowerCase() === normalized.toLowerCase()) {
      // Same name (any casing) — no-op, don't burn the cooldown.
      const next = await entitlementFor(req)
      res.json({ ok: true, prefs: next.prefs, entitlement: next })
      return
    }

    const changedAt = profile?.username_changed_at ? Date.parse(profile.username_changed_at) : NaN
    if (Number.isFinite(changedAt)) {
      const waitMs = USERNAME_COOLDOWN_MS - (Date.now() - changedAt)
      if (waitMs > 0) {
        const waitMin = Math.max(1, Math.ceil(waitMs / 60000))
        res.status(429).json({
          message: `You can change your username again in about ${waitMin} minute${waitMin === 1 ? '' : 's'}.`,
          retryAfterMinutes: waitMin,
          entitlement: ent,
        })
        return
      }
    }

    if (await isUsernameTaken(normalized, req.auth.userId)) {
      res.status(409).json({ message: 'That username is already taken.' })
      return
    }

    await upsertProfilePlan(req.auth.userId, {
      username: normalized,
      username_changed_at: new Date().toISOString(),
    })
    const next = await entitlementFor(req)
    res.json({ ok: true, prefs: next.prefs, entitlement: next })
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to save username' })
  }
})

app.post('/api/usage/heartbeat', async (req: AuthedRequest, res) => {
  const ent = await entitlementFor(req)
  if (!ent.allowed.live) {
    const login = ent.reason === 'login_required'
    const guestDone = ent.reason === 'guest_trial_exhausted'
    res.status(login || guestDone ? 401 : 402).json({
      message:
        login
          ? 'Please log in to use live translation.'
          : guestDone
            ? guestTrialMessage('live')
            : ent.reason === 'account_disabled'
              ? 'This account has been disabled.'
              : 'Live minutes exhausted for this month.',
      entitlement: ent,
    })
    return
  }
  const seconds = Math.max(0, Math.min(120, Number(req.body?.seconds || 0)))
  if (!env.openMode && seconds > 0) {
    if (req.auth?.userId) await addLiveSeconds(req.auth.userId, seconds)
    else if ((req as GuestRequest).guestId) {
      await addGuestLiveSeconds((req as GuestRequest).guestId!, seconds)
    }
  }
  res.json(await entitlementFor(req))
})

app.post('/api/camera/scan', async (req: AuthedRequest, res) => {
  if (!allowGuestIpOrReject(req, res, 'cameraScan')) return
  const forDocs = Boolean(req.body?.forDocs)
  const ent = await entitlementFor(req)
  const allowed = forDocs ? ent.allowed.docs : ent.allowed.camera
  if (!allowed) {
    const login = ent.reason === 'login_required' || (forDocs && !ent.loggedIn)
    const guestDone = !forDocs && ent.reason === 'guest_trial_exhausted'
    const disabled = ent.reason === 'account_disabled'
    const docsQuota =
      ent.reason === 'docs_quota_exhausted' || ent.reason === 'no_docs_quota'
    const camQuota =
      ent.reason === 'camera_quota_exhausted' || ent.reason === 'no_camera_quota'
    res.status(login || guestDone ? 401 : 402).json({
      message: login
        ? forDocs
          ? 'Please sign in to translate documents.'
          : 'Please sign in to use camera translation.'
        : guestDone
          ? guestTrialMessage('camera')
          : disabled
            ? 'This account has been disabled.'
            : forDocs
              ? docsQuota
                ? 'Document page quota exhausted for this month.'
                : 'Document translation is not available.'
              : camQuota
                ? 'Camera scan credits exhausted for this month.'
                : 'Camera translation is not available.',
      entitlement: ent,
    })
    return
  }
  try {
    const allowAiVision = env.openMode || Boolean(ent.allowed.aiVision)
    const result = await cameraScan(req.body, { allowAiVision })
    // Cam AR/Upload: 1 scan credit per successful call.
    // Docs hybrid OCR (`forDocs`): bill ≥1 docs page so Vision cannot run unbounded.
    if (!env.openMode) {
      if (forDocs) {
        if (req.auth?.userId) await addDocsPages(req.auth.userId, 1)
      } else if (req.auth?.userId) {
        await addCameraTranslateCount(req.auth.userId, 1)
      } else if ((req as GuestRequest).guestId) {
        await addGuestCameraTranslateCount((req as GuestRequest).guestId!, 1)
      }
    }
    // AI vision LLM fallback — metered; hard monthly caps enforced via entitlements.
    if (!env.openMode && result.aiVisionUsed) {
      if (req.auth?.userId) await addAiVisionCount(req.auth.userId, 1)
      else if ((req as GuestRequest).guestId) {
        await addGuestAiVisionCount((req as GuestRequest).guestId!, 1)
      }
    }
    res.json({ ...result, entitlement: await entitlementFor(req) })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Camera scan failed'
    const status =
      e instanceof ZodError
        ? 400
        : /too large/i.test(message)
          ? 413
          : 500
    res.status(status).json({ message })
  }
})

function docsDeniedMessage(ent: Awaited<ReturnType<typeof entitlementFor>>) {
  if (!ent.loggedIn || ent.reason === 'login_required') {
    return 'Please sign in to translate documents.'
  }
  if (ent.reason === 'account_disabled') return 'This account has been disabled.'
  if (ent.reason === 'docs_quota_exhausted' || ent.reason === 'no_docs_quota') {
    return 'Document page quota exhausted for this month.'
  }
  return 'Document translation is not available.'
}

function docsPagesRemainingOk(
  ent: Awaited<ReturnType<typeof entitlementFor>>,
  pages: number,
): boolean {
  if (ent.docsUnlimited) return true
  if (!ent.allowed.docs) return false
  const remaining = ent.remaining.docsPages
  if (remaining < 0) return true
  return pages <= remaining
}

/** Office / TXT layout-preserving document translate (Cam → Documents). */
app.post('/api/docs/translate', async (req: AuthedRequest, res) => {
  const ent = await entitlementFor(req)
  if (!ent.allowed.docs) {
    res.status(!ent.loggedIn || ent.reason === 'login_required' ? 401 : 402).json({
      message: docsDeniedMessage(ent),
      entitlement: ent,
    })
    return
  }
  try {
    const peek = await peekDocPages(req.body)
    if (!docsPagesRemainingOk(ent, peek.pages)) {
      res.status(402).json({
        message: `Not enough document pages remaining (need ~${peek.pages}).`,
        entitlement: ent,
        pagesNeeded: peek.pages,
      })
      return
    }
    const result = await translateDocumentFile(req.body)
    // Bill only on success — never on thrown errors above.
    if (!env.openMode && req.auth?.userId && result.pages > 0) {
      await addDocsPages(req.auth.userId, result.pages)
    }
    res.json({ ...result, entitlement: await entitlementFor(req) })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Document translation failed'
    const status = e instanceof ZodError ? 400 : /too large/i.test(message) ? 413 : 500
    res.status(status).json({ message })
  }
})

/** Batch text segments for PDF hybrid (extract → translate → paint). Bills ~1 docs page per call. */
app.post('/api/docs/segments', async (req: AuthedRequest, res) => {
  const ent = await entitlementFor(req)
  if (!ent.allowed.docs) {
    res.status(!ent.loggedIn || ent.reason === 'login_required' ? 401 : 402).json({
      message: docsDeniedMessage(ent),
      entitlement: ent,
    })
    return
  }
  try {
    const segments = Array.isArray(req.body?.segments) ? (req.body.segments as unknown[]) : []
    const totalChars = segments.reduce<number>(
      (n, s) => n + (typeof s === 'string' ? s.length : 0),
      0,
    )
    // Same density as Office/TXT page estimate — at least 1 page per paid model call.
    const estimatePages = Math.max(1, Math.min(50, Math.ceil(totalChars / 1800)))
    if (!docsPagesRemainingOk(ent, estimatePages)) {
      res.status(402).json({
        message: `Not enough document pages remaining (need ~${estimatePages}).`,
        entitlement: ent,
        pagesNeeded: estimatePages,
      })
      return
    }
    const result = await translateDocSegments(req.body)
    if (!env.openMode && req.auth?.userId) {
      await addDocsPages(req.auth.userId, estimatePages)
    }
    res.json({
      ...result,
      pagesBilled: env.openMode ? 0 : estimatePages,
      entitlement: await entitlementFor(req),
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Segment translation failed'
    res.status(e instanceof ZodError ? 400 : 500).json({ message })
  }
})

/**
 * Commit PDF hybrid page usage after a successful client job.
 * `prepaidPages` = pages already billed via `/api/docs/segments` during the job.
 * Failed / abandoned OCR-only pages still bill here; segment pages are not double-billed.
 */
app.post('/api/docs/commit', async (req: AuthedRequest, res) => {
  const ent = await entitlementFor(req)
  if (!ent.loggedIn) {
    res.status(401).json({ message: docsDeniedMessage(ent), entitlement: ent })
    return
  }
  if (ent.disabled || !ent.limits.can_docs) {
    res.status(402).json({ message: docsDeniedMessage(ent), entitlement: ent })
    return
  }
  const pages = Math.max(0, Math.min(500, Math.floor(Number(req.body?.pages) || 0)))
  const prepaid = Math.max(0, Math.min(pages, Math.floor(Number(req.body?.prepaidPages) || 0)))
  if (pages <= 0) {
    res.status(400).json({ message: 'pages must be a positive integer' })
    return
  }
  const toBill = Math.max(0, pages - prepaid)
  if (toBill > 0 && !docsPagesRemainingOk(ent, toBill)) {
    res.status(402).json({
      message: `Not enough document pages remaining (need ${toBill}).`,
      entitlement: ent,
      pagesNeeded: toBill,
    })
    return
  }
  if (!env.openMode && req.auth?.userId && toBill > 0) {
    await addDocsPages(req.auth.userId, toBill)
  }
  res.json({
    ok: true,
    pages,
    prepaidPages: prepaid,
    pagesBilled: env.openMode ? 0 : toBill,
    entitlement: await entitlementFor(req),
  })
})

app.post('/api/usage/camera-heartbeat', async (req: AuthedRequest, res) => {
  const ent = await entitlementFor(req)
  // Heartbeat is admin session logging only — do not gate on scan credits.
  const camFeature =
    Boolean(ent.limits.can_camera) && !ent.disabled && (ent.loggedIn || ent.plan === 'guest')
  if (!camFeature) {
    const login = !ent.loggedIn && ent.requireLogin
    res.status(login || ent.disabled ? 401 : 402).json({
      message: ent.disabled
        ? 'This account has been disabled.'
        : login
          ? 'Please sign in to use camera translation.'
          : 'Camera translation is not available.',
      entitlement: ent,
    })
    return
  }
  const seconds = Math.max(0, Math.min(120, Number(req.body?.seconds || 0)))
  if (!env.openMode && seconds > 0) {
    if (req.auth?.userId) await addCameraSeconds(req.auth.userId, seconds)
    else if ((req as GuestRequest).guestId) {
      await addGuestCameraSeconds((req as GuestRequest).guestId!, seconds)
    }
  }
  res.json(await entitlementFor(req))
})

app.post('/api/billing/checkout', startCheckout)
app.post('/api/billing/portal', startPortal)


app.get('/api/history', getHistory)
app.put('/api/history', putHistory)
app.get('/api/harbor-quest/leaderboard', getHarborQuestLeaderboard)
app.get('/api/practice-partner/leaderboard', getPracticePartnerLeaderboard)
app.put('/api/practice-partner/leaderboard', putPracticePartnerLeaderboard)
app.get('/api/harbor-quest', getHarborQuest)
app.put('/api/harbor-quest', putHarborQuest)
app.post('/api/harbor-quest/gift', postHarborQuestGift)
app.get('/api/household', getHousehold)
app.post('/api/household/invites', postHouseholdInvite)
app.delete('/api/household/invites/:inviteId', deleteHouseholdInvite)
app.delete('/api/household/members/:userId', deleteHouseholdMember)
app.post('/api/household/accept', postHouseholdAccept)

app.post('/api/bug-report', submitBugReport)

app.get('/api/push/config', getPushConfig)
app.post('/api/push/subscribe', subscribePush)
app.post('/api/push/unsubscribe', unsubscribePush)

/** Public offline dictionary packs for the installed PWA (no auth / no Azure). */
app.get('/api/offline-pack/manifest', (_req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=3600')
  res.json(offlinePackManifest())
})
app.get('/api/offline-pack/:id', (req, res) => {
  const id = String(req.params.id || '')
  if (!isOfflinePackId(id)) {
    res.status(404).json({ message: 'Unknown offline pack' })
    return
  }
  const pack = getOfflinePack(id)
  res.setHeader('Cache-Control', 'public, max-age=86400')
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.json(pack)
})

app.get('/api/admin/me', adminMe)
app.get('/api/admin/users', adminListUsers)
app.get('/api/admin/users.csv', adminExportUsersCsv)
app.get('/api/admin/users/:userId/usage', adminUserUsage)
app.patch('/api/admin/users/:userId/plan', adminSetPlan)
app.patch('/api/admin/users/:userId/role', adminSetRole)
app.post('/api/admin/users/:userId/reset-usage', adminResetUsage)
app.patch('/api/admin/users/:userId/disabled', adminSetDisabled)
app.get('/api/admin/audit', adminListAudit)
app.get('/api/admin/bug-reports', adminListBugReports)
app.patch('/api/admin/bug-reports/:reportId/status', adminPatchBugReportStatus)
app.post('/api/admin/bug-reports/:reportId/ai-answer', adminBugReportAiAnswer)
app.post('/api/admin/bug-reports/:reportId/resend-email', adminBugReportResendEmail)
app.get('/api/admin/incident-banner', adminGetIncidentBanner)
app.patch('/api/admin/incident-banner', adminPatchIncidentBanner)
app.post('/api/admin/resend-audience/sync', adminSyncResendAudience)
app.post('/api/admin/household-usage/backfill', adminBackfillHouseholdUsage)
app.get('/api/admin/email/templates', adminListEmailTemplates)
app.post('/api/admin/email/templates', adminSaveEmailTemplate)
app.delete('/api/admin/email/templates/:templateId', adminArchiveEmailTemplate)
app.get('/api/admin/email/contacts', adminListEmailContacts)
app.get('/api/admin/email/sends', adminListEmailSends)
app.post('/api/admin/email/preview', adminPreviewEmail)
app.post('/api/admin/email/draft', adminDraftEmail)
app.post('/api/admin/email/send', adminSendEmail)
app.get('/api/admin/push/stats', adminPushStats)
app.get('/api/admin/push/sends', adminListPushSends)
app.post('/api/admin/push/send', adminSendPush)
app.post('/api/admin/practice-partner/chat', adminPracticePartnerChat)
app.post('/api/chat', postDeepseekChat)
app.post('/api/chat/files', postDeepseekChatFile)
app.post('/api/chat/tts', postDeepseekChatTts)
app.post('/api/chat/asr', postDeepseekChatAsr)
app.post('/api/chat/ocr', postDeepseekChatOcr)
app.get('/api/chat/sandbox', getChatSandboxes)
app.post('/api/chat/sandbox', postChatSandbox)
app.get('/api/chat/sandbox/:id', getChatSandbox)
app.delete('/api/chat/sandbox/:id', deleteChatSandbox)
app.post('/api/chat/sandbox/:id/exec', postChatSandboxExec)
app.post('/api/chat/sandbox/:id/fs/list', postChatSandboxFsList)
app.post('/api/chat/sandbox/:id/fs/read', postChatSandboxFsRead)
app.post('/api/chat/sandbox/:id/fs/write', postChatSandboxFsWrite)
app.get('/api/chat/github/status', getChatGithubStatus)
app.get('/api/chat/github/repos', getChatGithubRepos)
app.get('/api/chat/github/pr-checks', getChatGithubPrChecks)
app.post('/api/chat/github/clone', postChatGithubClone)
app.post('/api/chat/github/pr', postChatGithubPr)
app.get('/api/chat/plugins', getDeepseekChatPlugins)
app.get('/api/chat/plugin-keys', getDeepseekChatPluginKeys)
app.put('/api/chat/plugin-keys', putDeepseekChatPluginKeys)
app.get('/api/chat/generated-images/:id', getDeepseekChatGeneratedImage)

scheduleHouseholdUsageBackfillOnStartup()

export default app
