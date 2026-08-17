# JyutTranslate web app

React + Vite PWA for the marketing site and translator UI. Run from the **repo root**.

| Command | Result |
| --- | --- |
| `npm run dev:web` | [http://localhost:5173](http://localhost:5173) |
| `?view=app` | Translator embed |
| `npm run build:web:wp` | WordPress plugin assets |
| `npm run build:web:marketing` | Static marketing build |

See the [root README](../../README.md) for API keys, phone testing, and quality bots.

## Modes

| Mode | Store id | Notes |
| --- | --- | --- |
| Solo | `solo` | One phone, EN↔粵 panes |
| Conversation | `conversation` | Two cards; 粵 pane rotated 180° |
| Text | `text` | Typed translate + Jyutping |

Live mic translates **once after capture ends** (no interim MT).
