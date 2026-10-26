# Showtime vs Higgsfield (same language-expansion brief)

| | **Showtime 0.4.4** (this pack) | **Higgsfield Seedance** ([language-expansion-higgsfield](../language-expansion-higgsfield/)) |
|---|---|---|
| **Picture** | Designed HTML / kinetic type / real Solo plate | Generative lifestyle montage + later Solo plate edit |
| **VO** | Local Supertonic TTS per language stem | Cloud `generate_audio` / Seedance native VO |
| **Music / SFX** | Catalog bed (“How it Begins”) + synth whoosh/pop/tick/sting | Native bed + SFX inside the video model |
| **Length** | ~18.4s (voice-led retime) | ~15s brief target |
| **Thai VO** | Skipped (no Supertonic Thai in this setup) | Included in stem list |
| **Brand control** | Exact Harbor/Jade/Syne + real favicon + Solo screenshot | Prompted look; empty phone risk until plate edit |
| **Cost / keys** | Local only (no Azure/DeepSeek) | Paid Higgsfield generation |
| **QA** | `check` + `qa` PASS (loudness, phone safe zones, captions) | Manual review + video_edit pass |

## What Showtime did well

- Pixel-accurate brand kit and a **readable Solo close** (no black phone).
- Deterministic captions karaoke synced to VO words.
- Mix ducks under voice; credits for CC music are automatic.
- Fast iterate: HTML + `check` → `render` in ~30s on this VM.

## Where Seedance still wins

- Photoreal lifestyle / travel montage energy.
- Continuous cinematic camera through the language hits.
- Model-native “commercial” atmosphere without building every beat in DOM.

## Practical takeaway

Use **Showtime** when you need brand-true UI proof, captions, and a shippable Reels cut without cloud AI. Use **Higgsfield** when the beat is lifestyle cinema; composite real Solo/favicon for the end card (as in the Seedance hero fix).
