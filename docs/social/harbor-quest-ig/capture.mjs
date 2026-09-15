#!/usr/bin/env node
/**
 * Capture real Harbor Quest UI for IG (offline — no paid APIs).
 * Usage: node docs/social/harbor-quest-ig/capture.mjs
 */
import { createRequire } from 'node:module'
import { existsSync, mkdirSync, writeFileSync, copyFileSync } from 'node:fs'
import { resolve, join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)
const puppeteer = require('/tmp/ig-render/node_modules/puppeteer-core')
const chrome =
  process.env.CHROME_PATH ||
  ['/usr/local/bin/google-chrome', '/usr/bin/google-chrome'].find(existsSync)

const OUT = resolve(__dirname, 'source')
const IG_SRC = resolve(__dirname, '../ig-posts/source/harbor-quest')
mkdirSync(OUT, { recursive: true })
mkdirSync(IG_SRC, { recursive: true })

const BASE = process.env.YUE_WEB_URL || 'http://localhost:5173'

function seedProgress() {
  return {
    cleared: ['introduction', 'lesson-1'],
    stepCursor: { 'lesson-2': 2 },
    correctCount: 28,
    gold: 180,
    xp: 1240,
    missionClears: { introduction: 1, 'lesson-1': 1 },
    coins: 320,
    owned: [
      'hat-straw',
      'top-harbor',
      'bottom-travel',
      'shoes-leather',
      'hand-none',
      'boat-canoe',
      'lantern-paper-amber',
    ],
    banked: [],
    look: {
      hat: 'hat-straw',
      top: 'top-harbor',
      bottom: 'bottom-travel',
      shoes: 'shoes-leather',
      hand: 'hand-none',
      boat: 'boat-canoe',
      lantern: 'lantern-paper-amber',
    },
    lastSavedAt: Date.now(),
    characterCreated: true,
    gender: 'male',
    appearance: { skinTone: 0xe8c4a8, hairStyle: 'short', hairColor: 0x2a2218 },
    localUsername: 'RiverScout',
  }
}

async function shot(page, name) {
  const path = join(OUT, name)
  await page.screenshot({ path, type: 'jpeg', quality: 92 })
  copyFileSync(path, join(IG_SRC, name))
  console.log('wrote', path)
}

async function clickByText(page, re) {
  return page.evaluate((pattern) => {
    const rx = new RegExp(pattern, 'i')
    const nodes = [...document.querySelectorAll('button, a, [role="button"]')]
    const hit = nodes.find((b) =>
      rx.test(`${b.textContent || ''} ${b.getAttribute('aria-label') || ''} ${b.getAttribute('title') || ''}`),
    )
    if (!hit) return null
    hit.click()
    return (hit.textContent || hit.getAttribute('aria-label') || '').trim().slice(0, 80)
  }, re)
}

const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: 'new',
  args: [
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--hide-scrollbars',
  ],
})

const page = await browser.newPage()
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 3 })
await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }])

async function boot(hash) {
  await page.goto(`${BASE}/?auth=0${hash}`, { waitUntil: 'networkidle0', timeout: 90000 })
  await page.evaluate((blob) => {
    localStorage.setItem('yue-theme', 'dark')
    localStorage.setItem('yue-harbor-quest-v1', JSON.stringify(blob))
    document.documentElement.setAttribute('data-theme', 'dark')
  }, seedProgress())
  await page.reload({ waitUntil: 'networkidle0', timeout: 90000 })
  await page
    .waitForSelector('.hq-stage, .hq-play, .hq-btn, .hq-play-hud-top, canvas', { timeout: 30000 })
    .catch(() => {})
  await new Promise((r) => setTimeout(r, 3000))
}

await boot('#/learn/lesson-1')
const htmlHint = await page.evaluate(() => ({
  title: document.title,
  body: document.body?.innerText?.slice(0, 200),
  canvas: !!document.querySelector('canvas'),
  hq: [...document.querySelectorAll('[class*="hq-"]')].slice(0, 15).map((e) => e.className),
}))
console.log('hint', htmlHint)
await shot(page, '01-play-lesson.jpg')

const scroll = await clickByText(page, 'Chapter scroll|Ch\\. |Open chapter|lesson')
console.log('scroll', scroll)
await new Promise((r) => setTimeout(r, 1500))
await shot(page, '02-chapter-scroll.jpg')
await page.keyboard.press('Escape')
await new Promise((r) => setTimeout(r, 500))

const arena = await clickByText(page, 'Arena gold|Match the Definition|擂台|金')
console.log('arena', arena)
await new Promise((r) => setTimeout(r, 1800))
await shot(page, '03-arena.jpg')
await page.keyboard.press('Escape')
await new Promise((r) => setTimeout(r, 500))

const inv = await clickByText(page, 'Ferry coins|Open inventory|inventory|◌')
console.log('inv', inv)
await new Promise((r) => setTimeout(r, 1400))
await shot(page, '04-inventory.jpg')
await page.keyboard.press('Escape')
await new Promise((r) => setTimeout(r, 400))

const chart = await clickByText(page, '^Chart$|Pier chart|Chart')
console.log('chart', chart)
await new Promise((r) => setTimeout(r, 1800))
await shot(page, '05-pier-chart.jpg')

await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 2 })
await boot('#/learn/lesson-1')
await shot(page, '06-desktop-dual.jpg')

const controls = await page.evaluate(() =>
  [...document.querySelectorAll('button, a')]
    .map((b) => ({
      t: (b.textContent || '').trim().slice(0, 40),
      a: b.getAttribute('aria-label') || '',
    }))
    .filter((x) => x.t || x.a)
    .slice(0, 60),
)
writeFileSync(join(OUT, 'controls.json'), JSON.stringify(controls, null, 2))
console.log('controls', controls)

await browser.close()
console.log('done →', OUT)
