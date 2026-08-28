# Entitlements & usage metering

Meter **live minutes** per plan. **Text translation** and character breakdown stay free for guests. **Tap-to-play voice (TTS)** is available to guests without login; **Free** is metered with a hard monthly char cap; **Pro/Max** are metered but **unlimited**. **Auto-speak** stays on Pro/Max. Live mic still requires login + plan quota. **Camera translation** requires login: Free has a hard monthly **camera minutes** cap (`YUE_FREE_CAMERA_MINUTES`, default 60); Pro has an 8 hr/mo cap (`YUE_PRO_CAMERA_MINUTES`, default 480); Max is unlimited but counted — see `docs/camera.md`.

按方案计量**实时分钟**。**文字翻译**与逐字拆解对访客免费。**点击喇叭朗读（TTS）**访客可不登录试用；**免费版**按月字数硬上限计量；**专业版／旗舰版**计量但**无限**。**自动朗读**仍属专业版／旗舰版。实时麦克风仍须登录并受方案配额限制。**相机翻译**须登录：免费版有每月**相机分钟**硬上限（`YUE_FREE_CAMERA_MINUTES`，默认 60）；专业版每月 8 小时（`YUE_PRO_CAMERA_MINUTES`，默认 480）；旗舰版无限但仍计数 — 见 `docs/camera.md`。

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
    "live_minutes": 5,
    "tts_chars": 30000,
    "camera_minutes": 5,
    "auto_speak": false,
    "can_live": true,
    "can_camera": true,
    "text_translate": true
  },
  "usage": { "month": "2026_08", "liveSeconds": 120, "ttsChars": 0, "translateCount": 3, "cameraSeconds": 40, "cameraTranslateCount": 2 },
  "remaining": { "liveSeconds": 1080, "ttsChars": 30000, "cameraSeconds": 260 },
  "ttsUnlimited": false,
  "cameraUnlimited": false,
  "allowed": { "live": true, "autoSpeak": false, "textTranslate": true, "tts": true, "camera": true },
  "upgradeUrl": "https://example.com/pricing",
  "loginUrl": "https://example.com/wp-login.php",
  "reason": null
}
```

Pro/Max snapshots set `ttsUnlimited: true` and `limits.tts_chars: 0`. Max also sets `cameraUnlimited: true` with `limits.camera_minutes: 0`. Pro uses `camera_minutes: 480` (8 hr) and `cameraUnlimited: false`. The plan chip shows `{used} used / unlimited` for voice on Pro/Max and for camera on Max; Free and Pro show time/chars left.

专业版／旗舰版快照带 `ttsUnlimited: true` 且 `limits.tts_chars: 0`。旗舰版另设 `cameraUnlimited: true` 与 `limits.camera_minutes: 0`。专业版为 `camera_minutes: 300`（5 小时）且 `cameraUnlimited: false`。计划芯片上 Pro/Max 语音显示 `{已用} used / unlimited`；Max 相机亦同；免费版与专业版显示剩余。

## Gate points / 闸门

| Endpoint / 接口 | Gate / 闸门 |
| --- | --- |
| `GET /speech-token` | live entitlement / 实时权益 |
| `POST /usage/heartbeat` | live entitlement, then add seconds / 先检查实时权益，再累加秒数 |
| `POST /tts` | Free: char quota; Pro/Max: always (usage counted); guests: allowed / 免费版字数；专业版无限（仍计数）；访客可用 |
| `POST /translate` | `allowed.textTranslate` (always true for guests); increments `translate_count` when metered / 文字翻译权限（访客可用）；计量开启时累加翻译次数 |
| `POST /breakdown` | same as translate / 同文字翻译 |
| `POST /camera/scan` | `allowed.camera` (login required); may increment `camera_translate_count` / 相机权限（须登录） |
| `POST /usage/camera-heartbeat` | camera entitlement, then add `cameraSeconds` / 相机权益后累加秒数 |

Usage writes go through `increment_usage` (migration `003_usage_increment.sql`) so concurrent TTS / live / translate updates cannot overwrite sibling counters. The web client also flushes elapsed live seconds when a mic session ends (not only every 15s), so short hold/tap turns are counted.

用量写入走 `increment_usage`（迁移 `003_usage_increment.sql`），避免并发朗读／实时／翻译互相覆盖。网页端在麦克风会话结束时也会冲刷已用秒数（不只每 15 秒一次），短按／点按也会计入。

Admin panel (`#/admin`, allowlist `YUE_ADMIN_EMAILS`): see `docs/admin.md`.

管理后台（`#/admin`，邮箱白名单 `YUE_ADMIN_EMAILS`）：见 `docs/admin.md`。

Production Vercel defaults in `vercel.json`: `YUE_OPEN_MODE=0`, `YUE_REQUIRE_LOGIN=1`. Guests can use Solo text translate and tap-to-play voice at `#/app`; live mic prompts sign-in via the Plan chip and API 401. Free users are TTS-capped; Pro/Max are unlimited.

生产环境 Vercel 默认（`vercel.json`）：`YUE_OPEN_MODE=0`、`YUE_REQUIRE_LOGIN=1`。访客可在 `#/app` 使用文字模式与点击朗读；实时麦克风通过 Plan 芯片与 API 401 提示登录。免费版有 TTS 上限；专业版／旗舰版无限。
