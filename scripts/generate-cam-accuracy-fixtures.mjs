#!/usr/bin/env node
/**
 * Generate Cam accuracy fixtures: PDFs (text + scanned), Office/TXT, and sign PNGs.
 * Run from repo root: node scripts/generate-cam-accuracy-fixtures.mjs
 *
 * Does NOT call DeepSeek / Azure — assets only.
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { PDFDocument, StandardFonts, rgb } from '../apps/web/node_modules/pdf-lib/dist/pdf-lib.esm.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const OUT = join(ROOT, 'fixtures', 'cam-accuracy')
const DOCS = join(OUT, 'documents')
const SIGNS = join(OUT, 'signs')

const require = createRequire(import.meta.url)
let fontkit
try {
  fontkit = require(join(ROOT, 'node_modules/@pdf-lib/fontkit'))
} catch {
  fontkit = require('@pdf-lib/fontkit')
}

mkdirSync(DOCS, { recursive: true })
mkdirSync(SIGNS, { recursive: true })

function fontCandidates() {
  return [
    '/usr/share/fonts/truetype/droid/DroidSansFallbackFull.ttf',
    '/home/ubuntu/.local/share/fonts/NotoSansHK-Bold.ttf',
    '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
  ].filter((p) => existsSync(p))
}

async function embedUiFont(pdf) {
  pdf.registerFontkit(fontkit)
  for (const path of fontCandidates()) {
    try {
      const bytes = readFileSync(path)
      const font = await pdf.embedFont(bytes, { subset: true })
      const cjk = /Noto|Droid|CJK|HK|Fallback/i.test(path)
      return { font, cjk, path }
    } catch (e) {
      console.warn('[fixtures] embed failed', path, e.message || e)
    }
  }
  return { font: await pdf.embedFont(StandardFonts.Helvetica), cjk: false, path: null }
}

function wrapLines(text, maxChars) {
  const words = text.split(/\s+/)
  const lines = []
  let cur = ''
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w
    if (next.length > maxChars && cur) {
      lines.push(cur)
      cur = w
    } else cur = next
  }
  if (cur) lines.push(cur)
  return lines
}

/** Draw wrapped Latin text; returns y after last line. */
function drawParagraph(page, font, text, x, y, size, maxWidth, color = rgb(0.08, 0.1, 0.12), leading = 1.35) {
  const avgChar = size * 0.52
  const maxChars = Math.max(12, Math.floor(maxWidth / avgChar))
  const lines = wrapLines(text, maxChars)
  let yy = y
  for (const line of lines) {
    page.drawText(line, { x, y: yy, size, font, color })
    yy -= size * leading
  }
  return yy
}

async function writeEnReferenceLetter() {
  const pdf = await PDFDocument.create()
  const { font } = await embedUiFont(pdf)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const page = pdf.addPage([612, 792])
  let y = 720
  page.drawText('Henry Guan', { x: 72, y, size: 28, font: bold, color: rgb(0.05, 0.08, 0.12) })
  y -= 36
  page.drawText('Character Reference', { x: 72, y, size: 14, font: bold })
  y -= 28
  page.drawText('Honorable Monica Ramirez Almadani', { x: 72, y, size: 12, font })
  y -= 18
  page.drawText('Director, U.S. Citizenship and Immigration Services', { x: 72, y, size: 11, font })
  y -= 28
  y = drawParagraph(
    page,
    font,
    'My name is Henry Guan. I have known Emmanuel Maldonado for about 9 years. He is honest, hardworking, and a reliable friend to our community.',
    72,
    y,
    12,
    468,
  )
  y -= 12
  y = drawParagraph(
    page,
    font,
    'Please feel free to contact me if you need any further information about his character.',
    72,
    y,
    12,
    468,
  )
  y -= 28
  page.drawText('Sincerely,', { x: 72, y, size: 12, font })
  y -= 36
  page.drawText('Henry Guan', { x: 72, y, size: 12, font: bold })

  // Page 2 — denser body (catches Y-placement / scaling bugs)
  const p2 = pdf.addPage([612, 792])
  y = 720
  p2.drawText('Additional remarks', { x: 72, y, size: 16, font: bold })
  y -= 28
  const paras = [
    'Emmanuel has volunteered at local events and helped neighbors during difficult times.',
    'He communicates clearly in English and treats everyone with respect.',
    'I recommend him without reservation for any opportunity that requires trust and integrity.',
    'Address for correspondence: 88 Harbor Road, Suite 12, Example City, CA 90001.',
    'Phone: (555) 010-2244 · Email: henry@example.com',
  ]
  for (const p of paras) {
    y = drawParagraph(p2, font, p, 72, y, 12, 468)
    y -= 14
  }

  const bytes = await pdf.save()
  writeFileSync(join(DOCS, '01-en-reference-letter.pdf'), bytes)
}

async function writeEnMenuPdf() {
  const pdf = await PDFDocument.create()
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const page = pdf.addPage([420, 620])
  let y = 560
  page.drawText('Harbor Tea House', { x: 48, y, size: 22, font: bold })
  y -= 28
  page.drawText('Menu', { x: 48, y, size: 14, font: bold, color: rgb(0.15, 0.45, 0.4) })
  y -= 32
  const items = [
    ['Milk tea', 'HK$ 28'],
    ['Lemon tea', 'HK$ 26'],
    ['Pineapple bun', 'HK$ 18'],
    ['Egg tart', 'HK$ 16'],
    ['Wonton noodles', 'HK$ 48'],
    ['Claypot rice', 'HK$ 68'],
  ]
  for (const [name, price] of items) {
    page.drawText(name, { x: 48, y, size: 13, font })
    page.drawText(price, { x: 300, y, size: 13, font: bold })
    y -= 26
  }
  y -= 12
  page.drawText('No service charge. Ask staff for allergens.', { x: 48, y, size: 10, font, color: rgb(0.35, 0.35, 0.38) })
  writeFileSync(join(DOCS, '02-en-cafe-menu.pdf'), await pdf.save())
}

async function writeZhNoticePdf() {
  const pdf = await PDFDocument.create()
  const embedded = await embedUiFont(pdf)
  if (!embedded.cjk) {
    console.warn('[fixtures] No CJK TTF found — writing zh notice as Latin placeholders only')
  }
  const page = pdf.addPage([420, 560])
  const font = embedded.font
  const lines = embedded.cjk
    ? [
        { t: '注意', s: 28 },
        { t: '請勿飲食', s: 20 },
        { t: '請保持安靜', s: 18 },
        { t: '如有查詢請聯絡職員', s: 14 },
        { t: '緊急出口 ->', s: 16 },
      ]
    : [
        { t: 'NOTICE (CJK font missing)', s: 16 },
        { t: 'No food or drink', s: 18 },
        { t: 'Please keep quiet', s: 16 },
        { t: 'Contact staff for help', s: 14 },
        { t: 'Emergency exit ->', s: 16 },
      ]
  let y = 460
  for (const line of lines) {
    page.drawText(line.t, { x: 56, y, size: line.s, font, color: rgb(0.1, 0.12, 0.15) })
    y -= line.s + 18
  }
  writeFileSync(join(DOCS, '03-zh-library-notice.pdf'), await pdf.save())
}

async function writeMixedTravelPdf() {
  const pdf = await PDFDocument.create()
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const { font: cjkFont, cjk } = await embedUiFont(pdf)
  const page = pdf.addPage([612, 792])
  let y = 720
  page.drawText('Hong Kong Travel Tips', { x: 72, y, size: 20, font: bold })
  y -= 32
  y = drawParagraph(
    page,
    font,
    'Buy an Octopus card for MTR, buses, and convenience stores. Keep to the right on escalators.',
    72,
    y,
    12,
    468,
  )
  y -= 18
  if (cjk) {
    page.drawText('港鐵 · 巴士 · 便利店', { x: 72, y, size: 14, font: cjkFont })
    y -= 24
    page.drawText('請勿阻擋車門', { x: 72, y, size: 14, font: cjkFont })
    y -= 28
  }
  y = drawParagraph(
    page,
    font,
    'Useful phrases: Where is the bathroom? · How much is this? · One ticket to Central, please.',
    72,
    y,
    12,
    468,
  )
  writeFileSync(join(DOCS, '04-en-zh-travel-tips.pdf'), await pdf.save())
}

async function writeTxtAndCsv() {
  writeFileSync(
    join(DOCS, '05-en-apartment-notice.txt'),
    [
      'BUILDING NOTICE',
      '',
      'Water supply will be suspended on Saturday 9:00–14:00 for maintenance.',
      'Please store enough water in advance.',
      'Sorry for the inconvenience.',
      '',
      'Management Office',
    ].join('\n'),
    'utf8',
  )
  writeFileSync(
    join(DOCS, '06-zh-shop-hours.txt'),
    [
      '營業時間',
      '星期一至五　11:00–21:00',
      '星期六日　10:00–22:00',
      '公眾假期照常營業',
      '歡迎光臨',
    ].join('\n'),
    'utf8',
  )
  writeFileSync(
    join(DOCS, '07-en-price-list.csv'),
    ['item,price_hkd', 'Bottled water,10', 'SIM card,88', 'Laundry bag,35', 'Umbrella,45'].join('\n'),
    'utf8',
  )
}

/** Minimal DOCX is written by the Python companion script. */

async function writeScannedPdfFromPng(pngPath, outName) {
  if (!existsSync(pngPath)) return
  const pdf = await PDFDocument.create()
  const bytes = readFileSync(pngPath)
  const img = await pdf.embedPng(bytes)
  const page = pdf.addPage([img.width, img.height])
  page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height })
  writeFileSync(join(DOCS, outName), await pdf.save())
}

const MANIFEST = {
  version: 1,
  purpose:
    'Offline fixtures for Cam AR / Upload / Documents accuracy. Do not commit live API outputs. Score OCR+MT separately.',
  howToTest: {
    documents: 'Cam → Documents → upload each file under fixtures/cam-accuracy/documents/',
    signs: 'Cam → Upload image → open each PNG under fixtures/cam-accuracy/signs/ → Auto-detect or draw boxes → Translate',
    ar: 'Display a sign PNG fullscreen on a second device / print it, then Cam → AR → shutter',
    scoring:
      'Compare OCR text to sourceText (character/word error). Compare translation to expectedHints (meaning, not verbatim). Prefer Traditional Chinese for EN→zh output.',
  },
  documents: [
    {
      id: '01-en-reference-letter',
      file: 'documents/01-en-reference-letter.pdf',
      path: 'documents',
      direction: 'en→zh',
      challenges: ['multi-page', 'heading size', 'proper nouns', 'formal letter'],
      sourceHighlights: ['Henry Guan', 'Character Reference', 'Emmanuel Maldonado', 'Additional remarks'],
      expectedHints: ['姓名／稱謂保留或音譯', '品格證明／推薦信語域', '第 2 頁標題對齊'],
    },
    {
      id: '02-en-cafe-menu',
      file: 'documents/02-en-cafe-menu.pdf',
      path: 'documents',
      direction: 'en→zh',
      challenges: ['short menu lines', 'prices', 'food names'],
      sourceHighlights: ['Harbor Tea House', 'Milk tea', 'Pineapple bun', 'Wonton noodles'],
      expectedHints: ['奶茶', '菠蘿包', '雲吞麵／馄饨面→宜用繁體餐廳用詞'],
    },
    {
      id: '03-zh-library-notice',
      file: 'documents/03-zh-library-notice.pdf',
      path: 'documents',
      direction: 'zh→en',
      challenges: ['short CJK lines', 'sign tone'],
      sourceHighlights: ['注意', '請勿飲食', '請保持安靜', '緊急出口'],
      expectedHints: ['Notice', 'No food or drink', 'Keep quiet', 'Emergency exit'],
    },
    {
      id: '04-en-zh-travel-tips',
      file: 'documents/04-en-zh-travel-tips.pdf',
      path: 'documents',
      direction: 'mixed — set From/To per pass',
      challenges: ['bilingual page', 'HK place terms'],
      sourceHighlights: ['Octopus card', '港鐵', '請勿阻擋車門'],
      expectedHints: ['八達通', 'MTR', 'Do not block the doors'],
    },
    {
      id: '05-en-apartment-notice',
      file: 'documents/05-en-apartment-notice.txt',
      path: 'documents',
      direction: 'en→zh',
      challenges: ['plain text', 'building notice'],
      sourceHighlights: ['Water supply will be suspended', 'Management Office'],
      expectedHints: ['暫停供水', '管理處'],
    },
    {
      id: '06-zh-shop-hours',
      file: 'documents/06-zh-shop-hours.txt',
      path: 'documents',
      direction: 'zh→en',
      challenges: ['hours format', 'full-width spaces'],
      sourceHighlights: ['營業時間', '星期一至五', '歡迎光臨'],
      expectedHints: ['Business hours', 'Monday to Friday', 'Welcome'],
    },
    {
      id: '07-en-price-list',
      file: 'documents/07-en-price-list.csv',
      path: 'documents',
      direction: 'en→zh',
      challenges: ['csv / tabular'],
      sourceHighlights: ['Bottled water', 'SIM card'],
      expectedHints: ['樽裝水／瓶裝水', '電話卡'],
    },
    {
      id: '08-en-invoice-docx',
      file: 'documents/08-en-invoice.docx',
      path: 'documents',
      direction: 'en→zh',
      challenges: ['docx layout-keep'],
      sourceHighlights: ['Invoice', 'Translation services', 'Total due'],
      expectedHints: ['發票', '翻譯服務', '應付總額'],
    },
    {
      id: '09-scanned-zh-menu',
      file: 'documents/09-scanned-zh-menu.pdf',
      path: 'documents',
      direction: 'zh→en',
      challenges: ['image-only PDF', 'Vision OCR path', 'no text layer'],
      sourceHighlights: ['今日特餐', '乾炒牛河', '凍檸茶'],
      expectedHints: ['Today’s special', 'Beef chow fun', 'Iced lemon tea'],
    },
  ],
  signs: [
    {
      id: 'sign-01-mtr-exit',
      file: 'signs/01-mtr-exit-zh.png',
      direction: 'zh→en',
      scene: 'MTR / mall exit',
      sourceText: ['出口', 'A2', '中環'],
      expectedHints: ['Exit', 'Central'],
    },
    {
      id: 'sign-02-no-entry',
      file: 'signs/02-no-entry-zh.png',
      direction: 'zh→en',
      scene: 'Door placard',
      sourceText: ['不准進入', '職員專用'],
      expectedHints: ['No entry', 'Staff only'],
    },
    {
      id: 'sign-03-wet-floor',
      file: 'signs/03-wet-floor-en.png',
      direction: 'en→zh',
      scene: 'Safety cone style',
      sourceText: ['CAUTION', 'WET FLOOR'],
      expectedHints: ['小心', '地面濕滑'],
    },
    {
      id: 'sign-04-restaurant-board',
      file: 'signs/04-restaurant-board-zh.png',
      direction: 'zh→en',
      scene: 'Cha chaan teng specials board',
      sourceText: ['今日特餐', '乾炒牛河', '凍檸茶', '$48'],
      expectedHints: ['Today’s special', 'Dry-fried beef hor fun', 'Iced lemon tea'],
    },
    {
      id: 'sign-05-opening-hours',
      file: 'signs/05-opening-hours-zh.png',
      direction: 'zh→en',
      scene: 'Shop glass hours',
      sourceText: ['營業時間', '每日 10:00–22:00', '逢星期三休息'],
      expectedHints: ['Business hours', 'Daily', 'Closed on Wednesday'],
    },
    {
      id: 'sign-06-pharmacy',
      file: 'signs/06-pharmacy-en.png',
      direction: 'en→zh',
      scene: 'Pharmacy counter',
      sourceText: ['PRESCRIPTION PICKUP', 'Please take a number', 'Queue here'],
      expectedHints: ['處方取藥', '請抽籌', '請在此排隊'],
    },
    {
      id: 'sign-07-street-bilingual',
      file: 'signs/07-street-bilingual.png',
      direction: 'either — test both',
      scene: 'HK street name plate',
      sourceText: ['德輔道中', 'DES VOEUX ROAD CENTRAL'],
      expectedHints: ['keep both names', 'Des Voeux Road Central'],
    },
    {
      id: 'sign-08-warning-construction',
      file: 'signs/08-construction-zh.png',
      direction: 'zh→en',
      scene: 'Construction site',
      sourceText: ['前方施工', '請改道', '小心車輛'],
      expectedHints: ['Roadwork ahead', 'Detour', 'Watch for vehicles'],
    },
    {
      id: 'sign-09-hotel-lobby',
      file: 'signs/09-hotel-lobby-en.png',
      direction: 'en→zh',
      scene: 'Hotel lobby',
      sourceText: ['Check-in', 'Concierge', 'Luggage storage'],
      expectedHints: ['入住', '禮賓', '行李寄存'],
    },
    {
      id: 'sign-10-dim-sum-menu',
      file: 'signs/10-dim-sum-menu-zh.png',
      direction: 'zh→en',
      scene: 'Dense dim sum checklist',
      sourceText: ['蝦餃', '燒賣', '叉燒包', '腸粉', '流沙包'],
      expectedHints: ['Har gow', 'Siu mai', 'BBQ pork bun', 'Rice noodle roll', 'Lava bun'],
    },
    {
      id: 'sign-11-angled-photo',
      file: 'signs/11-angled-no-smoking-zh.png',
      direction: 'zh→en',
      scene: 'Perspective-warped placard (OCR stress)',
      sourceText: ['嚴禁吸煙', '違者罰款'],
      expectedHints: ['No smoking', 'Fine for violations'],
    },
    {
      id: 'sign-12-low-contrast',
      file: 'signs/12-low-contrast-en.png',
      direction: 'en→zh',
      scene: 'Faded sticker (OCR stress)',
      sourceText: ['Push', 'Pull'],
      expectedHints: ['推', '拉'],
    },
  ],
}

writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(MANIFEST, null, 2))

await writeEnReferenceLetter()
await writeEnMenuPdf()
await writeZhNoticePdf()
await writeMixedTravelPdf()
await writeTxtAndCsv()

// Python: images + docx + scanned pdf source art
const py = join(__dirname, 'generate-cam-accuracy-signs.py')
execFileSync('python3', [py, SIGNS, DOCS], { stdio: 'inherit' })

await writeScannedPdfFromPng(join(SIGNS, '04-restaurant-board-zh.png'), '09-scanned-zh-menu.pdf')

writeFileSync(
  join(OUT, 'SCORECARD.md'),
  `# Cam accuracy scorecard

Use with \`manifest.json\`. Mark each fixture after testing on a signed-in build (Cam uses quota).

| ID | Path | OCR ok? | Translation ok? | Notes |
| --- | --- | --- | --- | --- |
${MANIFEST.documents.map((d) => `| ${d.id} | Documents | | | |`).join('\n')}
${MANIFEST.signs.map((s) => `| ${s.id} | Upload/AR | | | |`).join('\n')}

## Rubric

- **OCR ok:** ≥90% of \`sourceText\` / \`sourceHighlights\` characters recovered (allow Traditional/Simplified variance on CJK).
- **Translation ok:** Meaning matches \`expectedHints\` (colloquial 粵／書面 sign tone as appropriate). Proper nouns may transliterate.
- **Layout (Documents):** Overlay covers the right lines; heading font roughly matches source size; page 2 aligned.

Cloud agents: do **not** burn Azure Vision / DeepSeek on these without Henry’s OK — Henry should run locally.
`,
)

console.log(`[fixtures] wrote ${OUT}`)
