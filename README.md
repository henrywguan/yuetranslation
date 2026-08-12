# yuetranslation

粵譯 · **YueTranslation** — convert Chinese text into Cantonese **Jyutping** romanization
and **IPA** pronunciation. The conversion runs fully offline using the
[`to-jyutping`](https://www.npmjs.com/package/to-jyutping) engine, so no API keys or
external services are required.

## Stack

- **client/** — Vite + React + TypeScript + Tailwind CSS single-page app (port `5173`)
- **server/** — Express + TypeScript JSON API (port `3001`)
- npm workspaces monorepo

## Getting started

```bash
npm install        # install all workspace dependencies
npm run dev        # start API (3001) and web (5173) together
```

Then open http://localhost:5173. The Vite dev server proxies `/api/*` to the backend.

### Useful scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Run API + web dev servers concurrently |
| `npm run dev:server` | Run only the API dev server |
| `npm run dev:client` | Run only the web dev server |
| `npm run build` | Build both server and client for production |
| `npm run typecheck` | Type-check both workspaces |

## API

### `GET /api/health`

Returns service status.

### `POST /api/translate`

Request:

```json
{ "text": "香港人講廣東話" }
```

Response:

```json
{
  "input": "香港人講廣東話",
  "romanization": "hoeng1 gong2 jan4 gong2 gwong2 dung1 waa2",
  "tokens": [
    { "char": "香", "jyutping": "hoeng1", "ipa": "hœːŋ˥" }
  ]
}
```

## Cloud Agent environment

`.cursor/environment.json` installs dependencies with `npm install` and launches the
`api` and `web` dev servers as persistent terminals.
