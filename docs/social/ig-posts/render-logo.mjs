#!/usr/bin/env node
/**
 * Render logo-mark.html → assets/logo-mark.png (1024) via headless Chrome.
 */
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { createRequire } from 'node:module'
import { dirname, extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)
const root = __dirname

function loadPuppeteer() {
  const candidates = [
    resolve(__dirname, '../../../apps/web/node_modules/puppeteer-core'),
    resolve(__dirname, '../../../node_modules/puppeteer-core'),
    '/tmp/ig-render/node_modules/puppeteer-core',
  ]
  for (const c of candidates) {
    try {
      return require(c)
    } catch {
      /* try next */
    }
  }
  const install = spawnSync('npm', ['install', '--prefix', '/tmp/ig-render', 'puppeteer-core@23'], {
    stdio: 'inherit',
  })
  if (install.status !== 0) throw new Error('puppeteer-core install failed')
  return require('/tmp/ig-render/node_modules/puppeteer-core')
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
}

const server = createServer(async (req, res) => {
  try {
    const rel = decodeURIComponent((req.url || '/').split('?')[0])
    const file = join(root, rel)
    if (!file.startsWith(root)) {
      res.writeHead(403)
      res.end()
      return
    }
    const data = await readFile(file)
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' })
    res.end(data)
  } catch {
    res.writeHead(404)
    res.end('not found')
  }
})

await new Promise((r) => server.listen(0, '127.0.0.1', r))
const { port } = server.address()
const chrome =
  process.env.CHROME_PATH ||
  ['/usr/local/bin/google-chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].find(existsSync)
if (!chrome) throw new Error('Chrome not found')

const puppeteer = loadPuppeteer()
const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: true,
  args: ['--no-sandbox', '--disable-gpu', '--font-render-hinting=none'],
})
const page = await browser.newPage()
await page.setViewport({ width: 220, height: 220, deviceScaleFactor: 8 })
await page.goto(`http://127.0.0.1:${port}/logo-mark.html`, { waitUntil: 'networkidle0' })
const measure = await page.evaluate(async () => {
  await document.fonts.ready
  await document.fonts.load('800 138px SyneLogo', 'J')
  await document.fonts.load('700 54px NotoYue', '粵')
  const ctx = document.createElement('canvas').getContext('2d')
  ctx.font = '700 54px NotoYue'
  return ctx.measureText('粵').width
})
if (measure < 20) throw new Error(`粵 font failed width=${measure}`)
console.log('粵 measure width', measure)

const el = await page.$('#mark')
const rawPath = '/tmp/logo-mark-raw.png'
await el.screenshot({ path: rawPath, omitBackground: true })
await browser.close()
server.close()
console.log('raw written', rawPath)
