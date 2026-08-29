# Camera translation

Sign-in-only mode for AR live overlay and upload-with-boxes translation (English ↔ written Chinese).

相機翻譯：須登入。支援 AR 即時覆蓋與上載畫框（英文 ↔ 書面中文）。

## Paths / 路徑

1. **AR translation** — fullscreen camera; tap the shutter to freeze a still, then OCR + translate once (no continuous polling). Shows the shared translating animation while loading. Each region gets a tight source cover plus a floating translation chip (Google-style); unselected regions stay soft/outlined so dense packing stays distinct, and the selected region gets a full opaque cover. Chips use collision nudging so they don’t clip into each other. Pinch-zoom or mouse-wheel the still. Tap a chip/cover to open its detail sheet. Clear resumes the live preview. X exits to the AR / Upload choice modal.
2. **Upload image** — still photo; draw boxes and/or auto-detect; **Translate** / **Translate all**. Jade/glass overlays stay locked to each OCR/translated word region (not collision-nudged so dense menus stay on-word). **Drawn boxes can be dragged until Translate**; after translation they lock over the source text. Pinch-zoom (mobile), mouse-wheel, or slider; overlay text scales in screen space so it stays crisp. Selectable Results list for every region.
3. **Documents** — translate PDF / DOCX / PPTX / XLSX / TXT with layout kept. Office files rewrite OOXML text in place. PDFs use **hybrid C+B**: extract the text layer when present (C), always rasterize the page as the visual base (B), paint translations at source positions; scanned pages fall back to Azure Vision via `/api/camera/scan`. Uses your Cantonese translate pipeline (not DeepL).

Entry: **Cam** tab → floating modal (AR / Upload / Documents). Guests see sign-in first.

## Languages / 語言

- Latin script → Chinese (Traditional preferred, sign/menu phrasing)
- Chinese (Trad/Simp) → English
- UI toggle: Auto / To English / To 中文

Speech Solo/Conversation remain EN↔粵 only.

## Metering / 計量

| Plan | Camera | Cap | Counted |
| --- | --- | --- | --- |
| Guest | No | — | — |
| Free | Yes | `YUE_FREE_CAMERA_MINUTES` (default 60) hard cap | `cameraSeconds` |
| Pro | Yes | `YUE_PRO_CAMERA_MINUTES` (default 480 = 8 hr) hard cap | `cameraSeconds` |
| Max | Yes | Unlimited | Yes (`cameraUnlimited`) |

Heartbeat: `POST /api/usage/camera-heartbeat` while the AR fullscreen session or upload editor is open. Exit / back flushes seconds.

Analytics: `camera_translate_count` increments on OCR→translate cache misses (`POST /api/camera/scan`).

Apply Supabase migration `004_camera_usage.sql`.

**Mobile upload:** the file picker does **not** use `capture=` — gallery / files open on phones. Use AR for live camera.

## API / 接口

| Endpoint | Gate |
| --- | --- |
| `POST /api/camera/scan` | `allowed.camera` |
| `POST /api/docs/translate` | `allowed.camera` — Office/TXT layout-keep |
| `POST /api/docs/segments` | `allowed.camera` — PDF text-layer batch |
| `POST /api/usage/camera-heartbeat` | `allowed.camera` |

Scan body: `{ image: dataUrl|base64, boxes?: [{x,y,w,h}], target?: 'en'|'zh', ocrOnly?: boolean }`.

Docs translate body: `{ filename, data: dataUrl|base64, from: 'en'|'yue', to: 'en'|'yue' }` (max ~8 MB). PDF is handled in the client hybrid path.

OCR: Azure AI Vision Read when `AZURE_VISION_KEY` + `AZURE_VISION_ENDPOINT` are set. Requires a **Vision or multi-service Cognitive Services** resource — the Speech key alone does not grant OCR access. Without Vision, engine is `demo` (empty OCR — draw boxes manually). Invalid credentials return `visionAuthFailed: true` instead of a 500 error.

## Env / 環境變數

- `YUE_FREE_CAMERA_MINUTES` (default 60)
- `YUE_PRO_CAMERA_MINUTES` (default 480)
- `YUE_FREE_ALLOW_CAMERA` (default 1)
- `AZURE_VISION_KEY` — subscription key from a Vision / multi-service resource (optional for manual box mode)
- `AZURE_VISION_ENDPOINT` — e.g. `https://<resource-name>.cognitiveservices.azure.com` from the Azure portal (recommended). If omitted but key is set, falls back to `https://{AZURE_VISION_REGION|AZURE_SPEECH_REGION}.api.cognitive.microsoft.com`

## Mobile / 手機

Camera needs HTTPS or localhost (same as mic). See `docs/local-phone-testing.md`.
