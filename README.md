# JyutTranslate — English ↔ Cantonese

Face-to-face live translator PWA with WordPress freemium entitlements for Bluehost launch.

**Stack (launch):** Azure Speech (`zh-HK` STT/TTS) + OpenAI (colloquial 粵語) + WP plugin metering.

**Design tokens (Bricks matching):** [docs/design-system.md](docs/design-system.md) · visual page [docs/brand/index.html](docs/brand/index.html)

**Jyutping:** [LSHK scheme](https://jyutping.org/en/jyutping/) · in-repo notes [docs/jyutping.md](docs/jyutping.md)

## Apps

- `apps/web` — React/Vite PWA (solo, face-to-face, text + Jyutping)
- `apps/api` — Express cloud proxy for local testing
- `wordpress/yue-translator` — Bluehost plugin (REST + entitlements + shortcode)

## Quick start (local)

```bash
cp apps/api/.env.example apps/api/.env
npm install --prefix apps/api
npm install --prefix apps/web
npm run dev:api
npm run dev:web
```

Confirm the API sees your model key (after editing `apps/api/.env`, restart `dev:api`):

```bash
curl -s http://localhost:8787/api/health
```

`"openai": true` / `"demo": false` means real translation. `"demo": true` means keys were not loaded — results will be prefixed with `（示範）`.

### Phone / microphone on your LAN

Browsers block the mic on `http://192.168.x.x`. Use a free HTTPS tunnel while `dev:api` + `dev:web` are running:

```bash
npm run dev:tunnel
```

Open the printed `https://….trycloudflare.com` URL on your phone. Full steps: [docs/local-phone-testing.md](docs/local-phone-testing.md).

## WordPress package

```bash
npm run build:web:wp
```

Upload `wordpress/yue-translator` and follow [docs/bluehost-launch.md](docs/bluehost-launch.md).

**Hybrid (static marketing + Bricks translator):** [docs/hybrid-bluehost.md](docs/hybrid-bluehost.md)

```bash
npm run build:web:marketing   # → dist-marketing/ for Bluehost folder/subdomain
```

Entitlement design: [docs/entitlements.md](docs/entitlements.md).
