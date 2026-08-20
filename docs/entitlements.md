# Entitlements & usage metering

Meter **live minutes** and **TTS** per plan. **Text translation** (and character breakdown) stay available without sign-in; live mic requires login + plan quota when `YUE_REQUIRE_LOGIN=1`. Signed-in **free** users can tap the speaker for TTS (~30k chars/month). **Auto-speak** stays on Pro/Max.

按方案计量**实时分钟**与**朗读**。**文字翻译**（及逐字拆解）无需登录；当 `YUE_REQUIRE_LOGIN=1` 时，实时麦克风须登录并受方案配额限制。已登录的**免费**用户可点喇叭播放语音（每月约 3 万字）。**自动朗读**仍属专业版／旗舰版。

Implemented in the local Express API (`apps/api`) and the WordPress plugin (`wordpress/yue-translator`).

实现于本地 Express 接口（`apps/api`）与 WordPress 插件（`wordpress/yue-translator`）。

## Snapshot shape / 快照结构

Returned by `/api/health` and `/api/entitlement`:

由 `/api/health` 与 `/api/entitlement` 返回：

```json
{
  "loggedIn": true,
  "requireLogin": true,
  "plan": "free",
  "limits": {
    "plan": "free",
    "live_minutes": 20,
    "tts_chars": 30000,
    "auto_speak": false,
    "can_live": true,
    "text_translate": true
  },
  "usage": { "month": "2026_08", "liveSeconds": 120, "ttsChars": 0, "translateCount": 3 },
  "remaining": { "liveSeconds": 1080, "ttsChars": 30000 },
  "allowed": { "live": true, "autoSpeak": false, "textTranslate": true, "tts": true },
  "upgradeUrl": "https://example.com/pricing",
  "loginUrl": "https://example.com/wp-login.php",
  "reason": null
}
```

## Gate points / 闸门

| Endpoint / 接口 | Gate / 闸门 |
| --- | --- |
| `GET /speech-token` | live entitlement / 实时权益 |
| `POST /usage/heartbeat` | live entitlement, then add seconds / 先检查实时权益，再累加秒数 |
| `POST /tts` | TTS entitlement, then add char usage / 先检查朗读权益，再累加字数 |
| `POST /translate` | `allowed.textTranslate` (always true for guests) / 文字翻译权限（访客可用） |
| `POST /breakdown` | same as translate / 同文字翻译 |

Production Vercel defaults in `vercel.json`: `YUE_OPEN_MODE=0`, `YUE_REQUIRE_LOGIN=1`. Guests can use text mode at `#/app`; live mic prompts sign-in via the Plan chip and API 401.

生产环境 Vercel 默认（`vercel.json`）：`YUE_OPEN_MODE=0`、`YUE_REQUIRE_LOGIN=1`。访客可在 `#/app` 使用文字模式；实时麦克风通过 Plan 芯片与 API 401 提示登录。

Local open mode (`YUE_OPEN_MODE=1`) grants generous Pro-like limits for development — see `apps/api/.env.example`.

本地开放模式（`YUE_OPEN_MODE=1`）会给予接近专业版的宽松限额，便于开发 — 见 `apps/api/.env.example`。
