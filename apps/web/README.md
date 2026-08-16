# JyutTranslate web app

React + Vite PWA for the JyutTranslate marketing site and translator UI.

- Local: `npm run dev:web` from the repo root → [http://localhost:5173](http://localhost:5173)
- Translator embed: `http://localhost:5173/?view=app`
- WordPress embed build: `npm run build:web:wp`
- Static marketing build: `npm run build:web:marketing`
- Design tokens: [docs/design-system.md](../../docs/design-system.md) · [docs/brand/](../../docs/brand/)
- Quality bot: [docs/testing.md](../../docs/testing.md)

## Modes

| Mode | Store id | Notes |
| --- | --- | --- |
| Solo | `solo` | One phone, EN↔粵 panes |
| Conversation | `conversation` | Face-to-face cards (粵 pane rotated) |
| Text | `text` | Typed translate + Jyutping |

Live mic translates **once after capture ends** (no interim MT).
