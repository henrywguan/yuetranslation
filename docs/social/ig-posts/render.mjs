#!/usr/bin/env node
/**
 * Render IG posts to PNG via headless Chrome.
 * Serves docs/social/ig-posts over localhost so @font-face loads (file:// blocks fonts).
 *
 * Usage:
 *   node docs/social/ig-posts/render.mjs
 *   node docs/social/ig-posts/render.mjs --out /path/to/dir
 */
import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join, resolve, extname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'

const __dirname = dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)
const outArg = process.argv.indexOf('--out')
const outDir =
  outArg >= 0 && process.argv[outArg + 1]
    ? resolve(process.argv[outArg + 1])
    : resolve(__dirname, 'out')

mkdirSync(outDir, { recursive: true })

const jobs = [
  { html: 'jyutping-tones-square.html', png: 'ig-post-jyutping-tones-1080.png', w: 1080, h: 1080 },
  { html: 'jyutping-tones-portrait.html', png: 'ig-post-jyutping-tones-portrait.png', w: 1080, h: 1350 },
]

const chrome =
  process.env.CHROME_PATH ||
  ['/usr/local/bin/google-chrome', '/usr/bin/google-chrome', '/usr/bin/chromium-browser', '/usr/bin/chromium'].find(
    (p) => existsSync(p),
  )

if (!chrome) {
  console.error('Chrome/Chromium not found. Set CHROME_PATH.')
  process.exit(1)
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
}

function startStaticServer(root) {
  return new Promise((resolvePromise) => {
    const server = createServer(async (req, res) => {
      try {
        const urlPath = decodeURIComponent((req.url || '/').split('?')[0])
        const rel = urlPath === '/' ? '/index.html' : urlPath
        const file = join(root, rel)
        if (!file.startsWith(root)) {
          res.writeHead(403)
          res.end()
          return
        }
        const data = await readFile(file)
        res.writeHead(200, {
          'Content-Type': MIME[extname(file)] || 'application/octet-stream',
          'Cache-Control': 'no-cache',
          'Access-Control-Allow-Origin': '*',
        })
        res.end(data)
      } catch {
        res.writeHead(404)
        res.end('not found')
      }
    })
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address()
      resolvePromise({ server, port })
    })
  })
}

function loadPuppeteer() {
  const candidates = [
    resolve(__dirname, '../../../apps/web/node_modules/puppeteer-core'),
    resolve(__dirname, '../../../node_modules/puppeteer-core'),
    '/tmp/ig-render/node_modules/puppeteer-core',
  ]
  for (const p of candidates) {
    if (existsSync(p)) {
      return require(p)
    }
  }
  const install = spawnSync('npm', ['install', '--prefix', '/tmp/ig-render', 'puppeteer-core@23'], {
    encoding: 'utf8',
    stdio: 'inherit',
  })
  if (install.status !== 0) throw new Error('puppeteer-core install failed')
  return require('/tmp/ig-render/node_modules/puppeteer-core')
}

async function shotExact(puppeteer, url, outPng, w, h) {
  const outPath = join(outDir, outPng)
  const browser = await puppeteer.launch({
    executablePath: chrome,
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu', '--hide-scrollbars'],
  })
  try {
    const page = await browser.newPage()
    await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 })
    await page.goto(url, { waitUntil: 'load', timeout: 60000 })
    await page.evaluate(async () => {
      await document.fonts.ready
      await Promise.all([
        document.fonts.load("800 42px Syne", 'J'),
        document.fonts.load("700 42px 'Noto Sans HK'", '粵你返唔返嚟食飯㗎詩史試時市是'),
        document.fonts.load("800 20px 'Noto Sans'", '123456'),
        document.fonts.load("700 28px Syne", 'JyutTranslate'),
      ])
      await document.fonts.ready
    })
    await new Promise((r) => setTimeout(r, 400))
    const check = await page.evaluate(() => {
      const yue = document.querySelector('.logo-mark-yue')
      if (!yue) return { ok: false, reason: 'no yue' }
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      ctx.font = "64px 'Noto Sans HK'"
      const wYue = ctx.measureText('粵').width
      const wTofu = ctx.measureText('\uFFFD').width
      return {
        ok: wYue > 10 && Math.abs(wYue - wTofu) > 1,
        wYue,
        wTofu,
        font: getComputedStyle(yue).fontFamily,
        text: yue.textContent,
      }
    })
    console.log('glyph-check', JSON.stringify(check))
    if (!check.ok) {
      throw new Error('粵 glyph still missing — aborting screenshot')
    }
    const el = await page.$('#post')
    if (!el) throw new Error('missing #post')
    await el.screenshot({ path: outPath, type: 'png' })
    console.log('wrote', outPath)
  } finally {
    await browser.close()
  }
}

const puppeteer = loadPuppeteer()
const { server, port } = await startStaticServer(__dirname)
try {
  for (const job of jobs) {
    const url = `http://127.0.0.1:${port}/${job.html}`
    await shotExact(puppeteer, url, job.png, job.w, job.h)
  }
} finally {
  server.close()
}

const caption = `Most apps give you Chinese.
JyutTranslate teaches you how to say Cantonese.

✅ Jyutping (LSHK) on every line — tone numbers 1–6
✅ Chao tone letters when you dig in — ˥ ˧˥ ˧ ˨˩ ˩˧ ˨
✅ Real Hong Kong 口語, not textbook 書面語

Built for ABCs, families, and anyone who wants to hear — and speak — Cantonese correctly.

Free to try → link in bio
jyuttranslate.com

#Cantonese #粵語 #Jyutping #LearnCantonese #CantoneseAmerican #ABC #HongKongCantonese #ChaoTones #口語粵語 #JyutTranslate
`
writeFileSync(join(outDir, 'ig-post-jyutping-tones-caption.txt'), caption, 'utf8')
console.log('done →', outDir)
