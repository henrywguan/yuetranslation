#!/usr/bin/env node
/**
 * Live two-turn Azure STT test for the “second mic press is silent” bug.
 *
 * Calls paid Azure:
 *   POST /api/tts          — spoken WAV for Chrome’s fake mic
 *   GET  /api/speech-token — used by the real createAzureLiveSession path
 *
 * Usage (API :8787 + web :5173, AZURE_SPEECH_KEY set):
 *   node scripts/mic-second-turn-live.mjs
 */
import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import puppeteer from 'puppeteer-core'

const API = (process.env.API_BASE || 'http://localhost:8787').replace(/\/$/, '')
const WEB = (process.env.WEB_BASE || 'http://localhost:5173').replace(/\/$/, '')
const OUT = '/opt/cursor/artifacts'
const PHRASE = 'Hello. How are you today?'

function chromePath() {
  return (
    process.env.CHROME_PATH ||
    process.env.PUPPETEER_EXECUTABLE_PATH ||
    '/usr/local/bin/google-chrome'
  )
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function fetchTtsWav() {
  const res = await fetch(`${API}/api/tts`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text: `${PHRASE} ${PHRASE} ${PHRASE}`, lang: 'en' }),
  })
  const buf = Buffer.from(await res.arrayBuffer())
  if (!res.ok) {
    throw new Error(`tts HTTP ${res.status}: ${buf.toString('utf8').slice(0, 200)}`)
  }
  if (buf.length < 800) throw new Error(`tts too small (${buf.length} bytes)`)
  const dir = join(tmpdir(), `mic-second-turn-${Date.now()}`)
  mkdirSync(dir, { recursive: true })
  const mp3 = join(dir, 'phrase.mp3')
  const wav = join(dir, 'phrase.wav')
  const loop = join(dir, 'phrase-loop.wav')
  writeFileSync(mp3, buf)
  const conv = spawnSync(
    'ffmpeg',
    ['-y', '-i', mp3, '-ar', '48000', '-ac', '1', '-c:a', 'pcm_s16le', wav],
    { encoding: 'utf8' },
  )
  if (conv.status !== 0) {
    throw new Error(`ffmpeg convert failed: ${conv.stderr?.slice(-400)}`)
  }
  const looped = spawnSync(
    'ffmpeg',
    ['-y', '-stream_loop', '12', '-i', wav, '-t', '40', '-c', 'copy', loop],
    { encoding: 'utf8' },
  )
  if (looped.status !== 0) {
    throw new Error(`ffmpeg loop failed: ${looped.stderr?.slice(-400)}`)
  }
  if (!existsSync(loop)) throw new Error('loop wav missing')
  return { wav: loop, ttsBytes: buf.length, dir }
}

async function snap(page) {
  return page.evaluate(() => {
    const s = window.__yueStore?.getState()
    if (!s) return null
    return {
      live: s.live,
      status: s.status,
      error: s.error,
      enInterim: s.enInterim,
      yueInterim: s.yueInterim,
      enTranslation: s.enTranslation,
      yueTranslation: s.yueTranslation,
      liveInteraction: s.liveInteraction,
    }
  })
}

async function runTurn(page, n) {
  const turn = { n, started: false, heard: '', translation: '', error: null, levels: [] }
  await page.evaluate(async () => {
    const s = window.__yueStore.getState()
    s.setAutoSpeak?.(false)
    s.setMode?.('solo')
    s.setSoloPaneLang?.('upper', 'en')
    s.setSoloPaneLang?.('lower', 'yue')
    await s.startHold('en')
  })
  const live = await page
    .waitForFunction(() => window.__yueStore.getState().live === true, { timeout: 12000 })
    .then(() => true)
    .catch(() => false)
  turn.started = live
  if (!live) {
    turn.error = `turn ${n} never went live: ${JSON.stringify(await snap(page))}`
    return turn
  }

  const deadline = Date.now() + 14000
  while (Date.now() < deadline) {
    const level = await page.evaluate(() => {
      try {
        return window.__getMicLevel?.() ?? 0
      } catch {
        return 0
      }
    })
    turn.levels.push(Number(level) || 0)
    const s = await snap(page)
    const heard = `${s?.enInterim || ''} ${s?.yueInterim || ''}`.trim()
    if (heard) {
      turn.heard = heard
      break
    }
    if (s?.error) {
      turn.error = s.error
      break
    }
    await sleep(200)
  }

  await page.evaluate(async () => {
    await window.__yueStore.getState().endHold()
  })
  await page
    .waitForFunction(() => {
      const s = window.__yueStore.getState()
      return !s.live && !s.translating
    }, { timeout: 20000 })
    .catch(() => {})
  const after = await snap(page)
  turn.translation = after?.yueTranslation || ''
  turn.error = turn.error || after?.error || null
  if (!turn.heard) {
    turn.heard = `${after?.enInterim || ''} ${after?.yueInterim || ''}`.trim()
  }
  return turn
}

async function main() {
  mkdirSync(OUT, { recursive: true })
  const logs = []
  const report = { passed: false, turns: [], notes: [] }

  const health = await fetch(`${API}/api/health`).then((r) => r.json())
  if (!health.engines?.azureSpeech) {
    throw new Error('API health: azureSpeech=false')
  }
  report.notes.push('azureSpeech engine ready')

  const tokenRes = await fetch(`${API}/api/speech-token`)
  const tokenJson = await tokenRes.json().catch(() => ({}))
  if (!tokenRes.ok || !tokenJson.token) {
    throw new Error(`speech-token HTTP ${tokenRes.status}: ${JSON.stringify(tokenJson).slice(0, 240)}`)
  }
  report.notes.push(`speech-token ok (region=${tokenJson.region}, prepaid=${tokenJson.prepaidSeconds ?? '?'})`)

  const audio = await fetchTtsWav()
  report.notes.push(`tts wav ${audio.ttsBytes} bytes → ${audio.wav}`)

  const browser = await puppeteer.launch({
    executablePath: chromePath(),
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-gpu',
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      `--use-file-for-fake-audio-capture=${audio.wav}`,
    ],
  })
  try {
    const page = await browser.newPage()
    page.on('console', (msg) => logs.push(`[console.${msg.type()}] ${msg.text()}`))
    page.on('pageerror', (err) => logs.push(`[pageerror] ${err.message}`))
    await page.goto(`${WEB}/#/app`, { waitUntil: 'networkidle2', timeout: 60000 })
    await page.waitForFunction(() => Boolean(window.__yueStore), { timeout: 20000 })
    await page.evaluate(async () => {
      const { getMicLevel } = await import('/src/lib/audioReactive.ts')
      window.__getMicLevel = getMicLevel
    }).catch(() => {
      logs.push('[warn] could not import getMicLevel from /src; levels may be 0')
    })

    for (const n of [1, 2]) {
      const turn = await runTurn(page, n)
      report.turns.push(turn)
      logs.push(
        `turn ${n}: started=${turn.started} heard=${JSON.stringify(turn.heard)} translation=${JSON.stringify(turn.translation)} error=${turn.error} maxLevel=${Math.max(0, ...turn.levels)}`,
      )
      await sleep(400)
    }
  } finally {
    await browser.close()
  }

  const t1 = report.turns[0]
  const t2 = report.turns[1]
  const heard = (t) => Boolean(t?.heard?.trim())
  report.passed = Boolean(t1?.started && t2?.started && heard(t1) && heard(t2) && !t1.error && !t2.error)
  if (t1?.started && t2?.started && !heard(t2) && heard(t1)) {
    report.notes.push('REGRESSION: turn 1 heard speech, turn 2 did not')
  }
  writeFileSync(`${OUT}/mic-second-turn-live.json`, JSON.stringify(report, null, 2))
  writeFileSync(`${OUT}/mic-second-turn-live.log`, logs.join('\n'))
  console.log(JSON.stringify(report, null, 2))
  process.exit(report.passed ? 0 : 1)
}

main().catch((err) => {
  console.error('FAIL', err)
  process.exit(1)
})
