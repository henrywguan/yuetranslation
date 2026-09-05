# Security baseline — JyutTranslate

Initial full-project pass by Security Guardian (code review + safe `/api/health` probe).  
Re-run via **Vulnerability Scanner** automation or chat: follow `docs/agents/security-guardian.md`.

Date: 2026-09-04 · Scope: repo `main` + local cloud env health (not production HTTP)  
Updated: 2026-09-04 — shipped fail-closed `YUE_OPEN_MODE` default + stripped health `envFile`

---

## Critical / High

### [High] Guest `#/app` translate can burn DeepSeek with no per-IP rate limit
- **Category:** abuse
- **Evidence:** `POST /api/translate` allows guests when `allowed.textTranslate` is true (`apps/api/src/app.ts`). Metering via `addTranslateCount` only runs for signed-in users when `!env.openMode`. Bug-report path has a rate limit; translate does not.
- **Impact:** Scrapers / AI bots can spam translate against production without an account and burn model tokens until infra or provider limits kick in.
- **Fix:** Add per-IP (and optionally per-user) rate limits on `/api/translate`, `/api/breakdown`, and other guest-reachable paid paths; consider a soft anonymous daily cap or edge WAF rules on Vercel.
- **Fixability:** NEEDS_HUMAN
- **Why:** Cap numbers and whether guests stay free are product/billing decisions Henry must set.

### [High] `/api/health` discloses internal env file path + model identity — FIXED
- **Status:** Fixed on this branch — `openaiStatus()` no longer returns `envFile`; server boot still logs `loadedEnvFilePath()` to stdout only.
- **Category:** leak
- **Evidence (was):** `openaiStatus()` returned `envFile`; `/api/health` embedded it.
- **Fix applied:** Public status is booleans + model names only; `scripts/security-api-health.sh` now fails if `envFile` reappears.

### [Medium→High in misconfig] `YUE_OPEN_MODE` defaults to open in code — FIXED
- **Status:** Fixed on this branch — code default is now `'0'` (fail-closed). Local lux still sets `YUE_OPEN_MODE=1` in `apps/api/.env.example`.
- **Category:** config / metering
- **Evidence (was):** Default `'1'` meant any deploy missing Vercel override skipped metering.
- **Why this was safe to flip:** Production already pins `0` in `vercel.json`. Dev convenience belongs in `.env`, not in the fail-open code default.

---

## Medium

### [Medium] CORS `origin: true` reflects any Origin — FIXED
- **Status:** Fixed — allowlist = `YUE_APP_URL` ± www, `https://jyuttranslate.vercel.app`, localhost/127.0.0.1 (:5173/:4173/:8787), optional `YUE_CORS_ORIGINS`. No ephemeral `*-git-*.vercel.app` previews. Apex `jyuttranslate.com` 301 → `www.jyuttranslate.com` in `vercel.json`.
- **Category:** config
- **Evidence:** `app.use(cors({ origin: true, credentials: true }))` in `apps/api/src/app.ts`.
- **Impact:** See PR / chat explanation — browser cross-origin calls with credentials. With Bearer JWT in `Authorization` (JyutTranslate’s pattern) risk is lower than cookie sessions, but any browser page can still trigger credentialed CORS preflight+request if a logged-in SPA attaches the token to cross-origin fetches.
- **Fix:** Restrict to `YUE_APP_URL` + known marketing/localhost origins in production.
- **Fixability:** NEEDS_HUMAN
- **Why:** Must confirm all legitimate web origins (TWA, WordPress, tunnels) before tightening.

### [Medium] `ai_vision_count` was view-only — FIXED (hard monthly caps)
- **Status:** Fixed — Free **200** / Family **2000** / Business **10000** per month (`YUE_*_AI_VISION_COUNT`). Exhausted → skip LLM fallback; Azure OCR still runs. Cam/docs stay available.
- **Category:** metering / abuse
- **Evidence:** Camera/docs AI vision LLM fallback increments `ai_vision_count` and now gates via `allowed.aiVision` before the paid LLM call.
- **Impact (before):** Signed-in users who forced vision LLM fallback repeatedly could burn vision-model spend without a ceiling.
- **Residual risk:** Caps are generous; a determined signed-in attacker can still spend up to the monthly ceiling. Camera minutes / docs pages remain additional brakes. Lower the env caps if you want a tighter budget.


### [Medium] Large JSON body limit (`12mb`) on shared parser
- **Category:** abuse
- **Evidence:** `express.json({ limit: '12mb' })` before route handlers.
- **Impact:** Easy bandwidth/CPU DoS on any JSON endpoint; camera/docs may need large payloads but translate/tts do not.
- **Fix:** Keep a high limit only on camera/docs routes; use a smaller default (e.g. 256kb–1mb) globally.
- **Fixability:** AUTOMATED (deferred — Cam/Docs still need large base64 bodies; do as a follow-up with route-specific parsers)
- **Why:** Localized Express wiring; verify Cam/Docs still work.

---

## Low

### [Low] Public `GET /api/auth-config` returns anon key
- **Category:** config
- **Evidence:** By design for SPA runtime config (`apps/api/src/app.ts`).
- **Impact:** Anon key is meant to be public with RLS; risk only if Supabase RLS/policies are wrong.
- **Fix:** Audit Supabase RLS; never put service role in this endpoint (already correct).
- **Fixability:** NEEDS_HUMAN (RLS audit in Supabase dashboard)

### [Low] Docs / social agent markdown is public if GitHub Pages covers `/docs`
- **Category:** leak
- **Evidence:** `.github/PULL_REQUEST_TEMPLATE.md` already warns about Pages exposing `docs/agents`.
- **Impact:** Internal agent prompts and ops notes become public intel (not keys).
- **Fix:** Keep Pages scoped away from `docs/agents` / `docs/social`, or move sensitive runbooks private.
- **Fixability:** NEEDS_HUMAN

---

## Healthy controls already in place

- Production `vercel.json` sets `YUE_OPEN_MODE=0` and `YUE_REQUIRE_LOGIN=1`
- Code default is now also `YUE_OPEN_MODE=0` (fail-closed)
- Live speech token gated on `ent.allowed.live`; Cam/docs on `allowed.camera` / `allowed.docs`
- Admin routes use `requireAdmin` (email allowlist + role)
- Stripe webhook uses raw body + signature path; auth send-email hook verifies Standard Webhooks secret
- Bug reports rate-limited (10/hour) and strip oversized screenshots
- `.gitignore` excludes `.env` / `apps/api/.env`
- Public `/api/health` no longer exposes `openai.envFile`
- Offline smoke scripts exist (`smoke:canto`, `smoke:entitlements`, `smoke:usage`, `smoke:all`) without needing live paid calls for core lexicon paths
- Cloud `AGENTS.md` forbids unapproved metered API calls from agents
