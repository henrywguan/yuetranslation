# Security baseline — JyutTranslate

Full-project Security Guardian pass (code review + safe `/api/health` + `npm audit`).  
Re-run via **Vulnerability Scanner** automation or chat: follow `docs/agents/security-guardian.md`.

Date: 2026-09-04 · Scope: repo `main` + local cloud env health (not production HTTP)  
Updated: **2026-09-08** — speech-token prepaid debit, IP-bound guest ids, docs/segments page metering, slim health, JSON body split; `¡No manches!` phrase rescue

---

## Executive summary (2026-09-08)

| Area | Status |
| --- | --- |
| Secrets in repo / client bundles | **Healthy** — no service-role / Stripe / Azure keys committed |
| Open mode / login defaults | **Healthy** — `YUE_OPEN_MODE` fail-closed `'0'`; `vercel.json` pins `0` + `YUE_REQUIRE_LOGIN=1` |
| CORS | **Healthy** — allowlist (not `origin: true`) |
| Admin / Stripe / auth webhooks | **Healthy** — `requireAdmin`; Stripe `constructEvent`; Standard Webhooks on auth hooks |
| Guest / paid-API abuse | **Hardened** — guest IP RL + **IP-bound guest ids** (cookie wipe no longer refreshes trial); speech-token **prepay** live seconds; docs/segments bills pages |
| Health info disclosure | **Hardened** — public health is readiness + entitlement + incident banner (no model/lexicon/notify dump) |

**Safe health probe:** `npm run security:api-health` → fail=0.

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

### [High] Speech token issued without consuming live minutes — FIXED (prepaid debit)
- **Status:** Fixed 2026-09-08 — `GET /api/speech-token` requires ≥15s remaining, advertises TTL ≤180s, and **debits up to 60 live seconds** on mint (user + guest). Heartbeats still record session time.
- **Category:** metering
- **Residual:** Heartbeats can slightly over-count after prepaid debit; Family still has a finite live minutes cap.
- **Fixability:** Done

### [High] Camera OCR/scan without camera-minute burn — FIXED (scan credits)
- **Status:** Fixed 2026-09-06 — Cam hard gate is monthly **scan credits** (`camera_translate_count`): Guest 30 / Free 120 / Family 800 / Business unlimited. Each successful non-docs `/api/camera/scan` costs 1 credit (pre-check + charge on success). Heartbeats still write `cameraSeconds` for admin logging only and no longer gate Cam.
- **Category:** metering
- **Residual:** Guest IP change still starts a new trial identity (see guest binding).

### [High] Guest cookie rotation resets trial meters — FIXED (IP-bound guest id)
- **Status:** Fixed 2026-09-08 — guest id is a deterministic UUID from `sha256(month|ip)` (`guestId.ts`). Clearing `yue_guest_id` reissues the same id for that network/month.
- **Category:** abuse / metering
- **Residual:** Changing IP/VPN still yields a new trial; shared NAT shares one trial (intentional abuse tradeoff).
- **Fixability:** Done (further: edge Firewall / fingerprint — NEEDS_HUMAN if abuse continues)

### [High] `/api/docs/segments` model spend without page metering — FIXED
- **Status:** Fixed 2026-09-08 — segments pre-checks remaining docs pages, bills `ceil(chars/1800)` (min 1) on success; PDF hybrid passes `prepaidPages` into `/api/docs/commit` so pages are not double-billed.
- **Category:** metering
- **Residual:** Abandoned segment calls still consume pages (fair — model already ran).
- **Fixability:** Done

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

### [Medium] Global JSON body limit (`12mb`) — FIXED (split parser)
- **Status:** Fixed 2026-09-08 — default JSON limit **256kb**; Cam scan + docs routes keep **12mb**.
- **Category:** abuse
- **Fixability:** Done

### [Medium] `/api/health` still returns engines, models, full entitlement — HARDENED
- **Status:** 2026-09-08 — public health keeps `ok` / `cloudReady` / engine booleans / `entitlement` / `incidentBanner` / push configured for SPA bootstrap; removed model names, lexicon/gloss dumps, notify config shape.
- **Category:** leak / health
- **Residual:** Entitlement snapshot still public (needed for `#/app` bootstrap).
- **Fixability:** Done / residual accepted

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
