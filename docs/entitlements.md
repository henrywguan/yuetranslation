# Entitlements & usage metering

Meter **live minutes** and **TTS** per plan; guests must **sign in** when `YUE_REQUIRE_LOGIN=1` before using the app (live, text, breakdown, TTS).

按方案计量**实时分钟**与**朗读**；当 `YUE_REQUIRE_LOGIN=1` 时，访客须**登录**后才可使用应用（实时、文字、拆解、朗读）。

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
    "tts_chars": 0,
    "auto_speak": false,
    "can_live": true,
    "text_translate": true
  },
  "usage": { "month": "2026_08", "liveSeconds": 120, "ttsChars": 0, "translateCount": 3 },
  "remaining": { "liveSeconds": 1080, "ttsChars": 0 },
  "allowed": { "live": true, "autoSpeak": false, "textTranslate": true, "tts": false },
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
| `POST /translate` | `allowed.textTranslate` (401 when login required) / 文字翻译权限（未登录返回 401） |
| `POST /breakdown` | same as translate / 同文字翻译 |

Production Vercel defaults in `vercel.json`: `YUE_OPEN_MODE=0`, `YUE_REQUIRE_LOGIN=1`. The web app gate at `#/app` shows sign-in before the translator when Supabase is configured.

生产环境 Vercel 默认（`vercel.json`）：`YUE_OPEN_MODE=0`、`YUE_REQUIRE_LOGIN=1`。配置了 Supabase 时，`#/app` 会先显示登录再进入翻译器。

Local open mode (`YUE_OPEN_MODE=1`) grants generous Pro-like limits for development — see `apps/api/.env.example`.

本地开放模式（`YUE_OPEN_MODE=1`）会给予接近专业版的宽松限额，便于开发 — 见 `apps/api/.env.example`。
