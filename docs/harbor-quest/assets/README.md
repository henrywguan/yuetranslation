# Harbor Quest · Cinematic asset pack (Higgsfield)

**Status:** Active canon references (2026-09-18)  
**Purpose:** Dress-up-addictive, cinematic River Scout identity + Harbor mood. Use these as **visual / VO north stars** for procedural kit, Outfitter marketing, splash, and future GLB import.

**Creative lock:** Anime-adjacent beauty + Harbor Jade/Ink wardrobe. Original characters only — not Jagex, not celebrity likenesses.

---

## Character — River Scout (female)

| File | Role |
|---|---|
| [`scout-female-sheet-a.png`](./scout-female-sheet-a.png) | Soul Cast split-sheet (full + portrait) — primary identity |
| [`scout-female-sheet-b.png`](./scout-female-sheet-b.png) | Soul Cast variant |
| [`scout-female-turnaround.png`](./scout-female-turnaround.png) | Anime turnaround (front / ¾ / side / back) |
| [`scout-female-a-pose.png`](./scout-female-a-pose.png) | A-pose source for Meshy image→3D |

**Design notes for agents:** large expressive eyes, soft blush, traveler bun + bangs, ink-harbor blue robe, jade sash + pendant, straw hat, slim fashion legs. Match `harborFigure` / beauty barber toward this feel — never RS potato mannequin.

## Character — River Scout (male)

| File | Role |
|---|---|
| [`scout-male-sheet.png`](./scout-male-sheet.png) | Soul Cast split-sheet — male dress-up target |

## Environment

| File | Role |
|---|---|
| [`harbor-night-pier.png`](./harbor-night-pier.png) | Cinematic night pier mood (splash / loading / social stills) |

## Voice (Seed Audio TTS)

| File | Line |
|---|---|
| [`vo-scout-welcome.wav`](./vo-scout-welcome.wav) | “Welcome to Jyut Harbor…” |
| [`vo-outfitter-dressup.wav`](./vo-outfitter-dressup.wav) | “Try on something beautiful…” |

**Note:** Higgsfield standalone audio is TTS-only here. Music / SFX stay on Harbor Web Audio beds (`harborBgm`, `harborAmbient`) unless Henry opens a game-pipeline SFX pass.

## 3D

Meshy `image_to_3d` job from `scout-female-a-pose.png` (textured + PBR + humanoid rig). When the GLB lands, store as `scout-female.glb` in this folder and wire via a future GLB protagonist loader — do **not** replace procedural Scout until Henry OKs the mesh in-game.

Higgsfield job id: `b17e9020-8f33-465e-a3c5-e220153b42c8`

---

## Generation jobs (audit)

| Job | Model | Asset |
|---|---|---|
| `9e7e57bc-…` | soul_cast | female sheet A |
| `143f25e3-…` | soul_cast | female sheet B |
| `384f2fca-…` | gpt_image_2_5 | turnaround |
| `7f040761-…` | gpt_image_2_5 | A-pose |
| `04e5b503-…` | soul_location | night pier |
| `d2ef1fbc-…` | soul_cast | male sheet |
| `3e32f6fb-…` | seed_audio | welcome VO |
| `173808eb-…` | seed_audio | outfitter VO |
| `b17e9020-…` | image_to_3d | Scout GLB (pending/complete) |
