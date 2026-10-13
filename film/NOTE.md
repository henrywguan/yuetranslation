# NOTE — JyutTranslate MAX (motionmaxxing)

## Idea
**One English sentence becomes sayable Cantonese — and the same meaning wears three bodies: Solo, Conversation, Cam.** Cover-the-logo still reads as JyutTranslate (tone-colored Jyutping + colloquial 口語). Not a feature checklist.

Sentence (illustrative HK colloquial): “Where is the MTR?” → 「地鐵喺邊？」 / `dei6 tit3 hai2 bin1`.

Full director brief: `PROMPT-MAX.md`.

## Beats (buys)
1. **Hook (0–4s)** — Buys: this is about *saying* Cantonese. Giant Syne “Say it.” + 「聽得明，先講得出。」
2. **Solo (4–12s)** — Buys: sayable under your fingers. Types EN → Han + tone Jyutping land; jade underline; camera dive.
3. **Conversation (12–19s)** — Buys: same meaning, two faces. Real Convo plate + carried Han bubbles.
4. **Cam (19–28s)** — Buys: the street answers. Phone AR + floating 「地鐵喺邊？」; late breath into the cut.
5. **Close (28–30s)** — Buys: brand lands smaller. Chop crash-in + wordmark, still contracting on the last frame (≤2s beat).

## Real vs illustrative
| Real | Illustrative |
|---|---|
| Official chop `pwa-512`, Syne + Noto from brand capture | Solo card chrome rebuilt to match product grammar |
| Conversation plate `assets/ui/convo.jpg` (live app capture) | Cam street/sign stage (product AR grammar, not a photo plate) |
| Harbor ground / jade accent from brand | Sentence 「地鐵喺邊？」 plausible HK colloquial — declared here |
| Seed Audio VO (EN Isla + Chinese Brielle lines) | Soft bed absent (Higgsfield music locked) |

## VO (bilingual)
| t | Lang | Line | Source |
|---|---|---|---|
| 0.3s | EN | Hear Cantonese as it is spoken. | `audio/max/en1.mp3` |
| ~1.8s | Yue | 聽得明，先講得出。 | `yue1.mp3` |
| 8.5s | EN | Type a line — Jyutping lands with it. | `en2.mp3` |
| 14.0s | Yue | 對面傾偈，一部手機就夠。 | `yue2.mp3` |
| 20.5s | EN | Point the camera. The street answers back. | `en3.mp3` |
| ~26.5–27.6s | Yue | 準備好俾人聽明未？ | `yue3.mp3` (over late Cam → close) |
| 28.0s | EN | JyutTranslate. | `en4.mp3` |

**Honesty:** Chinese Seed Audio may read Yue lines with Mandarin-leaning cadence; lines are Cantonese copy. No ElevenLabs key in this environment.

Mix: `audio/max/mix-max.wav` → `final-max-vo.mp4`.

## Gates (quoted from look.py / lint.mjs)
Close cut moved to f840 (28.0s); accelerating contraction through last frame.

**`look.py final-max-vo.mp4 --expect 30`:**
- **G0** PASS — duration 30.00 s; audio present
- **G2** PASS — no run of > 3 flat frames
- **G3** PASS — end hold 0.00 s (ends mid-motion); final shot 2.00 s = 7% (≤ 25%)
- **G1 / G4** — by eye on `look-max-vo/sheet.jpg`
- **G5** PASS — `lint.mjs index.html` all C/D/P/T/V

**MOTION notice:** mean luma change ~0.9/255 (human median 6.8). Typing + slow drifts stay calm on purpose; Cam late breath + close contraction keep the exit alive. Cut sync 40% (within pro band).

## Deliverables
- `film/PROMPT-MAX.md` — max-level captivation brief
- `film/index.html` — seek-safe GSAP composition
- `film/final-max.mp4` — silent picture
- `film/final-max-vo.mp4` — bilingual VO
- Artifacts: `/opt/cursor/artifacts/jyuttranslate-motionmaxxing-max-*.mp4` · sheet

## Would still improve
1. Native Cantonese TTS (or ElevenLabs HK voice) instead of Seed Audio Chinese preset.
2. Soft map-adjacent bed if music unlock approved.
3. Live Solo Puppeteer plate for pixel-true typing UI.
4. Optional 9:16 crop for Stories.
