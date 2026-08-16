# WordPress entitlement checks

Meter **live minutes** and **TTS** for freemium launch; keep text + Jyutping available.

Implemented in the local Express API (`apps/api`) and the WordPress plugin (`wordpress/yue-translator`).

## Snapshot shape

Returned by `/api/health` and `/api/entitlement`:

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

## Gate points

| Endpoint | Gate |
| --- | --- |
| `GET /speech-token` | live entitlement |
| `POST /usage/heartbeat` | live entitlement, then add seconds |
| `POST /tts` | TTS entitlement, then add char usage |
| `POST /translate` | `allowed.textTranslate` only |

Local open mode (`YUE_OPEN_MODE=1`) grants generous Pro-like limits for development — see `apps/api/.env.example`.
