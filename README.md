# JyutTranslate — English ↔ Cantonese

Live translator PWA with WordPress freemium entitlements for Bluehost launch.

**Stack (launch):** Azure Speech (`zh-HK` STT/TTS) + OpenAI (colloquial 粵語) + WP plugin metering.

**Modes:** Solo · Conversation · Text (+ Jyutping)

<p>
  <img src="docs/demos/01-landing-dark.png" alt="JyutTranslate landing (dark)" width="720" />
</p>

**Design tokens (Bricks matching):** [docs/design-system.md](docs/design-system.md) · visual page [docs/brand/index.html](docs/brand/index.html)

**Jyutping:** [LSHK scheme](https://jyutping.org/en/jyutping/) · in-repo notes [docs/jyutping.md](docs/jyutping.md)

**UI snapshots:** [docs/demos/](docs/demos/)

## Apps

- `apps/web` — React/Vite PWA (Solo, Conversation, Text + Jyutping)
- `apps/api` — Express cloud proxy for local testing
- `wordpress/yue-translator` — Bluehost plugin (REST + entitlements + shortcode)

## Quick start (local)

```bash
cp apps/api/.env.example apps/api/.env
# Add OPENAI_API_KEY (and optional AZURE_SPEECH_KEY) to apps/api/.env
npm install --prefix apps/api
npm install --prefix apps/web
npm run dev:api
npm run dev:web
```

Confirm the API sees your model key (after editing `apps/api/.env`, restart `dev:api`):

```bash
curl -s http://localhost:8787/api/health
```

`"openai": true` / `"demo": false` means the model path is available. Phrase-memory hits still return real Cantonese/English **without** a key (`engine: "dictionary"`). Unknown text without a key is prefixed with `（示範）`.

### Live mic pipeline (final only)

```
mic → speak → STT source preview → capture ends → one final translate → display
```

There are **no interim machine translations**. Details: [docs/testing.md](docs/testing.md).

### Phone / microphone on your LAN

Browsers block the mic on `http://192.168.x.x`. Use a free HTTPS tunnel while `dev:api` + `dev:web` are running:

```bash
npm run dev:tunnel
```

Open the printed `https://….trycloudflare.com` URL on your phone. Full steps: [docs/local-phone-testing.md](docs/local-phone-testing.md).

## Quality checks

```bash
npm run smoke:canto      # dictionary / lexicon / scrub / attestation
npm run test:translate   # EN↔粵 bot: API + Solo/Conversation panes (needs servers)
```

## WordPress package

```bash
npm run build:web:wp
```

Upload `wordpress/yue-translator` and follow [docs/bluehost-launch.md](docs/bluehost-launch.md).

**Hybrid (static marketing + Bricks translator):** [docs/hybrid-bluehost.md](docs/hybrid-bluehost.md)

```bash
npm run build:web:marketing   # → dist-marketing/ for Bluehost folder/subdomain
```

Entitlements: [docs/entitlements.md](docs/entitlements.md).
