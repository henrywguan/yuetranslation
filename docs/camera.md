# Camera translation

Sign-in-only mode for **AR**, **Upload**, and **Documents** (English ↔ written Chinese).

相機翻譯：須登入。支援 **AR**、**上載**、**文件**（英文 ↔ 書面中文）。

## Paths / 路徑

1. **AR translation** — fullscreen camera; tap the shutter to freeze a still, then OCR + translate once (no continuous polling). Shows the shared translating animation while loading. Each region gets a tight source cover plus a floating translation chip; unselected regions stay soft/outlined. Pinch-zoom or mouse-wheel the still. Tap a chip/cover for details. Clear resumes preview. X exits to the choice modal.
2. **Upload image** — still photo; draw boxes and/or auto-detect; **Translate** / **Translate all**. Overlays stay locked to each OCR/translated region. Drawn boxes can be moved until Translate; after translation they lock. Pinch-zoom / wheel / slider; selectable Results list.
3. **Documents** — PDF / DOCX / PPTX / XLSX / TXT with layout kept. Office files rewrite OOXML in place. PDFs: extract text layer when present, always rasterize the page, paint translations at source positions (font size tracks the source line); scanned pages use Azure Vision via `/api/camera/scan`. Uses the Cantonese translate pipeline (not DeepL).

Entry: **Cam** tab → choice modal. Guests see sign-in first.

## Languages / 語言

- Latin script → Chinese (Traditional preferred, sign/menu phrasing)
- Chinese (Trad/Simp) → English
- UI toggle: Auto / To English / To 中文

Speech Solo/Conversation remain EN↔粵 only.

## Metering / 計量

### Camera (AR + Upload)

| Plan | Camera | Cap | Counted |
| --- | --- | --- | --- |
| Guest | No | — | — |
| Free | Yes | `YUE_FREE_CAMERA_MINUTES` (default 60) | `cameraSeconds` |
| Pro | Yes | `YUE_PRO_CAMERA_MINUTES` (default 480 = 8 hr) | `cameraSeconds` |
| Max | Yes | Unlimited | Yes (`cameraUnlimited`) |

Heartbeat: `POST /api/usage/camera-heartbeat` while AR fullscreen or upload editor is open.

Analytics: `camera_translate_count` on OCR→translate cache misses — **not** when `forDocs: true`.

Migration: `004_camera_usage.sql`.

### Documents (separate meter)

Same **access gate** as camera; **not** shared with camera minutes. Canonical numbers: [entitlements.md](./entitlements.md).

| Plan | Documents | Cap | Counted |
| --- | --- | --- | --- |
| Guest | No | — | — |
| Free | Yes | `YUE_FREE_DOCS_PAGES` (default 40) | `docs_pages` |
| Pro | Yes | `YUE_PRO_DOCS_PAGES` (default 400) | `docs_pages` |
| Max | Yes | Unlimited | Yes (`docsUnlimited`) |

Billing:

- **Success only** — failed / abandoned jobs are not billed.
- Office/TXT: bill after `POST /api/docs/translate` succeeds.
- PDF: bill via `POST /api/docs/commit` after the full client job succeeds. Mid-job `/docs/segments` and `/camera/scan?forDocs` do **not** increment docs or camera translate meters.
- Migration: `008_docs_pages.sql`.

**Mobile upload:** file picker does **not** use `capture=` — gallery / files open on phones. Use AR for live camera.

## API / 接口

| Endpoint | Gate |
| --- | --- |
| `POST /api/camera/scan` | `allowed.camera` (or `allowed.docs` when `forDocs: true`) |
| `POST /api/docs/translate` | `allowed.docs` — Office/TXT; bills pages on success |
| `POST /api/docs/segments` | `allowed.docs` — PDF text batch; no page bill |
| `POST /api/docs/commit` | signed-in docs — bill PDF pages after success |
| `POST /api/usage/camera-heartbeat` | `allowed.camera` |

Scan body: `{ image, boxes?, target?: 'en'|'zh', ocrOnly?, forDocs? }`.

Docs translate body: `{ filename, data, from: 'en'|'yue', to: 'en'|'yue' }` (max ~8 MB). PDF is client hybrid; commit with `{ pages }`.

OCR: Azure AI Vision Read when `AZURE_VISION_KEY` + `AZURE_VISION_ENDPOINT` are set (Vision or multi-service resource — Speech key alone is not enough). Without Vision, engine is `demo`. Invalid credentials return `visionAuthFailed: true`.

## Env / 環境變數

- `YUE_FREE_CAMERA_MINUTES` (default 60)
- `YUE_PRO_CAMERA_MINUTES` (default 480)
- `YUE_FREE_ALLOW_CAMERA` (default 1) — also gates documents
- `YUE_FREE_DOCS_PAGES` (default 40)
- `YUE_PRO_DOCS_PAGES` (default 400)
- `AZURE_VISION_KEY` / `AZURE_VISION_ENDPOINT`

## Accuracy fixtures / 準確度測試素材

Offline documents + sign images: [cam-accuracy-fixtures.md](./cam-accuracy-fixtures.md) · `fixtures/cam-accuracy/`.
