# Entitlements & usage metering

Meter **live minutes** per plan. **Text translation**, character breakdown, and **tap-to-play voice (TTS)** are free for guests and all signed-in users when `YUE_REQUIRE_LOGIN=1`. Live mic still requires login + plan quota. **Auto-speak** stays on Pro/Max.

按方案计量**实时分钟**。**文字翻译**、逐字拆解与**点击喇叭朗读（TTS）**对访客与所有登录用户免费。实时麦克风仍须登录并受方案配额限制。**自动朗读**仍属专业版／旗舰版。

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

`allowed.tts` is always `true` except for disabled accounts. `tts_chars` / remaining values may still be recorded for analytics but do **not** gate the speaker.

除已停用账户外，`allowed.tts` 恒为 `true`。`tts_chars`／剩余值仍可作分析记录，但**不会**锁喇叭。

## Gate points / 闸门

| Endpoint / 接口 | Gate / 闸门 |
| --- | --- |
| `GET /speech-token` | live entitlement / 实时权益 |
| `POST /usage/heartbeat` | live entitlement, then add seconds / 先检查实时权益，再累加秒数 |
| `POST /tts` | always allowed (except disabled); soft-meters chars when signed in / 除停用外一律可用；登录后软计量字数 |
| `POST /translate` | `allowed.textTranslate` (always true for guests); increments `translate_count` when metered / 文字翻译权限（访客可用）；计量开启时累加翻译次数 |
| `POST /breakdown` | same as translate / 同文字翻译 |

Usage writes go through `increment_usage` (migration `003_usage_increment.sql`) so concurrent TTS / live / translate updates cannot overwrite sibling counters. The web client also flushes elapsed live seconds when a mic session ends (not only every 15s), so short hold/tap turns are counted.

用量写入走 `increment_usage`（迁移 `003_usage_increment.sql`），避免并发朗读／实时／翻译互相覆盖。网页端在麦克风会话结束时也会冲刷已用秒数（不只每 15 秒一次），短按／点按也会计入。

Admin panel (`#/admin`, allowlist `YUE_ADMIN_EMAILS`): see `docs/admin.md`.

管理后台（`#/admin`，邮箱白名单 `YUE_ADMIN_EMAILS`）：见 `docs/admin.md`。

Production Vercel defaults in `vercel.json`: `YUE_OPEN_MODE=0`, `YUE_REQUIRE_LOGIN=1`. Guests can use text mode and tap-to-play voice at `#/app`; live mic prompts sign-in via the Plan chip and API 401.

生产环境 Vercel 默认（`vercel.json`）：`YUE_OPEN_MODE=0`、`YUE_REQUIRE_LOGIN=1`。访客可在 `#/app` 使用文字模式与点击朗读；实时麦克风通过 Plan 芯片与 API 401 提示登录。
