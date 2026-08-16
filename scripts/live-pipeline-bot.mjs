#!/usr/bin/env node
/**
 * Live DeepSeek + Azure pipeline bot
 *
 * Exercises paid/cloud paths that the dictionary quality bot intentionally skips:
 *   1) Azure speech-token (STT entitlement + credentials)
 *   2) Azure TTS (EN + 粵)
 *   3) DeepSeek / OpenAI-compatible translate on novel phrases (not phrase memory)
 *   4) UI Solo final translate path for one novel phrase (pane purity)
 *
 * Usage (API :8787 + web :5173 running, keys in apps/api/.env):
 *   npm run test:translate:live
 *   node scripts/live-pipeline-bot.mjs
 *
 * Env:
 *   API_BASE / WEB_BASE — override defaults
 *   SKIP_UI=1           — API + Azure only
 *
 * Cloud agents: only run when Henry explicitly approved this request.
 */

import puppeteer from 'puppeteer-core'

const API = (process.env.API_BASE || 'http://localhost:8787').replace(/\/$/, '')
const WEB = (process.env.WEB_BASE || 'http://localhost:5173').replace(/\/$/, '')
const SKIP_UI = process.env.SKIP_UI === '1'

/** Novel phrases — long/colloquial so phrase memory + exact lexicon miss. */
const MODEL_CASES = [
  {
    id: 'live-en-ferry',
    from: 'en',
    to: 'yue',
    text: 'Tonight the neon ferry to Macau leaves in twenty-three minutes after the fireworks.',
    expect: /[一-龥]{2,}/,
    mode: 'solo',
  },
  {
    id: 'live-yue-rain',
    from: 'yue',
    to: 'en',
    text: '今日落雨得滯，記得帶把遮同著雨褸啦，唔好整濕咗件衫。',
    expect: /rain|umbrella|coat|jacket|remember|wet|clothes/i,
    mode: 'solo',
  },
]

const JUNK_RE =
  /(（示範）|\(demo\)|question mark|full stop|exclamation mark|\bparticle\b|\bcolloquial\b|\binterjection\b|\s\/\s|^\d+\.\s)/i

const MODEL_ENGINES = new Set(['openai', 'openai-compatible'])

const failures = []
const passes = []

function ok(msg) {
  passes.push(msg)
  console.log(`  ✓ ${msg}`)
}

function fail(msg) {
  failures.push(msg)
  console.error(`  ✗ ${msg}`)
}

async function apiJson(path, init) {
  const res = await fetch(`${API}${path}`, init)
  const text = await res.text()
  let data
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error(`${path} → ${res.status} non-JSON: ${text.slice(0, 200)}`)
  }
  if (!res.ok) throw new Error(`${path} → ${res.status}: ${JSON.stringify(data).slice(0, 240)}`)
  return data
}

async function translate(text, from, to, extra = {}) {
  return apiJson('/api/translate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      text,
      from,
      to,
      stage: 'final',
      includeAlternatives: false,
      ...extra,
    }),
  })
}

function chromePath() {
  return (
    process.env.CHROME_PATH ||
    process.env.PUPPETEER_EXECUTABLE_PATH ||
    '/usr/local/bin/google-chrome'
  )
}

async function runAzureSuite(health) {
  console.log('\n== Azure Speech pipeline ==')
  if (!health.engines?.azureSpeech) {
    fail('engines.azureSpeech=false — set AZURE_SPEECH_KEY (+ region)')
    return
  }

  const token = await apiJson('/api/speech-token')
  if (!token.token || !token.region) {
    fail(`speech-token missing fields: ${JSON.stringify(token).slice(0, 120)}`)
  } else {
    ok(`speech-token issued (region=${token.region}, expiresIn=${token.expiresIn ?? '?'})`)
  }

  for (const { lang, text } of [
    { lang: 'en', text: 'Can you hear me?' },
    { lang: 'yue', text: '你聽唔聽到我？' },
  ]) {
    const res = await fetch(`${API}/api/tts`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text, lang }),
    })
    const buf = Buffer.from(await res.arrayBuffer())
    const ctype = res.headers.get('content-type') || ''
    if (!res.ok) {
      fail(`tts ${lang}: HTTP ${res.status} ${buf.toString('utf8').slice(0, 160)}`)
      continue
    }
    if (!ctype.includes('audio') || buf.length < 800) {
      fail(`tts ${lang}: bad audio (ctype=${ctype}, bytes=${buf.length})`)
      continue
    }
    ok(`tts ${lang}: ${buf.length} bytes audio/mpeg`)
  }

  // Soft live meter used by mic sessions
  const hb = await apiJson('/api/usage/heartbeat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ seconds: 1 }),
  })
  if (hb?.allowed?.live) ok('usage/heartbeat accepts live session tick')
  else fail(`usage/heartbeat unexpected: ${JSON.stringify(hb).slice(0, 160)}`)
}

async function runDeepSeekSuite() {
  console.log('\n== DeepSeek translate pipeline (novel phrases) ==')

  // First case: send stage=interim to prove coerce-to-final on the model path.
  const first = MODEL_CASES[0]
  const coerce = await translate(first.text, first.from, first.to, { stage: 'interim' })
  if (coerce.stage !== 'final') {
    fail(`interim coerce: stage=${coerce.stage} (expected final)`)
  } else if (!MODEL_ENGINES.has(coerce.engine)) {
    fail(`interim coerce / ${first.id}: engine=${coerce.engine} (expected model)`)
  } else if (JUNK_RE.test(coerce.text || '') || !first.expect.test(coerce.text || '')) {
    fail(`${first.id}: unexpected ${JSON.stringify(coerce.text)}`)
  } else {
    ok(
      `${first.id}: interim→final via ${coerce.engine} → ${coerce.text.slice(0, 64)}${coerce.text.length > 64 ? '…' : ''}`,
    )
  }

  for (const c of MODEL_CASES.slice(1)) {
    const result = await translate(c.text, c.from, c.to)
    if (!MODEL_ENGINES.has(result.engine)) {
      fail(
        `${c.id}: engine=${result.engine} (need openai/openai-compatible — phrase may have hit dict)`,
      )
      continue
    }
    if (result.stage !== 'final') {
      fail(`${c.id}: stage=${result.stage}`)
      continue
    }
    if (!result.text?.trim() || JUNK_RE.test(result.text) || !c.expect.test(result.text)) {
      fail(`${c.id}: unexpected ${JSON.stringify(result.text)}`)
      continue
    }
    ok(`${c.id}: ${c.from}→${c.to} via ${result.engine} → ${result.text}`)
  }
}

async function waitForTranslation(page, from) {
  const deadline = Date.now() + 45000
  while (Date.now() < deadline) {
    const snap = await page.evaluate((lang) => {
      const store = window.__yueStore
      if (!store) return null
      const s = store.getState()
      if (s.translating) return { ready: false }
      const translation = lang === 'en' ? s.yueTranslation : s.enTranslation
      const source = lang === 'en' ? s.enInterim : s.yueInterim
      return {
        ready: Boolean(translation),
        translation,
        source,
        error: s.error,
        yueTranslation: s.yueTranslation,
        enTranslation: s.enTranslation,
      }
    }, from)
    if (snap?.error) throw new Error(`store error: ${snap.error}`)
    if (snap?.ready) return snap
    await new Promise((r) => setTimeout(r, 200))
  }
  throw new Error(`timeout waiting for solo ${from} model translation`)
}

async function runUiSuite() {
  console.log('\n== UI Solo (DeepSeek final path) ==')
  const c = MODEL_CASES[1]
  const browser = await puppeteer.launch({
    executablePath: chromePath(),
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--use-fake-ui-for-media-stream'],
  })
  try {
    const page = await browser.newPage()
    await page.goto(`${WEB}/?view=app`, { waitUntil: 'networkidle2', timeout: 60000 })
    await page.waitForFunction(() => Boolean(window.__yueStore), { timeout: 20000 })

    await page.evaluate(async (text, from) => {
      const store = window.__yueStore.getState()
      store.setMode('solo')
      await store.translateTyped(text, from)
    }, c.text, c.from)

    const snap = await waitForTranslation(page, c.from)
    if (JUNK_RE.test(snap.translation || '') || !c.expect.test(snap.translation || '')) {
      fail(`UI ${c.id}: bad pane ${JSON.stringify(snap.translation)}`)
      return
    }
    const pure = snap.yueTranslation && !snap.enTranslation && Boolean(snap.source)
    if (!pure) {
      fail(
        `UI ${c.id}: impure store yue=${JSON.stringify(snap.yueTranslation)} en=${JSON.stringify(snap.enTranslation)}`,
      )
      return
    }
    ok(`UI solo/${c.id}: translation-only panes → ${snap.translation}`)
  } finally {
    await browser.close()
  }
}

async function main() {
  console.log(`JyutTranslate live pipeline bot\n  API ${API}\n  WEB ${WEB}`)

  console.log('\n== API health ==')
  const health = await apiJson('/api/health')
  console.log(
    `  engines: openai=${health.engines?.openai} azure=${health.engines?.azureSpeech} demo=${health.engines?.demo}`,
  )
  console.log(
    `  model: ${health.openai?.model || '?'} baseUrl=${Boolean(health.openai?.hasBaseUrl)}`,
  )

  if (!health.engines?.openai) {
    fail('engines.openai=false — DeepSeek/OpenAI key required for this bot')
  } else {
    ok('OpenAI-compatible engine ready')
  }
  if (!health.engines?.azureSpeech) {
    fail('engines.azureSpeech=false — Azure Speech key required for this bot')
  } else {
    ok('Azure Speech engine ready')
  }

  if (failures.length) {
    console.log(`\n== Summary: ${passes.length} passed, ${failures.length} failed (aborted) ==`)
    process.exit(1)
  }

  await runAzureSuite(health)
  await runDeepSeekSuite()

  if (!SKIP_UI) {
    try {
      await runUiSuite()
    } catch (e) {
      fail(`UI suite crashed: ${e?.message || e}`)
    }
  } else {
    console.log('\n== UI skipped (SKIP_UI=1) ==')
  }

  console.log(`\n== Summary: ${passes.length} passed, ${failures.length} failed ==`)
  if (failures.length) {
    for (const f of failures) console.error(`  - ${f}`)
    process.exit(1)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
