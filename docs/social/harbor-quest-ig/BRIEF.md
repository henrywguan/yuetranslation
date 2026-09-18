# Harbor Quest — IG Story reveal + image carousel

**Instructional night/dark mode** · real Harbor Quest UI · iPhone 13 Pro chrome  
**Credits:** $0 (local Puppeteer capture + HTML render + ffmpeg). No Higgsfield / paid TTS.

## Story · 10s reveal (9:16)

| File | Notes |
| --- | --- |
| `ig-posts/out/ig-story-harbor-quest-10s.mp4` | **Upload this** — ~10.0s · soft bed + UI clicks |
| `ig-story-harbor-quest-caption.txt` | Story sticker / text overlay helper |

Beats: title (PWA mark) → Sail UI → Arena → end CTA.

Brand mark: `pwa-512.png` only (no favicon in this pack).

Rebuild:

```bash
node docs/social/ig-posts/render.mjs --only harbor-quest
node docs/social/harbor-quest-ig/build.mjs
```

## Carousel · images only (1080×1350)

Post order (all stills — no carousel videos):

| # | Type | File |
| --- | --- | --- |
| 1 | Image | `ig-post-harbor-quest-01-cover.png` (Sail · Cast · Arena · Chart) |
| 2 | Image | `ig-post-harbor-quest-02-voyage.png` (Sail) |
| 3 | Image | `ig-post-harbor-quest-03-chart.png` (Cast · campaigns) |
| 4 | Image | `ig-post-harbor-quest-04-arena.png` (Arena) |
| 5 | Image | `ig-post-harbor-quest-05-gear.png` (Chart · OpenCantonese.org) |
| 6 | Image | `ig-post-harbor-quest-06-end.png` |

Caption: `ig-posts/out/ig-post-harbor-quest-caption.txt` (exactly **5** hashtags)

## Source

| Path | Role |
| --- | --- |
| `harbor-quest-ig/source/*.jpg` | Real `#/learn` captures (dark theme, seeded progress) |
| `ig-posts/harbor-quest-*.html` | Instructional night frames |
| `ig-posts/harbor-quest.css` | Layout + phone chrome |
| `harbor-quest-ig/capture.mjs` | Re-capture script |
| `harbor-quest-ig/build.mjs` | Story video only (optional) |

## Product notes for copy

- Route: `#/learn` (Free+ beta via Account Hub · also Admin → Harbor Quest; not in public marketing nav yet)
- Real UI: Sail (low-poly harbor), Cast (campaigns/chapters), Arena (Match the Definition), Chart (OpenCantonese.org)
- Copy pillars: Sail / Cast / Arena / Chart
- Do **not** call paid `/api/tts` for this shoot unless Henry approves

## Hashtags (exactly 5)

`#HarborQuest #JyutTranslate #Cantonese #Jyutping #LearnCantonese`
