# Local phone testing (HTTPS tunnel)
# 本地手机测试（HTTPS 隧道）

Browsers only allow the **microphone** in a [secure context](https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts): `https://…` or `http://localhost`.

浏览器只在[安全上下文](https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts)中允许使用**麦克风**：`https://…` 或 `http://localhost`。

| URL | Page / 页面 | Mic / 麦克风 |
| --- | --- | --- |
| `http://localhost:5173` | Yes / 可以 | Yes (same computer) / 可以（同一台电脑） |
| `http://192.168.x.x:5173` | Yes / 可以 | No (LAN HTTP is blocked) / 不可以（局域网 HTTP 会被拦截） |
| Cloudflare quick tunnel / Cloudflare 快速隧道 | Yes / 可以 | Yes / 可以 |

## Setup / 设置

```bash
npm run dev:api
npm run dev:web
npm run dev:tunnel   # third terminal — prints https://….trycloudflare.com
                     # 第三个终端 — 会打印 https://….trycloudflare.com
```

Open the printed URL on the phone. Vite already proxies `/api`, so only tunnel **5173**. Each `dev:tunnel` run gets a **new** URL.

在手机上打开打印出的网址。Vite 已经把 `/api` 代理出去，因此只需隧道 **5173**。每次运行 `dev:tunnel` 都会得到**新**网址。

For reliable iPhone STT, set `AZURE_SPEECH_KEY` (+ region) in `apps/api/.env` and restart `dev:api`. Without Azure, iOS Web Speech must start inside the tap gesture and is flakier.

若要在 iPhone 上稳定识别，请在 `apps/api/.env` 填写 `AZURE_SPEECH_KEY`（及区域）并重启 `dev:api`。没有 Azure 时，iOS 网页语音必须在点击手势内启动，稳定性较差。

## Real translate vs `（示範）` / 真实翻译与演示前缀

`（示範）…` means no model key **and** no phrase/lexicon hit. Put `OPENAI_API_KEY` in `apps/api/.env` (not `apps/web`), restart `dev:api`, then:

`（示範）…` 表示没有模型密钥**且**未命中短语或词库。请把 `OPENAI_API_KEY` 写在 `apps/api/.env`（不要写在 `apps/web`），重启 `dev:api`，然后：

```bash
curl -s http://localhost:8787/api/health
```

Need `"openai": true` / `"demo": false` for the model path. Dictionary hits still return real text when `"demo": true`.

模型通路需要 `"openai": true` / `"demo": false`。即使 `"demo": true`，词典命中仍会返回真实文本。

Quality checks: [testing.md](./testing.md).

质量检查见 [testing.md](./testing.md)。

## Troubleshooting / 故障排除

- **“This host is not allowed” / 「此主机不允许」** — restart `npm run dev:web` (Vite already allows `.trycloudflare.com` / ngrok).  
  重启 `npm run dev:web`（Vite 已允许 `.trycloudflare.com` / ngrok）。
- **Tunnel up but no translate / 隧道通了但无法翻译** — keep `dev:api` running.  
  请保持 `dev:api` 运行。
- **Mic blocked / no speech / 麦克风被拦或没有语音** — use the HTTPS tunnel, not `http://192.168.x.x`. Allow the mic prompt.  
  使用 HTTPS 隧道，不要用 `http://192.168.x.x`。请允许麦克风权限提示。
- **Windows firewall / Windows 防火墙** — allow Node / cloudflared on private networks if asked.  
  若系统询问，请允许 Node / cloudflared 访问专用网络。

Optional: `npx --yes ngrok http 5173` instead of cloudflared.

可选：用 `npx --yes ngrok http 5173` 代替 cloudflared。
