#!/usr/bin/env node
/**
 * Live Solo (real type → translate → auto-speak) + Conversation
 * (interim STT sim → real translate + TTS), captured via CDP screencast
 * of the page viewport only (clean 1080×1350 — no Chrome chrome).
 *
 *   NODE_PATH=/workspace/node_modules node scripts/record-carousel-live-demo.mjs
 */
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync, rmSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import puppeteer from 'puppeteer-core'

const chrome =
  process.env.CHROME_PATH ||
  ['/usr/local/bin/google-chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].find((p) =>
    existsSync(p),
  )
if (!chrome) throw new Error('no chrome')

const OUT_DIR = process.env.OUT_DIR || 'docs/social/carousel-solo-convo/source/live'
const W = 1080
const H = 1350
const FPS = 30
const SOLO_EN = 'Are you coming home for dinner?'
const FACE_EN = "Don't worry"

mkdirSync(OUT_DIR, { recursive: true })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function enableFamilyAutoSpeak(page) {
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

async function apiTranslate(text, from = 'en', to = 'yue') {
  const res = await fetch('http://127.0.0.1:8787/api/translate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text, from, to }),
  })
  if (!res.ok) throw new Error(`translate ${res.status}`)
  return res.json()
}

/** CDP screencast → JPEG sequence → H.264 1080×1350 (wall-clock paced) */
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
        quality: 88,
        maxWidth: W,
        maxHeight: H,
        everyNthFrame: 1,
      })
      await sleep(250)
    },
    async stop(outMp4) {
      running = false
      const wallSec = Math.max(0.5, (Date.now() - t0) / 1000)
      try {
        await session.send('Page.stopScreencast')
      } catch {}
      await sleep(200)
      const count = readdirSync(framesDir).filter((f) => f.endsWith('.jpg')).length
      if (count < 8) throw new Error(`too few frames (${count}) in ${framesDir}`)
      // Pace input by wall clock (CDP skips duplicate frames), then resample to 30fps
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
          '-preset',
          'medium',
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
        throw new Error('ffmpeg encode failed')
      }
      rmSync(framesDir, { recursive: true, force: true })
      return { count, wallSec, inFps }
    },
  }
}

const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--hide-scrollbars',
    '--autoplay-policy=no-user-gesture-required',
    `--window-size=${W},${H}`,
  ],
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
await page.goto('http://127.0.0.1:5173/?view=app#/app', {
  waitUntil: 'domcontentloaded',
  timeout: 60000,
})
await page.waitForFunction(() => window.__yueStore, { timeout: 60000 })
await page.evaluate(() => {
  document.documentElement.dataset.theme = 'dark'
  document.documentElement.style.colorScheme = 'dark'
})
await enableFamilyAutoSpeak(page)
await page.addStyleTag({
  content: `
    .history-rail, [class*="history-rail"], button[aria-label*="History"] { display: none !important; }
    * { caret-color: #3dcfb6 !important; }
  `,
})
await sleep(600)

// ========== SOLO ==========
const soloFinal = join(OUT_DIR, 'solo-live-1080.mp4')
{
  await page.evaluate(() => {
    const s = window.__yueStore
    s.getState().setMode('solo')
    s.setState({
      enInterim: '',
      enTranslation: '',
      yueTranslation: '',
      yueAlternatives: [],
      yueDefinitions: [],
      history: [],
      translating: false,
      error: null,
    })
  })
  await sleep(500)
  const cast = createScreencast(page, join(OUT_DIR, '_frames_solo'))
  await cast.start()
  await sleep(400)

  await page.waitForSelector('textarea.solo-input--en', { timeout: 15000 })
  await page.click('textarea.solo-input--en')
  await sleep(200)
  // Grow the Solo EN field char-by-char (React-controlled via input events)
  for (let i = 1; i <= SOLO_EN.length; i++) {
    const partial = SOLO_EN.slice(0, i)
    await page.$eval(
      'textarea.solo-input--en',
      (el, v) => {
        const desc = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')
        desc.set.call(el, v)
        el.dispatchEvent(new InputEvent('input', { bubbles: true, data: v.slice(-1), inputType: 'insertText' }))
      },
      partial,
    )
    await sleep(36 + Math.floor(Math.random() * 24))
  }
  await sleep(200)
  // Enter clears SoloView debounce timer and force-translates once
  // (do NOT also call translateTyped — that leaves a pending debounce → second "Translating")
  await page.keyboard.press('Enter')
  await page.waitForFunction(
    () => {
      const st = window.__yueStore.getState()
      const yue = st.yueTranslation || ''
      // TranslateThinking text is aria-hidden — detect the loader node itself
      const thinking = document.querySelector('.translate-thinking')
      return yue.length > 1 && !st.translating && !thinking
    },
    { timeout: 90000 },
  )
  await sleep(4500)
  const info = await cast.stop(soloFinal)
  console.log('solo live →', soloFinal, info)
}

// ========== CONVERSATION ==========
const convoFinal = join(OUT_DIR, 'convo-live-1080.mp4')
let yueOut = ''
{
  await page.evaluate(() => {
    const s = window.__yueStore
    s.getState().setMode('conversation')
    s.setState({
      live: false,
      liveSide: null,
      status: 'idle',
      translating: false,
      face: {
        enInterim: '',
        yueInterim: '',
        enTranslation: '',
        yueTranslation: '',
        yueDefinition: '',
        yueDefinitions: [],
      },
    })
  })
  await sleep(600)
  const cast = createScreencast(page, join(OUT_DIR, '_frames_convo'))
  await cast.start()
  await sleep(350)

  await page.evaluate(() => {
    window.__yueStore.setState({ live: true, liveSide: 'en', status: 'listening' })
  })
  let buf = ''
  for (const ch of FACE_EN) {
    buf += ch
    const interim = buf
    await page.evaluate((t) => {
      const face = window.__yueStore.getState().face
      window.__yueStore.setState({
        face: { ...face, enInterim: t, enTranslation: '', yueTranslation: '', yueInterim: '' },
      })
    }, interim)
    await sleep(55 + Math.floor(Math.random() * 35))
  }
  await sleep(280)
  await page.evaluate(() => {
    window.__yueStore.setState({
      live: false,
      liveSide: null,
      status: 'idle',
      translating: true,
      translatingTo: 'yue',
    })
  })
  const tr = await apiTranslate(FACE_EN, 'en', 'yue')
  yueOut = tr.text || tr.translation || '唔使擔心'
  const def = tr.definition || FACE_EN
  await sleep(400)
  await page.evaluate(
    ({ yue, def, en }) => {
      window.__yueStore.setState({
        translating: false,
        translatingTo: null,
        face: {
          enInterim: '',
          yueInterim: '',
          enTranslation: en,
          yueTranslation: yue,
          yueDefinition: def,
          yueDefinitions: [def],
        },
      })
    },
    { yue: yueOut, def, en: FACE_EN },
  )
  await page.evaluate(async (text) => {
    try {
      await window.__yueStore.getState().speakManual?.(text, 'yue')
    } catch {}
  }, yueOut)
  await sleep(3800)
  const info = await cast.stop(convoFinal)
  console.log('convo live →', convoFinal, yueOut, info)
}

await browser.close()

writeFileSync(
  join(OUT_DIR, 'manifest.json'),
  JSON.stringify(
    {
      theme: 'dark',
      capture: 'cdp-screencast',
      autoSpeak: true,
      solo: { en: SOLO_EN, liveTyping: true, realTranslate: true },
      conversation: { en: FACE_EN, yue: yueOut, simulatedStt: true, realTranslate: true },
      files: ['solo-live-1080.mp4', 'convo-live-1080.mp4'],
    },
    null,
    2,
  ),
)
console.log('done', OUT_DIR)
