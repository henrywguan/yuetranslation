# Yue design system

Brand tokens for matching the Yue marketing site and translator when building **Bricks** (or any WordPress) pages.

**Visual swatches:** open [`brand/index.html`](./brand/index.html) locally, or enable GitHub Pages:

1. Repo **Settings → Pages**
2. Source: **Deploy from a branch**
3. Branch: `main`, folder: **`/docs`**
4. After deploy, open `https://<user>.github.io/<repo>/brand/`

## Brand hierarchy

| Role | Name | Hex | Use |
| --- | --- | --- | --- |
| **Primary** | Harbor | `#07131f` | Page background, chrome, PWA theme |
| **Secondary** | Jade | `#3dcfb6` | CTAs, brand mark, links, focus, 3D accent |
| **Tertiary** | Ink | `#e8f4ff` | Primary body text on dark surfaces |

Supporting scales (same families):

### Harbor (primary family)
| Token | Hex | Notes |
| --- | --- | --- |
| `--harbor` | `#07131f` | Base |
| `--harbor-mid` | `#0a1c2c` | Gradient mid |
| `--harbor-deep` | `#081820` | Gradient end |
| `--harbor-blue` | `#12324a` | Atmosphere wash |
| `--harbor-teal` | `#0b3d36` | Atmosphere wash |

### Jade (secondary family)
| Token | Hex | Notes |
| --- | --- | --- |
| `--jade` | `#3dcfb6` | Brand accent |
| `--jade-mid` | `#2aa88f` | CTA gradient mid |
| `--jade-deep` | `#1f8f7a` | Mark / deep accent |
| `--jade-bright` | `#7ef0dc` | Highlights |
| `--on-jade` | `#041018` | Text/icons **on** jade fills |

### Ink / mint (tertiary family)
| Token | Hex / value | Notes |
| --- | --- | --- |
| `--ink` | `#e8f4ff` | Body text |
| `--ink-bright` | `#e8fff8` | Emphasized translation text |
| `--muted` | `rgba(232, 244, 255, 0.58)` | Secondary copy |
| `--mint` | `#9af0de` | Jyutping, pro chip, soft links |

### Danger
| Token | Hex |
| --- | --- |
| `--danger` | `#e36b6b` |
| `--danger-deep` | `#c44d4d` |
| `--danger-ink` | `#ffd0d0` |

## Typography

| Role | Family | Weights | Use |
| --- | --- | --- | --- |
| Display / UI | **Syne** | 500–800 | Brand name, headlines, buttons, tabs |
| Body / CJK | **Noto Sans HK** | 400–700 | Body copy, Cantonese, Jyutping |

Google Fonts import (same as the app):

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+HK:wght@400;500;600;700&family=Syne:wght@500;600;700;800&display=swap" rel="stylesheet" />
```

CSS variables in the app: `--font-display`, `--font-body` ([`apps/web/src/index.css`](../apps/web/src/index.css)).

## Gradients (copy into Bricks)

**Primary CTA**
```css
background: linear-gradient(135deg, #3dcfb6, #2aa88f);
color: #041018;
```

**Brand mark**
```css
background: linear-gradient(145deg, #3dcfb6, #1f8f7a);
color: #041018;
```

**Harbor atmosphere** (page wash)
```css
background:
  radial-gradient(120% 80% at 10% 0%, #12324a 0%, transparent 55%),
  radial-gradient(90% 70% at 100% 20%, #0b3d36 0%, transparent 50%),
  linear-gradient(165deg, #07131f 0%, #0a1c2c 45%, #081820 100%);
```

## Assets

| Asset | Path | Notes |
| --- | --- | --- |
| Favicon / mark | [`apps/web/public/favicon.svg`](../apps/web/public/favicon.svg) | 粵 glyph on jade → harbor |
| PWA 192 | [`apps/web/public/pwa-192.png`](../apps/web/public/pwa-192.png) | |
| PWA 512 | [`apps/web/public/pwa-512.png`](../apps/web/public/pwa-512.png) | |
| Logo in UI | CSS text **粵** | No separate logo file — recreate with Syne/Noto + jade gradient |

Theme / manifest color: `#07131f`.

## Bricks quick recipe

1. Page background: Harbor `#07131f` (or the atmosphere gradient above).
2. Headlines: Syne, weight 700–800, Ink `#e8f4ff`.
3. Body: Noto Sans HK, Muted or Ink.
4. Primary button: jade gradient + On-jade text `#041018`, generous radius (~999px or 16–24px to match product chrome).
5. Links / accents: Jade `#3dcfb6` or Mint `#9af0de`.
6. Embed the product with `[yue_translator]` — do not restyle inside the iframe.

## Source of truth

Runtime CSS tokens: [`apps/web/src/index.css`](../apps/web/src/index.css).  
Keep Bricks and this doc aligned when you change those variables.
