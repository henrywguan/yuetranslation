# Harbor Quest · Cinematic asset pack (Higgsfield)

**Status:** Active canon references (2026-09-18)  
**Purpose:** Dress-up-addictive, cinematic River Scout identity + Harbor mood. Use these as **visual / VO / audio north stars** for procedural kit, Outfitter marketing, splash, BGM/SFX beds, and future GLB import.

**Creative lock:** Anime-adjacent beauty + Harbor Jade/Ink wardrobe. Original characters only — not Jagex, not celebrity likenesses.

---

## Character — River Scout (female)

| File | Role |
|---|---|
| [`scout-female-anime-sheet-v2.png`](./scout-female-anime-sheet-v2.png) | **2026-09-18 revamp** — Soul Cast anime sheet (~7-head fashion) |
| [`scout-female-sheet-a.png`](./scout-female-sheet-a.png) | Soul Cast split-sheet (full + portrait) — prior identity |
| [`scout-female-sheet-b.png`](./scout-female-sheet-b.png) | Soul Cast variant |
| [`scout-female-turnaround.png`](./scout-female-turnaround.png) | Anime turnaround (front / ¾ / side / back) |
| [`scout-female-a-pose.png`](./scout-female-a-pose.png) | A-pose source for Meshy image→3D |
| [`scout-female-outfit-festival.png`](./scout-female-outfit-festival.png) | Festival jade/gold silk dress-up still |
| [`scout-female-outfit-rain.png`](./scout-female-outfit-rain.png) | Rain-traveler cloak dress-up still |
| [`scout-female-outfit-evening.png`](./scout-female-outfit-evening.png) | Modest pier-evening silk jacket look |

**Design notes for agents:** large expressive eyes, soft blush, traveler topknot + face strands, ink-harbor blue robe, jade sash + pendant, ~7-heads-tall fashion legs. Match `harborFigure` toward **v2** sheets — never RS potato / voxel mannequin. See [`../ANIME-ASSET-REVAMP.md`](../ANIME-ASSET-REVAMP.md).

## Character — River Scout (male)

| File | Role |
|---|---|
| [`scout-male-anime-sheet-v2.png`](./scout-male-anime-sheet-v2.png) | **2026-09-18 revamp** — Soul Cast anime sheet (~7-head fashion) |
| [`scout-male-sheet.png`](./scout-male-sheet.png) | Soul Cast split-sheet — prior male dress-up target |
| [`scout-male-a-pose.png`](./scout-male-a-pose.png) | A-pose source for Meshy image→3D |

## NPC cast (unique female / male)

**Appeal north star:** MapleStory fashion charm · Where Winds Meet elegance · Genshin silhouette beauty · Black Desert face/outfit polish · Elder Scrolls Online noble variety — **original Harbor OCs only** (never copy those IPs’ characters).

Procedural meshes in `harborWorld.ts` (`chineseNpc` / `landmarkHostNpc`) chase these sheets with the shared anime `harborFigure` kit + gender mix.

### Landmark hosts

| File | Name | Gender | Role |
|---|---|---|---|
| [`npcs/mei-lin-outfitter.png`](./npcs/mei-lin-outfitter.png) | Mei Lin | ♀ | River Outfitter |
| [`npcs/wei-barber.png`](./npcs/wei-barber.png) | Wei | ♂ | Harbor Barber |
| [`npcs/yun-save-keeper.png`](./npcs/yun-save-keeper.png) | Yun | ♀ | Save Keeper |
| [`npcs/jin-banker.png`](./npcs/jin-banker.png) | Master Jin | ♂ | Banker |
| [`npcs/arena-master.png`](./npcs/arena-master.png) | Arena Master | ♂ | Arena host |

### Pier role NPCs

| File | Name | Gender | Role |
|---|---|---|---|
| [`npcs/an-scholar.png`](./npcs/an-scholar.png) | An | ♀ | Scholar |
| [`npcs/bo-ferryman.png`](./npcs/bo-ferryman.png) | Bo | ♂ | Ferryman |
| [`npcs/rui-merchant.png`](./npcs/rui-merchant.png) | Rui | ♀ | Merchant |
| [`npcs/hao-fisherman.png`](./npcs/hao-fisherman.png) | Hao | ♂ | Fisherman |
| [`npcs/ping-villager.png`](./npcs/ping-villager.png) | Ping | ♀ | Villager |

## Environment & splash

| File | Role |
|---|---|
| [`harbor-night-pier.png`](./harbor-night-pier.png) | Cinematic night pier mood |
| [`guan-harbor-anime-keyart-v2.png`](./guan-harbor-anime-keyart-v2.png) | **2026-09-18 revamp** — anime Guan Harbor world target |
| [`harbor-dawn-pier.png`](./harbor-dawn-pier.png) | Dawn pier / loading mood |
| [`harbor-outfitter-interior.png`](./harbor-outfitter-interior.png) | Outfitter boutique interior |
| [`harbor-splash-keyart.png`](./harbor-splash-keyart.png) | Splash / title key art (Scout on night pier) |

## Voice (Seed Audio TTS)

| File | Line |
|---|---|
| [`vo-scout-welcome.wav`](./vo-scout-welcome.wav) | “Welcome to Harbor Quest.” |
| [`vo-outfitter-dressup.wav`](./vo-outfitter-dressup.wav) | “Try on something beautiful…” |
| [`vo-pier-cleared.wav`](./vo-pier-cleared.wav) | “Pier cleared. The ferry lights are waiting for you.” |
| [`vo-nice-catch.wav`](./vo-nice-catch.wav) | “Nice catch! Bring it to the pier market.” |
| [`vo-save-shack.wav`](./vo-save-shack.wav) | “Save Shack. Your look is safe with the tide.” |
| [`vo-male-sail.wav`](./vo-male-sail.wav) | “Ready when you are. Let's sail the harbor.” (male Scout) |

Female VO: Brielle preset · Male VO: Holden preset.

## Music & SFX (game pipeline)

Henry opened full creative audio control for Harbor Quest. These beds/cues are **wired** into runtime (`apps/web/public/assets/harbor-quest/` + `harborBgm` / `harborVo` / sample SFX).

| File | Role |
|---|---|
| [`bgm-harbor-night.m4a`](./bgm-harbor-night.m4a) | Night harbor ambient pad (~20s, Sonilo) |
| [`bgm-outfitter.m4a`](./bgm-outfitter.m4a) | Outfitter boutique bed (~12s, Sonilo) |
| [`sfx-coin-chime.mp3`](./sfx-coin-chime.mp3) | Soft jade coin purchase (Mirelo) |
| [`sfx-water-splash.mp3`](./sfx-water-splash.mp3) | Gentle catch splash (Mirelo) |
| [`sfx-ui-whoosh.mp3`](./sfx-ui-whoosh.mp3) | Soft dress-up menu whoosh (Mirelo) |

## 3D

| File | Role |
|---|---|
| [`scout-female.glb`](./scout-female.glb) | Meshy v7 image→3D from female A-pose — textured albedo, Lambert+cel at runtime |
| [`scout-male.glb`](./scout-male.glb) | Meshy v7 image→3D from anime male A-pose v2 — textured albedo, Lambert+cel at runtime |
| [`scout-male-a-pose-v2.png`](./scout-male-a-pose-v2.png) | Anime male A-pose used for the v2 male GLB |

Wire via `harborProtagonistGlb.ts` (standing Scout). Seated canoe stays procedural. Unique wardrobe silhouettes temporarily fall back to the procedural body.

**Runtime audio** (copied to `apps/web/public/assets/harbor-quest/`): BGM beds + SFX + VO are wired through `harborBgm.ts` / `harborSampleAudio.ts` / `harborVo.ts` / coin·fish·UI SFX modules.

Female Meshy job: `b17e9020-8f33-465e-a3c5-e220153b42c8` (completed)  
Male Meshy job: `75c9d9ae-f8a9-420b-b2e2-d76c1dca452a` (completed)

---

## Generation jobs (audit)

| Job | Model | Asset |
|---|---|---|
| `9e7e57bc-…` | soul_cast | female sheet A |
| `143f25e3-…` | soul_cast | female sheet B |
| `384f2fca-…` | gpt_image_2_5 | turnaround |
| `7f040761-…` | gpt_image_2_5 | female A-pose |
| `04e5b503-…` | soul_location | night pier |
| `d2ef1fbc-…` | soul_cast | male sheet |
| `469ee524-…` | seed_audio | welcome VO (“Welcome to Harbor Quest.”) |
| `173808eb-…` | seed_audio | outfitter VO |
| `b17e9020-…` | image_to_3d | female Scout GLB |
| `ca3ab311-…` | gpt_image_2_5 | male A-pose |
| `8dfb610d-…` | gpt_image_2_5 | festival outfit |
| `56440589-…` | gpt_image_2_5 | rain outfit |
| `18c5986d-…` | gpt_image_2_5 | evening outfit (retry) |
| `b1b1601f-…` | soul_location | dawn pier |
| `71e3e1a5-…` | soul_location | Outfitter interior |
| `12a3d7ab-…` | gpt_image_2_5 | splash key art |
| `c235b988-…` | seed_audio | pier cleared VO |
| `905aefb3-…` | seed_audio | nice catch VO |
| `1180463a-…` | seed_audio | Save Shack VO |
| `7a6f8ee3-…` | seed_audio | male sail VO |
| `0bf5e981-…` | sonilo_music | harbor night BGM |
| `cd76841b-…` | sonilo_music | Outfitter BGM |
| `81631b8c-…` | mirelo_text_to_audio | coin chime |
| `2e439dc6-…` | mirelo_text_to_audio | water splash |
| `7990a046-…` | soul_cast | Scholar An |
| `db4fc736-…` | soul_cast | Ferryman Bo |
| `0a13a2c3-…` | soul_cast | Merchant Rui |
| `dcfed29d-…` | soul_cast | Fisherman Hao |
| `2072b5f0-…` | soul_cast | Villager Ping |
| `307760a0-…` | soul_cast | Outfitter Mei Lin |
| `7029b875-…` | soul_cast | Barber Wei |
| `a8295071-…` | soul_cast | Save Keeper Yun |
| `82a47839-…` | soul_cast | Banker Jin |
| `5ca1b81e-…` | soul_cast | Arena Master |
