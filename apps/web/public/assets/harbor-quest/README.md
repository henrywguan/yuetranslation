# Harbor Quest assets (original)

## SFX

Procedurally synthesized for JyutTranslate Harbor Quest.

- `miss-thud.wav` — original body-hit / grunt cue inspired by classic fantasy-RPG combat hits (not a RuneScape / Jagex asset).
- `miss-oof.wav` — original short vocal “oof” inspired by block-game hurt cues (not a Minecraft / Mojang asset).

Regenerate: `python3 scripts/gen-harbor-miss-sfx.py`

## 3D craft

World meshes are authored in code (`harborCraft.ts`, `harborWorld.ts`, `harborProtagonist.ts`) against **`docs/harbor-quest/RS-LIKE-CRAFT-BIBLE.md`**:

- Locked posterized palette
- Flat Lambert / faceted cylinders (6-gon)
- Extruded windows & chunky architecture
- Oversized-head NPC / River Scout mannequin grammar

Original Harbor / Jiangnan kit — **not** extracted from a RuneScape cache and **not** a recolor of Jagex models.

Do not replace these with ripped game files.

## Coin ching + BGM + scroll (Web Audio)

Ferry-coin pickup, riverside BGM, and chapter-scroll cues are synthesized in the browser (no WAV):

- `harborCoinSfx.ts` — soft metal “ching” on correct casts
- `harborBgm.ts` — original Chinese pentatonic ambient loop (RS-like pacing, not a Jagex track)
- `harborScrollSfx.ts` — paper rustle + wood roller for chapter scroll open / close

Do not replace with ripped game audio.

