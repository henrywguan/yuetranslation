# Harbor Quest assets (original + cinematic)

## SFX

- `miss-thud.wav` / `miss-oof.wav` — original synth miss cues (`scripts/gen-harbor-miss-sfx.py`)
- `sfx-coin-chime.mp3` · `sfx-water-splash.mp3` · `sfx-ui-whoosh.mp3` — Higgsfield Mirelo (wired into coin / fish / UI)

## BGM

- `bgm-harbor-night.m4a` — cinematic river bed (Sonilo); loops under soft synth in `harborBgm.ts`
- `bgm-outfitter.m4a` — Outfitter boutique bed while the shop panel is open

## VO

Seed Audio lines: `vo-scout-welcome.wav`, `vo-outfitter-dressup.wav`, `vo-pier-cleared.wav`, `vo-nice-catch.wav`, `vo-save-shack.wav`, `vo-male-sail.wav` — see `harborVo.ts`.

## 3D

- `scout-female.glb` / `scout-male.glb` — Meshy image→3D (Henry-approved). Standing Scout uses these via `harborProtagonistGlb.ts`; seated canoe stays procedural. Unique wardrobe silhouettes temporarily fall back to procedural body.

World architecture remains procedural craft (`harborCraft.ts` / craft bible). Original Harbor IP — never Jagex meshes.
