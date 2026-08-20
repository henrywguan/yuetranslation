import cors from 'cors'
import express from 'express'
import { cloudReady, env, openaiStatus } from './env.js'
import { dictionaryStats, lexiconStats } from './canto/index.js'
import { glossStats } from './canto/gloss.js'
import { activeGlossSources, wordshkEnabled } from './canto/licenseGate.js'
import { resolveEntitlement } from './entitlements.js'
import { attachAuth, type AuthedRequest } from './auth.js'
import { handleBillingWebhook, startCheckout, startPortal } from './billing.js'
import { issueSpeechToken, synthesize } from './azure.js'
import { breakdown } from './breakdown.js'
import { translate } from './translate.js'
import { addLiveSeconds, addTtsChars } from './usage.js'

export const app = express()
app.use(cors({ origin: true, credentials: true }))

// Stripe webhook must read the raw body before JSON parsing.
app.post('/api/billing/webhook', express.raw({ type: 'application/json' }), handleBillingWebhook)

app.use(express.json({ limit: '1mb' }))
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
    res.status(ent.reason === 'login_required' ? 401 : 402).json({
      message:
        ent.reason === 'login_required'
          ? 'Please log in to use translation.'
          : 'Translation not allowed on your plan.',
      entitlement: ent,
    })
    return
  }
  try {
    res.json(await translate(req.body))
  } catch (e) {
    res.status(400).json({ message: e instanceof Error ? e.message : 'Translate error' })
  }
})

app.post('/api/breakdown', async (req: AuthedRequest, res) => {
  const ent = await entitlementFor(req)
  if (!ent.allowed.textTranslate) {
    res.status(ent.reason === 'login_required' ? 401 : 402).json({
      message:
        ent.reason === 'login_required'
          ? 'Please log in to use character breakdown.'
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
        ent.reason === 'login_required'
          ? 'Log in to play voice.'
          : 'Voice playback needs remaining TTS quota.',
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

app.post('/api/billing/checkout', startCheckout)
app.post('/api/billing/portal', startPortal)

export default app
