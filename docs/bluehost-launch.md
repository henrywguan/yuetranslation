# JyutTranslate — Bluehost launch guide

Freemium launch: **WordPress plugin hosts the PWA**; **Azure Speech** (`zh-HK` STT/TTS) and **OpenAI** (colloquial 粵語) run through plugin REST.

Shared hosting does not run a local STT / MT / TTS stack — keys live in the plugin settings.

## What Bluehost hosts

| Layer | Where |
| --- | --- |
| UI / PWA | `wordpress/yue-translator/app/` (built assets) |
| Entitlements + usage | Plugin PHP (`Yue_Entitlements`, `Yue_Usage`) |
| Speech token + TTS | Plugin → Azure |
| Translate | Plugin → OpenAI (no local phrase/lexicon harden — keep an OpenAI key in production) |

Plan snapshot and gate table: [entitlements.md](./entitlements.md).

## Install

```bash
npm run build:web:wp
```

1. Upload `wordpress/yue-translator/` to `wp-content/plugins/yue-translator/`.
2. Activate **JyutTranslate**.
3. Settings → JyutTranslate: Azure Speech key/region + OpenAI key.
4. Set **Upgrade URL** to your pricing / MemberPress checkout page.
5. Shortcodes:
   - `[yue_translator]` — translator (`view=app` in a phone-sized iframe)
   - `[yue_splash]` — marketing landing (optional if marketing is static files)

The shortcode passes `api=` and `nonce=` (WP REST nonce). The PWA sends `credentials: 'include'` and `X-WP-Nonce`.

## Hybrid marketing + Bricks translator

Recommended: **static marketing files** for the brand site, and a **Bricks (or WP) page** with `[yue_translator]`.

```bash
npm run build:web:marketing   # → dist-marketing/
npm run build:web:wp          # → wordpress/yue-translator/app/
```

Copy `dist-marketing/` onto Bluehost (subdirectory or subdomain). Do **not** overwrite WordPress’s root `index.php`.

Edit `site-config.json` next to that `index.html` (no rebuild):

```json
{
  "translatorUrl": "https://yoursite.com/translate",
  "pricingUrl": "https://yoursite.com/pricing",
  "marketingUrl": "https://yoursite.com/welcome/"
}
```

Leave a field empty to keep in-app hash routes (`#/app`, `#/pricing`) — useful for local `npm run dev:web`. Query params `?translator=` / `?pricing=` override for testing.

Create a Bricks page (e.g. `/translate`) and place `[yue_translator]`. Match **Upgrade URL** to `pricingUrl`.

| Piece | When to refresh |
| --- | --- |
| Static marketing folder | Landing redesign → `build:web:marketing` and re-upload |
| Plugin `app/` | Translator UI changes → `build:web:wp` and re-upload plugin |
| `site-config.json` | URL changes on the static host |

## Entitlement model

| Plan | Live mic | TTS / auto-speak | Text + Jyutping |
| --- | --- | --- | --- |
| Guest (login required) | Blocked | Blocked | Allowed |
| Free | ~20 min/mo (configurable) | Off by default | Allowed |
| Pro | ~600 min/mo | On | Allowed |

Runtime: health snapshot → `GET /speech-token` for live → heartbeat every 15s → `POST /tts` for auto-speak. Text mode uses `POST /translate` (not gated by live minutes).

Plan resolution: capability `yue_pro` → user meta `yue_plan` → filter `yue_user_plan` → default `free` / `guest`.

```php
add_filter('yue_user_plan', function ($plan, $user_id) {
    if (function_exists('mepr_user_has_active_membership') && mepr_user_has_active_membership($user_id)) {
        return 'pro';
    }
    return $plan;
}, 10, 2);
```

## Local cloud testing (no WordPress)

```bash
cp apps/api/.env.example apps/api/.env
# add keys; YUE_OPEN_MODE=1 for unrestricted local use
npm run dev:api
npm run dev:web
```

Open `http://localhost:5173` — Vite proxies `/api` to Express. Phone mic needs HTTPS: [local-phone-testing.md](./local-phone-testing.md).
