=== JyutTranslate ===
Contributors: yue
Requires at least: 6.0
Tested up to: 6.7
Requires PHP: 8.0
Stable tag: 2.0.0
License: GPLv2 or later

English ↔ Cantonese live translator PWA with freemium entitlements (Azure Speech + Vision + OpenAI).

== Description ==

Shortcodes:
- `[yue_translator]` — phone-sized translator (`?view=app`)
- `[yue_splash]` — full-bleed marketing landing (optional if marketing is hosted as static files)

Modes: Solo, Conversation, Cam (AR · Upload · Documents).

Hybrid static marketing + Bricks: see repo docs/bluehost-launch.md (`site-config.json` links CTAs to your translator page).

Settings → JyutTranslate for Azure/OpenAI keys and plan limits.
Build the app with `npm run build:web:wp` before uploading.

== Installation ==

1. Run `npm run build:web:wp` from the JyutTranslate monorepo.
2. Upload the `yue-translator` folder to `/wp-content/plugins/`.
3. Activate and configure API keys (set Upgrade URL to your checkout page).
4. Place `[yue_translator]` on a Bricks/WP translator page.
5. Optionally host `npm run build:web:marketing` output as static files and edit `site-config.json`.
