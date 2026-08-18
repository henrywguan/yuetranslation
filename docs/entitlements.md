# WordPress entitlement checks / WordPress 权益检查

Meter **live minutes** and **TTS** for freemium launch; keep text + Jyutping available.

免费增值上线时计量**实时分钟**与**朗读**；文字翻译与粤拼保持可用。

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
| `POST /translate` | `allowed.textTranslate` only / 仅检查文字翻译权限 |

Local open mode (`YUE_OPEN_MODE=1`) grants generous Pro-like limits for development — see `apps/api/.env.example`.

本地开放模式（`YUE_OPEN_MODE=1`）会给予接近专业版的宽松限额，便于开发 — 见 `apps/api/.env.example`。
