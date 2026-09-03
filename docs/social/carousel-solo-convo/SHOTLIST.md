# Solo / Conversation instructional carousel

**Format:** Instagram **video carousel** — 6 clips · **1080×1350 (4:5)** · AAC  
**Theme:** **Dark / night mode** UI (Harbor field) — not light  
**Vibe:** modern, luxury, smart instructional · quiet motion · soft jade callouts  
**Audio:** soft luxury bed on every slide · **auto-speak TTS audible** on Solo + Conversation how-to slides  
**Source:** ~4K real UI (`DPR=3`) for sharp Ken Burns / zooms  

Avoid “Real Hong Kong” framing. Prefer 口語 / 書面 / 婆婆 language.

## Slides (~7–9s each)

| # | File | Beat | Visual | Audio |
|---|---|---|---|---|
| 1 | `slide-01-hook.mp4` | Hook | Brand + Solo / Conversation tabs | Soft bed |
| 2 | `slide-02-solo-anatomy.mp4` | Solo anatomy | Dark Solo UI · jade rings on EN / 粵 / Speak | Soft bed |
| 3 | `slide-03-solo-howto.mp4` | Solo how-to | Type → 粵 + Jyutping · **auto-speak hears 粵** | Bed ducked + TTS |
| 4 | `slide-04-convo-anatomy.mp4` | Conversation anatomy | Split panes · 180° 粵 · upright EN | Soft bed |
| 5 | `slide-05-convo-howto.mp4` | Conversation how-to | Face-to-face exchange · **TTS** | Bed + TTS |
| 6 | `slide-06-cta.mp4` | CTA | Chop + jyuttranslate.com · Free to try | Soft bed resolve |

## Demo phrases

**Solo:** Are you coming home for dinner? → 你返唔返嚟食飯㗎？  
**Conversation:** Don't worry → 唔使擔心

## Pipeline

1. `node scripts/capture-carousel-solo-convo.mjs` → `source/*.png` (dark, autoSpeak seeded ON)
2. Ken Burns + soft overlays → draft videos
3. Soft bed (Higgsfield / RF) + TTS audio muxed under speak slides
4. Export → `out/slide-0N-*.mp4` + `out/caption.txt`

## Render notes

- Safe margins: keep labels out of extreme top/bottom chrome
- No attention-grabbing bounce; slow ease zooms only
- Logo: `docs/brand/favicon.png` only
