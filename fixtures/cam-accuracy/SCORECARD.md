# Cam accuracy scorecard

Use with `manifest.json`. Mark each fixture after testing on a signed-in build (Cam uses quota).

Harness: `node scripts/run-cam-accuracy-pass.mjs [1|2]` → `fixtures/cam-accuracy/results/`.

| ID | Path | OCR ok? | Translation ok? | Notes |
| --- | --- | --- | --- | --- |
| 01-en-reference-letter | Documents | n/a (text layer) | Pass 2: 2/3 → fix written-語 | Pass 1 null extract; Helvetica regen |
| 02-en-cafe-menu | Documents | n/a | Pass 2: 3/3 | |
| 03-zh-library-notice | Documents | n/a | Pass 2: 4/4 | |
| 04-en-zh-travel-tips | Documents | n/a | Pass 2: 3/3 | |
| 05-en-apartment-notice | Documents | n/a | Pass 2: 2/2 | |
| 06-zh-shop-hours | Documents | n/a | Pass 2: 1/3 (Opening Hours ok) | Hints relaxed for Mon–Fri |
| 07-en-price-list | Documents | n/a | Pass 2: 2/2 | |
| 08-en-invoice-docx | Documents | n/a | Pass 2: 3/3 | |
| 09-scanned-zh-menu | Documents | SKIP Vision | Pass 2 MT-only 3/3 | Needs Azure Vision for OCR |
| sign-01-mtr-exit | Upload/AR | SKIP Vision | Pass 2: 2/2 | MT via docs/segments |
| sign-02-no-entry | Upload/AR | SKIP Vision | Pass 2: 2/2 | |
| sign-03-wet-floor | Upload/AR | SKIP Vision | Pass 2: 2/2 | |
| sign-04-restaurant-board | Upload/AR | SKIP Vision | Pass 2: 3/3 | |
| sign-05-opening-hours | Upload/AR | SKIP Vision | Pass 2: 3/3 | |
| sign-06-pharmacy | Upload/AR | SKIP Vision | Pass 2: 3/3 | |
| sign-07-street-bilingual | Upload/AR | SKIP Vision | Pass 2: 2/2 | |
| sign-08-warning-construction | Upload/AR | SKIP Vision | Pass 2: 1/3 | Construction ahead / Mind the vehicle |
| sign-09-hotel-lobby | Upload/AR | SKIP Vision | Pass 2: 3/3 | Check-in → 入住登記 |
| sign-10-dim-sum-menu | Upload/AR | SKIP Vision | Pass 2: 4/5 | Case-insensitive score fix |
| sign-11-angled-photo | Upload/AR | SKIP Vision | Pass 2: 2/2 | |
| sign-12-low-contrast | Upload/AR | SKIP Vision | Pass 2: 2/2 | |

## Cloud pass summaries

| Pass | mt-hint-miss | vision-missing | Notes |
| --- | --- | --- | --- |
| 1 | 15 | 13 | Solo `/api/translate` for signs; EN PDF nulls; Vision off |
| 2 | 4 | 13 | Cam segments + prompts; remaining scorecard/register issues |
| 2b spot | 0 | — | Docs always 書面語; case-insensitive hints; 4/4 prior misses cleared |
| 3 (Vision) | — | 10 OCR + rate-limits | Endpoint was regional; resource URL required |
| 3b (Vision paced) | 0 | 0 | All 12 signs + scanned menu OCR+MT; 429 retries |

## Rubric

- **OCR ok:** ≥90% of `sourceText` / `sourceHighlights` characters recovered (allow Traditional/Simplified variance on CJK).
- **Translation ok:** Meaning matches `expectedHints` (書面 for Documents/signs). Proper nouns may transliterate. Alternatives in hints are OR’d (`／`).
- **Layout (Documents):** Overlay covers the right lines; heading font roughly matches source size; page 2 aligned.

Cloud agents: burn DeepSeek/Azure Vision only when Henry explicitly allows that run.
