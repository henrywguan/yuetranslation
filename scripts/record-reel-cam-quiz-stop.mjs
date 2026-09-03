#!/usr/bin/env node
/**
 * Record real Cam upload flow for stop-sign quiz Reel (9:16 CDP screencast).
 * Uploads docs/social/reel-cam-quiz-stop/source/stop-sign.png into Cam → Upload image.
 * Then runs Translate (Azure Vision) so OCR/overlay is real product UI.
 *
 *   NODE_PATH=/workspace/node_modules node scripts/record-reel-cam-quiz-stop.mjs
 */
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync, readFileSync, rmSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import puppeteer from 'puppeteer-core'

const chrome =
  process.env.CHROME_PATH ||
  ['/usr/local/bin/google-chrome', '/usr/bin/google-chrome'].find((p) => existsSync(p))
if (!chrome) throw new Error('no chrome')

const OUT_DIR = 'docs/social/reel-cam-quiz-stop/source/live'
const SIGN = 'docs/social/reel-cam-quiz-stop/source/stop-sign.png'
const W = 1080
const H = 1920
const FPS = 30

mkdirSync(OUT_DIR, { recursive: true })
if (!existsSync(SIGN)) throw new Error(`missing ${SIGN}`)

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
        quality: 86,
        maxWidth: W,
        maxHeight: H,
        everyNthFrame: 1,
      })
      await sleep(200)
    },
    async stop(outMp4) {
      running = false
      const wallSec = Math.max(0.5, (Date.now() - t0) / 1000)
      try {
        await session.send('Page.stopScreencast')
      } catch {}
      await sleep(200)
      const count = readdirSync(framesDir).filter((f) => f.endsWith('.jpg')).length
      if (count < 8) throw new Error(`too few frames (${count})`)
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
        console.error(r.stderr?.slice(-600))
        throw new Error('encode failed')
      }
      rmSync(framesDir, { recursive: true, force: true })
      return { count, wallSec }
    },
  }
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
  } catch {}
})
await page.goto('http://127.0.0.1:5173/?view=app#/app', { waitUntil: 'domcontentloaded', timeout: 60000 })
await page.waitForFunction(() => window.__yueStore, { timeout: 60000 })
await page.evaluate(() => {
  document.documentElement.dataset.theme = 'dark'
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
      limits: { ...(ent.limits || {}), plan: 'family', auto_speak: true, can_camera: true, can_docs: true },
    },
  })
  s.getState().setMode('camera')
})
await sleep(1200)

// Ensure choice modal / Cam view is ready
const modalReady = await page.evaluate(() => {
  const t = document.body?.innerText || ''
  if (/Upload image|上載相片/.test(t)) return true
  const btns = [...document.querySelectorAll('button')]
  const cam = btns.find((b) => /\bCam\b|相機/.test(b.textContent || ''))
  cam?.click()
  return false
})
if (!modalReady) await sleep(900)

const outMp4 = join(OUT_DIR, 'cam-upload-1080.mp4')
const cast = createScreencast(page, join(OUT_DIR, '_frames'))
await cast.start()
await sleep(700)

// Tap Upload image — file chooser opens from that click
const signAbs = join(process.cwd(), SIGN)
const [chooser] = await Promise.all([
  page.waitForFileChooser({ timeout: 15000 }).catch(() => null),
  page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')]
    const up = btns.find((b) => /Upload image|上載相片/.test(b.textContent || ''))
    if (!up) throw new Error('Upload image button not found')
    up.click()
  }),
])
if (chooser) {
  await chooser.accept([signAbs])
} else {
  const input = await page.$('input[type=file]')
  if (!input) throw new Error('no file input')
  await input.uploadFile(signAbs)
}
await sleep(1800)

// Wait for upload editor + image
await page
  .waitForFunction(
    () => {
      const t = document.body?.innerText || ''
      return /Translate all|全部翻譯|Translate|翻譯/.test(t)
    },
    { timeout: 15000 },
  )
  .catch(() => console.warn('upload editor wait timed out'))

await sleep(600)

// Primary Cam demo path: Translate all (auto OCR + translate) — not box Translate
await page.evaluate(() => {
  const btns = [...document.querySelectorAll('button')]
  const all = btns.find((b) => /Translate all|全部翻譯/.test(b.textContent || ''))
  if (all) {
    all.click()
    return
  }
  const tr = btns.find((b) => /^Translate$|^翻譯$|Translate|翻譯/.test(b.textContent || '') && !/AR|all|全部/.test(b.textContent || ''))
  tr?.click()
})

// Wait for OCR/translation result — real Vision overlay
await page
  .waitForFunction(
    () => {
      const t = document.body?.innerText || ''
      const scanning = /Scanning|掃描中/.test(t)
      if (scanning) return false
      return /停車|ting4|STOP|Details|詳情|粵/.test(t)
    },
    { timeout: 60000 },
  )
  .catch(() => console.warn('translate wait timed out — keeping capture anyway'))

// Hold on OCR overlay + results so the packed 8s Cam beat keeps 停車/停止 readable
await sleep(6500)
const info = await cast.stop(outMp4)
await browser.close()
writeFileSync(join(OUT_DIR, 'manifest.json'), JSON.stringify({ ...info, sign: SIGN, file: 'cam-upload-1080.mp4' }, null, 2))
console.log('cam live →', outMp4, info)
