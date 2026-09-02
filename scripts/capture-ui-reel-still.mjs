import { spawnSync } from 'node:child_process'
import { existsSync, writeFileSync } from 'node:fs'
import puppeteer from 'puppeteer-core'

const chrome =
  process.env.CHROME_PATH ||
  ['/usr/local/bin/google-chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].find((p) => existsSync(p))
if (!chrome) throw new Error('no chrome')

const OUT = process.argv[2] || '/opt/cursor/artifacts/ui-reel-still-3x.png'
const DPR = Number(process.env.DPR || 3)
const W = 1080
const H = 1920

const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--hide-scrollbars'],
  defaultViewport: { width: W, height: H, deviceScaleFactor: DPR, isMobile: true, hasTouch: true },
})

const page = await browser.newPage()
await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }])
// Collapse History floating panel before first paint of app chrome
await page.evaluateOnNewDocument(() => {
  try {
    localStorage.setItem('yue-theme', 'light')
    localStorage.setItem(
      'yue-history-panel-v3',
      JSON.stringify({
        x: 24,
        y: 24,
        w: 320,
        h: 480,
        minimized: true,
      }),
    )
  } catch {}
})
await page.goto('http://127.0.0.1:5173/?view=app#/app', { waitUntil: 'domcontentloaded', timeout: 60000 })
await page.waitForFunction(() => window.__yueStore, { timeout: 60000 })
await page.waitForSelector('#root', { timeout: 30000 })
await new Promise((r) => setTimeout(r, 1500))

await page.evaluate(() => {
  document.documentElement.dataset.theme = 'light'
  document.documentElement.style.colorScheme = 'light'
  try { localStorage.setItem('yue-theme', 'light') } catch {}
})

await page.evaluate(() => {
  const EN = 'Are you coming home for dinner?'
  const YUE = '你返唔返嚟食飯㗎？'
  const ALTS = [
    '你返唔返嚟食飯呀？',
    '你今晚返唔返嚟食飯？',
    '你會唔會返嚟食飯㗎？',
    '你返唔返屋企食飯呀？',
  ]
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
    enInterim: EN,
    yueInterim: '',
    enTranslation: '',
    yueTranslation: YUE,
    yueDefinition: EN,
    yueDefinitions: [EN],
    yueAlternatives: ALTS,
    detailStack: [],
    detailMinimized: false,
    history: [{
      id: 'seed-dinner',
      from: 'en',
      to: 'yue',
      source: EN,
      translation: YUE,
      definition: EN,
      definitions: [EN],
      alternatives: ALTS,
      at: Date.now(),
    }],
  })
})

// wait for Cantonese + variations to paint
await page.waitForFunction(() => {
  const t = document.body?.innerText || ''
  return t.includes('你返唔返嚟食飯㗎') && (t.includes('OTHER VARIATIONS') || t.includes('其他講法') || t.includes('你返唔返嚟食飯呀'))
}, { timeout: 15000 })
await new Promise((r) => setTimeout(r, 800))

// hide cursor / selection noise + history rail if it still opens
await page.addStyleTag({
  content: `
    * { caret-color: transparent !important; }
    body { cursor: none !important; }
    .history-rail, [class*="history-rail"], button[aria-label*="History"] { display: none !important; }
  `,
})
await new Promise((r) => setTimeout(r, 400))

await page.screenshot({ path: OUT, type: 'png', fullPage: false })
await browser.close()

const { spawnSync: sp } = await import('node:child_process')
console.log('wrote', OUT, 'dpr', DPR)
sp('file', [OUT], { stdio: 'inherit' })
