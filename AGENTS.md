# Agent notes

## Cursor Cloud specific instructions

### Dev servers (fixed ports)

Use the environment terminals (or these exact commands). **Do not** start extra Vite/API copies — that creates ports 5174/5175/… and wastes hours debugging the wrong server.

| Service | URL | Command |
| --- | --- | --- |
| Web (Vite) | http://localhost:5173 | `npm run dev --prefix apps/web -- --host 0.0.0.0 --port 5173` |
| API | http://localhost:8787 | `npm run dev:api` (defaults to port 8787) |

Smoke without a browser:

```bash
curl -s http://localhost:8787/api/health
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5173/
```

In DEV, `window.__yueStore` is exposed for seeding UI state from the console.

### Walkthrough artifacts (screenshots / demo videos)

Henry runs a local copy of this repo and refreshes the browser himself.

**Do not** take screenshots, record demo videos, or upload walkthrough UI artifacts for routine UI/UX or code changes unless he explicitly asks for them.

Prefer:

- Push the branch / update the PR efficiently
- Rely on lint/typecheck (and automated tests when relevant)
- Brief confirmation of what changed so he can refresh locally

Exception: only capture screenshots/videos when he specifically requests visual proof, or when a bug cannot be verified any other way and he has asked for help debugging it.

Computer-use / GUI screenshots are especially slow in this Cloud VM (software WebGL). Prefer terminal checks unless visuals were requested.

### Environment bootstrap

- Install: `./scripts/cloud-agent-install.sh` (`npm ci` for web + api, icons)
- Start: `./scripts/cloud-agent-start.sh` (frees stale 5173/8787 only)
- Config: `.cursor/environment.json`
