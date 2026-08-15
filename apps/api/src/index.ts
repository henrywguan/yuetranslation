import cors from 'cors'
import express from 'express'
import { cloudReady, env, openaiConfigured } from './env.js'
import { localEntitlement } from './entitlements.js'
import { issueSpeechToken, synthesize } from './azure.js'
import { translate } from './translate.js'

const app = express()
app.use(cors({ origin: true, credentials: true }))
app.use(express.json({ limit: '1mb' }))

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    product: 'jyut',
    service: 'jyut-api',
    mode: 'cloud',
    cloudReady: cloudReady(),
    engines: {
      azureSpeech: Boolean(env.azureSpeechKey),
      openai: openaiConfigured(),
      demo: !openaiConfigured(),
    },
    entitlement: localEntitlement(),
  })
})

app.get('/api/entitlement', (_req, res) => {
  // Convenience alias for /health.entitlement — kept for WP/local tooling.
  res.json(localEntitlement())
})

app.get('/api/speech-token', async (_req, res) => {
  const ent = localEntitlement()
  if (!ent.allowed.live) {
    res.status(402).json({
      message: 'Live listening requires a Pro plan or free minutes.',
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

app.post('/api/translate', async (req, res) => {
  try {
    res.json(await translate(req.body))
  } catch (e) {
    res.status(400).json({ message: e instanceof Error ? e.message : 'Translate error' })
  }
})

app.post('/api/tts', async (req, res) => {
  const ent = localEntitlement()
  if (!ent.allowed.tts) {
    res.status(402).json({ message: 'Voice playback is a Pro feature.', entitlement: ent })
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
    res.setHeader('Content-Type', 'audio/mpeg')
    res.send(audio)
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'TTS error' })
  }
})

app.post('/api/usage/heartbeat', (req, res) => {
  const ent = localEntitlement()
  if (!ent.allowed.live) {
    res.status(402).json({
      message: 'Live minutes exhausted for this month.',
      entitlement: ent,
    })
    return
  }
  const seconds = Math.max(0, Math.min(120, Number(req.body?.seconds || 0)))
  // Soft meter in open mode — do not persist.
  void seconds
  res.json(ent)
})

app.listen(env.port, () => {
  console.log(`Jyut API on http://localhost:${env.port}`)
  console.log(`Cloud ready: ${cloudReady()} (openMode=${env.openMode})`)
})
