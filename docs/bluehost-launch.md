# Yue — Bluehost launch guide

Launchable freemium product: **WordPress plugin hosts the PWA**; **Azure Speech** (zh-HK STT/TTS) and **OpenAI** (colloquial 粵語 MT) run via plugin REST proxies.

## What Bluehost hosts

| Layer | Where |
| --- | --- |
| UI / PWA | `wordpress/yue-translator/app/` (built assets) |
| Entitlements + usage | Plugin PHP (`Yue_Entitlements`, `Yue_Usage`) |
| Speech token + TTS | Plugin → Azure |
| Translate | Plugin → OpenAI |

Shared hosting does **not** run FunASR/Ollama/Piper. Keep those for a later self-hosted tier.

## Install

1. Build the embeddable app:

```bash
npm run build:web:wp
```

2. Upload `wordpress/yue-translator/` to `wp-content/plugins/yue-translator/`.
3. Activate **Yue Translator**.
4. Settings → Yue Translator: paste Azure Speech key/region and OpenAI key.
5. Set **Upgrade URL** to your pricing / MemberPress checkout page.
6. Add shortcodes:
   - `[yue_translator]` — translator (forces `view=app` in a phone-sized iframe)
   - `[yue_splash]` — marketing landing (full-bleed iframe)

## Entitlement model

| Plan | Live mic | TTS / auto-speak | Text + Jyutping |
| --- | --- | --- | --- |
| Guest (login required) | Blocked | Blocked | Allowed |
| Free | ~20 min/mo (configurable) | Off by default | Allowed |
| Pro | ~600 min/mo | On | Allowed |

### Runtime checks

1. App loads `GET /wp-json/yue/v1/health` → entitlement snapshot.
2. **Start listening** calls `GET /speech-token` → `assert_can_live()`.
3. While live, `POST /usage/heartbeat` every 15s meters seconds; UI stops when `allowed.live` becomes false.
4. Auto-speak calls `POST /tts` → `assert_can_tts()`.
5. Text mode uses `POST /translate` (not gated by live minutes).

### Plan resolution order

1. Filter `yue_user_plan`
2. Capability `yue_pro` (admins also count as pro unless meta/filter overrides)
3. User meta `yue_plan` = `free` | `pro`
4. Default `free` / `guest`

MemberPress / WooMemberships example:

```php
add_filter('yue_user_plan', function ($plan, $user_id) {
    if (function_exists('mepr_user_has_active_membership') && mepr_user_has_active_membership($user_id)) {
        return 'pro';
    }
    return $plan;
}, 10, 2);
```

Or set user meta in wp-admin (Users → Profile → Yue Translator plan).

## Cookie auth in the iframe

The shortcode passes `api=` and `nonce=` (WP REST nonce). The PWA sends `credentials: 'include'` and `X-WP-Nonce` so logged-in users resolve correctly inside the embed.

## Local cloud testing (no WordPress)

```bash
cp apps/api/.env.example apps/api/.env
# add keys; YUE_OPEN_MODE=1 for unrestricted local use
npm run dev:api
npm run dev:web
```

Open `http://localhost:5173` — Vite proxies `/api` to the Express server.

## Suggested free → paid UX

- Free: try live for a short monthly allowance; show Jyutping always.
- Gate TTS + higher minutes behind Pro.
- Upgrade chip / banner links to your checkout URL.
