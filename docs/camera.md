# Camera translation

Sign-in-only mode for AR live overlay and upload-with-boxes translation (English ↔ written Chinese).

相機翻譯：須登入。支援 AR 即時覆蓋與上載畫框（英文 ↔ 書面中文）。

## Paths / 路徑

1. **AR translation** — fullscreen camera; tap the shutter to OCR + translate once (no continuous polling). Overlays track camera motion locally. Tap a result for details. Clear resets overlays. X exits to the AR / Upload choice modal.
2. **Upload image** — still photo; draw / resize / delete boxes; auto-detect optional; translate crops.

Entry: **Cam** tab → floating modal (AR vs Upload). Guests see sign-in first.

## Languages / 語言

- Latin script → Chinese (Traditional preferred, sign/menu phrasing)
- Chinese (Trad/Simp) → English
- UI toggle: Auto / To English / To 中文

Speech Solo/Conversation remain EN↔粵 only.

## Metering / 計量

| Plan | Camera | Cap | Counted |
| --- | --- | --- | --- |
| Guest | No | — | — |
| Free | Yes | `YUE_FREE_CAMERA_MINUTES` (default 5) hard cap | `cameraSeconds` |
| Pro / Max | Yes | Unlimited | Yes (`cameraUnlimited`) |

Heartbeat: `POST /api/usage/camera-heartbeat` while AR scanning or upload editor is active. Pause/back flushes seconds.

Analytics: `camera_translate_count` increments on OCR→translate cache misses (`POST /api/camera/scan`).

Apply Supabase migration `004_camera_usage.sql`.

## API / 接口

| Endpoint | Gate |
| --- | --- |
| `POST /api/camera/scan` | `allowed.camera` |
| `POST /api/usage/camera-heartbeat` | `allowed.camera` |

Scan body: `{ image: dataUrl|base64, boxes?: [{x,y,w,h}], target?: 'en'|'zh', ocrOnly?: boolean }`.

OCR: Azure Vision Read when `AZURE_VISION_KEY` + endpoint (or speech key/region fallback). Without Vision, engine is `demo` (empty OCR — draw boxes manually).

## Env / 環境變數

- `YUE_FREE_CAMERA_MINUTES` (default 5)
- `YUE_FREE_ALLOW_CAMERA` (default 1)
- `AZURE_VISION_KEY` (optional; falls back to `AZURE_SPEECH_KEY`)
- `AZURE_VISION_ENDPOINT` (optional; falls back to `https://{AZURE_SPEECH_REGION}.api.cognitive.microsoft.com`)

## Mobile / 手機

Camera needs HTTPS or localhost (same as mic). See `docs/local-phone-testing.md`.
