# Entitlements & usage metering

Canonical plan limits for the **Vercel** stack (`apps/api` + Supabase + Stripe). The WordPress plugin is a secondary surface and may not match these defaults — see [bluehost-launch.md](./bluehost-launch.md).

Vercel 生产栈的套餐与计量以本文为准。WordPress 插件为次要表面，默认值可能不一致。

## Guest & Free / 访客与免费版

| Capability | Guest | Free (signed in) |
| --- | --- | --- |
| Solo text translate + Jyutping | Yes | Yes |
| Tap-to-play TTS | Yes (counts against Free cap once signed in) | Metered hard cap |
| Live mic / auto-speak | Sign-in required | Live: metered; auto-speak: Family/Business |
| Cam AR / Upload / Documents | Sign-in required | Yes (camera + docs caps) |

Production (`vercel.json`): `YUE_OPEN_MODE=0`, `YUE_REQUIRE_LOGIN=1`. Guests use Solo text + tap TTS at `#/app`; live mic and Cam prompt sign-in.

## Default limits / 默认上限

Code defaults in `apps/api/src/env.ts`. **Production overrides** in `vercel.json` are noted.

| Meter | Free | Family | Business |
| --- | --- | --- | --- |
| Live minutes | `YUE_FREE_LIVE_MINUTES` (default **5**; **prod `vercel.json` = 5**) | `YUE_FAMILY_LIVE_MINUTES` (default **60** = 1 hr; **prod `vercel.json` = 60**) | `YUE_BUSINESS_LIVE_MINUTES` or legacy `YUE_MAX_LIVE_MINUTES` (default 2400) |
| TTS chars | `YUE_FREE_TTS_CHARS` (default **30000**) hard cap | Unlimited (`ttsUnlimited`) — still counted | Unlimited — still counted |
| Camera minutes | `YUE_FREE_CAMERA_MINUTES` (default **60**) | `YUE_FAMILY_CAMERA_MINUTES` (default **480** = 8 hr) | Unlimited (`cameraUnlimited`) — still counted |
| Document pages | `YUE_FREE_DOCS_PAGES` (default **40**) | `YUE_FAMILY_DOCS_PAGES` (default **400**) | Unlimited (`docsUnlimited`) — still counted |
| Auto-speak | No | Yes | Yes |

Marketing copy rounds Family live as “~1 hr”; production sets Family live to **60 minutes** via `vercel.json` (`YUE_FAMILY_LIVE_MINUTES=60`). Prefer this table + env over stale marketing blurbs when debugging quotas.

Camera and Documents share the **same access gate** (signed-in + plan can use cam/docs) but **separate meters**. Details: [camera.md](./camera.md).

## Household seats & pooled usage / 家庭座位与共用用量

Family (**4 seats**) and Business (**10 seats**) can invite members by email from Account Hub.

- One Stripe subscriber is the **owner**; invitees become **members**.
- All members inherit the owner’s plan entitlements.
- Monthly meters (live mic, TTS, camera, documents, AI vision) are **pooled** on `household_usage_months` — not multiplied per seat.
- Pending invites count toward the seat cap until accepted, revoked, or expired.
- Apply migration `012_household_seats_pooled_usage.sql`.
- **Legacy usage:** meters recorded before pooling live in per-user `usage_months`. Run `015_backfill_household_usage_from_legacy.sql` (or `POST /api/admin/household-usage/backfill`) once so historical totals fold into `household_usage_months`.

API: `GET /api/household`, `POST /api/household/invites`, `POST /api/household/accept`, revoke/remove under `/api/household/invites/:id` and `/api/household/members/:userId`.

## Snapshot shape / 快照结构

Returned by `/api/health` and `/api/entitlement`:

```json
{
  "loggedIn": true,
  "requireLogin": true,
  "plan": "free",
  "limits": {
    "plan": "free",
    "live_minutes": 5,
    "tts_chars": 30000,
    "camera_minutes": 60,
    "docs_pages": 40,
    "auto_speak": false,
    "can_live": true,
    "can_camera": true,
    "can_docs": true,
    "text_translate": true
  },
  "usage": {
    "month": "2026_08",
    "liveSeconds": 120,
    "ttsChars": 800,
    "translateCount": 3,
    "cameraSeconds": 40,
    "cameraTranslateCount": 2,
    "docsPages": 4
  },
  "remaining": {
    "liveSeconds": 180,
    "ttsChars": 29200,
    "cameraSeconds": 3560,
    "docsPages": 36
  },
  "ttsUnlimited": false,
  "cameraUnlimited": false,
  "docsUnlimited": false,
  "allowed": {
    "live": true,
    "autoSpeak": false,
    "textTranslate": true,
    "tts": true,
    "camera": true,
    "docs": true
  },
  "upgradeUrl": "https://www.example.com/#/pricing",
  "loginUrl": null,
  "reason": null
}
```

Family/Business: `ttsUnlimited: true` and `limits.tts_chars: 0`. Max: `cameraUnlimited` / `docsUnlimited` true with `limits.camera_minutes` / `docs_pages` = 0. Remaining uses `-1` for unlimited meters.

## Gate points / 闸门

| Endpoint | Gate |
| --- | --- |
| `GET /speech-token` | live |
| `POST /usage/heartbeat` | live, then add seconds |
| `POST /tts` | Free: char quota; Family/Business: always (usage counted); guests: allowed |
| `POST /translate` | `allowed.textTranslate` (guests OK); may increment `translate_count` |
| `POST /breakdown` | same as translate |
| `POST /camera/scan` | `allowed.camera` — or `allowed.docs` when `forDocs: true` (no camera translate meter) |
| `POST /usage/camera-heartbeat` | camera, then add `cameraSeconds` |
| `POST /docs/translate` | `allowed.docs` — Office/TXT; bills pages on success |
| `POST /docs/segments` | `allowed.docs` — PDF text batch; no page bill |
| `POST /docs/commit` | signed-in docs — bill PDF pages after success |

Usage writes go through `increment_usage` (migrations `003` … `010`) so concurrent counters do not overwrite each other. The web client flushes live seconds when a mic session ends. `ai_vision_count` tracks multimodal LLM OCR fallbacks (view-only; no hard cap).

Admin: [admin.md](./admin.md). Stripe Checkout enables **promotion codes** (`allow_promotion_codes` in `apps/api/src/billing.ts`).
