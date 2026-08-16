# JyutTranslate design system

Brand tokens for matching the marketing site and translator when building **Bricks** (or any WordPress) pages.

**Visual swatches:** open [`brand/index.html`](./brand/index.html) locally, or enable GitHub Pages:

1. Repo **Settings → Pages**
2. Source: **Deploy from a branch**
3. Branch: `main`, folder: **`/docs`**
4. After deploy, open `https://<user>.github.io/<repo>/brand/`

**Product UI snapshots:** [demos/](./demos/)

<p>
  <img src="./demos/04-app-solo-dark.png" alt="Solo translator dark theme" width="640" />
</p>

## Themes

| Theme | Primary surface | Text | Accent |
| --- | --- | --- | --- |
| **Dark** (default) | Harbor `#07131f` | Ink `#e8f4ff` | Jade `#3dcfb6` |
| **Light** | Mist `#eef5f8` | Harbor `#07131f` | Jade `#1f9f8a` |

Toggle lives in the marketing nav and translator header. Preference is stored as `localStorage.yue-theme` and respects `prefers-color-scheme` on first visit.

Background: iridescent glass bubbles (WebGL on marketing, CSS orbs in the translator) mixed from Harbor / Jade / Ink.

## Brand hierarchy

| Role | Name | Hex | Use |
| --- | --- | --- | --- |
| **Primary** | Harbor | `#07131f` | Page background, chrome, PWA theme |
| **Secondary** | Jade | `#3dcfb6` | CTAs, brand mark, links, focus, 3D accent |
| **Tertiary** | Ink | `#e8f4ff` | Primary body text on dark surfaces |

## Typography

- Display / UI: **Syne**
- Cantonese body: **Noto Sans HK**

Implementations: `apps/web/src/index.css` (CSS variables) · `docs/brand/index.html` (swatches).
