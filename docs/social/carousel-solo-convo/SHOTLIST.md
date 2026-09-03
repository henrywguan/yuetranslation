# Solo / Conversation instructional carousel

**Format:** Instagram **video carousel** — 6 clips · **1080×1350 (4:5)** · AAC  
**Theme:** **Dark / night mode** real UI + Harbor instructional overlays ([`INSTRUCTIONAL-NIGHT-MODE.md`](../ig-posts/INSTRUCTIONAL-NIGHT-MODE.md))  
**Vibe:** modern, luxury, smart instructional · quiet Ken Burns · soft jade callouts  
**Audio:** soft luxury bed on every slide · **auto-speak Azure TTS** on Solo + Conversation how-to slides  
**Source:** ~4K real UI (`DPR=3`) — never AI-fake UI  

Avoid “Real Hong Kong” framing. Prefer 口語 / 書面 / 婆婆 language.

## Slides (~7–9s each)

| # | File | Beat | Visual | Audio |
|---|---|---|---|---|
| 1 | `slide-01-hook.mp4` | Hook | Brand + Solo / Conversation tabs | Soft bed |
| 2 | `slide-02-solo-anatomy.mp4` | Solo anatomy | Dark Solo UI · jade rings on EN / 粵 | Soft bed |
| 3 | `slide-03-solo-howto.mp4` | Solo how-to | Type → 粵 + Jyutping · **auto-speak hears 粵** | Bed ducked + TTS |
| 4 | `slide-04-convo-anatomy.mp4` | Conversation anatomy | Split panes · 180° 粵 · upright EN | Soft bed |
| 5 | `slide-05-convo-howto.mp4` | Conversation how-to | Face-to-face exchange · **TTS** | Bed + TTS |
| 6 | `slide-06-cta.mp4` | CTA | Chop + jyuttranslate.com · Free to try | Soft bed resolve |

## Demo phrases

**Solo:** Are you coming home for dinner? → 你返唔返嚟食飯㗎？  
**Conversation:** Don't worry → 唔使擔心

## Pipeline ($0 credits preferred)

1. `node scripts/capture-carousel-solo-convo.mjs` → `source/*.png` (dark, autoSpeak ON)
2. `python3 scripts/make-carousel-overlays.py` + Ken Burns → silent slides
3. Azure `/api/tts` → `audio/tts-*-yue.mp3` (needs a real Azure Speech subscription key in apps/api/.env)
4. Soft bed + duck under TTS → `out/slide-0N-*.mp4`
5. Caption: `out/caption.txt`

```bash
node scripts/capture-carousel-solo-convo.mjs
node scripts/build-carousel-solo-convo.mjs
```
