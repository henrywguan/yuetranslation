#!/usr/bin/env node
/**
 * Record Cam upload for stop-sign quiz Reel — Translate all only (no draw box).
 *
 * Flow: Upload tight STOP crop → Recordly zoom toward Translate all → press →
 * hold full OCR overlay → zoom out. Emits cam-upload-1080.mp4 + zoom-cues.json.
 *
 *   NODE_PATH=/workspace/node_modules node scripts/record-reel-cam-quiz-stop.mjs
 */
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync, rmSync, readdirSync } from 'node:fs'
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
const cues = []
const mark = (label, extra = {}) => {
  cues.push({ t: Date.now(), label, ...extra })
  console.log('cue', label, extra)
}

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
      return { count, wallSec, t0 }
    },
  }
}

async function findToolBtn(page, patterns) {
  return page.evaluate((pats) => {
    const btns = [...document.querySelectorAll('button')]
    for (const pat of pats) {
      const re = new RegExp(pat)
      const el = btns.find((b) => re.test((b.textContent || '').replace(/\s+/g, ' ').trim()) && !b.disabled)
      if (el) {
        const r = el.getBoundingClientRect()
        return {
          x: r.x + r.width / 2,
          y: r.y + r.height / 2,
          w: r.width,
          h: r.height,
          label: (el.textContent || '').trim().slice(0, 48),
        }
      }
    }
    return null
  }, patterns)
}

async function pressBtn(page, btn, label) {
  if (!btn) throw new Error(`missing button for ${label}`)
  await page.mouse.move(btn.x, btn.y, { steps: 1 })
  await sleep(140)
  await page.mouse.down()
  mark(`${label}_press`, { btn })
  await sleep(300) // hold so Recordly zoom catches the press
  await page.mouse.up()
  mark(`${label}_release`)
}

/**
 * After OCR, expand glass to blanket STOP letters (Vision often returns a skinny box).
 * Uses DEV-only window event wired in CameraUploadEditor.
 */
async function expandOverlayToStop(page) {
  return page.evaluate(() => {
    const box = { x: 0.14, y: 0.34, w: 0.72, h: 0.28 }
    window.dispatchEvent(new CustomEvent('yue:cam-set-overlay-box', { detail: { box } }))
    return { ok: true, box }
  })
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
    autoSpeak: false,
  })
  s.getState().setMode('camera')
})
await sleep(900)

const modalReady = await page.evaluate(() => {
  const t = document.body?.innerText || ''
  if (/Upload image|上載相片/.test(t)) return true
  const btns = [...document.querySelectorAll('button')]
  const cam = btns.find((b) => /\bCam\b|相機/.test(b.textContent || ''))
  cam?.click()
  return false
})
if (!modalReady) await sleep(700)

const outMp4 = join(OUT_DIR, 'cam-upload-1080.mp4')
const cast = createScreencast(page, join(OUT_DIR, '_frames'))
await cast.start()
mark('cast_start')
await sleep(450)

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
mark('upload_click')
if (chooser) await chooser.accept([signAbs])
else {
  const input = await page.$('input[type=file]')
  if (!input) throw new Error('no file input')
  await input.uploadFile(signAbs)
}

await page
  .waitForFunction(() => /Translate all|全部翻譯|Draw box|畫框/.test(document.body?.innerText || ''), {
    timeout: 20000,
  })
  .catch(() => {})
await sleep(900)
mark('image_loaded')

const translateAll = await findToolBtn(page, ['Translate all|全部翻譯'])
mark('pre_translate', { btn: translateAll })
await sleep(400)
mark('zoom_in_target')
await sleep(350)

await pressBtn(page, translateAll, 'translate')

const ok = await page
  .waitForFunction(
    () => {
      const t = document.body?.innerText || ''
      if (/Scanning|掃描中/.test(t)) return false
      return /停車|停止|ting4|ting2|Details|詳情|RESULTS|結果/.test(t)
    },
    { timeout: 45000 },
  )
  .then(() => true)
  .catch(() => false)

mark('result_visible', { ok })

// Expand glass to blanket full STOP (DEV event) so overlay covers S–P
const expanded = await expandOverlayToStop(page)
mark('overlay_expand', expanded)
await sleep(1200)
mark('zoom_out')
await sleep(3400)
mark('hold_end')

const info = await cast.stop(outMp4)
await browser.close()

const cueRel = cues.map((c) => ({
  ...c,
  sec: Number(((c.t - info.t0) / 1000).toFixed(3)),
}))
writeFileSync(
  join(OUT_DIR, 'manifest.json'),
  JSON.stringify({ ...info, sign: SIGN, file: 'cam-upload-1080.mp4', mode: 'translate_all', cues: cueRel }, null, 2),
)
writeFileSync(join(OUT_DIR, 'zoom-cues.json'), JSON.stringify(cueRel, null, 2))
console.log('cam live →', outMp4, info)
console.log('cues', cueRel.map((c) => `${c.sec}s ${c.label}`).join(' | '))
if (!ok) process.exitCode = 2
