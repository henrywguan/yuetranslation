# Security baseline — JyutTranslate

Full-project Security Guardian pass (code review + safe `/api/health` + `npm audit`).  
Re-run via **Vulnerability Scanner** automation or chat: follow `docs/agents/security-guardian.md`.

Date: 2026-09-04 · Scope: repo `main` + local cloud env health (not production HTTP)  
Updated: **2026-09-19** — Harbor Quest + Practice Partner full-repo rescan; push subscribe RL; Harbor sync/gift RL; progress RLS service-role writes; Practice Partner meter await + hide model from client

---

## Executive summary (2026-09-19)

| Area | Status |
| --- | --- |
| Secrets in repo / client bundles | **Healthy** — no service-role / Stripe / Azure keys committed |
| Open mode / login defaults | **Healthy** — `YUE_OPEN_MODE` fail-closed `'0'`; `vercel.json` pins `0` + `YUE_REQUIRE_LOGIN=1` |
| CORS | **Healthy** — allowlist (not `origin: true`) |
| Admin / Stripe / auth webhooks | **Healthy** — `requireAdmin`; Stripe `constructEvent`; Standard Webhooks on auth hooks |
| Guest / paid-API abuse | **Hardened** — guest IP RL + device/network guest ids; speech-token prepaid; docs page metering |
| Harbor Quest | **New focus** — auth on sync/gift OK; **client-trusted scores** remain High (product); RL + RLS hardenings shipped this pass |
| Practice Partner | **Admin-only** — guests cannot reach DeepSeek; uncapped admin turns remain NEEDS_HUMAN |
| Health info disclosure | **Healthy** — slim readiness; entitlement snapshot for SPA bootstrap |
| Safe health probe | `npm run security:api-health` → **fail=0** (2026-09-19) |
| `npm audit --omit=dev` | **web: 0**; **api: 3 moderate** (`qs` via Express — see Low) |

---

## Critical

None.

---

## High

### [High] Harbor Quest client-trusted progress drives global leaderboard
- **Category:** abuse
- **Evidence:** `PUT /api/harbor-quest` accepts client `xp` / `gold` / `correctCount` / inventory (sanitized caps only) then `syncHarborLeaderboard` upserts absolute values. No server verification of pier/arena clears.
- **Impact:** Any signed-in Free account can max the public leaderboard and invent cosmetics within allowlists.
- **Fix:** Server-authoritative awards (event log / signed deltas), or stop accepting absolute XP/gold; monotonic `greatest()` on board upsert; anti-cheat rate caps on score deltas.
- **Fixability:** NEEDS_HUMAN
- **Why:** Trust model and schema design are product decisions — not a one-line patch.

### [High] Guest TTS uncapped per-IP — ACCEPTED (product) + Harbor amplification
- **Category:** abuse / metering
- **Evidence:** Guests get `ttsUnlimited: true`; no guest IP RL on `/api/tts` (2000 char/request cap). Harbor `#/learn` auto-speak / pier audio calls the same path (`harborSpeak.ts`).
- **Impact:** Guest or scripted Harbor play can burn Azure TTS harder than Solo tap-to-speak.
- **Fix:** Guest TTS IP RL and/or Harbor-only daily budget; or local samples for drills.
- **Fixability:** NEEDS_HUMAN
- **Why:** Unlimited guest TTS is an explicit product choice.

### [High] In-memory guest IP RL reset on cold start / multi-instance — residual
- **Category:** abuse
- **Evidence:** `guestRateLimit.ts` Map windows; best-effort on Vercel.
- **Impact:** Scrapers can exceed per-instance limits across isolates.
- **Fix:** Redis/Upstash shared limiter + keep edge Firewall.
- **Fixability:** NEEDS_HUMAN

---

## Medium

### [Medium] Harbor inventory / gift economy spoofable
- **Category:** abuse
- **Evidence:** Sanitize accepts allowlisted gear into `owned`/`banked`; `POST /api/harbor-quest/gift` transfers lanterns/titles to any signed-in UUID (leaderboard exposes `userId`).
- **Impact:** Infinite cosmetics within allowlist; gift spam.
- **Fix:** Server ownership ledger; gift rate already added this pass — further economy rules need product OK.
- **Fixability:** NEEDS_HUMAN
- **Why:** Economy policy.

### [Medium] Admin Practice Partner LLM uncapped + no RPM
- **Category:** abuse / metering
- **Evidence:** `POST /api/admin/practice-partner/chat` — `requireAdmin` only; `practice_partner_count` view-only; no IP/user RL.
- **Impact:** Stolen admin JWT burns DeepSeek (and follow-on TTS) without a product brake.
- **Fix:** Per-admin RPM + optional monthly hard cap before consumer launch.
- **Fixability:** NEEDS_HUMAN
- **Why:** Admin policy / numbers.

### [Medium] Practice Partner client-controlled chat history (injection)
- **Category:** injection
- **Evidence:** Client sends full `{role,content}[]`; server only prepends fixed system prompt.
- **Impact:** Low while admin-only; **High** if reused for consumer Practice Partner.
- **Fix:** Server-side session store before consumer launch.
- **Fixability:** NEEDS_HUMAN for consumer design; scaffolding AUTOMATED later.

### [Medium] Signed-in Free accounts skip guest IP RL on paid paths
- **Category:** abuse
- **Evidence:** `allowGuestIpOrReject` returns true when Bearer present.
- **Impact:** Free scrapers hit plan caps without IP throttling.
- **Fix:** Per-user RL buckets or WAF.
- **Fixability:** NEEDS_HUMAN

### [Medium] `/api/docs/*` has no IP rate limit
- **Category:** abuse
- **Evidence:** Login + page meters only.
- **Impact:** Burst Vision/model until pages exhaust.
- **Fixability:** NEEDS_HUMAN

### [Medium] Unauthenticated push subscribe — HARDENED (IP RL)
- **Status:** Fixed 2026-09-19 — `allowIpRateOrReject` on subscribe/unsubscribe (default **20**/min, `YUE_PUSH_SUBSCRIBE_RL_PER_MIN`).
- **Residual:** Still optional-auth; bots can fill table slowly within RL.
- **Fixability:** Done / further auth-required = NEEDS_HUMAN

---

## Low

### [Low] Public leaderboard returns account UUIDs
- **Category:** leak
- **Evidence:** `userId` on each entry; used for gifts/presence.
- **Fixability:** NEEDS_HUMAN (identity design)

### [Low] Harbor / push 500s returned raw DB messages — HARDENED
- **Status:** Fixed 2026-09-19 — generic client messages; details logged server-side.

### [Low] Practice Partner returned model name to UI — HARDENED
- **Status:** Fixed 2026-09-19 — model stays in audit only; UI no longer shows it.

### [Low] Practice Partner usage meter was fire-and-forget — HARDENED
- **Status:** Fixed 2026-09-19 — `await addPracticePartnerCount` (still fail-open on meter errors).

### [Low] `X-Powered-By: Express` — HARDENED
- **Status:** Fixed 2026-09-19 — `app.disable('x-powered-by')`.

### [Low] Harbor progress RLS allowed client writes bypassing API sanitize — HARDENED
- **Status:** Fixed 2026-09-19 — migration `035_harbor_quest_progress_service_role_writes.sql` drops insert/update/delete policies (keep SELECT). **Apply in Supabase SQL Editor.**
- **Fixability:** Done (ops: apply migration)

### [Low] Public `GET /api/auth-config` returns anon key — by design
- **Fixability:** NEEDS_HUMAN (Supabase RLS audit)

### [Low] Duplicate migration prefix `025_*.sql`
- **Fixability:** NEEDS_HUMAN if not already applied

### [Low] `npm audit` api: moderate `qs` via Express 4.22.2
- **Category:** other
- **Evidence:** `npm audit --omit=dev` in `apps/api` — GHSA-x5fp-wj9c-mxmx / GHSA-4mjr-xmp4-gh2g; web clean.
- **Impact:** DoS/array-limit issues in querystring parsing — mitigated somewhat by JSON body limits; still worth upgrading when Express patches land.
- **Fix:** `npm audit fix` / bump Express when compatible.
- **Fixability:** NEEDS_HUMAN (dependency bump / lockfile review)

---

## AUTOMATED hardenings shipped this pass (2026-09-19)

1. Harbor PUT / gift per-user rate limits (`YUE_HARBOR_PUT_RL_PER_MIN` default 120, gift 30)
2. Push subscribe/unsubscribe IP rate limit (default 20/min)
3. Generic Harbor / push error messages (no raw Supabase strings to clients)
4. `app.disable('x-powered-by')`
5. Practice Partner: await usage meter; omit `model` from JSON response
6. Migration `035` — Harbor progress writes service-role only
7. Docs: list `POST /api/admin/practice-partner/chat` in `docs/admin.md`
8. Extended `guestRateLimit.smoke.ts` for IP + user buckets

---

## Healthy controls already in place

- Production `vercel.json`: `YUE_OPEN_MODE=0`, `YUE_REQUIRE_LOGIN=1`, guest live **30 min** + Cam **30 scan credits**
- Code default `YUE_OPEN_MODE=0` (fail-closed)
- Live speech token gated + prepaid debit; Cam scan credits; docs page metering
- Guest IP RL: translate / breakdown / speech-token / camera
- Guest identity anchors (device + network)
- Admin routes: `requireAdmin` (email allowlist + role) — including Practice Partner
- Practice Partner: **not** in consumer app; no public `/api/practice*`
- Harbor GET/PUT/gift require auth; public leaderboard is read-only by design
- Leaderboard table: RLS SELECT public, no client writes
- Stripe webhook signature; auth hooks Standard Webhooks; signup notify `timingSafeEqual`
- CORS allowlist; JSON body 256kb default / 12mb Cam+docs
- History 14-day TTL prune (client + API + `026`)
- `.gitignore` excludes `.env`
- `npm run security:api-health` fail=0
- Cloud `AGENTS.md` forbids unapproved metered API calls from agents

---

## Harbor Quest / Practice Partner — gate matrix

| Surface | Guest | Free signed-in | Admin |
| --- | --- | --- | --- |
| `#/learn` play (local) | Yes | Yes | Yes |
| `PUT /api/harbor-quest` | 401 | Yes (scores client-trusted) | Yes |
| Leaderboard GET | Public | Public | Public |
| Harbor gift | 401 | Yes | Yes |
| Practice Partner LLM | 401 | 403 | Yes (uncapped) |
| Harbor TTS via `/api/tts` | Unlimited (product) | Plan meters | Plan meters |

---

## Recommended next actions for Henry (NEEDS_HUMAN)

1. **Decide Harbor trust model** — accept cosmetic leaderboard spoofing for beta, or design server-authoritative XP/gold.
2. Apply **`035_harbor_quest_progress_service_role_writes.sql`** in Supabase SQL Editor (and earlier gaps `022`/`023` TTS columns if still missing).
3. Before consumer Practice Partner: hard turn cap + RPM + server-side history.
4. Optional: guest TTS IP RL if Harbor auto-speak costs spike; Upstash shared RL; Express/`qs` bump when ready.
5. Confirm Vercel `YUE_APP_URL=https://www.jyuttranslate.com` for CORS.
