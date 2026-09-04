# Security baseline — JyutTranslate

Initial full-project pass by Security Guardian (code review + safe `/api/health` probe).  
Re-run via **Vulnerability Scanner** automation or chat: follow `docs/agents/security-guardian.md`.

Date: 2026-09-04 · Scope: repo `main` + local cloud env health (not production HTTP)

---

## Critical / High

### [High] Guest `#/app` translate can burn DeepSeek with no per-IP rate limit
- **Category:** abuse
- **Evidence:** `POST /api/translate` allows guests when `allowed.textTranslate` is true (`apps/api/src/app.ts`). Metering via `addTranslateCount` only runs for signed-in users when `!env.openMode`. Bug-report path has a rate limit; translate does not.
- **Impact:** Scrapers / AI bots can spam translate against production without an account and burn model tokens until infra or provider limits kick in.
- **Fix:** Add per-IP (and optionally per-user) rate limits on `/api/translate`, `/api/breakdown`, and other guest-reachable paid paths; consider a soft anonymous daily cap or edge WAF rules on Vercel.
- **Fixability:** NEEDS_HUMAN
- **Why:** Cap numbers and whether guests stay free are product/billing decisions Henry must set.

### [High] `/api/health` discloses internal env file path + model identity
- **Category:** leak
- **Evidence:** `openaiStatus()` in `apps/api/src/env.ts` returns `envFile`; `/api/health` embeds full `openai` object (`apps/api/src/app.ts`). Local probe returned `envFile: "/workspace/apps/api/.env"` plus model names.
- **Impact:** Helps attackers map filesystem layout and stack; increases value of other vulns; noisy reconnaissance.
- **Fix:** Strip `envFile` (and any absolute paths) from public health JSON; keep booleans only (`configured`, `hasApiKey`, engine flags). Log paths server-side only (`apps/api/src/index.ts` already logs).
- **Fixability:** AUTOMATED
- **Why:** Safe response-shape cleanup with no product-policy change.

### [Medium→High in misconfig] `YUE_OPEN_MODE` defaults to open in code
- **Category:** config / metering
- **Evidence:** `apps/api/src/env.ts` defaults `YUE_OPEN_MODE` to `'1'`. Production overrides to `0` in `vercel.json`. Local/cloud health currently reports `mode: "open"`.
- **Impact:** Any deploy missing the Vercel env override skips metering and soft-opens entitlements → token burn + free live-like behavior.
- **Fix:** Prefer fail-closed default (`'0'`) in code; keep explicit `1` only in local `.env.example`. Add a deploy checklist / health assert that production must be `mode: "cloud"`.
- **Fixability:** NEEDS_HUMAN (default flip) / AUTOMATED (docs + health assert once Henry confirms fail-closed)
- **Why:** Changing the code default affects every local/dev workflow; Henry should confirm.

---

## Medium

### [Medium] CORS `origin: true` reflects any Origin
- **Category:** config
- **Evidence:** `app.use(cors({ origin: true, credentials: true }))` in `apps/api/src/app.ts`.
- **Impact:** Browser sessions with cookies/credentials could be invoked from arbitrary origins if cookie auth is used; with Bearer tokens the risk is lower but still widens CSRF-style browser abuse of logged-in clients that attach tokens cross-origin.
- **Fix:** Restrict to `YUE_APP_URL` + known marketing/localhost origins in production.
- **Fixability:** NEEDS_HUMAN
- **Why:** Must confirm all legitimate web origins (TWA, WordPress, tunnels) before tightening.

### [Medium] `ai_vision_count` is view-only (no hard cap)
- **Category:** metering / abuse
- **Evidence:** `docs/entitlements.md` + camera scan path notes uncapped AI vision fallback.
- **Impact:** Signed-in Free/Family users who trigger vision LLM fallback repeatedly can burn vision-model spend beyond soft expectations.
- **Fix:** Add a hard or soft monthly cap, or degrade to Azure-only OCR when over budget.
- **Fixability:** NEEDS_HUMAN
- **Why:** Quota numbers are a plan decision.

### [Medium] Large JSON body limit (`12mb`) on shared parser
- **Category:** abuse
- **Evidence:** `express.json({ limit: '12mb' })` before route handlers.
- **Impact:** Easy bandwidth/CPU DoS on any JSON endpoint; camera/docs may need large payloads but translate/tts do not.
- **Fix:** Keep a high limit only on camera/docs routes; use a smaller default (e.g. 256kb–1mb) globally.
- **Fixability:** AUTOMATED (with care for docs/camera tests)
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
- Live speech token gated on `ent.allowed.live`; Cam/docs on `allowed.camera` / `allowed.docs`
- Admin routes use `requireAdmin` (email allowlist + role)
- Stripe webhook uses raw body + signature path; auth send-email hook verifies Standard Webhooks secret
- Bug reports rate-limited (10/hour) and strip oversized screenshots
- `.gitignore` excludes `.env` / `apps/api/.env`
- Offline smoke scripts exist (`smoke:canto`, `smoke:entitlements`, `smoke:usage`, `smoke:all`) without needing live paid calls for core lexicon paths
- Cloud `AGENTS.md` forbids unapproved metered API calls from agents

---

## Suggested first automated fix PR (if Henry says go)

1. Remove `envFile` from public `openaiStatus()` / health JSON  
2. Optionally shrink default JSON body limit with per-route overrides for Cam/Docs  

Leave rate limits, CORS allowlist, open-mode default, and vision caps for Henry’s input.
