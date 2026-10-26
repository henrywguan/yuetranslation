# JyutTranslate — Language Expansion (Showtime local)

**Goal:** Same language-expansion brief as the Higgsfield Seedance reel, rebuilt end-to-end in [Showtime](https://github.com/FavioVazquez/showtime) (local HTML → voice → music → render).

**Format:** Instagram Reel · **9:16** · **~18.4s** · 1080×1920 · 30 fps  
**Brand:** Harbor `#07131f` · Jade accent `#0a5a4a` / `#3dcfb6` · Mist `#eef5f8` · Syne + Noto CJK stacks  
**UI:** Real Solo plate (`shots/solo-yue.jpg`) on the close beat — not an empty phone  
**Audio:** Supertonic multilingual VO + Incompetech “How it Begins” bed + synth whoosh/pop/tick/logo-sting  
**Tooling:** Showtime **0.4.4** · job `jyut-lang-expand-20261014-221524`

---

## Story (same idea as Higgsfield)

**Cantonese stays the heart — the world around it just got much bigger.**

Hook → kinetic language chips → native confirmation beats (Yue → JA → KO → ES → FR → HI → AR → DE → ID) → Solo phone close with wordmark + chop.

### VO lines (Showtime narration)

| # | Lang | Line |
|---|---|---|
| 1 | EN | Twenty-six languages. One phone. |
| 2 | Yue | 聽得明，先講得出。 |
| 3 | JA | 分かりました。 |
| 4 | KO | 알겠어요. |
| 5 | ES | Te entiendo. |
| 6 | FR | Je comprends. |
| 7 | HI | समझ गया। |
| 8 | AR | أفهمك. |
| 9 | DE | Ich verstehe dich. |
| 10 | ID | Saya mengerti. |
| 11 | EN | JyutTranslate. |

Thai was in the Higgsfield VO list; Showtime’s Supertonic pack here had no Thai voice, so TH is omitted from VO (chips still name the expansion wave).

---

## Output

| File | Notes |
|---|---|
| [`out/jyut-lang-expand-showtime.mp4`](out/jyut-lang-expand-showtime.mp4) | Final render (`final-2.mp4` from job) |
| [`out/poster.jpg`](out/poster.jpg) | Frame ~0.7s |
| [`out/look-sheet.jpg`](out/look-sheet.jpg) | Keyframe look sheet |
| [`out/credits.txt`](out/credits.txt) | CC music credit block |
| [`narration.md`](narration.md) | Voice script used by Showtime |
| [`project-index.html`](project-index.html) | Scene HTML snapshot |

**QA:** `showtime check` PASS (0 errors / 0 warnings) · `showtime qa` PASS (−14.1 LUFS, phone check PASS)

**Higgsfield media_id (uploaded copy):** `fcfc4725-6aa5-43b8-b31a-041b3a7d5f5d`

See [`COMPARISON.md`](COMPARISON.md) for Showtime vs Seedance.
