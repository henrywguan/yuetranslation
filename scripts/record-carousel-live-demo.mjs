#!/usr/bin/env node
/**
 * Live Solo demo (real type → translate → auto-speak) + Conversation
 * simulated live STT→translate on DISPLAY=:1, recorded via ffmpeg.
 *
 * Conversation has no text field (mic-only) — we animate interim STT then
 * finalize with a real /api/translate result + TTS so it still feels live.
 *
 *   NODE_PATH=apps/web/node_modules node scripts/record-carousel-live-demo.mjs
 */
import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
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
const WIN_X = 420
const WIN_Y = 40
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

function startFfmpeg(outPath) {
  const videoArgs = [
    '-y',
    '-f', 'x11grab',
    '-video_size', '1920x1080',
    '-framerate', '30',
    '-i', ':1.0',
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-crf', '17',
    '-pix_fmt', 'yuv420p',
    '-an',
    outPath,
  ]
  let proc = spawn('ffmpeg', videoArgs, { stdio: ['ignore', 'pipe', 'pipe'] })
  let err = ''
  proc.stderr.on('data', (d) => {
    err += String(d)
  })
  return {
    async waitReady() {
      await sleep(1200)
      if (proc.exitCode != null) throw new Error(`ffmpeg died early: ${err.slice(-500)}`)
    },
    stop() {
      return new Promise((resolve) => {
        if (proc.exitCode != null) return resolve()
        proc.on('close', () => resolve())
        proc.kill('SIGINT')
        setTimeout(() => {
          try {
            proc.kill('SIGKILL')
          } catch {}
          resolve()
        }, 5000)
      })
    },
  }
}

function cropPhone(src, dest) {
  const r = spawnSync(
    'ffmpeg',
    [
      '-y',
      '-i',
      src,
      '-vf',
      `crop=${W}:${H}:${WIN_X}:${WIN_Y + 36}`,
      '-c:v',
      'libx264',
      '-crf',
      '17',
      '-an',
      dest,
    ],
    { encoding: 'utf8' },
  )
  if (r.status !== 0) {
    console.error(r.stderr?.slice(-600))
    throw new Error('crop failed')
  }
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

const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: false,
  env: { ...process.env, DISPLAY: ':1' },
  args: [
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--hide-scrollbars',
    `--window-size=${W},${H + 90}`,
    `--window-position=${WIN_X},${WIN_Y}`,
    '--autoplay-policy=no-user-gesture-required',
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

// ========== SOLO: real typing + translate ==========
const soloRaw = join(OUT_DIR, 'solo-live-raw.mp4')
const soloFinal = join(OUT_DIR, 'solo-live-1080.mp4')
{
  await page.evaluate(() => {
    const s = window.__yueStore
    s.getState().setMode('solo')
    s.setState({
      enInterim: '',
      yueTranslation: '',
      yueAlternatives: [],
      yueDefinitions: [],
      history: [],
      translating: false,
      error: null,
    })
  })
  await sleep(700)
  const rec = startFfmpeg(soloRaw)
  await rec.waitReady()
  await sleep(900)

  await page.waitForSelector('textarea.solo-input--en', { timeout: 15000 })
  const enBox = await page.$('textarea.solo-input--en')
  await enBox.click({ clickCount: 3 })
  await page.keyboard.press('Backspace')
  await sleep(350)
  // Human-paced typing into the real Solo EN field (fires React onChange)
  for (const ch of SOLO_EN) {
    await page.keyboard.type(ch, { delay: 55 + Math.floor(Math.random() * 55) })
  }
  await sleep(400)
  // Enter forces immediate translate (skip 2s debounce) — still a real /api/translate
  await page.keyboard.press('Enter')
  await page.waitForFunction(
    () => {
      const st = window.__yueStore.getState()
      return Boolean(st.yueTranslation && st.yueTranslation.length > 1)
    },
    { timeout: 60000 },
  )
  // Hold on result + auto-speak TTS + alternatives
  await sleep(6000)
  await rec.stop()
  cropPhone(soloRaw, soloFinal)
  console.log('solo live →', soloFinal)
}

// ========== CONVERSATION: animated live STT → real translate ==========
const convoRaw = join(OUT_DIR, 'convo-live-raw.mp4')
const convoFinal = join(OUT_DIR, 'convo-live-1080.mp4')
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
  await sleep(900)
  const rec = startFfmpeg(convoRaw)
  await rec.waitReady()
  await sleep(700)

  // Simulate listening on EN side with growing interim
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
    await sleep(90 + Math.floor(Math.random() * 50))
  }
  await sleep(400)
  // End capture → translating
  await page.evaluate(() => {
    window.__yueStore.setState({ live: false, liveSide: null, status: 'idle', translating: true, translatingTo: 'yue' })
  })
  const tr = await apiTranslate(FACE_EN, 'en', 'yue')
  const yue = tr.text || tr.translation || '唔使擔心'
  const def = tr.definition || FACE_EN
  await sleep(600)
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
    { yue, def, en: FACE_EN },
  )
  // Fire product TTS (auto-speak path)
  await page.evaluate(async (text) => {
    try {
      await window.__yueStore.getState().speakManual?.(text, 'yue')
    } catch {}
  }, yue)
  await sleep(4500)
  await rec.stop()
  cropPhone(convoRaw, convoFinal)
  console.log('convo live →', convoFinal, yue)
}

await browser.close()

writeFileSync(
  join(OUT_DIR, 'manifest.json'),
  JSON.stringify(
    {
      theme: 'dark',
      autoSpeak: true,
      solo: { en: SOLO_EN, liveTyping: true, realTranslate: true },
      conversation: { en: FACE_EN, simulatedStt: true, realTranslate: true },
      files: ['solo-live-1080.mp4', 'convo-live-1080.mp4'],
    },
    null,
    2,
  ),
)
console.log('done', OUT_DIR)
