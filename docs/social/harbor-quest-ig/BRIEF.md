# Harbor Quest — IG Story reveal + mixed carousel

**Instructional night/dark mode** · real Harbor Quest UI · iPhone 13 Pro chrome  
**Credits:** $0 (local Puppeteer capture + HTML render + ffmpeg). No Higgsfield / paid TTS.

## Story · 10s reveal (9:16)

| File | Notes |
| --- | --- |
| `ig-posts/out/ig-story-harbor-quest-10s.mp4` | **Upload this** — ~10.0s · soft bed + UI clicks |
| `ig-story-harbor-quest-caption.txt` | Story sticker / text overlay helper |

Beats: title → voyage UI → arena → pier chart end CTA.

Rebuild:

```bash
node docs/social/ig-posts/render.mjs --only harbor-quest
node docs/social/harbor-quest-ig/build.mjs
```

## Carousel · mixed images + videos (1080×1350 / 9:16 clips)

Post order (alternate stills + motion):

| # | Type | File |
| --- | --- | --- |
| 1 | Image | `ig-post-harbor-quest-01-cover.png` |
| 2 | **Video** | `ig-post-harbor-quest-carousel-02-voyage.mp4` (~6s explore pan) |
| 3 | Image | `ig-post-harbor-quest-03-chart.png` |
| 4 | **Video** | `ig-post-harbor-quest-carousel-04-arena.mp4` (~5s Ken Burns) |
| 5 | Image | `ig-post-harbor-quest-05-gear.png` |
| 6 | Image | `ig-post-harbor-quest-06-end.png` |

Caption: `ig-posts/out/ig-post-harbor-quest-caption.txt` (exactly **5** hashtags)

## Source

| Path | Role |
| --- | --- |
| `harbor-quest-ig/source/*.jpg` | Real `#/learn` captures (dark theme, seeded progress) |
| `harbor-quest-ig/source/frames/` | Explore pan frames → voyage video |
| `ig-posts/harbor-quest-*.html` | Instructional night frames |
| `ig-posts/harbor-quest.css` | Layout + phone chrome |
| `harbor-quest-ig/capture.mjs` | Re-capture script |
| `harbor-quest-ig/build.mjs` | Story + carousel videos |

## Product notes for copy

- Route: `#/learn` (admin preview — not public nav yet)
- Real UI: low-poly harbor, pier chart, Match the Definition arena, ferry coins / inventory
- Pedagogy: Open Cantonese pronunciation guide pacing (Sounds + Life Unit 0)
- Do **not** call paid `/api/tts` for this shoot unless Henry approves

## Hashtags (exactly 5)

`#HarborQuest #JyutTranslate #Cantonese #Jyutping #LearnCantonese`
