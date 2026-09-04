# Agent notes

## Product & design goals

Henry’s bar for JyutTranslate UX: **fluid, dynamic, modern, interactive, responsive, luxury**.

Before shipping a change that **reduces** live feedback, motion, immediacy, or polish (e.g. hiding interim STT, removing animations, deferring UI until a slow path completes, static placeholders where real-time state exists), **stop and flag the tradeoff** for Henry. Wait for his confirmation before implementing.

**Do flag** when a proposal favors austerity, latency hacks, or “lean pipeline” over feel — especially voice, translation, and mic flows.

**Do not flag** obvious engineering necessities (security, billing, crash fixes, env limits) unless they also materially hurt the goals above.

**Example:** Interim **machine translation** during speech wastes tokens — fine to avoid. Interim **transcription** preview is local STT feedback and supports the goals — removing it needs explicit approval.

### Instagram / static social posts (approved look)

When Henry asks for **IG posts, static feed graphics, Reels covers, or similar brand stills**, use the **instructional night/dark mode** Harbor look — **not** a new AI poster style.

- **Named template:** [`docs/social/ig-posts/INSTRUCTIONAL-NIGHT-MODE.md`](docs/social/ig-posts/INSTRUCTIONAL-NIGHT-MODE.md) (recall: *instructional night/dark mode post*)
- **Canon:** [`docs/social/ig-posts/DESIGN.md`](docs/social/ig-posts/DESIGN.md) + `references/*.jpg`
- **Locked:** Harbor / Jade / Ink · Syne + Noto Sans HK · **`docs/brand/favicon.png` only** (never regenerate the chop)
- **Pipeline:** HTML → `node docs/social/ig-posts/render.mjs` → commit `out/*.png`
- Content/topic can change; **colors, type, logo, atmosphere, and composition language stay**
- Emotional story Reels: storybook + **real UI** overlay; cast/scene **variety by default** (see social-media-manager brief)

### Social / Higgsfield / Recordly demos — auto-speak

For **all** future social, Higgsfield, Recordly, or instructional demo work that shows a translation result:

1. **Enable auto-speak** in the seeded / recorded UI (`autoSpeak: true` + Family/open entitlement).
2. Ensure **TTS is audible** in the final audio (product Azure TTS when available; do not ship silent translation reveals when the beat is “hear it”).
3. Soft background music may duck under TTS; do not replace TTS with music alone.
4. Cloud agents still need Henry’s **explicit yes** before calling paid `/api/tts` (or other metered Azure/DeepSeek paths) for that shoot — see below.

### Social / Higgsfield / Recordly demos — auto-speak

For **all** future social, Higgsfield, Recordly, or instructional demo work that shows a translation result:

1. **Enable auto-speak** in the seeded / recorded UI (`autoSpeak: true` + Family/open entitlement).
2. Ensure **TTS is audible** in the final audio (product Azure TTS when available; do not ship silent translation reveals when the beat is “hear it”).
3. Soft background music may duck under TTS; do not replace TTS with music alone.
4. Cloud agents still need Henry’s **explicit yes** before calling paid `/api/tts` (or other metered Azure/DeepSeek paths) for that shoot — see below.

## Cursor Cloud specific instructions

### Paid / external API usage (cloud testing only)

This rule applies **only** to Cursor Cloud agent testing. It does **not** restrict Henry’s local use of DeepSeek or Azure.

Do **not** call DeepSeek, Azure Speech, Azure Vision, Cam Documents OCR/translate paths that hit paid APIs, or other metered providers unless Henry has **explicitly allowed that specific request** in the current turn.

Before each outbound cloud-agent call that would use those keys (including `curl` to `/api/translate` when it would miss phrase/lexicon, `/api/tts`, `/api/speech-token`, `/api/camera/scan`, `/api/docs/*` when it bills Vision/model, live mic STT, quality-bot cases that require OpenAI, etc.):

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

Do **not** run `npm run test:translate`, `npm run test:translate:live`, or any live translate/STT/TTS/Vision that can hit DeepSeek/Azure unless Henry approved that run.

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

- Install: `./scripts/cloud-agent-install.sh` (`npm ci` for web + api, icons, Recordly)
- Start: `./scripts/cloud-agent-start.sh` (frees stale 5173/8787 only)
- Config: `.cursor/environment.json`
- **Recordly** (screen recorder for demo source): `recordly` on `DISPLAY=:1` after install (`scripts/cloud-agent-install-recordly.sh`, AppImage v1.3.3 → `/opt/recordly`). Recordings land in `~/.config/Recordly/recordings`. Linux uses Electron capture (no cursor hide).

### Production auth & metering (Vercel)

Default deploy flags in `vercel.json`: `YUE_OPEN_MODE=0`, `YUE_REQUIRE_LOGIN=1`. Guests get a metered trial without signing in: **30 min live**, **30 min cam** (AR/Upload), unlimited text + TTS (both counted). **Documents** still require login (greyed with sign-in). Free TTS is metered with a hard char cap; Family/Business TTS is unlimited (usage still counted). Auto-speak remains Family/Business. Signed-in **Cam** documents use the docs meter; camera minutes are separate; camera minutes and document pages are **separate** meters — see [docs/entitlements.md](docs/entitlements.md) and [docs/camera.md](docs/camera.md). Production Free live minutes are **60** (`YUE_FREE_LIVE_MINUTES=60`) and Family live minutes are **480** (`YUE_FAMILY_LIVE_MINUTES=480` in `vercel.json`), matching the pricing page.

OAuth / confirm-email returns to the site origin (Supabase Site URL). The web app then routes to `#/app`. Login links must be `/?auth=1#/app` (query before hash). In Supabase → Authentication → URL configuration, Site URL should be the production origin; extra Redirect URLs can include `http://localhost:5173/**` and the production origin.

Required Vercel env (in addition to Azure/OpenAI): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (or `SUPABASE_ANON_KEY` — the web app also loads public keys from `GET /api/auth-config` at runtime), and **`YUE_APP_URL=https://your-production-domain`**. Optional: **`YUE_ADMIN_EMAILS`** for `#/admin` — see [docs/admin.md](docs/admin.md). Sign-in opens an in-app modal via `openAuthScreen()` — do not link to API `loginUrl` from the SPA. Enable Google (and Apple) in Supabase → Authentication → Providers.

Stripe Checkout enables promotion codes — create a Stripe **Promotion code** (not only a coupon).

### Phone mic testing (Henry’s machine)

For microphone on a real phone, use the free Cloudflare quick tunnel — see [docs/local-phone-testing.md](docs/local-phone-testing.md) and `npm run dev:tunnel`. Do not expect mic to work on `http://192.168.x.x`.

Live STT on phone is most reliable with the Azure Speech key (+ region) in `apps/api/.env` (see `apps/api/.env.example`). Without it, iOS falls back to Web Speech, which must start inside the tap gesture and is flaky. Restart `dev:api` after changing speech env vars; open the app over the HTTPS tunnel and allow mic when prompted. Cloud agents must still get Henry’s OK before triggering Azure STT/TTS **from this cloud testing environment** (local use is unrestricted).
