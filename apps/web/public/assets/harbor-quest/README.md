# Harbor Quest assets (original + cinematic)

## Splash cinematic

`splash/lantern-canoe-fpov.mp4` + `splash/lantern-canoe-fpov-b.png` — Higgsfield first-person lantern canoe night (wired in `HarborSplash.tsx`).

## SFX

- `miss-thud.wav` / `miss-oof.wav` — original synth miss cues (`scripts/gen-harbor-miss-sfx.py`)
- `sfx-coin-chime.mp3` · `sfx-water-splash.mp3` · `sfx-ui-whoosh.mp3` — Higgsfield Mirelo (wired into coin / fish / UI)

## BGM

- `bgm-harbor-night.m4a` — cinematic river bed (Sonilo); loops under soft synth in `harborBgm.ts`
- `bgm-outfitter.m4a` — Outfitter boutique bed while the shop panel is open

## VO

Seed Audio lines: `vo-scout-welcome.wav` (“Welcome to Harbor Quest.”), `vo-outfitter-dressup.wav`, `vo-pier-cleared.wav`, `vo-nice-catch.wav`, `vo-save-shack.wav`, `vo-male-sail.wav` — see `harborVo.ts`.

## 3D

- `scout-female.glb` / `scout-male.glb` — Meshy v7 image→3D from A-pose sheets. Standing Scout attaches these via `harborProtagonistGlb.ts` (Lambert + cel). Seated canoe stays procedural. Unique wardrobe silhouettes temporarily fall back to the procedural body.

World architecture remains procedural craft (`harborCraft.ts` / craft bible). Original Harbor IP — never Jagex meshes.
