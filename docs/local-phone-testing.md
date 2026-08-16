# Local phone testing (HTTPS tunnel)

Browsers only allow the **microphone** (and some crypto APIs) in a [secure context](https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts): `https://…` or `http://localhost`.

That means:

| URL | Page loads? | Mic? | Notes |
| --- | --- | --- | --- |
| `http://localhost:5173` | Yes | Yes | Fine on the same computer as the dev server |
| `http://192.168.x.x:5173` | Yes | No | Safari/Chrome block mic on LAN HTTP |
| `https://192.168.x.x:5173` | No* | — | Vite does not serve TLS by default (*SSL error) |

For **phone** testing on your Wi‑Fi, use a free Cloudflare quick tunnel. It gives you a temporary `https://….trycloudflare.com` URL that points at your local Vite server. No Cloudflare account required for this mode.

## Prerequisites

1. API + web already running locally (from the repo root):

```bash
npm run dev:api
npm run dev:web
```

2. Confirm the app opens on the computer at [http://localhost:5173](http://localhost:5173).

## Start the tunnel

In a **third** terminal, from the repo root:

```bash
npm run dev:tunnel
```

This runs:

```bash
npx --yes cloudflared tunnel --url http://localhost:5173
```

When it connects, cloudflared prints a line like:

```text
https://random-words-here.trycloudflare.com
```

Open **that** URL on your phone (same Wi‑Fi is not required — any network works). Allow the microphone when Safari/Chrome asks.

Vite already proxies `/api` to the local API, so you only tunnel port **5173**.

## Real translate vs `（示範）` demo

If results look like `（示範）Can you hear me?`, the API fell back to **demo echo** — no OpenAI-compatible key **and** no phrase/lexicon hit. Curated phrases (e.g. “what are you doing?”) still translate via dictionary without a key. The PRO badge can still show (entitlements are separate).

1. Put keys in **`apps/api/.env`** (not under `apps/web`):

```bash
OPENAI_API_KEY=sk-...
# Optional DeepSeek / compatible host:
# OPENAI_BASE_URL=https://api.deepseek.com/v1
# OPENAI_MODEL=deepseek-chat
```

2. **Restart** `npm run dev:api` (env is only read at startup).

3. Check:

```bash
curl -s http://localhost:8787/api/health
```

Need `"openai": true` and `"demo": false` for the **model** path. Dictionary/lexicon can still return real text when `"demo": true`.

Automated checks: [testing.md](./testing.md) (`npm run test:translate`).

## Stop

Press `Ctrl+C` in the tunnel terminal. The public URL stops working immediately.

## Cost

Cloudflare **quick tunnels** are free for this local-dev use. You do not need a paid plan or to sign in.

## Troubleshooting

- **Results show `（示範）…` / Jyutping `si6 faan6`** — that is the demo prefix (示範), not a real translation. See [Real translate vs demo](#real-translate-vs-示範-demo). Common causes: keys not in `apps/api/.env`, API not restarted, empty system `OPENAI_API_KEY` blocking the file (fixed by restarting after pull), or `.env` saved with a UTF-8 BOM from Notepad.
- **“Blocked request. This host … is not allowed”** — Vite must allow tunnel hostnames. This repo already sets `server.allowedHosts` for `.trycloudflare.com` (and ngrok). **Restart** `npm run dev:web` after pulling that change, then start a fresh `npm run dev:tunnel` and use the new URL.
- **Tunnel starts but phone can’t translate** — make sure `npm run dev:api` is still running on the computer.
- **Mic still blocked / no speech detected** — use the Cloudflare HTTPS tunnel (not `http://192.168.x.x`). Allow microphone when the browser asks. For reliable Solo/Conversation STT on iPhone, set `AZURE_SPEECH_KEY` (+ region) in `apps/api/.env` and restart `dev:api` — the app keeps the mic stream from the tap and feeds it to Azure (avoids a second mic open after awaits). Without Azure, iOS uses Web Speech started inside the tap gesture (flakier). Silence now auto-stops after ~7s with an error instead of staying “listening” forever.
- **Old tunnel URL 404s** — each `npm run dev:tunnel` creates a **new** URL; use the latest one printed in the terminal.
- **Windows firewall prompt** — allow Node / cloudflared on private networks if Windows asks.
- **Want Text mode on plain `http://192.168.x.x` without a tunnel?** — that can work for typing after the `randomUUID` insecure-context fix, but the **mic will still be blocked** until you use HTTPS or localhost.

## Alternatives (optional)

- **ngrok:** `npx --yes ngrok http 5173` (may require a free ngrok signup depending on version).
- **Same machine only:** use `http://localhost:5173` — no tunnel needed.
- **Android Chrome flag (dev only):** `chrome://flags` → “Insecure origins treated as secure” → add `http://192.168.x.x:5173`. Does **not** work on iPhone Safari.
