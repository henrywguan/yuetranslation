# Instagram posts — Jyutping + Chao tones

Static brand posts rendered from HTML with **project fonts and logo**:

| Asset | Size | File |
| --- | --- | --- |
| Feed square | 1080×1080 | `out/ig-post-jyutping-tones-1080.png` |
| Portrait / Reels cover | 1080×1350 | `out/ig-post-jyutping-tones-portrait.png` |
| Caption | — | `out/ig-post-jyutping-tones-caption.txt` |

## Brand sources

- Logo mark: HTML lockup matching `JyutLogo` `variant="mark"` (Syne **J** + Noto **粵** on jade)
- Fonts: self-hosted Syne / Noto Sans / Noto Sans HK subsets in `fonts/` + `fonts-local.css`
- Chao letters: drawn SVG bars (not Unicode) so they never tofu
- Colors: Harbor / Jade / Ink from `apps/web/src/index.css`
- Tone set: `詩史試時市是` from `tonesData.ts`
- Dinner example: `你返唔返嚟食飯㗎？` · `nei5 faan2 m4 faan1 lai4 sik6 faan6 gaa3`

## Render

```bash
node docs/social/ig-posts/render.mjs
# optional:
node docs/social/ig-posts/render.mjs --out /opt/cursor/artifacts/social/v3
```

Requires Chrome/Chromium. The script serves this folder over `localhost` (so `@font-face` loads) and aborts if `粵` still measures as missing.
