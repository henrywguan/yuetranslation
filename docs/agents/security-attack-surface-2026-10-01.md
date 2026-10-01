# JyutTranslate — deep attack-surface research

**Date:** 2026-10-01  
**Scope:** Full product — `www.jyuttranslate.com` (Vercel), Express API, Supabase Auth/DB, Stripe, Azure Speech/Vision, DeepSeek/OpenAI-compatible LLM, Harbor Quest, Practice Partner, Admin Hub, PWA  
**Method:** Static code review of all ~69 API routes + web client + migrations + prod health/headers; safe probes only (`/api/health`, auth-config, unauth gate checks). **No** paid translate/TTS/STT/Vision calls.  
**Companions:** [`security-guardian.md`](./security-guardian.md) · [`security-baseline.md`](./security-baseline.md)

---

## Executive verdict

| Grade | Area |
| --- | --- |
| **Strong** | Secrets not in client; open-mode fail-closed in prod (`mode: cloud`); CORS allowlist; admin/webhook gates; speech prepaid; guest device+network anchors; Cam scan credits; docs login-gated |
| **Hardened this pass** | `?api=` token exfil, query open redirects, push navigate, speech TTL↔prepaid, `forDocs` page debit, household null-email invite steal, OOXML zip entry caps, admin email iframe sandbox |
| **Needs Henry** | Harbor/Practice **leaderboard trust**, guest unlimited TTS, shared Redis RL, Free-account farm, CSP/`frame-ancestors`, admin MFA, consumer Practice Partner metering |

**Production snapshot (2026-10-01):** `GET https://www.jyuttranslate.com/api/health` → `ok: true`, `mode: cloud`. Headers: HSTS + nosniff + Referrer-Policy. **No CSP / X-Frame-Options.** Local `npm run security:api-health` → fail=0.

---

## Attack surface map (how someone attacks you)

```
Internet
  ├─ www.jyuttranslate.com (SPA + PWA + static Harbor assets)
  │    ├─ Query phishing (?api=, ?upgrade=, ?translator=)     ← HARDENED 2026-10-01
  │    ├─ XSS / clickjacking / missing CSP
  │    ├─ localStorage spoof (guest id, Harbor XP, history)
  │    └─ Service worker + Web Push navigate
  ├─ /api/* (Vercel serverless → Express)
  │    ├─ Guest paid paths (translate, TTS, speech, cam)
  │    ├─ Signed-in Free scrape (skips guest IP RL)
  │    ├─ Docs Vision / OOXML DoS
  │    ├─ Harbor / Practice leaderboards (client scores)
  │    ├─ Admin DeepSeek / Resend / push fan-out
  │    └─ Webhooks (Stripe / Auth hooks)
  ├─ Supabase (Auth + PostgREST + Realtime)
  │    ├─ Anon key + RLS
  │    ├─ Realtime Harbor chat soft-trust
  │    └─ Service-role (server only — Critical if leaked)
  └─ Stripe / Azure / DeepSeek / Resend (provider keys in Vercel)
```

---

## 1. Critical (none open today)

No live Critical finding in current `main` + prod health.

| Hypothetical Critical | Status |
| --- | --- |
| Service role / Stripe secret in client | Not found |
| Unauthenticated `/api/admin/*` | All `requireAdmin`; probe 401 |
| `YUE_OPEN_MODE=1` in prod | Prod `mode: cloud`; `vercel.json` pins `0` |
| Stripe webhook without signature | `constructEvent` required |

---

## 2. High — what can still hurt you

### A. Money / token burn (AI scrapers & bots)

| Attack | How | Current brake | Residual |
| --- | --- | --- | --- |
| Guest DeepSeek flood | `POST /api/translate` | IP RL 30/min | Multi-isolate RL reset; no monthly $ hard cap |
| Free signed-in scraper | Same + Bearer skips IP RL | Plan is “unlimited text” by design | Unbounded DeepSeek until you change product |
| Guest TTS / Harbor auto-speak | `POST /api/tts` | 2000 chars/req; Free char cap N/A for guest | **Unlimited guest TTS (product)** |
| Speech token under-meter | Mint + skip heartbeat | Prepaid debit | Was TTL 180 vs debit 60 — **FIXED** (TTL ≤ prepaid) |
| `forDocs` Vision free ride | Cam scan with `forDocs` without commit | Docs login | Was unmetered — **FIXED** (1 page / success) |
| Free email farm | New Free accounts × quotas | Soft | NEEDS_HUMAN (fraud / phone verify) |
| Zip bomb on docs | Fat OOXML | 8MB compressed | Entry/text caps — **HARDENED** |

### B. Auth / identity

| Attack | How | Status |
| --- | --- | --- |
| Phish `?api=https://evil` → steal JWT | SPA sent Bearer to attacker | **FIXED** (same-origin API base only) |
| Household invite accept without email match | Null JWT email skipped check | **FIXED** (email required) |
| Rotate guest device UUID | New trial meters | Residual + IP registry |
| Steal admin JWT | Full admin blast radius | NEEDS_HUMAN (MFA) |
| OAuth redirect allowlist loose | Token to evil origin | NEEDS_HUMAN (Supabase Dashboard) |

### C. Integrity / reputation

| Attack | How | Status |
| --- | --- | --- |
| Harbor leaderboard spoof | `PUT /api/harbor-quest` client XP/gold | **ACCEPTED (beta)** — Henry 2026-10-01: leave client-trusted; not competitive integrity |
| Practice Partner board spoof | `PUT /api/practice-partner/leaderboard` | **ACCEPTED (beta)** — same as Harbor |
| Harbor Realtime chat impersonation | Client-chosen userId/username | NEEDS_HUMAN (Realtime auth) |
| Gift spam after inventory spoof | Gift API + public UUIDs | Soft RL only |

---

## 3. Medium

| Attack | Category | Fixability |
| --- | --- | --- |
| Clickjacking / missing CSP `frame-ancestors` | config | NEEDS_HUMAN (embed policy for `?view=app`) |
| Query `?upgrade=` / site link open redirect | abuse | **FIXED** (same-origin sanitize) |
| Push notification absolute URL open | abuse | **FIXED** (SW + App sanitize) |
| Practice Partner `#/practice` UI for non-admins (403 on chat) | auth UX | NEEDS_HUMAN (hide until consumer API) |
| PDF commit client-trusted pages | metering | NEEDS_HUMAN |
| Docs routes no IP/user RPM | abuse | NEEDS_HUMAN |
| Admin Practice Partner / email draft uncapped LLM | abuse | NEEDS_HUMAN |
| Admin email `srcDoc` XSS in preview | injection | **FIXED** (`sandbox=""`) |
| Meter DB fail-open (empty usage) | metering | AUTOMATED candidate (fail-closed 503) |
| XFF leftmost hop spoof off-Vercel | abuse | AUTOMATED if you leave Vercel |

---

## 4. Low / by design

- Public Supabase anon key (`/api/auth-config`) — RLS must stay tight  
- Public Harbor/Practice leaderboard UUIDs  
- Legal markdown `dangerouslySetInnerHTML` with escape + href allowlist  
- Google Fonts CDN (no SRI)  
- `npm audit` Express/`qs` moderate (api)  
- Duplicate migration prefix `025_*`  

---

## 5. Full route risk register (condensed)

**Public / recon:** `health`, `entitlement`, `auth-config`, `push/config`, Harbor + Practice leaderboard GET  

**Guest burn:** `translate`, `breakdown`, `details/enrich`, `tts`★, `speech-token`, `camera/scan`, heartbeats  

**User burn:** docs/*, prefs, history, Harbor PUT/gift, Practice leaderboard PUT, billing checkout  

**Webhook:** Stripe, signup-notify, auth-send-email  

**Admin (stolen JWT = game over):** plan/role, ban, CSV PII, email blast, push all, Practice Partner chat, bug AI, incident banner  

★ Guest TTS intentionally uncapped by IP.

---

## 6. JyutTranslate.com production checklist (ops)

Do these in dashboards (NEEDS_HUMAN):

1. **Supabase → Auth → URL configuration** — Site URL = `https://www.jyuttranslate.com`; Redirect URLs only www + localhost (no `*`).  
2. **Confirm migrations applied** — especially `035` (Harbor progress service-role writes), `022`/`023` TTS columns if still missing, `026` history TTL.  
3. **Vercel env** — `YUE_OPEN_MODE=0`, `YUE_REQUIRE_LOGIN=1`, `YUE_APP_URL=https://www.jyuttranslate.com`; never put service role in `VITE_*`.  
4. **Stripe webhook** — signing secret set; only Checkout sessions your API creates.  
5. **Auth hooks** — Send Email + Signup secrets rotated; not empty.  
6. **Optional CSP** — start with `frame-ancestors 'self'` (decide WordPress embed story first).  
7. **Vercel Firewall** — rate-limit `/api/translate`, `/api/tts`, `/api/speech-token`, `/api/camera/scan`.  
8. **Admin allowlist** — keep `YUE_ADMIN_EMAILS` short; prefer MFA on those Google accounts.

---

## 7. AUTOMATED hardenings shipped 2026-10-01

1. Block foreign `?api=` (Bearer exfil)  
2. Sanitize `?upgrade=` / site `translator|pricing|marketing` query URLs  
3. Push SW + App navigate same-origin only  
4. Speech token TTL ≤ prepaid debit  
5. Debit 1 docs page on successful `forDocs` camera scan  
6. Household invite accept requires matching email  
7. OOXML entry / expand caps (pages + engine)  
8. Admin email preview iframes `sandbox=""`  
9. `safeUrl` smoke tests  

---

## 8. Recommended priority for Henry

| Priority | Action | Who |
| --- | --- | --- |
| P0 | Merge + deploy this hardenings PR | Henry |
| P0 | Apply pending Supabase migrations (`035`, etc.) | Henry |
| P1 | ~~Decide Harbor + Practice leaderboard trust~~ → **Accepted beta spoof (2026-10-01)** | — |
| P1 | Guest TTS IP RL and/or Harbor TTS budget if Azure bill spikes | Henry |
| P2 | Upstash shared rate limits + Vercel Firewall rules | Henry |
| P2 | CSP `frame-ancestors` (optional; embed policy first) | Henry |
| P2 | Before consumer Practice Partner: hard caps + server chat history | Henry |
| P3 | Self-serve account deletion; fail-closed when usage DB down | Eng |

---

## 9. Healthy controls (keep these)

- Prod open-mode off; require-login on  
- Admin `requireAdmin` on every admin route  
- Stripe `constructEvent`; Auth hooks Standard Webhooks  
- Guest IP RL on translate / breakdown / speech / camera  
- Guest device + network trial anchors  
- Speech prepaid debit; Cam scan credits; AI vision hard caps  
- Docs require login; JSON 256kb / Cam+docs 12mb  
- History 14-day TTL  
- CORS allowlist; HSTS on Vercel  
- Cloud agents forbidden from unpaid DeepSeek/Azure probes (`AGENTS.md`)  

---

*Re-run: Vulnerability Scanner automation or chat “follow security-guardian.md full repo”. Update `security-baseline.md` when findings change.*
