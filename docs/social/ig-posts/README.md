# Instagram posts — JyutTranslate

> **Template name:** **Instructional night / dark mode post**  
> Henry approved these Harbor instructional posts as the visual baseline.  
> Named recall + gallery → **[`INSTRUCTIONAL-NIGHT-MODE.md`](./INSTRUCTIONAL-NIGHT-MODE.md)**  
> Full recipe → **[`DESIGN.md`](./DESIGN.md)** (colors, fonts, logo, composition, pipeline).

Static brand posts rendered from HTML with **project fonts and logo**:

| Asset | Size | File |
| --- | --- | --- |
| Feed square (tones) | 1080×1080 | `out/ig-post-jyutping-tones-1080.png` |
| Portrait (tones) | 1080×1350 | `out/ig-post-jyutping-tones-portrait.png` |
| Feed square (intro) | 1080×1080 | `out/ig-post-intro-1080.png` |
| Portrait (intro) | 1080×1350 | `out/ig-post-intro-portrait.png` |
| Profile avatar | 1080×1080 | `out/ig-profile-avatar.png` |
| Captions | — | `out/ig-post-*-caption.txt` / `ig-profile-bio.md` |

## Brand sources

- Logo mark: **`docs/brand/favicon.png`** (chop 粵 — do not regenerate; do not invent a J+粵 raster)
- Chao letters: jade SVG bars with Unicode orientation (staff on the **right**, ticks left — matches `˥` / cantonese.ca)
- Fonts: self-hosted Syne / Noto Sans / Noto Sans HK subsets in `fonts/` + `fonts-local.css`
- Colors: Harbor / Jade / Ink from `apps/web/src/index.css`

## Render

```bash
node docs/social/ig-posts/render.mjs
# optional:
node docs/social/ig-posts/render.mjs --out /opt/cursor/artifacts/social/v3
```

Requires Chrome/Chromium. The script serves this folder over `localhost` (so `@font-face` loads) and aborts if `粵` still measures as missing.
