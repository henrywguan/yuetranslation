# Agent notes

## Cursor Cloud specific instructions

### Paid / external API usage (cloud testing only)

This rule applies **only to Cursor Cloud agent testing** in this remote environment. It does **not** restrict Henry’s own local laptop/phone use of DeepSeek or Azure.

Henry’s DeepSeek (`OPENAI_*` / `OPENAI_BASE_URL`) and Azure Speech keys are metered. Cloud agents must **not** burn that quota on automated testing.

**Do not** call DeepSeek, Azure Speech, or any other paid/external inference/STT/TTS provider from the cloud agent unless Henry has **explicitly allowed that specific request** in the current turn.

Before each outbound cloud-agent call that would use those keys (including `curl` to `/api/translate` when it would miss phrase/lexicon and hit the model, `/api/tts`, `/api/speech-token`, live mic STT, quality-bot cases that require OpenAI, etc.):

1. Ask Henry for confirmation
2. Name the exact endpoint / action and why
3. Wait for a clear yes for **that** request
4. Do not batch “blanket forever” permission — ask again for the next call

Allowed without asking (cloud):

- `/api/health` (readiness only)
- Offline `npm run smoke:canto`
- Dictionary/lexicon-only checks that cannot reach the model
- Local Vite / Express process management
- Lint / `tsc`

If unsure whether a cloud command would bill DeepSeek or Azure — **ask first**.

### Dev servers (fixed ports)

Use the environment terminals (or these exact commands). **Do not** start extra Vite/API copies — that creates ports 5174/5175/… and wastes hours debugging the wrong server.

| Service | URL | Command |
| --- | --- | --- |
| Web (Vite) | http://localhost:5173 | `npm run dev --prefix apps/web -- --host 0.0.0.0 --port 5173` |
| API | http://localhost:8787 | `npm run dev:api` (defaults to port 8787) |

Smoke without a browser (offline / no paid APIs):

```bash
curl -s http://localhost:8787/api/health
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5173/
npm run smoke:canto
```

Do **not** run `npm run test:translate`, `npm run test:translate:live`, or any live translate/STT/TTS that can hit DeepSeek/Azure unless Henry approved that run.

In DEV, `window.__yueStore` is exposed for seeding UI state from the console.

### Walkthrough artifacts (screenshots / demo videos)

Henry runs a local copy of this repo and refreshes the browser himself.

**Do not** take screenshots, record demo videos, or upload walkthrough UI artifacts for routine UI/UX or code changes unless he explicitly asks for them.

Prefer:

- Push the branch / update the PR efficiently
- Rely on lint/typecheck and offline `smoke:canto`
- Brief confirmation of what changed so he can refresh locally

Exception: only capture screenshots/videos when he specifically requests visual proof, or when a bug cannot be verified any other way and he has asked for help debugging it. For docs screenshots: `npm run docs:screenshots`.

Computer-use / GUI screenshots are especially slow in this Cloud VM (software WebGL). Prefer terminal checks unless visuals were requested.

### Environment bootstrap

- Install: `./scripts/cloud-agent-install.sh` (`npm ci` for web + api, icons)
- Start: `./scripts/cloud-agent-start.sh` (frees stale 5173/8787 only)
- Config: `.cursor/environment.json`

### Phone mic testing (Henry’s machine)

For microphone on a real phone, use the free Cloudflare quick tunnel — see [docs/local-phone-testing.md](docs/local-phone-testing.md) and `npm run dev:tunnel`. Do not expect mic to work on `http://192.168.x.x`.

Live STT on phone is most reliable with `AZURE_SPEECH_KEY` (+ region) in `apps/api/.env`. Without it, iOS falls back to Web Speech, which must start inside the tap gesture and is flaky. Restart `dev:api` after changing speech env vars; open the app over the HTTPS tunnel and allow mic when prompted. Cloud agents must still get Henry’s OK before triggering Azure STT/TTS **from this cloud testing environment** (local use is unrestricted).
