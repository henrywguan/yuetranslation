#!/usr/bin/env node
/**
 * Render IG posts to PNG via headless Chrome (loads Syne / Noto Sans / Noto Sans HK).
 *
 * Usage:
 *   node docs/social/ig-posts/render.mjs
 *   node docs/social/ig-posts/render.mjs --out /path/to/dir
 */
import { spawnSync } from 'node:child_process'
import { mkdirSync, copyFileSync, writeFileSync, existsSync, unlinkSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
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

function ensurePuppeteer() {
  const candidates = [
    resolve(__dirname, '../../../apps/web/node_modules/puppeteer-core'),
    resolve(__dirname, '../../../node_modules/puppeteer-core'),
    '/tmp/ig-render/node_modules/puppeteer-core',
  ]
  if (candidates.some((p) => existsSync(p))) {
    return [
      resolve(__dirname, '../../../apps/web/node_modules'),
      resolve(__dirname, '../../../node_modules'),
      '/tmp/ig-render/node_modules',
    ].join(':')
  }
  const install = spawnSync('npm', ['install', '--prefix', '/tmp/ig-render', 'puppeteer-core@23'], {
    encoding: 'utf8',
    stdio: 'inherit',
  })
  if (install.status !== 0) return null
  return '/tmp/ig-render/node_modules'
}

function shotChrome(htmlName, outPng, w, h) {
  const htmlPath = join(__dirname, htmlName)
  const url = pathToFileURL(htmlPath).href
  const tmp = join(outDir, `.tmp-${outPng}`)
  const args = [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    `--window-size=${w},${h}`,
    `--screenshot=${tmp}`,
    `--virtual-time-budget=8000`,
    url,
  ]
  const r = spawnSync(chrome, args, { encoding: 'utf8' })
  if (r.status !== 0) {
    console.error(r.stderr || r.stdout)
    throw new Error(`Chrome failed for ${htmlName} (exit ${r.status})`)
  }
  copyFileSync(tmp, join(outDir, outPng))
  try {
    unlinkSync(tmp)
  } catch {
    // ignore
  }
  console.log(`wrote ${join(outDir, outPng)}`)
}

function shotExact(htmlName, outPng, w, h, nodePath) {
  const htmlPath = join(__dirname, htmlName)
  const url = pathToFileURL(htmlPath).href
  const outPath = join(outDir, outPng)
  const script = `
    const puppeteer = require('puppeteer-core');
    (async () => {
      const browser = await puppeteer.launch({
        executablePath: ${JSON.stringify(chrome)},
        headless: 'new',
        args: ['--no-sandbox', '--disable-gpu', '--hide-scrollbars'],
      });
      const page = await browser.newPage();
      await page.setViewport({ width: ${w}, height: ${h}, deviceScaleFactor: 1 });
      await page.goto(${JSON.stringify(url)}, { waitUntil: 'networkidle0', timeout: 60000 });
      await page.evaluate(async () => {
        if (document.fonts && document.fonts.ready) await document.fonts.ready;
      });
      await new Promise((r) => setTimeout(r, 500));
      const el = await page.$('#post');
      if (!el) throw new Error('missing #post');
      await el.screenshot({ path: ${JSON.stringify(outPath)}, type: 'png' });
      await browser.close();
      console.log('wrote', ${JSON.stringify(outPath)});
    })().catch((e) => { console.error(e); process.exit(1); });
  `
  if (!nodePath) {
    shotChrome(htmlName, outPng, w, h)
    return
  }
  const r = spawnSync(process.execPath, ['-e', script], {
    encoding: 'utf8',
    env: { ...process.env, NODE_PATH: nodePath },
  })
  if (r.status !== 0) {
    console.error(r.stderr || r.stdout)
    console.warn('puppeteer failed; falling back to Chrome --screenshot')
    shotChrome(htmlName, outPng, w, h)
    return
  }
  process.stdout.write(r.stdout || '')
}

const nodePath = ensurePuppeteer()
for (const job of jobs) {
  shotExact(job.html, job.png, job.w, job.h, nodePath)
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
