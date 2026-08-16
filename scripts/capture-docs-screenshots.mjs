#!/usr/bin/env node
/**
 * Capture fresh docs/demos screenshots from the local Vite app.
 * Requires web on :5173. Usage: node scripts/capture-docs-screenshots.mjs
 */
import puppeteer from 'puppeteer-core'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const WEB = (process.env.WEB_BASE || 'http://localhost:5173').replace(/\/$/, '')
const OUT = path.resolve('docs/demos')
const chrome =
  process.env.CHROME_PATH || process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/local/bin/google-chrome'

const shots = [
  { file: '01-landing-dark.png', url: `${WEB}/`, w: 1440, h: 900, theme: 'dark' },
  { file: '02-landing-light.png', url: `${WEB}/`, w: 1440, h: 900, theme: 'light' },
  { file: '03-pricing-dark.png', url: `${WEB}/#/pricing`, w: 1440, h: 900, theme: 'dark' },
  { file: '04-app-solo-dark.png', url: `${WEB}/?view=app`, w: 1440, h: 900, theme: 'dark', mode: 'solo' },
  { file: '05-app-solo-light.png', url: `${WEB}/?view=app`, w: 1440, h: 900, theme: 'light', mode: 'solo' },
  { file: '06-landing-mobile-dark.png', url: `${WEB}/`, w: 390, h: 844, theme: 'dark' },
  { file: '07-app-mobile-dark.png', url: `${WEB}/?view=app`, w: 390, h: 844, theme: 'dark', mode: 'solo' },
  {
    file: '08-app-conversation-dark.png',
    url: `${WEB}/?view=app`,
    w: 1440,
    h: 900,
    theme: 'dark',
    mode: 'conversation',
  },
  { file: '09-app-text-dark.png', url: `${WEB}/?view=app`, w: 1440, h: 900, theme: 'dark', mode: 'text' },
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
        deviceScaleFactor: shot.w < 500 ? 2 : 1,
      })
      await page.evaluateOnNewDocument((theme) => {
        localStorage.setItem('yue-theme', theme)
      }, shot.theme)
      await page.goto(shot.url, { waitUntil: 'networkidle2', timeout: 60000 })
      await page.waitForFunction(
        () => (document.body?.innerText || '').trim().length > 40,
        { timeout: 20000 },
      ).catch(() => {})
      if (shot.mode) {
        await page.waitForFunction(() => Boolean(window.__yueStore), { timeout: 20000 })
        await page.evaluate((mode) => {
          window.__yueStore.getState().setMode(mode)
        }, shot.mode)
        await new Promise((r) => setTimeout(r, 700))
      } else {
        await new Promise((r) => setTimeout(r, 900))
      }
      const dest = path.join(OUT, shot.file)
      await page.screenshot({ path: dest, type: 'png' })
      console.log('wrote', dest)
      await page.close()
    }
    try {
      const { unlink } = await import('node:fs/promises')
      await unlink(path.join(OUT, '08-app-facetoface-dark.png'))
      console.log('removed obsolete 08-app-facetoface-dark.png')
    } catch {
      /* ok */
    }
  } finally {
    await browser.close()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
