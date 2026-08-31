# Cam accuracy fixtures

Synthetic **documents** and **real-life signs** for scoring JyutTranslate Cam (AR / Upload / Documents). Assets are generated offline — they do **not** call DeepSeek or Azure.

## Quick start

```bash
# Regenerate (optional — committed outputs live under fixtures/cam-accuracy/)
npm run fixtures:cam-accuracy

# Then on a signed-in local build:
# 1) Cam → Documents → upload fixtures/cam-accuracy/documents/*
# 2) Cam → Upload → open fixtures/cam-accuracy/signs/*.png → Auto-detect → Translate
# 3) Optional AR: full-screen a sign PNG on another device / print it → Cam → AR → shutter
```

Score with [`fixtures/cam-accuracy/SCORECARD.md`](../fixtures/cam-accuracy/SCORECARD.md) and [`manifest.json`](../fixtures/cam-accuracy/manifest.json).

Cloud agents must **not** burn Vision/MT quota on these without Henry’s OK — see `AGENTS.md`.

## What’s in the set

### Documents (`fixtures/cam-accuracy/documents/`)

| File | Stresses |
| --- | --- |
| `01-en-reference-letter.pdf` | Multi-page formal letter, heading size, proper nouns |
| `02-en-cafe-menu.pdf` | Short menu lines + prices |
| `03-zh-library-notice.pdf` | CJK text-layer notice → English |
| `04-en-zh-travel-tips.pdf` | Mixed bilingual page |
| `05-en-apartment-notice.txt` | Plain building notice |
| `06-zh-shop-hours.txt` | Hours / full-width punctuation |
| `07-en-price-list.csv` | Tabular CSV |
| `08-en-invoice.docx` | Office layout-keep |
| `09-scanned-zh-menu.pdf` | Image-only PDF (Vision OCR path, no text layer) |

### Signs (`fixtures/cam-accuracy/signs/`)

MTR exit, staff-only, wet floor, cha chaan teng board, shop hours, pharmacy queue, bilingual street plate, construction, hotel lobby, dim-sum checklist, **angled** no-smoking (perspective), **low-contrast** Push/Pull.

## Rubric

- **OCR:** Recover ≥90% of `sourceText` / `sourceHighlights` in the manifest (Trad/Simp variance OK).
- **Translation:** Meaning matches `expectedHints` (colloquial / sign tone). Proper nouns may transliterate.
- **Documents layout:** Overlay on the correct lines; headings roughly match source size; page 2 aligned.

## Regenerating

```bash
npm run fixtures:cam-accuracy
```

Scripts: `scripts/generate-cam-accuracy-fixtures.mjs` + `scripts/generate-cam-accuracy-signs.py`. Requires system CJK fonts (Droid Sans Fallback / Noto Sans HK) and `@pdf-lib/fontkit` (root `devDependency`).
