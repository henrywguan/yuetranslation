#!/usr/bin/env node
/**
 * 4K dark-mode UI stills for Solo / Conversation instructional carousel.
 * Seeds autoSpeak ON. Does NOT call /api/translate or /api/tts.
 *
 * Usage:
 *   node scripts/capture-carousel-solo-convo.mjs
 *   DPR=3 OUT_DIR=docs/social/carousel-solo-convo/source node scripts/capture-carousel-solo-convo.mjs
 */
import { mkdirSync, existsSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import puppeteer from 'puppeteer-core'

const chrome =
  process.env.CHROME_PATH ||
  ['/usr/local/bin/google-chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].find((p) =>
    existsSync(p),
  )
if (!chrome) throw new Error('no chrome')

const OUT_DIR = process.env.OUT_DIR || 'docs/social/carousel-solo-convo/source'
const DPR = Number(process.env.DPR || 3)
// 4:5 feed carousel canvas
const W = 1080
const H = 1350

const SOLO_EN = 'Are you coming home for dinner?'
const SOLO_YUE = '你返唔返嚟食飯㗎？'
const SOLO_ALTS = [
  '你返唔返嚟食飯呀？',
  '你今晚返唔返嚟食飯？',
  '你會唔會返嚟食飯㗎？',
  '你返唔返屋企食飯呀？',
]
const FACE_EN = "Don't worry"
const FACE_YUE = '唔使擔心'

mkdirSync(OUT_DIR, { recursive: true })

const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--hide-scrollbars'],
  defaultViewport: { width: W, height: H, deviceScaleFactor: DPR, isMobile: true, hasTouch: true },
})

const page = await browser.newPage()
await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }])
await page.evaluateOnNewDocument(() => {
  try {
    localStorage.setItem('yue-theme', 'dark')
    localStorage.setItem(
      'yue-history-panel-v3',
      JSON.stringify({ x: 24, y: 24, w: 320, h: 480, minimized: true }),
    )
  } catch {}
})

await page.goto('http://127.0.0.1:5173/?view=app#/app', {
  waitUntil: 'domcontentloaded',
  timeout: 60000,
})
await page.waitForFunction(() => window.__yueStore, { timeout: 60000 })
await page.waitForSelector('#root', { timeout: 30000 })
await new Promise((r) => setTimeout(r, 1200))

await page.evaluate(() => {
  document.documentElement.dataset.theme = 'dark'
  document.documentElement.style.colorScheme = 'dark'
  try {
    localStorage.setItem('yue-theme', 'dark')
  } catch {}
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', '#07131f')
})

await page.addStyleTag({
  content: `
    * { caret-color: transparent !important; }
    body { cursor: none !important; }
    .history-rail, [class*="history-rail"], button[aria-label*="History"] { display: none !important; }
  `,
})

async function enableAutoSpeakFamily() {
  await page.evaluate(() => {
    const s = window.__yueStore
    const ent = s.getState().entitlement || {}
    s.setState({
      entitlement: {
        ...ent,
        plan: 'family',
        loggedIn: true,
        allowed: {
          ...(ent.allowed || {}),
          autoSpeak: true,
          tts: true,
          live: true,
          textTranslate: true,
          camera: true,
        },
        limits: { ...(ent.limits || {}), auto_speak: true, plan: 'family' },
      },
    })
    s.getState().setAutoSpeak(true)
  })
}

async function seedSolo({ filled }) {
  await page.evaluate(
    ({ filled, SOLO_EN, SOLO_YUE, SOLO_ALTS }) => {
      const store = window.__yueStore
      store.getState().setMode('solo')
      store.setState({
        mode: 'solo',
        speakDirection: 'en',
        live: false,
        status: 'idle',
        translating: false,
        translatingTo: null,
        altsLoading: false,
        error: null,
        enInterim: filled ? SOLO_EN : '',
        yueInterim: '',
        enTranslation: '',
        yueTranslation: filled ? SOLO_YUE : '',
        yueDefinition: filled ? SOLO_EN : '',
        yueDefinitions: filled ? [SOLO_EN] : [],
        yueAlternatives: filled ? SOLO_ALTS : [],
        detailStack: [],
        detailMinimized: false,
        history: filled
          ? [
              {
                id: 'seed-dinner',
                from: 'en',
                to: 'yue',
                source: SOLO_EN,
                translation: SOLO_YUE,
                definition: SOLO_EN,
                definitions: [SOLO_EN],
                alternatives: SOLO_ALTS,
                at: Date.now(),
              },
            ]
          : [],
      })
    },
    { filled, SOLO_EN, SOLO_YUE, SOLO_ALTS },
  )
}

async function seedConversation({ filled }) {
  await page.evaluate(
    ({ filled, FACE_EN, FACE_YUE }) => {
      const store = window.__yueStore
      store.getState().setMode('conversation')
      store.setState({
        mode: 'conversation',
        live: false,
        status: 'idle',
        translating: false,
        error: null,
        face: {
          enInterim: '',
          yueInterim: '',
          enTranslation: filled ? FACE_EN : '',
          yueTranslation: filled ? FACE_YUE : '',
          yueDefinition: filled ? FACE_EN : '',
          yueDefinitions: filled ? [FACE_EN] : [],
        },
      })
    },
    { filled, FACE_EN, FACE_YUE },
  )
}

async function shot(name, waitFn) {
  if (waitFn) await waitFn()
  await new Promise((r) => setTimeout(r, 600))
  const path = join(OUT_DIR, `${name}.png`)
  await page.screenshot({ path, type: 'png', fullPage: false })
  const info = spawnSync('file', [path], { encoding: 'utf8' })
  console.log('wrote', path, info.stdout.trim())
  return path
}

await enableAutoSpeakFamily()

await seedSolo({ filled: false })
await shot('01-solo-ready', async () => {
  await page.waitForFunction(() => (document.body?.innerText || '').includes('Solo') || (document.body?.innerText || '').includes('獨白'), {
    timeout: 10000,
  })
})

await seedSolo({ filled: true })
await shot('02-solo-filled', async () => {
  await page.waitForFunction(
    () => {
      const t = document.body?.innerText || ''
      return t.includes('你返唔返嚟食飯㗎')
    },
    { timeout: 15000 },
  )
})

await seedConversation({ filled: false })
await shot('03-convo-ready', async () => {
  await page.waitForFunction(
    () => {
      const t = document.body?.innerText || ''
      return t.includes('Conversation') || t.includes('對話')
    },
    { timeout: 10000 },
  )
})

await seedConversation({ filled: true })
await shot('04-convo-filled', async () => {
  // Jyutping/Chao splits Han across nodes — match pieces or English face line.
  await page.waitForFunction(
    () => {
      const t = document.body?.innerText || ''
      return (t.includes('唔') && t.includes('使') && t.includes('擔')) || t.includes("Don't worry")
    },
    { timeout: 15000 },
  )
})
// Also collapse History overlay if it floated open
await page.evaluate(() => {
  document.querySelectorAll('.history-rail, [class*="History"]').forEach((el) => {
    ;(el).style.display = 'none'
  })
})

writeFileSync(
  join(OUT_DIR, 'manifest.json'),
  JSON.stringify(
    {
      theme: 'dark',
      autoSpeak: true,
      dpr: DPR,
      viewport: { w: W, h: H },
      phrases: { solo: { en: SOLO_EN, yue: SOLO_YUE }, conversation: { en: FACE_EN, yue: FACE_YUE } },
      files: ['01-solo-ready.png', '02-solo-filled.png', '03-convo-ready.png', '04-convo-filled.png'],
    },
    null,
    2,
  ),
)

await browser.close()
console.log('done →', OUT_DIR, 'dpr', DPR)
