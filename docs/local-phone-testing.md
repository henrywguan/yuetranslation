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

## Stop

Press `Ctrl+C` in the tunnel terminal. The public URL stops working immediately.

## Cost

Cloudflare **quick tunnels** are free for this local-dev use. You do not need a paid plan or to sign in.

## Troubleshooting

- **Tunnel starts but phone can’t translate** — make sure `npm run dev:api` is still running on the computer.
- **Mic still blocked** — confirm the phone address bar shows `https://`, not `http://` or a raw `192.168.…` IP.
- **Old tunnel URL 404s** — each `npm run dev:tunnel` creates a **new** URL; use the latest one printed in the terminal.
- **Windows firewall prompt** — allow Node / cloudflared on private networks if Windows asks.
- **Want Text mode on plain `http://192.168.x.x` without a tunnel?** — that can work for typing after the `randomUUID` insecure-context fix, but the **mic will still be blocked** until you use HTTPS or localhost.

## Alternatives (optional)

- **ngrok:** `npx --yes ngrok http 5173` (may require a free ngrok signup depending on version).
- **Same machine only:** use `http://localhost:5173` — no tunnel needed.
- **Android Chrome flag (dev only):** `chrome://flags` → “Insecure origins treated as secure” → add `http://192.168.x.x:5173`. Does **not** work on iPhone Safari.
