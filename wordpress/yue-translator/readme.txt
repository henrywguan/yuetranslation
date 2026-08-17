=== JyutTranslate ===
Contributors: yue
Requires at least: 6.0
Tested up to: 6.7
Requires PHP: 8.0
Stable tag: 2.0.0
License: GPLv2 or later

English ↔ Cantonese live translator PWA with freemium entitlements (Azure Speech + OpenAI).
英语 ↔ 粤语即时翻译 PWA，含免费增值权益（Azure Speech + OpenAI）。

== Description ==

Shortcodes / 短代码:
- `[yue_translator]` — phone-sized translator (`?view=app`) / 手机尺寸翻译器
- `[yue_splash]` — full-bleed marketing landing (optional if marketing is hosted as static files) / 通栏营销首页（若营销站已是静态文件则可省略）

Hybrid static marketing + Bricks: see repo docs/bluehost-launch.md (`site-config.json` links CTAs to your translator page).

静态营销站 + Bricks：见仓库 docs/bluehost-launch.md（用 `site-config.json` 把按钮链到翻译页）。

Settings → JyutTranslate for Azure/OpenAI keys and plan limits.
Build the app with `npm run build:web:wp` before uploading.

设置 → JyutTranslate 填写 Azure/OpenAI 密钥与套餐限额。
上传前请先运行 `npm run build:web:wp` 构建应用。

== Installation ==

1. Run `npm run build:web:wp` from the Yue monorepo. / 在粤译仓库根目录运行 `npm run build:web:wp`。
2. Upload the `yue-translator` folder to `/wp-content/plugins/`. / 将 `yue-translator` 文件夹上传到 `/wp-content/plugins/`。
3. Activate and configure API keys (set Upgrade URL to your checkout page). / 启用并配置密钥（将 Upgrade URL 设为结账页）。
4. Place `[yue_translator]` on a Bricks/WP translator page. / 在 Bricks/WordPress 翻译页放入 `[yue_translator]`。
5. Optionally host `npm run build:web:marketing` output as static files and edit `site-config.json`. / 可选：把 `npm run build:web:marketing` 产物作为静态文件托管，并编辑 `site-config.json`。
