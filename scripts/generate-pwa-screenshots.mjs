#!/usr/bin/env node
/**
 * Capture PWA manifest screenshots (narrow + wide) into apps/web/public/pwa-screenshots/.
 * Requires web on :5173. Usage: npm run pwa:screenshots
 *
 * Uses deviceScaleFactor 1 so PNG pixel dimensions match manifest `sizes`.
 */
import puppeteer from 'puppeteer-core'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'

const WEB = (process.env.WEB_BASE || 'http://localhost:5173').replace(/\/$/, '')
const OUT = path.resolve('apps/web/public/pwa-screenshots')
const chrome =
  process.env.CHROME_PATH || process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/local/bin/google-chrome'

const shots = [
  {
    file: 'mobile-app-narrow.png',
    url: `${WEB}/#/app`,
    w: 390,
    h: 844,
    theme: 'dark',
  },
  {
    file: 'desktop-app-wide.png',
    url: `${WEB}/#/app`,
    w: 1440,
    h: 900,
    theme: 'dark',
  },
]

async function main() {
  await mkdir(OUT, { recursive: true })
  const browser = await puppeteer.launch({
    executablePath: chrome,
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--hide-scrollbars', '--use-gl=swiftshader'],
  })
  try {
    for (const shot of shots) {
      const page = await browser.newPage()
      await page.setViewport({
        width: shot.w,
        height: shot.h,
        deviceScaleFactor: 1,
      })
      await page.evaluateOnNewDocument((theme) => {
        localStorage.setItem('yue-theme', theme)
      }, shot.theme)
      await page.goto(shot.url, { waitUntil: 'networkidle2', timeout: 60000 })
      await page
        .waitForFunction(() => (document.body?.innerText || '').trim().length > 40, {
          timeout: 20000,
        })
        .catch(() => {})
      await page.waitForFunction(() => Boolean(window.__yueStore), { timeout: 20000 }).catch(() => {})
      await new Promise((r) => setTimeout(r, 900))
      const dest = path.join(OUT, shot.file)
      await page.screenshot({ path: dest, type: 'png' })
      console.log('wrote', dest, `(${shot.w}x${shot.h})`)
      await page.close()
    }
  } finally {
    await browser.close()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
