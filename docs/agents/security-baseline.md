# Security baseline — JyutTranslate

Full-project Security Guardian pass (code review + safe `/api/health` + `npm audit`).  
Re-run via **Vulnerability Scanner** automation or chat: follow `docs/agents/security-guardian.md`.

Date: 2026-09-04 · Scope: repo `main` + local cloud env health (not production HTTP)  
Updated: **2026-09-06** — full re-scan on `main` (`d889387`); shipped small AUTOMATED hardenings (see below)

---

## Executive summary (2026-09-06)

| Area | Status |
| --- | --- |
| Secrets in repo / client bundles | **Healthy** — no service-role / Stripe / Azure keys committed; `npm audit` → 0 vulns |
| Open mode / login defaults | **Healthy** — `YUE_OPEN_MODE` fail-closed `'0'`; `vercel.json` pins `0` + `YUE_REQUIRE_LOGIN=1` |
| CORS | **Healthy** — allowlist (not `origin: true`) |
| Admin / Stripe / auth webhooks | **Healthy** — `requireAdmin`; Stripe `constructEvent`; Standard Webhooks on auth hooks |
| Guest / paid-API abuse | **Open risk** — no IP rate limits; guest cookie rotation; TTS unlimited for guests; speech-token & camera scan not tightly tied to minute burn |
| Health info disclosure | **Residual** — no `envFile`, but engines/models/full entitlement still public |

**Safe health probe:** `npm run security:api-health` → fail=0 (2026-09-06).

---

## Critical / High

### [High] Guest `#/app` translate can burn DeepSeek with no per-IP rate limit — STILL OPEN
- **Category:** abuse
- **Evidence:** `POST /api/translate` allows guests when `allowed.textTranslate` is true (`apps/api/src/app.ts`). Counts are recorded (`addTranslateCount` / `addGuestTranslateCount`) but **do not gate** guests. No IP/user rate limiter on translate (bug-report path is rate-limited).
- **Impact:** Scrapers / AI bots can spam translate without an account and burn model tokens until infra or provider limits kick in.
- **Fix:** Add per-IP (and optionally per-user) rate limits on `/api/translate`, `/api/breakdown`, `/api/tts`, `/api/speech-token`, `/api/camera/scan`; consider anonymous daily caps or Vercel Firewall / WAF rules.
- **Fixability:** NEEDS_HUMAN
- **Why:** Cap numbers and whether guests stay free are product/billing decisions.

### [High] Guest TTS is unlimited + was uncapped per request — PARTIALLY HARDENED
- **Category:** abuse / metering
- **Evidence:** Guests get `ttsUnlimited: true` (`entitlements.ts`). Usage is counted but does not block. **2026-09-06 AUTOMATED:** `/api/tts` now rejects text longer than **2000** chars (same as translate).
- **Impact (residual):** Anonymous callers can still burn Azure TTS continuously within 2000 chars/request and by rotating guest cookies.
- **Fix (remaining):** Per-IP rate limits; optional guest monthly TTS hard cap; require login for TTS if product allows.
- **Fixability:** NEEDS_HUMAN (policy / caps) — max-length **AUTOMATED** (shipped)

### [High] `/api/breakdown` hit the model with no metering — FIXED (metering)
- **Status:** Fixed 2026-09-06 — breakdown now increments the same translate counters as `/api/translate`.
- **Category:** abuse / metering
- **Evidence (was):** Guest-reachable LLM path with no `addTranslateCount`.
- **Residual:** Still no IP rate limit (same as translate).

### [High] Speech token issued without consuming live minutes — STILL OPEN
- **Category:** metering
- **Evidence:** `GET /api/speech-token` checks `allowed.live` then issues an Azure STS token (~540s). Live seconds only decrement via client `POST /api/usage/heartbeat`.
- **Impact:** While minutes “remain”, a client can mint tokens and run STT without heartbeats → Azure STT spend largely unmetered.
- **Fix:** Tie token issuance to remaining seconds / rate-limit issuance / shorter TTL + server-side debit.
- **Fixability:** NEEDS_HUMAN

### [High] Camera OCR/scan without camera-minute burn — STILL OPEN
- **Category:** metering
- **Evidence:** `POST /api/camera/scan` requires `allowed.camera` (from minute balance) but each scan runs Azure Read OCR; minutes only move via `camera-heartbeat`. Guests have AI vision off (good); OCR still runs.
- **Impact:** Spam scans (or skip heartbeats) while minutes appear remaining → Vision cost with little/no minute burn.
- **Fix:** Charge seconds or scan units per scan; require a recent heartbeat window.
- **Fixability:** NEEDS_HUMAN

### [High] Guest cookie rotation resets trial meters — STILL OPEN
- **Category:** abuse / metering
- **Evidence:** Guest id is HttpOnly cookie UUID (`guest.ts`). Dropping the cookie → new UUID → fresh guest live/camera minutes (`YUE_GUEST_*_MINUTES=30`) and fresh translate/TTS counts.
- **Impact:** Unlimited guest trials for live tokens, cam OCR, and soft-counted translate/TTS.
- **Fix:** Bind trial to IP/fingerprint hash, reject cookieless live/cam, and/or edge rate limits.
- **Fixability:** NEEDS_HUMAN

### [High] `/api/docs/segments` model spend without page metering — STILL OPEN
- **Category:** metering
- **Evidence:** Requires `allowed.docs` but does not call `addDocsPages`; pages billed later via client `/api/docs/commit`. Batch can be large (hundreds of segments).
- **Impact:** Signed-in users can burn DeepSeek on PDF hybrid path without consuming docs pages until commit.
- **Fix:** Meter segment chars/calls against docs or translate budget; estimate pages server-side where possible.
- **Fixability:** NEEDS_HUMAN

### [High] `/api/health` disclosed `envFile` — FIXED (earlier)
- **Status:** Fixed — public health has no `envFile`. Probe script fails if it reappears.

### [Medium→High in misconfig] `YUE_OPEN_MODE` fail-open default — FIXED (earlier)
- **Status:** Fixed — code default `'0'`; `vercel.json` pins `0`.

---

## Medium

### [Medium] CORS `origin: true` — FIXED (earlier)
- **Status:** Fixed — allowlist via `corsOrigins.ts`.

### [Medium] `ai_vision_count` uncapped — FIXED (earlier)
- **Status:** Fixed — Free / Family / Business monthly hard caps; guests `aiVision: false`.

### [Medium] Global JSON body limit (`12mb`) — STILL OPEN
- **Category:** abuse
- **Evidence:** `express.json({ limit: '12mb' })` before all JSON routes.
- **Impact:** Bandwidth/CPU DoS on translate/tts/etc.; Cam/Docs may need large payloads.
- **Fix:** Smaller default (256kb–1mb); route-specific large parsers for camera/docs.
- **Fixability:** AUTOMATED (deferred — needs Cam/Docs verification)

### [Medium] `/api/health` still returns engines, models, full entitlement
- **Category:** leak / health
- **Evidence:** Public payload includes engine booleans, model names, license gate, notify shape, full `entitlement`.
- **Impact:** Aids targeting of paid backends; reveals guest quotas. No secrets observed.
- **Fix:** Slim public health to `ok` + minimal readiness; move diagnostics behind admin.
- **Fixability:** AUTOMATED (confirm SPA still works) / NEEDS_HUMAN if ops dashboards depend on fields

---

## Low

### [Low] Public `GET /api/auth-config` returns anon key — by design
- **Fixability:** NEEDS_HUMAN (Supabase RLS audit)

### [Low] Docs / social agent markdown if GitHub Pages covers `/docs`
- **Fixability:** NEEDS_HUMAN

### [Low] Legal markdown `javascript:` hrefs — HARDENED 2026-09-06
- **Status:** `rewriteLegalHref` now allowlists `http(s):`, `mailto:`, and `#/` only.

### [Low] Azure Vision `Operation-Location` host not pinned — HARDENED 2026-09-06
- **Status:** Poll URL host must match configured Vision endpoint (https only).

### [Low] Internal DB webhook secret compared with `!==` — HARDENED 2026-09-06
- **Status:** `timingSafeEqual` on `x-notify-secret` in `signupNotify.ts`.

---

## AUTOMATED hardenings shipped in this re-scan

1. Meter `/api/breakdown` like translate  
2. Cap `/api/tts` text at 2000 characters  
3. Constant-time compare for signup DB webhook secret  
4. Pin Azure Vision operation-location host  
5. Block non-http(s)/mailto/hash hrefs in legal markdown  

---

## Healthy controls already in place

- Production `vercel.json`: `YUE_OPEN_MODE=0`, `YUE_REQUIRE_LOGIN=1`, guest live/cam 30 minutes
- Code default `YUE_OPEN_MODE=0` (fail-closed)
- Live speech token gated on `ent.allowed.live`; Cam/docs on `allowed.camera` / `allowed.docs`
- Admin routes use `requireAdmin` (email allowlist + role)
- Stripe webhook: raw body + signature verification
- Auth send-email + signup auth hook: Standard Webhooks
- Bug reports: auth + 10/hour + screenshot size strip
- `.gitignore` excludes `.env` / `apps/api/.env`
- Public `/api/health` no longer exposes `envFile`
- CORS allowlist (no ephemeral `*-git-*.vercel.app`)
- Guest AI vision hard-off
- Offline smokes + `npm run security:api-health` (no paid APIs)
- Cloud `AGENTS.md` forbids unapproved metered API calls from agents
- `npm audit --omit=dev` → **0 vulnerabilities** (2026-09-06)

---

## Recommended next actions for Henry (NEEDS_HUMAN)

1. **Decide guest policy:** keep anonymous live/cam/TTS, or require login after a tighter trial.  
2. **Pick rate-limit numbers** (e.g. translate 30/min/IP, TTS 20/min/IP, speech-token 10/min/IP) — then AUTOMATED implement.  
3. **Bind guest trials to IP** (or drop cookieless live/cam).  
4. **Align live/cam meters** with actual Azure spend (token debit / per-scan charge).  
5. Optional: slim `/api/health`; route-specific JSON body limits; Supabase RLS audit.
