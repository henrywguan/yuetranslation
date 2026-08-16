#!/usr/bin/env node
/**
 * JyutTranslate quality bot
 *
 * 1) API cases: EN↔粵 phrases must translate without demo/junk engines.
 * 2) UI cases (Puppeteer): Solo + Conversation panes show only clean
 *    translations after a simulated post-capture turn (same path as mic end).
 * 3) Optional speech: browser speechSynthesis “speaks” EN/粵 lines before each UI case.
 *
 * Usage (API + web already running on 8787 / 5173):
 *   node scripts/translation-quality-bot.mjs
 *   npm run test:translate
 *
 * Env:
 *   API_BASE=http://localhost:8787
 *   WEB_BASE=http://localhost:5173
 *   SKIP_UI=1          — API-only
 *   REQUIRE_OPENAI=1   — fail if engines.openai is false
 */

import puppeteer from 'puppeteer-core'

const API = (process.env.API_BASE || 'http://localhost:8787').replace(/\/$/, '')
const WEB = (process.env.WEB_BASE || 'http://localhost:5173').replace(/\/$/, '')
const SKIP_UI = process.env.SKIP_UI === '1'
const REQUIRE_OPENAI = process.env.REQUIRE_OPENAI === '1'

const JUNK_RE =
  /(（示範）|\(demo\)|question mark|full stop|exclamation mark|\bparticle\b|\bcolloquial\b|\binterjection\b|\s\/\s|^\d+\.\s|\[|\]|\([^)]{0,40}\))/i

/** Cases that must never hit demo — phrase memory / lexicon exact. */
const API_CASES = [
  {
    id: 'en-what-doing',
    from: 'en',
    to: 'yue',
    text: 'what are you doing?',
    expect: /做緊|咩/,
    mode: 'solo',
  },
  {
    id: 'en-apple',
    from: 'en',
    to: 'yue',
    text: 'apple',
    expect: /蘋|果/,
    mode: 'solo',
  },
  {
    id: 'yue-understand',
    from: 'yue',
    to: 'en',
    text: '明唔明白我講乜嘢？',
    expect: /understand/i,
    mode: 'solo',
  },
  {
    id: 'yue-morning',
    from: 'yue',
    to: 'en',
    text: '喂，早晨呀。',
    expect: /morning|hello/i,
    mode: 'conversation',
  },
  {
    id: 'en-thank-you',
    from: 'en',
    to: 'yue',
    text: 'thank you',
    expect: /唔該|多謝/,
    mode: 'conversation',
  },
  {
    id: 'yue-hear-me',
    from: 'yue',
    to: 'en',
    text: '你聽唔聽到我？',
    expect: /hear/i,
    mode: 'conversation',
  },
]

const failures = []
const passes = []

function ok(msg) {
  passes.push(msg)
  console.log(`  ✓ ${msg}`)
}

function fail(msg) {
  failures.push(msg)
  console.error(`  ✗ ${msg}`)
}

async function apiJson(path, init) {
  const res = await fetch(`${API}${path}`, init)
  const text = await res.text()
  let data
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error(`${path} → ${res.status} non-JSON: ${text.slice(0, 200)}`)
  }
  if (!res.ok) throw new Error(`${path} → ${res.status}: ${text.slice(0, 200)}`)
  return data
}

async function translate(text, from, to) {
  return apiJson('/api/translate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text, from, to, stage: 'final', includeAlternatives: false }),
  })
}

function assertCleanTranslation(caseId, result) {
  if (result.engine === 'demo') {
    fail(`${caseId}: engine=demo (need phrase hit or OPENAI_API_KEY)`)
    return false
  }
  if (result.stage && result.stage !== 'final') {
    fail(`${caseId}: stage=${result.stage} (expected final)`)
    return false
  }
  if (!result.text?.trim()) {
    fail(`${caseId}: empty translation`)
    return false
  }
  if (JUNK_RE.test(result.text)) {
    fail(`${caseId}: junk translation → ${JSON.stringify(result.text)}`)
    return false
  }
  return true
}

async function runApiSuite() {
  console.log('\n== API health ==')
  const health = await apiJson('/api/health')
  console.log(
    `  engines: openai=${health.engines?.openai} demo=${health.engines?.demo} dictionary=${health.engines?.dictionary} lexicon=${health.engines?.lexicon}`,
  )
  if (REQUIRE_OPENAI && !health.engines?.openai) {
    fail('REQUIRE_OPENAI=1 but engines.openai is false')
  } else if (health.engines?.openai) {
    ok('OpenAI configured (non-demo model path available)')
  } else {
    console.log('  ℹ OpenAI not configured — phrase/lexicon hits must carry the suite (demo only for unknown text)')
  }

  console.log('\n== API final translations (no demo / no junk) ==')
  let nonDemo = 0
  for (const c of API_CASES) {
    const result = await translate(c.text, c.from, c.to)
    if (!assertCleanTranslation(c.id, result)) continue
    if (!c.expect.test(result.text)) {
      fail(`${c.id}: unexpected text ${JSON.stringify(result.text)} (engine=${result.engine})`)
      continue
    }
    nonDemo += 1
    if (result.engine === 'demo') {
      fail(`${c.id}: unexpected demo engine`)
      continue
    }
    ok(`${c.id}: ${c.from}→${c.to} via ${result.engine} → ${result.text}`)
  }

  if (nonDemo < 3) {
    fail(`Need ≥3 non-demo translations; got ${nonDemo}`)
  } else {
    ok(`${nonDemo} non-demo text translations (≥3 required)`)
  }

  // Explicit junk regressions (粵→EN must not dump gloss joins).
  console.log('\n== Gloss-dump regressions ==')
  for (const text of ['你聽唔聽到我？', '喂，早晨呀。', '明唔明白我講乜嘢？']) {
    const result = await translate(text, 'yue', 'en')
    if (assertCleanTranslation(`junk-${text}`, result) && !JUNK_RE.test(result.text)) {
      ok(`no gloss dump for ${text} → ${result.text}`)
    }
  }

  return health
}

function chromePath() {
  return (
    process.env.CHROME_PATH ||
    process.env.PUPPETEER_EXECUTABLE_PATH ||
    '/usr/local/bin/google-chrome'
  )
}

async function speakInPage(page, text, lang) {
  await page.evaluate(
    async (phrase, voiceLang) => {
      await new Promise((resolve) => {
        const u = new SpeechSynthesisUtterance(phrase)
        u.lang = voiceLang
        u.rate = 1
        u.onend = () => resolve()
        u.onerror = () => resolve()
        speechSynthesis.cancel()
        speechSynthesis.speak(u)
        // Headless often has no voices — don't hang.
        setTimeout(resolve, 1200)
      })
    },
    text,
    lang === 'yue' ? 'zh-HK' : 'en-US',
  )
}

async function waitForTranslation(page, mode, from) {
  const deadline = Date.now() + 20000
  while (Date.now() < deadline) {
    const snap = await page.evaluate((m, lang) => {
      const store = window.__yueStore
      if (!store) return null
      const s = store.getState()
      if (s.translating) return { ready: false, translating: true }
      if (m === 'conversation') {
        const face = s.face
        const translation = lang === 'en' ? face.yueTranslation : face.enTranslation
        const source = lang === 'en' ? face.enInterim : face.yueInterim
        return { ready: Boolean(translation), translation, source, error: s.error }
      }
      const translation = lang === 'en' ? s.yueTranslation : s.enTranslation
      const source = lang === 'en' ? s.enInterim : s.yueInterim
      return { ready: Boolean(translation), translation, source, error: s.error }
    }, mode, from)
    if (snap?.error) throw new Error(`store error: ${snap.error}`)
    if (snap?.ready) return snap
    await new Promise((r) => setTimeout(r, 150))
  }
  throw new Error(`timeout waiting for ${mode} ${from} translation`)
}

async function runUiSuite() {
  console.log('\n== UI Solo + Conversation (post-capture panes) ==')
  const browser = await puppeteer.launch({
    executablePath: chromePath(),
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--use-fake-ui-for-media-stream'],
  })
  try {
    const page = await browser.newPage()
    await page.goto(`${WEB}/?view=app`, { waitUntil: 'networkidle2', timeout: 60000 })
    await page.waitForFunction(() => Boolean(window.__yueStore), { timeout: 20000 })

    const uiCases = API_CASES.filter((c) => c.mode === 'solo' || c.mode === 'conversation')
    for (const c of uiCases) {
      await page.evaluate((mode) => {
        const store = window.__yueStore.getState()
        store.setMode(mode)
      }, c.mode)

      // Bot “speaks” the line (browser TTS), then we run the same final translate
      // path the mic uses after capture ends (translateTyped / lean final).
      await speakInPage(page, c.text, c.from)

      await page.evaluate(
        async (text, from) => {
          const store = window.__yueStore.getState()
          await store.translateTyped(text, from)
        },
        c.text,
        c.from,
      )

      const snap = await waitForTranslation(page, c.mode, c.from)
      if (JUNK_RE.test(snap.translation || '')) {
        fail(`UI ${c.mode}/${c.id}: junk in pane → ${JSON.stringify(snap.translation)}`)
        continue
      }
      if (!c.expect.test(snap.translation || '')) {
        fail(`UI ${c.mode}/${c.id}: unexpected pane ${JSON.stringify(snap.translation)}`)
        continue
      }

      // Pane purity (store): translation only in the target pane; no junk / demo.
      // Solo Yue pane may also show an English definition gloss + variations — that is OK.
      const purity = await page.evaluate(
        (mode, from, expected) => {
          const s = window.__yueStore.getState()
          const junk =
            /(（示範）|\(demo\)|question mark|full stop|\bparticle\b|\bcolloquial\b|\s\/\s|^\d+\.\s)/i

          if (mode === 'conversation') {
            const face = s.face
            if (from === 'en') {
              return {
                ok:
                  face.yueTranslation === expected &&
                  !face.enTranslation &&
                  Boolean(face.enInterim) &&
                  !junk.test(face.yueTranslation) &&
                  !junk.test(face.enInterim),
              }
            }
            return {
              ok:
                face.enTranslation === expected &&
                !face.yueTranslation &&
                Boolean(face.yueInterim) &&
                !junk.test(face.enTranslation) &&
                !junk.test(face.yueInterim),
            }
          }

          if (from === 'en') {
            const yueDom = document.querySelector('.solo-translation')?.textContent || ''
            return {
              ok:
                s.yueTranslation === expected &&
                !s.enTranslation &&
                Boolean(s.enInterim) &&
                !junk.test(s.yueTranslation) &&
                !junk.test(s.enInterim) &&
                yueDom.includes(expected) &&
                !yueDom.includes('（示範）') &&
                !yueDom.includes('(demo)'),
            }
          }

          const enDom = document.querySelector('.solo-source')?.textContent || ''
          return {
            ok:
              s.enTranslation === expected &&
              !s.yueTranslation &&
              Boolean(s.yueInterim) &&
              !junk.test(s.enTranslation) &&
              enDom.includes(expected.slice(0, 12)) &&
              !enDom.includes('（示範）') &&
              !enDom.includes('(demo)'),
          }
        },
        c.mode,
        c.from,
        snap.translation,
      )

      if (!purity.ok) {
        fail(`UI ${c.mode}/${c.id}: pane layout impure ${JSON.stringify(purity)}`)
        continue
      }
      ok(`UI ${c.mode}/${c.id}: translation-only panes → ${snap.translation}`)
    }
  } finally {
    await browser.close()
  }
}

async function main() {
  console.log(`JyutTranslate quality bot\n  API ${API}\n  WEB ${WEB}`)
  await runApiSuite()
  if (!SKIP_UI) {
    try {
      await runUiSuite()
    } catch (e) {
      fail(`UI suite crashed: ${e?.message || e}`)
    }
  } else {
    console.log('\n== UI skipped (SKIP_UI=1) ==')
  }

  console.log(`\n== Summary: ${passes.length} passed, ${failures.length} failed ==`)
  if (failures.length) {
    for (const f of failures) console.error(`  - ${f}`)
    process.exit(1)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
