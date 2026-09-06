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
| Guest / paid-API abuse | **Partially hardened** — guest IP RL on translate/breakdown/speech-token/camera; TTS uncapped by choice; cookie rotation + minute/token decoupling still open |
| Health info disclosure | **Residual** — no `envFile`, but engines/models/full entitlement still public |

**Safe health probe:** `npm run security:api-health` → fail=0 (2026-09-06).

---

## Critical / High

### [High] Guest `#/app` translate can burn DeepSeek with no per-IP rate limit — HARDENED (app RL)
- **Status:** Guest-only per-IP limits shipped 2026-09-06 — translate **30**/min, breakdown **20**/min, speech-token **12**/min, camera scan **20**/min (`YUE_GUEST_RL_*`). TTS intentionally uncapped by IP (product). In-memory windows are best-effort on multi-instance Vercel; keep edge Firewall if configured.
- **Category:** abuse
- **Evidence:** `allowGuestIpOrReject` in `apps/api/src/guestRateLimit.ts` on guest translate/breakdown/speech-token/camera.
- **Residual:** Cookie rotation still refreshes trial meters; signed-in users not limited by these buckets; serverless cold starts reset memory.
- **Fixability:** NEEDS_HUMAN for Redis/Upstash shared limiter or cookie↔IP binding if abuse continues.

### [High] Guest TTS is unlimited + was uncapped per request — ACCEPTED (product) + length cap
- **Status:** Henry accepted unlimited guest TTS (2026-09-06). Per-request max **2000** chars remains. No guest IP RL on TTS by design.
- **Category:** abuse / metering
- **Evidence:** Guests get `ttsUnlimited: true`; usage counted; `/api/tts` rejects text > 2000 chars.
- **Residual:** High-volume short TTS still possible; rely on edge Firewall / provider limits if needed.
- **Fixability:** NEEDS_HUMAN only if costs appear — otherwise leave as-is.

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

### [High] Camera OCR/scan without camera-minute burn — FIXED (scan credits)
- **Status:** Fixed 2026-09-06 — Cam hard gate is monthly **scan credits** (`camera_translate_count`): Guest 30 / Free 120 / Family 800 / Business unlimited. Each successful non-docs `/api/camera/scan` costs 1 credit (pre-check + charge on success). Heartbeats still write `cameraSeconds` for admin logging only and no longer gate Cam.
- **Category:** metering
- **Residual:** Guest cookie rotation still refreshes scan trial; guest IP RL applies.

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
6. Guest per-IP rate limits on translate / breakdown / speech-token / camera scan (TTS excluded by product choice)  

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

1. Confirm guest IP RL defaults feel right in real Solo use (or tweak `YUE_GUEST_RL_*`).  
2. **Bind guest trials to IP** (or drop cookieless live/cam) if cookie wipe abuse shows up.  
3. **Align live/cam meters** with actual Azure spend (token debit / per-scan charge) — see #4.  
4. Meter or soft-cap `/api/docs/segments` — see #5.  
5. Optional: slim `/api/health`; route-specific JSON body limits; Supabase RLS audit; Upstash shared RL.
