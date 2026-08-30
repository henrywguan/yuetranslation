# JyutTranslate web app / 粤译网页应用

React + Vite PWA for the marketing site and translator UI. Run from the **repo root**.

| Command | Result |
| --- | --- |
| `npm run dev:web` | [http://localhost:5173](http://localhost:5173) |
| `?view=app` / `#/app` | Translator |
| `npm run build:web:wp` | WordPress plugin assets |
| `npm run build:web:marketing` | Static marketing build |

See the [root README](../../README.md) for API keys, phone testing, and quality bots.

## Modes / 模式

| Mode | Store id | Notes |
| --- | --- | --- |
| Solo | `solo` | Type or speak — EN↔粵 (legacy `text` remaps here) |
| Conversation | `conversation` | Two cards; 粵 pane rotated 180° |
| Cam | `camera` | AR · Upload · Documents — [docs/camera.md](../../docs/camera.md) |

**Guests:** Solo text + tap-to-play TTS. Live mic and Cam require sign-in — [docs/entitlements.md](../../docs/entitlements.md).

Live mic translates **once after capture ends**. Camera OCR runs **once per shutter** (no continuous polling).
