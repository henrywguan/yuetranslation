#!/usr/bin/env node
/**
 * Cam accuracy harness — Pass 1 / Pass 2.
 * Henry-approved paid calls: /api/docs/translate, /api/docs/segments (Cam MT for signs).
 * Skips Azure Vision when engines.azureVision is false.
 *
 * Usage: node scripts/run-cam-accuracy-pass.mjs [1|2]
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const FIX = join(ROOT, 'fixtures', 'cam-accuracy')
const PASS = String(process.argv[2] || '1')
const OUT_DIR = join(FIX, 'results')
mkdirSync(OUT_DIR, { recursive: true })

const API = process.env.API_BASE || 'http://localhost:8787'

const manifest = JSON.parse(readFileSync(join(FIX, 'manifest.json'), 'utf8'))

async function health() {
  const r = await fetch(`${API}/api/health`)
  return r.json()
}

async function sleep(ms) {
  await new Promise((r) => setTimeout(r, ms))
}

async function postJson(path, body, { retries = 5 } = {}) {
  let last = { status: 0, json: {} }
  for (let attempt = 0; attempt <= retries; attempt++) {
    const r = await fetch(`${API}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const text = await r.text()
    let json
    try {
      json = JSON.parse(text)
    } catch {
      json = { raw: text }
    }
    last = { status: r.status, json }
    const msg = String(json.message || json.raw || '')
    const rateLimited = r.status === 429 || /rate limited|\b429\b/i.test(msg)
    if (!rateLimited || attempt === retries) return last
    const wait = Math.min(25000, 4000 * (attempt + 1))
    console.log(`[retry] ${path} rate-limit — wait ${wait}ms (attempt ${attempt + 1}/${retries})`)
    await sleep(wait)
  }
  return last
}

function fileToDataUrl(filePath, mime) {
  const buf = readFileSync(filePath)
  return `data:${mime};base64,${buf.toString('base64')}`
}

function scoreHints(translated, hints) {
  if (!hints?.length) return { hit: 0, total: 0, missing: [] }
  const blob = String(translated || '')
    .toLowerCase()
    .replace(/[–—−]/g, '-') // OCR often returns ASCII hyphen
  const missing = []
  let hit = 0
  for (const h of hints) {
    // Allow alternatives separated by ／ or /
    const alts = String(h)
      .split(/[／/]/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => s.replace(/→.*/, '').trim().toLowerCase().replace(/[–—−]/g, '-'))
    const ok = alts.some((a) => a && blob.includes(a))
    if (ok) hit += 1
    else missing.push(h)
  }
  return { hit, total: hints.length, missing }
}

async function translateSegments(segments, from, to) {
  const { status, json } = await postJson('/api/docs/segments', { segments, from, to })
  return { status, translations: json.translations || [], error: json.message, engine: json.engine }
}

async function translateFile(filename, absPath, from, to, mime) {
  const data = fileToDataUrl(absPath, mime)
  const { status, json } = await postJson('/api/docs/translate', {
    filename,
    data,
    from,
    to,
  })
  return { status, json }
}

async function translateOne(text, from, to) {
  // Cam Documents/signs path: /api/docs/segments → translateCameraText for short lines
  const { status, translations, error } = await translateSegments([text], from, to)
  return { status, text: translations[0] || '', json: { error, translations } }
}

/** Extract PDF text items with pdfjs (same transform math as app). */
async function extractPdfLines(pdfPath) {
  const pdfjs = await import(join(ROOT, 'apps/web/node_modules/pdfjs-dist/legacy/build/pdf.mjs'))
  const data = new Uint8Array(readFileSync(pdfPath))
  const pdf = await pdfjs.getDocument({ data }).promise
  const pages = []
  for (let n = 1; n <= pdf.numPages; n++) {
    const page = await pdf.getPage(n)
    const viewport = page.getViewport({ scale: 2 })
    const tc = await page.getTextContent()
    const items = []
    for (const raw of tc.items) {
      if (!raw?.str?.trim()) continue
      const text = String(raw.str).replace(/\s+/g, ' ').trim()
      const vx = pdfjs.Util.transform(viewport.transform, raw.transform)
      const tx = vx[4] ?? 0
      const ty = vx[5] ?? 0
      const scaleY = Math.hypot(vx[2] ?? 0, vx[3] ?? 0) || 1
      const fontH = Math.max(6, scaleY)
      const top = ty - fontH * 0.92
      items.push({
        text,
        x: tx / viewport.width,
        y: top / viewport.height,
        w: 0.2,
        h: fontH / viewport.height,
      })
    }
    // group lines
    items.sort((a, b) => a.y - b.y || a.x - b.x)
    const lines = []
    for (const it of items) {
      const last = lines[lines.length - 1]
      if (!last?.length) {
        lines.push([it])
        continue
      }
      const sample = last[0]
      const band = Math.max(sample.h, it.h) * 0.55
      const midA = sample.y + sample.h / 2
      const midB = it.y + it.h / 2
      if (Math.abs(midA - midB) <= band) last.push(it)
      else lines.push([it])
    }
    const grouped = lines.map((parts) => {
      parts.sort((a, b) => a.x - b.x)
      return {
        text: parts
          .map((p) => p.text)
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim(),
        y: Math.min(...parts.map((p) => p.y)),
      }
    })
    pages.push({ page: n, lines: grouped.filter((g) => g.text), itemCount: items.length })
  }
  return pages
}

function dirFromManifest(entry) {
  const d = String(entry.direction || '')
  if (d.startsWith('en')) return { from: 'en', to: 'yue' }
  if (d.startsWith('zh')) return { from: 'yue', to: 'en' }
  return { from: 'en', to: 'yue' }
}

const report = {
  pass: PASS,
  startedAt: new Date().toISOString(),
  health: null,
  documents: [],
  signs: [],
  issues: [],
}

const h = await health()
report.health = {
  openai: h.engines?.openai,
  vision: h.engines?.azureVision,
  demo: h.engines?.demo,
  allowed: h.entitlement?.allowed,
}
console.log('[health]', report.health)

if (!h.engines?.openai) {
  console.error('OpenAI/DeepSeek not configured — abort')
  process.exit(1)
}

// --- Documents ---
for (const doc of manifest.documents) {
  const abs = join(FIX, doc.file)
  if (!existsSync(abs)) {
    report.issues.push({ id: doc.id, kind: 'missing-file' })
    continue
  }
  const { from, to } = dirFromManifest(doc)
  const entry = {
    id: doc.id,
    file: doc.file,
    from,
    to,
    status: 0,
    mode: '',
    sourcePreview: '',
    translationPreview: '',
    hintScore: null,
    notes: [],
  }

  try {
    if (doc.file.endsWith('.pdf') && !doc.id.includes('scanned')) {
      entry.mode = 'pdf-text-layer+segments'
      const pages = await extractPdfLines(abs)
      const segs = pages.flatMap((p) => p.lines.map((l) => l.text)).filter(Boolean).slice(0, 80)
      entry.sourcePreview = segs.slice(0, 6).join(' | ')
      entry.extractPages = pages.map((p) => ({ page: p.page, lines: p.lines.length, items: p.itemCount }))
      // Placement sanity: page1 first line should be near top (y < 0.25)
      const p1 = pages[0]?.lines?.[0]
      if (p1 && p1.y > 0.35) {
        entry.notes.push(`WARN extract Y looks low on page1 (y=${p1.y.toFixed(3)}) — possible flip bug`)
        report.issues.push({ id: doc.id, kind: 'pdf-y-placement', y: p1.y })
      }
      if (segs.length === 0) {
        entry.notes.push('ERROR no text extracted')
        report.issues.push({ id: doc.id, kind: 'pdf-extract-empty' })
      } else {
        const tr = await translateSegments(segs, from, to)
        entry.status = tr.status
        entry.translationPreview = (tr.translations || []).slice(0, 6).join(' | ')
        entry.hintScore = scoreHints((tr.translations || []).join('\n'), doc.expectedHints)
        if (tr.status !== 200) {
          report.issues.push({ id: doc.id, kind: 'segments-http', status: tr.status, error: tr.error })
        }
        if (entry.hintScore && entry.hintScore.hit < entry.hintScore.total) {
          report.issues.push({
            id: doc.id,
            kind: 'mt-hint-miss',
            missing: entry.hintScore.missing,
          })
        }
      }
    } else if (doc.file.endsWith('.pdf') && doc.id.includes('scanned')) {
      entry.mode = 'scanned-pdf'
      if (!h.engines?.azureVision) {
        entry.notes.push('SKIP Vision not configured — cannot OCR scanned PDF')
        report.issues.push({ id: doc.id, kind: 'vision-missing' })
        // Still MT the known source highlights for translation quality
        const segs = doc.sourceHighlights || []
        if (segs.length) {
          const tr = await translateSegments(segs, from, to)
          entry.status = tr.status
          entry.translationPreview = (tr.translations || []).join(' | ')
          entry.hintScore = scoreHints((tr.translations || []).join('\n'), doc.expectedHints)
          entry.notes.push('MT-only fallback using sourceHighlights')
        }
      } else {
        // Fixture is a PNG wrapped in a PDF — OCR the source restaurant-board PNG
        // (same pixels as documents/09). Prefer explicit sibling sign art.
        const pngGuess = join(FIX, 'signs/04-restaurant-board-zh.png')
        const pngPath = existsSync(pngGuess) ? pngGuess : abs
        const dataUrl = fileToDataUrl(pngPath, 'image/png')
        const { status, json } = await postJson('/api/camera/scan', {
          image: dataUrl,
          target: to === 'en' ? 'en' : 'zh',
        })
        entry.status = status
        entry.ocr = {
          engine: json.engine,
          visionAuthFailed: json.visionAuthFailed,
          regions: (json.regions || []).map((r) => ({ text: r.text, translated: r.translated })),
        }
        const ocrBlob = (json.regions || []).map((r) => r.text).join('\n')
        const mtBlob = (json.regions || []).map((r) => r.translated || '').join('\n')
        entry.translationPreview = mtBlob.slice(0, 400)
        entry.ocrScore = scoreHints(ocrBlob, doc.sourceHighlights || [])
        entry.hintScore = scoreHints(`${ocrBlob}\n${mtBlob}`, doc.expectedHints || [])
        if (json.visionAuthFailed) {
          report.issues.push({ id: doc.id, kind: 'vision-auth-failed' })
        }
        if (entry.ocrScore && entry.ocrScore.hit < entry.ocrScore.total) {
          report.issues.push({ id: doc.id, kind: 'ocr-miss', missing: entry.ocrScore.missing })
        }
        if (entry.hintScore && entry.hintScore.hit < entry.hintScore.total) {
          report.issues.push({ id: doc.id, kind: 'mt-hint-miss', missing: entry.hintScore.missing })
        }
      }
    } else {
      entry.mode = 'docs-translate'
      const mime = doc.file.endsWith('.docx')
        ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        : doc.file.endsWith('.csv')
          ? 'text/csv'
          : 'text/plain'
      const name = doc.file.split('/').pop()
      const tr = await translateFile(name, abs, from, to, mime)
      entry.status = tr.status
      if (tr.status !== 200) {
        entry.notes.push(tr.json?.message || 'translate failed')
        report.issues.push({ id: doc.id, kind: 'docs-http', status: tr.status, error: tr.json?.message })
      } else {
        // Decode output for hint scoring when txt/csv
        if (mime.startsWith('text') && tr.json?.dataBase64) {
          const out = Buffer.from(tr.json.dataBase64, 'base64').toString('utf8')
          entry.translationPreview = out.slice(0, 400)
          entry.hintScore = scoreHints(out, doc.expectedHints)
          if (entry.hintScore.hit < entry.hintScore.total) {
            report.issues.push({ id: doc.id, kind: 'mt-hint-miss', missing: entry.hintScore.missing })
          }
        } else {
          entry.translationPreview = `engine=${tr.json.engine} pages=${tr.json.pages} segments=${tr.json.segments}`
          // DOCX: translate highlights via segments for scoring
          const segs = doc.sourceHighlights || []
          if (segs.length) {
            const s = await translateSegments(segs, from, to)
            entry.hintScore = scoreHints((s.translations || []).join('\n'), doc.expectedHints)
            entry.translationPreview += ' | ' + (s.translations || []).join(' | ')
            if (entry.hintScore.hit < entry.hintScore.total) {
              report.issues.push({ id: doc.id, kind: 'mt-hint-miss', missing: entry.hintScore.missing })
            }
          }
        }
      }
    }
  } catch (e) {
    entry.notes.push(String(e.message || e))
    report.issues.push({ id: doc.id, kind: 'exception', error: String(e.message || e) })
  }
  report.documents.push(entry)
  console.log(
    `[doc ${doc.id}] ${entry.mode} status=${entry.status} hints=${entry.hintScore ? `${entry.hintScore.hit}/${entry.hintScore.total}` : '-'} ${entry.notes.join('; ')}`,
  )
}

// --- Signs (MT of sourceText; OCR only if Vision on) ---
for (const sign of manifest.signs) {
  const abs = join(FIX, sign.file)
  const { from, to } = dirFromManifest(sign)
  const entry = {
    id: sign.id,
    file: sign.file,
    from,
    to,
    ocr: null,
    translations: [],
    hintScore: null,
    notes: [],
  }
  try {
    if (h.engines?.azureVision && existsSync(abs)) {
      // Free-tier Vision is ~10 TPM — pace OCR calls
      await sleep(3500)
      const dataUrl = fileToDataUrl(abs, 'image/png')
      const { status, json } = await postJson('/api/camera/scan', {
        image: dataUrl,
        target: to === 'en' ? 'en' : 'zh',
      })
      entry.ocr = {
        status,
        engine: json.engine,
        regions: (json.regions || []).map((r) => ({
          text: r.text,
          translated: r.translated,
        })),
      }
      const blob = (json.regions || []).map((r) => `${r.text} ${r.translated}`).join('\n')
      entry.hintScore = scoreHints(blob, sign.expectedHints)
      // Also check OCR recovered sourceText
      const ocrBlob = (json.regions || []).map((r) => r.text).join('\n')
      const ocrScore = scoreHints(ocrBlob, sign.sourceText)
      entry.ocrScore = ocrScore
      if (ocrScore.hit < ocrScore.total) {
        report.issues.push({ id: sign.id, kind: 'ocr-miss', missing: ocrScore.missing })
      }
      if (entry.hintScore.hit < entry.hintScore.total) {
        report.issues.push({ id: sign.id, kind: 'mt-hint-miss', missing: entry.hintScore.missing })
      }
    } else {
      entry.notes.push('OCR skipped (no Vision) — MT-only on sourceText')
      report.issues.push({ id: sign.id, kind: 'vision-missing' })
      const lines = sign.sourceText || []
      const outs = []
      for (const line of lines) {
        const tr = await translateOne(line, from, to)
        outs.push({ source: line, translation: tr.text, status: tr.status })
        if (tr.status !== 200) {
          report.issues.push({ id: sign.id, kind: 'translate-http', status: tr.status, line })
        }
      }
      entry.translations = outs
      entry.hintScore = scoreHints(outs.map((o) => o.translation).join('\n'), sign.expectedHints)
      if (entry.hintScore.hit < entry.hintScore.total) {
        report.issues.push({ id: sign.id, kind: 'mt-hint-miss', missing: entry.hintScore.missing })
      }
    }
  } catch (e) {
    entry.notes.push(String(e.message || e))
    report.issues.push({ id: sign.id, kind: 'exception', error: String(e.message || e) })
  }
  report.signs.push(entry)
  console.log(
    `[sign ${sign.id}] hints=${entry.hintScore ? `${entry.hintScore.hit}/${entry.hintScore.total}` : '-'} ${entry.notes.join('; ')}`,
  )
}

report.finishedAt = new Date().toISOString()
const outPath = join(OUT_DIR, `pass-${PASS}.json`)
writeFileSync(outPath, JSON.stringify(report, null, 2))
const summary = {
  pass: PASS,
  docCount: report.documents.length,
  signCount: report.signs.length,
  issueCount: report.issues.length,
  issuesByKind: report.issues.reduce((a, i) => {
    a[i.kind] = (a[i.kind] || 0) + 1
    return a
  }, {}),
  mtMisses: report.issues.filter((i) => i.kind === 'mt-hint-miss'),
}
writeFileSync(join(OUT_DIR, `pass-${PASS}-summary.json`), JSON.stringify(summary, null, 2))
console.log('\n[summary]', JSON.stringify(summary, null, 2))
console.log('wrote', outPath)
