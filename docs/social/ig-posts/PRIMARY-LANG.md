# Primary Language locale — IG post + Stories

**Instructional night/dark mode** · real UI · iPhone 13 Pro chrome ([`PHONE-MOCKUP.md`](./PHONE-MOCKUP.md))

Promotes Account Hub **Primary Language**: one pick localizes Solo, Conversation (your side), Cam, and the logo sublabel.

## Carousel (feed · 1080×1350)

| # | HTML | PNG | Real UI |
| --- | --- | --- | --- |
| 1 | `primary-lang-01-hub.html` | `out/ig-post-primary-lang-01-hub.png` | Crop `01-hub-closed` + phone `02-hub-menu` (same beat) |
| 2 | `primary-lang-02-solo.html` | `out/ig-post-primary-lang-02-solo.png` | Cantonese primary · Solo |
| 3 | `primary-lang-03-convo.html` | `out/ig-post-primary-lang-03-convo.png` | Spanish (MX) · Conversation |
| 4 | `primary-lang-04-cam.html` | `out/ig-post-primary-lang-04-cam.png` | Vietnamese · Cam sheet |

## Stories (1080×1920)

| # | HTML | PNG |
| --- | --- | --- |
| 1 | `primary-lang-01-hub-story.html` | `out/ig-story-primary-lang-01-hub.png` |
| 2 | `primary-lang-02-solo-story.html` | `out/ig-story-primary-lang-02-solo.png` |
| 3 | `primary-lang-03-convo-story.html` | `out/ig-story-primary-lang-03-convo.png` |
| 4 | `primary-lang-04-cam-story.html` | `out/ig-story-primary-lang-04-cam.png` |

**Source:** `source/primary-lang/` · **Logo:** `pwa-512.png` (product mark)  
**Caption:** `out/ig-post-primary-lang-caption.txt` (exactly 5 hashtags)  
**CSS:** `primary-lang.css` (+ `lang-launch.css` phone chrome)

```bash
node docs/social/ig-posts/render.mjs
```
