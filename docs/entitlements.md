# WordPress entitlement checks (sketch → implementation)

## Goal

Meter **live minutes** and **TTS** for freemium launch; keep text + Jyutping available.

## Snapshot shape

Returned by `/health` and `/entitlement`:

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
| `GET /speech-token` | `Yue_Entitlements::assert_can_live()` |
| `POST /usage/heartbeat` | `assert_can_live()` then add seconds |
| `POST /tts` | `assert_can_tts()` then add char usage |
| `POST /translate` | `allowed.textTranslate` only |

HTTP **401** = login required; **402** = quota / plan block. Error payload includes `entitlement` for UI refresh.

## Frontend behavior

- Bootstrap from `/health`.
- Disable Start when `!allowed.live`; show Log in / Upgrade.
- Heartbeat every 15s while live; stop session when exhausted.
- Auto-speak toggle disabled when `!allowed.autoSpeak`.

## Storage

- Logged-in: user meta `yue_usage_YYYY_mm`
- Guest (if allowed): transient keyed by IP hash + month
