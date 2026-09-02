# Instagram static posts — approved design canon

**Status:** Henry signed off the Jyutping + Chao tones square + portrait posts as the visual baseline (“PERFECT”).  
**Use this pack as the starting point for future static IG posts** — keep the look; swap content/topic.

## Canonical references (do not invent a new look)

| Role | Path |
| --- | --- |
| Square feed (1080×1080) | `jyutping-tones-square.html` → `out/ig-post-jyutping-tones-1080.png` |
| Portrait / cover (1080×1350) | `jyutping-tones-portrait.html` → `out/ig-post-jyutping-tones-portrait.png` |
| Shared tokens + layout | `shared.css` |
| Fonts | `fonts-local.css` + `fonts/` |
| Render | `node docs/social/ig-posts/render.mjs` |

## Brand (locked)

| Token | Value | Use |
| --- | --- | --- |
| Harbor | `#07131f` (+ mid/deep `#0a1c2c` / `#081820`) | Full-bleed background base |
| Harbor blue / teal | `#12324a` / `#0b3d36` | Soft radial atmosphere only |
| Jade | `#3dcfb6` (+ bright `#7ef0dc`) | Accent headline, labels, Jyutping, URL |
| Ink | `#e8f4ff` / `#e8fff8` | Primary text |
| Mist / mute | ink @ ~58% | Supporting lines |
| Logo | **`docs/brand/favicon.png` only** | Chop 粵 — **never** regenerate / invent J+粵 |
| Display | **Syne** 700–800 | Brand name, H1, accents |
| Body EN | **Noto Sans** | Subcopy, captions |
| Body 粵 | **Noto Sans HK** 700 | Han, 口語 lines |

## Composition rules (match the approved posts)

1. **One composition** — dark Harbor field with **subtle jade/blue radial glows** (not flat black, not purple gradients, not cream/serif “AI default”).
2. **Brand first** — top-left: favicon chop (72px, soft jade shadow) + **JyutTranslate** wordmark + short subline.
3. **Hero** — one Syne H1 + jade accent line + one short support sentence. No card clutter in the hero.
4. **Content blocks** — rounded Harbor panels (`feat` / `card` / tone tiles) with jade section labels (`EXAMPLE 實例`, `SIX TONES 六聲`, etc.).
5. **Typography hierarchy** — big readable Syne; jade for product terms (Jyutping, Chao, URL); Ink for Han; mute for meta.
6. **Chao tones** — jade SVG bars, Unicode orientation (**staff right, ticks left**). Prefer drawn glyphs over Unicode-only Chao in finals.
7. **Footer** — quiet rule + **JyutTranslate.com** (or short product line + URL). Avoid busy CTAs unless Henry asks.
8. **Sizes** — ship **both** 1080×1080 and 1080×1350 when making a static post set, unless Henry asks for one format.

## Pipeline for a new post

1. Copy `jyutping-tones-square.html` / `jyutping-tones-portrait.html` (or fork into new HTML filenames).
2. Keep `shared.css` / fonts / logo wiring; change only copy, example phrase, and section content.
3. Extend `font-preload` spans if new CJK/Latin glyphs appear.
4. Add jobs in `render.mjs` if new filenames.
5. Render → commit HTML + `out/*.png` (+ caption txt when useful).
6. Do **not** replace the look with Midjourney/Higgsfield “poster” stills unless Henry explicitly wants AI art for that piece.

## Anti-patterns

- Regenerating or redrawing the logo
- Purple / cream-serif / glassmorphism / emoji spam
- Tiny unreadable 粵 on phone
- Chao staff on the wrong side
- Dropping Syne / Noto Sans HK for Inter/system defaults
- Flat single-color backgrounds with no atmosphere
