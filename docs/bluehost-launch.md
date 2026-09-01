# JyutTranslate — Bluehost launch guide
# 粤译 — Bluehost 上线指南

> **Note / 注意：** Production entitlements, Business plan, Cam Documents, Stripe, and Resend admin tools live on **Vercel**. This WordPress package is a **secondary** deploy path and may lag (no Business / Documents parity guaranteed). Canonical limits: [entitlements.md](./entitlements.md) · Cam: [camera.md](./camera.md).
>
> 生产环境的权益、旗舰版、相机文件、Stripe 与 Resend 管理工具以 **Vercel** 为准。本 WordPress 包为**次要**部署路径，可能落后。套餐以 entitlements 文档为准。

Freemium launch: **WordPress plugin hosts the PWA**; **Azure Speech** (`zh-HK` STT/TTS) and **OpenAI** (colloquial 粤语) run through plugin REST.

免费增值上线方式：**WordPress 插件托管 PWA**；**Azure Speech**（`zh-HK` 语音识别/合成）与 **OpenAI**（口语粤语）经由插件 REST 转发。

Shared hosting does not run a local STT / MT / TTS stack — keys live in the plugin settings.

共享主机不运行本地语音识别 / 机器翻译 / 语音合成服务 — 密钥写在插件设置里。

## What Bluehost hosts / Bluehost 托管内容

| Layer / 层级 | Where / 位置 |
| --- | --- |
| UI / PWA | `wordpress/yue-translator/app/` (built assets / 构建产物) |
| Entitlements + usage / 权益与用量 | Plugin PHP (`Yue_Entitlements`, `Yue_Usage`) |
| Speech token + TTS / 语音令牌与朗读 | Plugin → Azure |
| Translate / 翻译 | Plugin → OpenAI (no local phrase/lexicon harden — keep an OpenAI key in production / 生产环境请配置 OpenAI 密钥，插件侧无本地短语词库加固) |

Plan snapshot and gate table: [entitlements.md](./entitlements.md).

套餐快照与闸门表见 [entitlements.md](./entitlements.md)。

## Install / 安装

```bash
npm run build:web:wp
```

1. Upload `wordpress/yue-translator/` to `wp-content/plugins/yue-translator/`.  
   将 `wordpress/yue-translator/` 上传到 `wp-content/plugins/yue-translator/`。
2. Activate **JyutTranslate**.  
   启用 **JyutTranslate（粤译）**。
3. Settings → JyutTranslate: Azure Speech key/region + OpenAI key.  
   设置 → JyutTranslate：填写 Azure Speech 密钥/区域以及 OpenAI 密钥。
4. Set **Upgrade URL** to your pricing / MemberPress checkout page.  
   将 **Upgrade URL（升级链接）** 设为定价页或 MemberPress 结账页。
5. Shortcodes / 短代码:
   - `[yue_translator]` — translator (`view=app` in a phone-sized iframe) / 翻译器（手机尺寸 iframe，`view=app`）
   - `[yue_splash]` — marketing landing (optional if marketing is static files) / 营销首页（若营销站已是静态文件则可省略）

The shortcode passes `api=` and `nonce=` (WP REST nonce). The PWA sends `credentials: 'include'` and `X-WP-Nonce`.

短代码会传入 `api=` 与 `nonce=`（WordPress REST nonce）。PWA 请求带 `credentials: 'include'` 与 `X-WP-Nonce`。

## Hybrid marketing + Bricks translator / 静态营销站 + Bricks 翻译页

Recommended: **static marketing files** for the brand site, and a **Bricks (or WP) page** with `[yue_translator]`.

推荐做法：品牌站用**静态营销文件**，产品页用 **Bricks（或 WordPress）页面** 放入 `[yue_translator]`。

```bash
npm run build:web:marketing   # → dist-marketing/
npm run build:web:wp          # → wordpress/yue-translator/app/
```

Copy `dist-marketing/` onto Bluehost (subdirectory or subdomain). Do **not** overwrite WordPress’s root `index.php`.

将 `dist-marketing/` 复制到 Bluehost（子目录或子域名）。**不要**覆盖 WordPress 根目录的 `index.php`。

Edit `site-config.json` next to that `index.html` (no rebuild):

在该 `index.html` 旁编辑 `site-config.json`（无需重新构建）：

```json
{
  "translatorUrl": "https://yoursite.com/translate",
  "pricingUrl": "https://yoursite.com/pricing",
  "marketingUrl": "https://yoursite.com/welcome/"
}
```

Leave a field empty to keep in-app hash routes (`#/app`, `#/pricing`) — useful for local `npm run dev:web`. Query params `?translator=` / `?pricing=` override for testing.

某字段留空则继续使用应用内哈希路由（`#/app`、`#/pricing`）— 适合本地 `npm run dev:web`。查询参数 `?translator=` / `?pricing=` 可在测试时覆盖。

Create a Bricks page (e.g. `/translate`) and place `[yue_translator]`. Match **Upgrade URL** to `pricingUrl`.

新建 Bricks 页面（例如 `/translate`）并放入 `[yue_translator]`。插件里的 **Upgrade URL** 应与 `pricingUrl` 一致。

| Piece / 部分 | When to refresh / 何时更新 |
| --- | --- |
| Static marketing folder / 静态营销目录 | Landing redesign → `build:web:marketing` and re-upload / 首页改版后重新构建并上传 |
| Plugin `app/` / 插件 `app/` | Translator UI changes → `build:web:wp` and re-upload plugin / 翻译界面改动后重新构建并上传插件 |
| `site-config.json` | URL changes on the static host / 静态站点上的网址变更时 |

## Entitlement model / 权益模型

| Plan / 套餐 | Live mic / 实时麦克风 | Camera / 相机 | Tap-to-play TTS / 点击朗读 | Auto-speak / 自动朗读 | Text + Jyutping / 文字 + 粤拼 |
| --- | --- | --- | --- | --- | --- |
| Guest / 访客 | Blocked (sign-in) / 不可用（需登录） | Blocked / 不可用 | Allowed (unmetered try) / 可用（不计费试用） | Blocked / 不可用 | Allowed / 可用 |
| Free / 免费 | ~5 min/mo (configurable) / 约每月 5 分钟（可配置） | ~1 hr/mo camera / 约每月 1 小时相机 | Metered hard cap / 字数硬上限 | Off / 关闭 | Allowed / 可用 |
| Family / 家庭版 | ~1 hr/mo / 约每月 1 小时 | 8 hr/mo camera / 每月 8 小时相机 | Unlimited (usage tracked) / 无限（仍计数） | On / 开启 | Allowed / 可用 |

Runtime: health snapshot → `GET /speech-token` for live → heartbeat every 15s → `POST /tts` for tap-to-play / auto-speak. Solo typing uses `POST /translate` (not gated by live minutes). Camera uses `POST /camera/scan` + `POST /usage/camera-heartbeat` (see [camera.md](./camera.md)).

运行时：健康快照 → 实时会话调用 `GET /speech-token` → 每 15 秒心跳 → 点击朗读／自动朗读调用 `POST /tts`。独白文字走 `POST /translate`（不受实时分钟数限制）。相机走 `POST /camera/scan` 与 `POST /usage/camera-heartbeat`（见 [camera.md](./camera.md)）。

Plan resolution: capability `yue_family` (legacy `yue_pro`) → user meta `yue_plan` → filter `yue_user_plan` → default `free` / `guest`.

套餐判定顺序：能力 `yue_family`（旧名 `yue_pro`）→ 用户元数据 `yue_plan` → 过滤器 `yue_user_plan` → 默认 `free` / `guest`。

```php
add_filter('yue_user_plan', function ($plan, $user_id) {
    if (function_exists('mepr_user_has_active_membership') && mepr_user_has_active_membership($user_id)) {
        return 'family';
    }
    return $plan;
}, 10, 2);
```

## Local cloud testing (no WordPress) / 本地云测试（无需 WordPress）

```bash
cp apps/api/.env.example apps/api/.env
# add keys; YUE_OPEN_MODE=1 for unrestricted local use
# 填写密钥；YUE_OPEN_MODE=1 可在本地放开限额
npm run dev:api
npm run dev:web
```

Open `http://localhost:5173` — Vite proxies `/api` to Express. Phone mic needs HTTPS: [local-phone-testing.md](./local-phone-testing.md).

打开 `http://localhost:5173` — Vite 将 `/api` 代理到 Express。手机麦克风需要 HTTPS：见 [local-phone-testing.md](./local-phone-testing.md)。
