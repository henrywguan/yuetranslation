# Local phone testing (HTTPS tunnel)

Browsers only allow the **microphone** in a [secure context](https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts): `https://…` or `http://localhost`.

| URL | Page | Mic |
| --- | --- | --- |
| `http://localhost:5173` | Yes | Yes (same computer) |
| `http://192.168.x.x:5173` | Yes | No (LAN HTTP is blocked) |
| Cloudflare quick tunnel | Yes | Yes |

## Setup

```bash
npm run dev:api
npm run dev:web
npm run dev:tunnel   # third terminal — prints https://….trycloudflare.com
```

Open the printed URL on the phone. Vite already proxies `/api`, so only tunnel **5173**. Each `dev:tunnel` run gets a **new** URL.

For reliable iPhone STT, set `AZURE_SPEECH_KEY` (+ region) in `apps/api/.env` and restart `dev:api`. Without Azure, iOS Web Speech must start inside the tap gesture and is flakier.

## Real translate vs `（示範）`

`（示範）…` means no model key **and** no phrase/lexicon hit. Put `OPENAI_API_KEY` in `apps/api/.env` (not `apps/web`), restart `dev:api`, then:

```bash
curl -s http://localhost:8787/api/health
```

Need `"openai": true` / `"demo": false` for the model path. Dictionary hits still return real text when `"demo": true`.

Quality checks: [testing.md](./testing.md).

## Troubleshooting

- **“This host is not allowed”** — restart `npm run dev:web` (Vite already allows `.trycloudflare.com` / ngrok).
- **Tunnel up but no translate** — keep `dev:api` running.
- **Mic blocked / no speech** — use the HTTPS tunnel, not `http://192.168.x.x`. Allow the mic prompt.
- **Windows firewall** — allow Node / cloudflared on private networks if asked.

Optional: `npx --yes ngrok http 5173` instead of cloudflared.
