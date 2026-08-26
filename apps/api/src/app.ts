import cors from 'cors'
import express from 'express'
import { ZodError } from 'zod'
import { cloudReady, env, openaiStatus, visionConfigured } from './env.js'
import { dictionaryStats, lexiconStats } from './canto/index.js'
import { glossStats } from './canto/gloss.js'
import { activeGlossSources, wordshkEnabled } from './canto/licenseGate.js'
import { resolveEntitlement } from './entitlements.js'
import { attachAuth, type AuthedRequest } from './auth.js'
import { handleBillingWebhook, startCheckout, startPortal } from './billing.js'
import { issueSpeechToken, synthesize } from './azure.js'
import { breakdown } from './breakdown.js'
import { translate } from './translate.js'
import { cameraScan } from './cameraScan.js'
import {
  addCameraSeconds,
  addCameraTranslateCount,
  addLiveSeconds,
  addTtsChars,
  addTranslateCount,
} from './usage.js'
import {
  adminExportUsersCsv,
  adminListAudit,
  adminListUsers,
  adminMe,
  adminResetUsage,
  adminSetDisabled,
  adminSetPlan,
  adminUserUsage,
} from './admin.js'

export const app = express()
app.use(cors({ origin: true, credentials: true }))

// Stripe webhook must read the raw body before JSON parsing.
app.post('/api/billing/webhook', express.raw({ type: 'application/json' }), handleBillingWebhook)

app.use(express.json({ limit: '6mb' }))
app.use(attachAuth)

async function entitlementFor(req: AuthedRequest) {
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
            : 'Live listening requires a Pro plan or free minutes.',
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
    if (!text) {
      res.status(400).json({ message: 'text required' })
      return
    }
    const azureLang = lang === 'en' || lang === 'en-US' ? 'en' : 'zh-HK'
    const audio = await synthesize(text, azureLang)
    // Meter signed-in usage for Free (hard cap) and Pro/Max (unlimited).
    if (!env.openMode && req.auth?.userId) {
      await addTtsChars(req.auth.userId, text.length)
    }
    res.setHeader('Content-Type', 'audio/mpeg')
    res.send(audio)
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'TTS error' })
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
  const ent = await entitlementFor(req)
  if (!ent.allowed.camera) {
    res.status(ent.reason === 'login_required' ? 401 : 402).json({
      message:
        ent.reason === 'login_required'
          ? 'Please sign in to use camera translation.'
          : ent.reason === 'account_disabled'
            ? 'This account has been disabled.'
            : ent.reason === 'camera_quota_exhausted' || ent.reason === 'no_camera_quota'
              ? 'Camera minutes exhausted for this month.'
              : 'Camera translation is not available.',
      entitlement: ent,
    })
    return
  }
  try {
    const result = await cameraScan(req.body)
    if (!env.openMode && req.auth?.userId && result.translateMisses > 0) {
      await addCameraTranslateCount(req.auth.userId, result.translateMisses)
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

app.get('/api/admin/me', adminMe)
app.get('/api/admin/users', adminListUsers)
app.get('/api/admin/users.csv', adminExportUsersCsv)
app.get('/api/admin/users/:userId/usage', adminUserUsage)
app.patch('/api/admin/users/:userId/plan', adminSetPlan)
app.post('/api/admin/users/:userId/reset-usage', adminResetUsage)
app.patch('/api/admin/users/:userId/disabled', adminSetDisabled)
app.get('/api/admin/audit', adminListAudit)

export default app
