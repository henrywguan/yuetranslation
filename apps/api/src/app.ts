import cors from 'cors'
import express from 'express'
import { ZodError } from 'zod'
import { cloudReady, env, openaiStatus, visionConfigured, visionLlmConfigured } from './env.js'
import { dictionaryStats, lexiconStats } from './canto/index.js'
import { glossStats } from './canto/gloss.js'
import { activeGlossSources, wordshkEnabled } from './canto/licenseGate.js'
import { resolveEntitlement } from './entitlements.js'
import { attachAuth, type AuthedRequest } from './auth.js'
import { queueResendAudienceContact } from './resendAudience.js'
import { handleBillingWebhook, startCheckout, startPortal } from './billing.js'
import { handleSignupNotify } from './signupNotify.js'
import { issueSpeechToken, synthesize } from './azure.js'
import { breakdown } from './breakdown.js'
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
} from './usage.js'
import { submitBugReport } from './bugReport.js'
import { peekDocPages, translateDocumentFile, translateDocSegments } from './docs/handler.js'
import { upsertProfilePlan } from './supabase.js'
import { isEnVoice, isYueVoice } from './ttsVoices.js'
import {
  adminArchiveEmailTemplate,
  adminBugReportAiAnswer,
  adminExportUsersCsv,
  adminListAudit,
  adminListBugReports,
  adminListEmailContacts,
  adminListEmailTemplates,
  adminListUsers,
  adminMe,
  adminPatchBugReportStatus,
  adminPreviewEmail,
  adminResetUsage,
  adminSaveEmailTemplate,
  adminSendEmail,
  adminSetDisabled,
  adminSetPlan,
  adminSetRole,
  adminSyncResendAudience,
  adminUserUsage,
} from './admin.js'

export const app = express()
app.use(cors({ origin: true, credentials: true }))

// Stripe webhook must read the raw body before JSON parsing.
app.post('/api/billing/webhook', express.raw({ type: 'application/json' }), handleBillingWebhook)
app.post(
  '/api/internal/signup-notify',
  express.raw({ type: 'application/json' }),
  handleSignupNotify,
)

app.use(express.json({ limit: '12mb' }))
app.use(attachAuth)

async function entitlementFor(req: AuthedRequest) {
  if (req.auth?.email) {
    queueResendAudienceContact({
      email: req.auth.email,
      userId: req.auth.userId,
    })
  }
  return resolveEntitlement(req.auth)
}

app.get('/api/health', async (req: AuthedRequest, res) => {
  const openai = openaiStatus()
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
    openai,
    dictionary: dictionaryStats(),
    lexicon: lexiconStats(),
    gloss: glossStats(),
    licenseGate: {
      allowNoncommercialDicts: env.allowNoncommercialDicts,
      wordshkEnabled: wordshkEnabled(),
      activeSources: activeGlossSources(),
    },
    openaiBaseUrl: openai.hasBaseUrl,
    entitlement: await entitlementFor(req),
  })
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
  const ent = await entitlementFor(req)
  if (!ent.allowed.live) {
    res.status(ent.reason === 'login_required' ? 401 : 402).json({
      message:
        ent.reason === 'login_required'
          ? 'Please log in to use live translation.'
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
  try {
    res.json(await issueSpeechToken())
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Token error' })
  }
})

app.post('/api/translate', async (req: AuthedRequest, res) => {
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
    if (!env.openMode && req.auth?.userId) {
      await addTranslateCount(req.auth.userId, 1)
    }
    res.json(result)
  } catch (e) {
    res.status(400).json({ message: e instanceof Error ? e.message : 'Translate error' })
  }
})

app.post('/api/breakdown', async (req: AuthedRequest, res) => {
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
    res.json(await breakdown(req.body))
  } catch (e) {
    res.status(400).json({ message: e instanceof Error ? e.message : 'Breakdown error' })
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
    if (!text) {
      res.status(400).json({ message: 'text required' })
      return
    }
    const azureLang = lang === 'en' || lang === 'en-US' ? 'en' : 'zh-HK'
    const audio = await synthesize(text, azureLang, {
      voice: voiceOverride,
      preferredYue: ent.prefs?.ttsVoiceYue,
      preferredEn: ent.prefs?.ttsVoiceEn,
    })
    // Meter signed-in usage for Free (hard cap) and Family/Max (unlimited).
    if (!env.openMode && req.auth?.userId) {
      await addTtsChars(req.auth.userId, text.length)
    }
    res.setHeader('Content-Type', 'audio/mpeg')
    res.send(audio)
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'TTS error' })
  }
})

/** Save cross-device TTS voice preferences (signed-in only). */
app.patch('/api/prefs/tts-voices', async (req: AuthedRequest, res) => {
  const ent = await entitlementFor(req)
  const body = req.body || {}
  const patch: { tts_voice_yue?: string; tts_voice_en?: string } = {}
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

app.post('/api/usage/heartbeat', async (req: AuthedRequest, res) => {
  const ent = await entitlementFor(req)
  if (!ent.allowed.live) {
    res.status(ent.reason === 'login_required' ? 401 : 402).json({
      message:
        ent.reason === 'login_required'
          ? 'Please log in to use live translation.'
          : ent.reason === 'account_disabled'
            ? 'This account has been disabled.'
            : 'Live minutes exhausted for this month.',
      entitlement: ent,
    })
    return
  }
  const seconds = Math.max(0, Math.min(120, Number(req.body?.seconds || 0)))
  if (!env.openMode && req.auth?.userId && seconds > 0) {
    await addLiveSeconds(req.auth.userId, seconds)
  }
  res.json(await entitlementFor(req))
})

app.post('/api/camera/scan', async (req: AuthedRequest, res) => {
  const forDocs = Boolean(req.body?.forDocs)
  const ent = await entitlementFor(req)
  const allowed = forDocs ? ent.allowed.docs : ent.allowed.camera
  if (!allowed) {
    const login = ent.reason === 'login_required'
    const disabled = ent.reason === 'account_disabled'
    const docsQuota =
      ent.reason === 'docs_quota_exhausted' || ent.reason === 'no_docs_quota'
    const camQuota =
      ent.reason === 'camera_quota_exhausted' || ent.reason === 'no_camera_quota'
    res.status(login ? 401 : 402).json({
      message: login
        ? forDocs
          ? 'Please sign in to translate documents.'
          : 'Please sign in to use camera translation.'
        : disabled
          ? 'This account has been disabled.'
          : forDocs
            ? docsQuota
              ? 'Document page quota exhausted for this month.'
              : 'Document translation is not available.'
            : camQuota
              ? 'Camera minutes exhausted for this month.'
              : 'Camera translation is not available.',
      entitlement: ent,
    })
    return
  }
  try {
    const result = await cameraScan(req.body)
    // Docs hybrid vision: no camera translate metering (pages billed on /docs/commit).
    if (!forDocs && !env.openMode && req.auth?.userId && result.translateMisses > 0) {
      await addCameraTranslateCount(req.auth.userId, result.translateMisses)
    }
    // AI vision LLM fallback — view-only meter (Cam + Documents). No hard cap.
    if (!env.openMode && req.auth?.userId && result.aiVisionUsed) {
      await addAiVisionCount(req.auth.userId, 1)
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
  if (ent.reason === 'login_required') return 'Please sign in to translate documents.'
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
    res.status(ent.reason === 'login_required' ? 401 : 402).json({
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

/** Batch text segments for PDF hybrid (extract → translate → paint). No page billing. */
app.post('/api/docs/segments', async (req: AuthedRequest, res) => {
  const ent = await entitlementFor(req)
  if (!ent.allowed.docs) {
    res.status(ent.reason === 'login_required' ? 401 : 402).json({
      message: docsDeniedMessage(ent),
      entitlement: ent,
    })
    return
  }
  try {
    const result = await translateDocSegments(req.body)
    res.json({ ...result, entitlement: await entitlementFor(req) })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Segment translation failed'
    res.status(e instanceof ZodError ? 400 : 500).json({ message })
  }
})

/**
 * Commit PDF hybrid page usage after a successful client job.
 * Failed / abandoned jobs never call this — so they are not billed.
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
  if (pages <= 0) {
    res.status(400).json({ message: 'pages must be a positive integer' })
    return
  }
  if (!docsPagesRemainingOk(ent, pages)) {
    res.status(402).json({
      message: `Not enough document pages remaining (need ${pages}).`,
      entitlement: ent,
      pagesNeeded: pages,
    })
    return
  }
  if (!env.openMode && req.auth?.userId) {
    await addDocsPages(req.auth.userId, pages)
  }
  res.json({ ok: true, pages, entitlement: await entitlementFor(req) })
})

app.post('/api/usage/camera-heartbeat', async (req: AuthedRequest, res) => {
  const ent = await entitlementFor(req)
  if (!ent.allowed.camera) {
    res.status(ent.reason === 'login_required' ? 401 : 402).json({
      message:
        ent.reason === 'login_required'
          ? 'Please sign in to use camera translation.'
          : ent.reason === 'account_disabled'
            ? 'This account has been disabled.'
            : 'Camera minutes exhausted for this month.',
      entitlement: ent,
    })
    return
  }
  const seconds = Math.max(0, Math.min(120, Number(req.body?.seconds || 0)))
  if (!env.openMode && req.auth?.userId && seconds > 0) {
    await addCameraSeconds(req.auth.userId, seconds)
  }
  res.json(await entitlementFor(req))
})

app.post('/api/billing/checkout', startCheckout)
app.post('/api/billing/portal', startPortal)

app.post('/api/bug-report', submitBugReport)

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
app.post('/api/admin/resend-audience/sync', adminSyncResendAudience)
app.get('/api/admin/email/templates', adminListEmailTemplates)
app.post('/api/admin/email/templates', adminSaveEmailTemplate)
app.delete('/api/admin/email/templates/:templateId', adminArchiveEmailTemplate)
app.get('/api/admin/email/contacts', adminListEmailContacts)
app.post('/api/admin/email/preview', adminPreviewEmail)
app.post('/api/admin/email/send', adminSendEmail)

export default app
