# JyutTranslate — English ↔ Cantonese
# 粤译 — 英语 ↔ 粤语

Live translator PWA with freemium entitlements (Supabase + Stripe on **Vercel**). Optional WordPress package for Bluehost is a secondary deploy path and may lag Vercel features.

即时翻译 PWA，免费增值权益（**Vercel** 上的 Supabase + Stripe）。可选 WordPress／Bluehost 安装包为次要部署路径，功能可能落后于 Vercel。

**Stack / 技术栈：** Azure Speech (`zh-HK` STT/TTS) · Azure Vision (camera OCR) · OpenAI-compatible LLM (colloquial 粤语, e.g. DeepSeek).

**Free for everyone / 人人可用：** Solo text translate, Jyutping, and guest tap-to-play voice. **Free** TTS is metered (hard char cap); **Pro/Max** TTS is unlimited (usage tracked). Live mic requires sign-in and is metered; auto-speak is Pro/Max. **Cam** (AR / Upload / Documents) requires sign-in — see [docs/camera.md](docs/camera.md) and [docs/entitlements.md](docs/entitlements.md).

**人人可用：** 独白文字翻译、粤拼、访客点击朗读。**免费版** TTS 有字数硬上限；**专业版／旗舰版** TTS 无限（仍计数）。实时麦克风须登录并计量；自动朗读属专业版／旗舰版。**相机**（AR／上载／文件）须登录 — 见文档。

**Modes / 模式：** Solo · Conversation · Cam  
独白 · 对话 · 相机  
(Text is folded into Solo / 原「文字」模式已并入独白)

<p>
  <img src="docs/demos/01-landing-dark.png" alt="JyutTranslate landing (dark) / 粤译首页（深色）" width="720" />
</p>

**Design tokens / 设计变量：** [docs/design-system.md](docs/design-system.md) · [docs/brand/index.html](docs/brand/index.html)

**Jyutping / 粤拼：** [LSHK scheme](https://jyutping.org/en/jyutping/) · [docs/jyutping.md](docs/jyutping.md)

**Cam / 相机：** [docs/camera.md](docs/camera.md) — AR · Upload · Documents (EN ↔ written Chinese / PDF & Office)

**UI snapshots / 界面截图：** [docs/demos/](docs/demos/) (regenerate with `npm run docs:screenshots`)

## Apps / 应用

- `apps/web` — React/Vite PWA (marketing + translator)
- `apps/api` — Express proxy for local / Vercel serverless
- `wordpress/yue-translator` — optional Bluehost plugin (may lag Vercel entitlements)

## Quick start (local) / 本地快速开始

```bash
cp apps/api/.env.example apps/api/.env
# Add OPENAI_API_KEY (and optional AZURE_SPEECH_KEY / AZURE_VISION_KEY)
npm install --prefix apps/api
npm install --prefix apps/web
npm run dev:api
npm run dev:web
```

Confirm the API sees your model key (restart `dev:api` after editing `.env`):

```bash
curl -s http://localhost:8787/api/health
```

`"openai": true` / `"demo": false` means the model path is available. Phrase-memory hits return real Cantonese/English **without** a key (`engine: "dictionary"`). Unknown text without a key is prefixed with `（示範）`.

### Live mic / 实时麦克风

```
mic → speak → STT preview → capture ends → one final translate → display
```

No interim machine translations. Details: [docs/testing.md](docs/testing.md).

### Cam / 相机

```
Cam → choose AR | Upload | Documents
AR: fullscreen → shutter → one OCR+translate → overlay
Upload: gallery → draw/detect boxes → Translate
Documents: PDF / Office / text → layout-kept download
```

See [docs/camera.md](docs/camera.md).

### Phone mic on LAN / 局域网手机

Browsers block the mic on `http://192.168.x.x`. With `dev:api` + `dev:web` running:

```bash
npm run dev:tunnel
```

Open the printed `https://….trycloudflare.com` URL on your phone. Full steps: [docs/local-phone-testing.md](docs/local-phone-testing.md).

## Quality checks / 质量检查

```bash
npm run smoke:canto      # dictionary / lexicon / scrub (offline)
npm run test:translate   # EN↔粵 bot — needs servers + may bill model (ask first in Cloud)
```

## Docs / 文档

| Doc | Topic |
| --- | --- |
| [docs/camera.md](docs/camera.md) | Cam AR · Upload · Documents |
| [docs/cam-accuracy-fixtures.md](docs/cam-accuracy-fixtures.md) | Test documents & signs for Cam accuracy |
| [docs/entitlements.md](docs/entitlements.md) | Plans, metering, gates (canonical) |
| [docs/admin.md](docs/admin.md) | Admin panel, Resend, bug reports |
| [docs/design-system.md](docs/design-system.md) | Brand tokens, themes, orbital marketing |
| [docs/testing.md](docs/testing.md) | Smoke / bots |
| [docs/local-phone-testing.md](docs/local-phone-testing.md) | HTTPS tunnel for mic/camera |
| [docs/bluehost-launch.md](docs/bluehost-launch.md) | WordPress / Bluehost (secondary) |
| [AGENTS.md](AGENTS.md) | Cursor Cloud agent notes |

## Checkout / 结账

Stripe Checkout sessions enable **promotion codes** (`allow_promotion_codes`). Create a **Promotion code** (not only a coupon) in the Stripe Dashboard.

## WordPress package / WordPress 安装包

```bash
npm run build:web:wp
```

Upload `wordpress/yue-translator` and follow [docs/bluehost-launch.md](docs/bluehost-launch.md). Prefer Vercel for production when possible — WP entitlements may not include Max / Documents parity.
