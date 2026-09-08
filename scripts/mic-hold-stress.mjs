/**
 * Stress-test Solo mic hold lifecycle: 5 back-to-back successful translations.
 *
 * Cloud VMs often lack Azure Speech + a real mic, so this injects a mock LiveSession
 * via DEV hooks and drives the real store startHold → endHold → /api/translate path
 * (dictionary phrases — no DeepSeek).
 *
 * Usage: node scripts/mic-hold-stress.mjs
 */
import { chromium } from 'playwright'
import { writeFileSync, mkdirSync } from 'node:fs'

const BASE = process.env.YUE_WEB_URL || 'http://localhost:5173'
const OUT = '/opt/cursor/artifacts'
const PHRASES = ['hello', 'thank you', 'good morning', 'how are you', 'goodbye']

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function main() {
  mkdirSync(OUT, { recursive: true })
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
  })
  const context = await browser.newContext({
    permissions: ['microphone'],
  })
  const page = await context.newPage()
  const logs = []
  page.on('console', (msg) => logs.push(`[console.${msg.type()}] ${msg.text()}`))

  await page.goto(`${BASE}/#/app`, { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForFunction(() => Boolean(window.__yueStore), null, { timeout: 30000 })

  // Disable auto-speak so TTS/echo cannot mask STT in this harness.
  await page.evaluate(() => {
    const s = window.__yueStore.getState()
    s.setAutoSpeak?.(false)
    s.setMode?.('solo')
    s.setSoloPaneLang?.('upper', 'en')
    s.setSoloPaneLang?.('lower', 'yue')
  })

  await page.evaluate(() => {
    window.__setLiveSessionFactoryForTests(async (handlers) => {
      let stopped = false
      let timer = null
      return {
        setPlaybackActive() {},
        async start() {
          stopped = false
          handlers.onStatus('listening')
          // Phrase is injected by the harness via window.__mockFinal before endHold.
        },
        async stop() {
          stopped = true
          if (timer) clearTimeout(timer)
          handlers.onStatus('idle')
        },
        /** test helper */
        __emit(text, lang = 'en') {
          if (stopped) return
          handlers.onInterim(lang, text)
          handlers.onFinal(lang, text)
        },
      }
    })
  })

  // Keep a handle to the last session so we can emit finals.
  await page.evaluate(() => {
    const orig = window.__setLiveSessionFactoryForTests
    window.__lastMockSession = null
    window.__setLiveSessionFactoryForTests((factory) => {
      orig(async (handlers, stream, lock) => {
        const session = await factory(handlers, stream, lock)
        window.__lastMockSession = session
        return session
      })
    })
    // Re-install with wrapping
    const inner = async (handlers) => {
      let stopped = false
      return {
        setPlaybackActive() {},
        async start() {
          stopped = false
          handlers.onStatus('listening')
        },
        async stop() {
          stopped = true
          handlers.onStatus('idle')
        },
        __emit(text, lang = 'en') {
          if (stopped) return
          handlers.onInterim(lang, text)
          handlers.onFinal(lang, text)
        },
      }
    }
    window.__setLiveSessionFactoryForTests(null)
    orig(async (handlers) => {
      const session = await inner(handlers)
      window.__lastMockSession = session
      return session
    })
  })

  const results = []
  for (let i = 0; i < PHRASES.length; i++) {
    const phrase = PHRASES[i]
    const turn = { i: i + 1, phrase, ok: false, translation: '', flags: null, error: null }
    try {
      await page.evaluate(async () => {
        await window.__yueStore.getState().startHold('en')
      })
      await page.waitForFunction(() => window.__yueStore.getState().live === true, null, {
        timeout: 5000,
      })
      await page.evaluate((text) => {
        const session = window.__lastMockSession
        if (!session?.__emit) throw new Error('mock session missing')
        session.__emit(text, 'en')
      }, phrase)
      await sleep(80)
      await page.evaluate(async () => {
        await window.__yueStore.getState().endHold()
      })
      // Wait for translate to land on lower pane (yue*).
      await page.waitForFunction(
        () => {
          const s = window.__yueStore.getState()
          return Boolean(s.yueTranslation?.trim()) && !s.translating && !s.live
        },
        null,
        { timeout: 15000 },
      )
      const snap = await page.evaluate(() => {
        const s = window.__yueStore.getState()
        return {
          yueTranslation: s.yueTranslation,
          enInterim: s.enInterim,
          live: s.live,
          status: s.status,
          error: s.error,
          flags: window.__getHoldDebugFlagsForTests(),
        }
      })
      turn.translation = snap.yueTranslation
      turn.flags = snap.flags
      turn.error = snap.error
      const flagsClear =
        !snap.flags.holding &&
        !snap.flags.tapSticky &&
        !snap.flags.flushingHold &&
        !snap.flags.startingHold &&
        !snap.live
      turn.ok = Boolean(snap.yueTranslation?.trim()) && flagsClear && !snap.error
      if (!turn.ok) {
        turn.error = turn.error || `flags=${JSON.stringify(snap.flags)} live=${snap.live}`
      }
    } catch (e) {
      turn.error = String(e)
      turn.flags = await page.evaluate(() => window.__getHoldDebugFlagsForTests?.() || null)
    }
    results.push(turn)
    logs.push(`turn ${turn.i}: ${turn.ok ? 'OK' : 'FAIL'} "${phrase}" → "${turn.translation}" ${turn.error || ''}`)
    if (!turn.ok) break
    // Brief gap then immediately start next — reproduces rapid re-press.
    await sleep(50)
  }

  // Extra: after 5 successes, confirm a 6th startHold can go live (not stuck).
  let sixthLive = false
  if (results.length === 5 && results.every((r) => r.ok)) {
    await page.evaluate(async () => {
      await window.__yueStore.getState().startHold('en')
    })
    sixthLive = await page
      .waitForFunction(() => window.__yueStore.getState().live === true, null, { timeout: 5000 })
      .then(() => true)
      .catch(() => false)
    await page.evaluate(async () => {
      await window.__yueStore.getState().endHold()
    })
    await sleep(200)
  }

  const passed = results.length === 5 && results.every((r) => r.ok) && sixthLive
  const report = {
    passed,
    sixthLive,
    results,
    note:
      'Mock STT + real dictionary /api/translate. Cloud has no AZURE_SPEECH_KEY; this validates hold lifecycle stuck-state.',
  }
  writeFileSync(`${OUT}/mic-hold-stress.json`, JSON.stringify(report, null, 2))
  writeFileSync(`${OUT}/mic-hold-stress.log`, logs.join('\n'))
  console.log(JSON.stringify(report, null, 2))
  await browser.close()
  process.exit(passed ? 0 : 1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
