#!/usr/bin/env node
/**
 * Capture Solo + Conversation UI for the Studio feature-tour Story.
 * Seeds store — no translate / STT / Vision API calls.
 *
 *   NODE_PATH=/workspace/node_modules node scripts/capture-story-feature-tour.mjs
 */
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync, rmSync, readdirSync, copyFileSync } from 'node:fs'
import { join } from 'node:path'
import puppeteer from 'puppeteer-core'

const chrome =
  process.env.CHROME_PATH ||
  ['/usr/local/bin/google-chrome', '/usr/bin/google-chrome'].find((p) => existsSync(p))
if (!chrome) throw new Error('no chrome')

const ROOT = 'docs/social/story-feature-tour'
const SRC = join(ROOT, 'source')
const LIVE = join(SRC, 'live')
const W = 1080
const H = 1920
const FPS = 30

mkdirSync(LIVE, { recursive: true })
mkdirSync(join(ROOT, 'audio'), { recursive: true })
mkdirSync(join(ROOT, 'out'), { recursive: true })
mkdirSync(join(ROOT, 'overlays'), { recursive: true })

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function createScreencast(page, framesDir) {
  mkdirSync(framesDir, { recursive: true })
  let session = null
  let n = 0
  let running = false
  let t0 = 0
  const onFrame = async (frame) => {
    if (!running) return
    const i = n++
    writeFileSync(join(framesDir, `f-${String(i).padStart(5, '0')}.jpg`), Buffer.from(frame.data, 'base64'))
    try {
      await session.send('Page.screencastFrameAck', { sessionId: frame.sessionId })
    } catch {}
  }
  return {
    async start() {
      session = await page.createCDPSession()
      running = true
      t0 = Date.now()
      session.on('Page.screencastFrame', onFrame)
      await session.send('Page.startScreencast', {
        format: 'jpeg',
        quality: 90,
        maxWidth: W,
        maxHeight: H,
        everyNthFrame: 1,
      })
      await sleep(150)
    },
    async stop(outMp4) {
      running = false
      const wallSec = Math.max(0.5, (Date.now() - t0) / 1000)
      try {
        await session.send('Page.stopScreencast')
      } catch {}
      await sleep(200)
      const count = readdirSync(framesDir).filter((f) => f.endsWith('.jpg')).length
      if (count < 6) throw new Error(`too few frames (${count}) in ${framesDir}`)
      const inFps = Math.max(1, count / wallSec)
      const r = spawnSync(
        'ffmpeg',
        [
          '-y',
          '-framerate',
          inFps.toFixed(4),
          '-i',
          join(framesDir, 'f-%05d.jpg'),
          '-vf',
          `scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},setsar=1,fps=${FPS}`,
          '-c:v',
          'libx264',
          '-crf',
          '17',
          '-pix_fmt',
          'yuv420p',
          '-an',
          outMp4,
        ],
        { encoding: 'utf8' },
      )
      if (r.status !== 0) {
        console.error(r.stderr?.slice(-800))
        throw new Error(`encode failed ${outMp4}`)
      }
      rmSync(framesDir, { recursive: true, force: true })
      return { count, wallSec }
    },
  }
}

const hideChromeCss = `
  * { caret-color: transparent !important; }
  body { cursor: none !important; }
  .history-rail, [class*="history-rail"], button[aria-label*="History"],
  button[aria-label*="歷史"] { opacity: 0 !important; pointer-events: none !important; }
`

async function seedEntitlement(page) {
  await page.evaluate(() => {
    document.documentElement.dataset.theme = 'dark'
    document.documentElement.style.colorScheme = 'dark'
    try {
      localStorage.setItem('yue-theme', 'dark')
    } catch {}
    const s = window.__yueStore
    const ent = s.getState().entitlement || {}
    s.setState({
      entitlement: {
        ...ent,
        plan: 'family',
        loggedIn: true,
        allowed: {
          ...(ent.allowed || {}),
          camera: true,
          docs: true,
          autoSpeak: true,
          tts: true,
          live: true,
          textTranslate: true,
        },
        limits: {
          ...(ent.limits || {}),
          plan: 'family',
          auto_speak: true,
          can_camera: true,
          can_docs: true,
        },
      },
      autoSpeak: false,
      error: null,
    })
  })
}

async function seedSolo(page) {
  await page.evaluate(() => {
    const EN = 'Are you coming home for dinner?'
    const YUE = '你返唔返嚟食飯㗎？'
    const ALTS = ['你返唔返嚟食飯呀？', '你今晚返唔返嚟食飯？', '你返唔返屋企食飯呀？']
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
      soloShowAutoHint: false,
      face: {
        enInterim: '',
        yueInterim: '',
        enTranslation: '',
        yueTranslation: '',
        yueDefinition: '',
        yueDefinitions: [],
      },
      history: [
        {
          id: 'seed-tour-dinner',
          from: 'en',
          to: 'yue',
          source: EN,
          translation: YUE,
          definition: EN,
          definitions: [EN],
          alternatives: ALTS,
          at: Date.now(),
        },
      ],
    })
  })
  await page.waitForFunction(
    () => {
      const s = window.__yueStore?.getState?.()
      if (s?.yueTranslation?.includes('你返唔返嚟食飯')) return true
      const t = (document.body?.innerText || '').replace(/\s+/g, '')
      return t.includes('你返唔返嚟食飯')
    },
    { timeout: 15000 },
  )
}

async function seedConversation(page) {
  await page.evaluate(() => {
    const EN = 'I miss you'
    const YUE = '我掛住你'
    const store = window.__yueStore
    store.getState().setMode('conversation')
    store.setState({
      mode: 'conversation',
      speakDirection: 'en',
      live: false,
      status: 'idle',
      liveSide: null,
      translating: false,
      translatingTo: null,
      altsLoading: false,
      error: null,
      enInterim: '',
      yueInterim: '',
      enTranslation: '',
      yueTranslation: '',
      yueDefinition: '',
      yueDefinitions: [],
      yueAlternatives: [],
      detailStack: [],
      detailMinimized: false,
      face: {
        enInterim: EN,
        yueInterim: '',
        enTranslation: '',
        yueTranslation: YUE,
        yueDefinition: EN,
        yueDefinitions: [EN],
      },
    })
  })
  await page.waitForFunction(
    () => {
      const s = window.__yueStore?.getState?.()
      if (s?.face?.yueTranslation?.includes('我掛住你')) return true
      const t = (document.body?.innerText || '').replace(/\s+/g, '')
      return t.includes('我掛住你') || t.includes('Imissyou')
    },
    { timeout: 15000 },
  )
}

const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--hide-scrollbars', `--window-size=${W},${H}`],
  defaultViewport: { width: W, height: H, deviceScaleFactor: 1, isMobile: true, hasTouch: true },
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
await page.goto('http://127.0.0.1:5173/?view=app#/app', { waitUntil: 'domcontentloaded', timeout: 60000 })
await page.waitForFunction(() => window.__yueStore, { timeout: 60000 })
await seedEntitlement(page)
await page.addStyleTag({ content: hideChromeCss })
await sleep(800)

// --- Solo clip ---
await seedSolo(page)
await sleep(400)
{
  const frames = join(LIVE, '_solo-frames')
  const cast = createScreencast(page, frames)
  await cast.start()
  // gentle settle: hold, tiny scroll nudge via CSS transform not needed
  await sleep(2800)
  await cast.stop(join(LIVE, 'solo-1080.mp4'))
  await page.screenshot({ path: join(SRC, 'solo-still.png'), type: 'png' })
  console.log('wrote solo')
}

// --- Conversation clip ---
await seedConversation(page)
await sleep(500)
{
  const frames = join(LIVE, '_convo-frames')
  const cast = createScreencast(page, frames)
  await cast.start()
  await sleep(2800)
  await cast.stop(join(LIVE, 'conversation-1080.mp4'))
  await page.screenshot({ path: join(SRC, 'conversation-still.png'), type: 'png' })
  console.log('wrote conversation')
}

await browser.close()

// Reuse prior real Cam live capture (no new Vision billing)
const camSrc = 'docs/social/reel-cam-quiz-stop/source/live/cam-upload-1080.mp4'
if (!existsSync(camSrc)) throw new Error(`missing ${camSrc}`)
const camOut = join(LIVE, 'cam-1080.mp4')
// Trim to ~3.2s of the strongest overlay portion (mid clip)
const probe = spawnSync(
  'ffprobe',
  ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', camSrc],
  { encoding: 'utf8' },
)
const dur = Number(probe.stdout.trim()) || 10
// Prefer the post-Translate-all OCR glass hold (late in Recordly capture).
  const start = Math.max(0, Math.min(Math.max(dur - 4.0, dur * 0.7), dur - 3.2))
spawnSync(
  'ffmpeg',
  [
    '-y',
    '-ss',
    start.toFixed(2),
    '-i',
    camSrc,
    '-t',
    '3.2',
    '-vf',
    `scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},setsar=1`,
    '-c:v',
    'libx264',
    '-crf',
    '17',
    '-pix_fmt',
    'yuv420p',
    '-an',
    camOut,
  ],
  { stdio: 'inherit' },
)
spawnSync(
  'ffmpeg',
  ['-y', '-ss', '1.4', '-i', camOut, '-frames:v', '1', '-q:v', '2', join(SRC, 'cam-still.jpg')],
  { stdio: 'inherit' },
)

writeFileSync(
  join(LIVE, 'manifest.json'),
  JSON.stringify(
    {
      w: W,
      h: H,
      fps: FPS,
      theme: 'dark',
      palette: {
        harbor: '#07131f',
        jade: '#3dcfb6',
        ink: '#e8f4ff',
      },
      clips: ['solo-1080.mp4', 'conversation-1080.mp4', 'cam-1080.mp4'],
    },
    null,
    2,
  ),
)

console.log('capture complete')
