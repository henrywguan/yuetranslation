# Cam accuracy scorecard

Use with `manifest.json`. Mark each fixture after testing on a signed-in build (Cam uses quota).

| ID | Path | OCR ok? | Translation ok? | Notes |
| --- | --- | --- | --- | --- |
| 01-en-reference-letter | Documents | | | |
| 02-en-cafe-menu | Documents | | | |
| 03-zh-library-notice | Documents | | | |
| 04-en-zh-travel-tips | Documents | | | |
| 05-en-apartment-notice | Documents | | | |
| 06-zh-shop-hours | Documents | | | |
| 07-en-price-list | Documents | | | |
| 08-en-invoice-docx | Documents | | | |
| 09-scanned-zh-menu | Documents | | | |
| sign-01-mtr-exit | Upload/AR | | | |
| sign-02-no-entry | Upload/AR | | | |
| sign-03-wet-floor | Upload/AR | | | |
| sign-04-restaurant-board | Upload/AR | | | |
| sign-05-opening-hours | Upload/AR | | | |
| sign-06-pharmacy | Upload/AR | | | |
| sign-07-street-bilingual | Upload/AR | | | |
| sign-08-warning-construction | Upload/AR | | | |
| sign-09-hotel-lobby | Upload/AR | | | |
| sign-10-dim-sum-menu | Upload/AR | | | |
| sign-11-angled-photo | Upload/AR | | | |
| sign-12-low-contrast | Upload/AR | | | |

## Rubric

- **OCR ok:** ≥90% of `sourceText` / `sourceHighlights` characters recovered (allow Traditional/Simplified variance on CJK).
- **Translation ok:** Meaning matches `expectedHints` (colloquial 粵／書面 sign tone as appropriate). Proper nouns may transliterate.
- **Layout (Documents):** Overlay covers the right lines; heading font roughly matches source size; page 2 aligned.

Cloud agents: do **not** burn Azure Vision / DeepSeek on these without Henry’s OK — Henry should run locally.
