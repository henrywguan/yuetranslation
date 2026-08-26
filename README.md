# JyutTranslate — English ↔ Cantonese
# 粤译 — 英语 ↔ 粤语

Live translator PWA with freemium entitlements (Supabase + Stripe on Vercel, optional WordPress package for Bluehost).

即时翻译 PWA，免费增值权益（Vercel 上可用 Supabase + Stripe；另有可选 WordPress／Bluehost 安装包）。

**Stack / 技术栈：** Azure Speech (`zh-HK` STT/TTS) + Azure Vision (camera OCR) + OpenAI-compatible LLM (colloquial 粤语, e.g. DeepSeek).

**Free for everyone / 人人可用：** text translate, Jyutping, and guest tap-to-play voice. **Free** TTS is metered (hard char cap); **Pro/Max** TTS is unlimited (usage tracked). Live mic is metered; auto-speak is Pro/Max. Camera translation requires sign-in (Free camera minutes cap).

**人人可用：** 文字翻译、粤拼、访客点击朗读。**免费版** TTS 有字数硬上限；**专业版／旗舰版** TTS 无限（仍计数）。实时麦克风计量；自动朗读属专业版／旗舰版。相机翻译须登录（免费版有相机分钟上限）。

**Modes / 模式：** Solo · Conversation · Text · Cam (+ Jyutping)  
独白 · 对话 · 文字 · 相机（含粤拼）

<p>
  <img src="docs/demos/01-landing-dark.png" alt="JyutTranslate landing (dark) / 粤译首页（深色）" width="720" />
</p>

**Design tokens / 设计变量（对接 Bricks）：** [docs/design-system.md](docs/design-system.md) · visual page [docs/brand/index.html](docs/brand/index.html)

**Jyutping / 粤拼：** [LSHK scheme](https://jyutping.org/en/jyutping/) · in-repo notes [docs/jyutping.md](docs/jyutping.md)

**Camera / 相机：** [docs/camera.md](docs/camera.md) — AR capture + upload boxes (EN ↔ written Chinese)

**UI snapshots / 界面截图：** [docs/demos/](docs/demos/)

## Apps / 应用

- `apps/web` — React/Vite PWA (Solo, Conversation, Text, Cam + Jyutping)  
  React/Vite 渐进式网页应用（独白、对话、文字、相机 + 粤拼）
- `apps/api` — Express cloud proxy for local testing / Vercel serverless  
  Express 云代理，供本地测试／Vercel 无服务器
- `wordpress/yue-translator` — optional Bluehost plugin (REST + entitlements + shortcode)  
  可选 Bluehost 插件（REST、权益计量、短代码）

## Quick start (local) / 本地快速开始

```bash
cp apps/api/.env.example apps/api/.env
# Add OPENAI_API_KEY (and optional AZURE_SPEECH_KEY / AZURE_VISION_KEY) to apps/api/.env
# 在 apps/api/.env 中填写 OPENAI_API_KEY（以及可选的 AZURE_SPEECH_KEY / AZURE_VISION_KEY）
npm install --prefix apps/api
npm install --prefix apps/web
npm run dev:api
npm run dev:web
```

Confirm the API sees your model key (after editing `apps/api/.env`, restart `dev:api`):

编辑 `apps/api/.env` 后请重启 `dev:api`，再确认接口已读到模型密钥：

```bash
curl -s http://localhost:8787/api/health
```

`"openai": true` / `"demo": false` means the model path is available. Phrase-memory hits still return real Cantonese/English **without** a key (`engine: "dictionary"`). Unknown text without a key is prefixed with `（示範）`.

`"openai": true` / `"demo": false` 表示模型通路可用。短语记忆命中时**无需密钥**也会返回真实粤语/英语（`engine: "dictionary"`）。无密钥且未命中时，结果会加上 `（示範）` 前缀。

### Live mic pipeline (final only) / 实时麦克风流程（仅终稿）

```
mic → speak → STT source preview → capture ends → one final translate → display
麦克风 → 说话 → 语音识别原文预览 → 采集结束 → 一次终稿翻译 → 显示
```

There are **no interim machine translations**. Details: [docs/testing.md](docs/testing.md).

**没有**中间过程的机器翻译。详见 [docs/testing.md](docs/testing.md)。

### Camera AR (capture) / 相机 AR（拍摄）

```
Cam → AR → fullscreen preview → shutter → one OCR+translate → overlay → tap for details
相机 → AR → 全屏预览 → 快门 → 一次 OCR＋翻译 → 覆盖层 → 轻按查看详情
```

Upload image opens the gallery/files picker (not forced camera). See [docs/camera.md](docs/camera.md).

上载相片会打开相册／文件选择器（不会强制打开相机）。见 [docs/camera.md](docs/camera.md)。

### Phone / microphone on your LAN / 局域网手机麦克风

Browsers block the mic on `http://192.168.x.x`. Use a free HTTPS tunnel while `dev:api` + `dev:web` are running:

浏览器会拦截 `http://192.168.x.x` 上的麦克风。请在 `dev:api` 与 `dev:web` 运行时使用免费 HTTPS 隧道：

```bash
npm run dev:tunnel
```

Open the printed `https://….trycloudflare.com` URL on your phone. Full steps: [docs/local-phone-testing.md](docs/local-phone-testing.md).

在手机上打开终端打印的 `https://….trycloudflare.com` 地址。完整步骤见 [docs/local-phone-testing.md](docs/local-phone-testing.md)。

## Quality checks / 质量检查

```bash
npm run smoke:canto      # dictionary / lexicon / scrub / attestation
                         # 词典 / 词库 / 书面语清洗 / 词条核验
npm run test:translate   # EN↔粵 bot: API + Solo/Conversation panes (needs servers)
                         # 英↔粤测试机器人：接口 + 独白/对话面板（需本地服务）
```

## Docs / 文档

| Doc | Topic |
| --- | --- |
| [docs/camera.md](docs/camera.md) | Camera AR + upload |
| [docs/entitlements.md](docs/entitlements.md) | Plans, metering, gates |
| [docs/admin.md](docs/admin.md) | Admin panel |
| [docs/testing.md](docs/testing.md) | Smoke / bots |
| [docs/local-phone-testing.md](docs/local-phone-testing.md) | HTTPS tunnel for mic/camera |
| [docs/bluehost-launch.md](docs/bluehost-launch.md) | WordPress / Bluehost package |
| [docs/hybrid-bluehost.md](docs/hybrid-bluehost.md) | Static marketing + WP embed |
| [AGENTS.md](AGENTS.md) | Cursor Cloud agent notes |

## WordPress package / WordPress 安装包

```bash
npm run build:web:wp
```

Upload `wordpress/yue-translator` and follow [docs/bluehost-launch.md](docs/bluehost-launch.md) (plugin + hybrid static marketing / Bricks).

上传 `wordpress/yue-translator`，并按 [docs/bluehost-launch.md](docs/bluehost-launch.md) 操作（插件 + 静态营销站 / Bricks 混合部署）。
