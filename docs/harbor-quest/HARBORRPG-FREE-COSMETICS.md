# HarborRPG · Free cosmetic / animated asset scout

**Status:** v6.6 live — free Standard kits (Ranger, Peasant, two dyes) + UAL1/UAL2 on full outfits  
**Date:** 2026-09-29  
**Goal:** CC0 / free-for-commercial models with **motion or animation-friendly rigs** that can become HarborRPG show / cloak / hat / companion flair — **not** ClaudeCraft IP, not Jagex art.

## Shipped (v6.3)

| Asset | Path | Notes |
|---|---|---|
| Male/Female Ranger + Peasant outfits | `apps/web/public/assets/harbor-quest/cosmetics/quaternius/` | Full body swap (`kind: outfit`) |
| Ranger hood M/F · pauldron(s) | same folder | Layer on Scout (`kind: attach`) |
| CREDITS | `cosmetics/CREDITS.md` | Quaternius CC0 |
| Catalogue / runtime | `harborRpgCosmetics.ts` · `harborRpgCosmeticRuntime.ts` | Wardrobe tab + `rpg-vendor` |

Still soft placeholders (no mesh): `rpg-cloak-traveler` (starter), jade cloak, leather/bronze helm, ember cape.

## Best fits (animated or retarget-ready)

| Pack | License | Format | Why it fits | Notes |
|---|---|---|---|---|
| [Quaternius · Modular Character Outfits — Fantasy](https://quaternius.com/packs/modularcharacteroutfitsfantasy.html) | **CC0** | FBX / glTF | 12 outfits · 62 modular parts · Humanoid rig · works with Universal Animation Library | Top pick for cloaks / hats / layered cosmetics. Pair with [Universal Animation Library](https://quaternius.com/packs/universalanimationlibrary.html) (120+ clips, CC0). |
| [Quaternius · Animated Man / Woman / Men / Women](https://quaternius.com/packs/animatedman.html) | **CC0** | FBX / glTF | Ready locomotion + idle clips | Use as companion / NPC skins or clip donors — do **not** ship as River Scout body. |
| [Quaternius · Knight Character](https://quaternius.com/packs/knightcharacter.html) | **CC0** | FBX / glTF | Armor / cape silhouette with animation | Good Reliquary / title flair reference; retarget onto Scout or modular outfit. |
| [Kenney · Animated Characters 1–3](https://opengameart.org/content/animated-characters-3) | **CC0** | (zip) | Idle / jump / run · 4 skins | Tiny, web-friendly; credit optional. |
| [Gobkit Free Minions](https://gobkit.itch.io/gobkit-free-minions) | **CC0** | **GLB** | idle / attack / dead baked · Three.js ready | Companion / pet-shaped allies (matches soft companion mesh). Manifest: `https://gobkit.com/api/free` |
| [Cinevva free CC0 characters](https://app.cinevva.com/game-assets/free-3d-character-models) | **CC0** | **GLB** | Many Quaternius / Kenney / Protocol Mind GLBs, some pre-skinned | Convenient GLB download shelf for browser import. |

## Strong accessory libraries (often need Mixamo / Blender)

| Pack | License | Motion? | Notes |
|---|---|---|---|
| [OverScore Proxy modular set](https://opengameart.org/content/overscore-proxy-modular-low-poly-female-character-creation-set) | Free commercial | Unrigged | **315** hats / cloaks / tops / etc. Needs Blender + Mixamo (their tutorial is linked on OGA). Huge cosmetic catalog once skinned. |
| [Angel Wing (DevMops)](https://opengameart.org/content/angel-wing) | Check page (often CC0 collection) | Static FBX | Back-slot cosmetic; attach to Scout spine. |
| [Poly Pizza · Hooded Adventurer (Quaternius)](https://poly.pizza/m/y9KWOVG21R) | **CC0** | Static / pack-dependent | Hood silhouette for cape/hood cosmetics. |
| Poly Pizza hats (Top Hat / Cap by J-Toastie) | **CC-BY** | Static | Attribution required — prefer Quaternius CC0 if you want zero credit UI. |

## Motion-only libraries (clip donors)

| Pack | License | Use |
|---|---|---|
| Quaternius Universal Animation Library | CC0 | Death / emote / combat / loco for humanoid cosmetics |
| Mixamo | Adobe ToS | Retarget onto **Harbor** meshes only — never ship Mixamo body |

## HarborRPG wiring tips

1. Prefer **GLB/glTF + named clips** (`Idle`, `Walk`, `Run`) — same path as Ferry Stable mounts (`harborRpgMountRuntime.ts`).
2. Cosmetics should attach to Scout bones / sockets (head / back / hand) — modular Quaternius parts are the least retopo work.
3. Keep soft bag ids in `HARBOR_RPG_COSMETICS` / future wardrobe UI; do not mix into Harbor Quest showoff VIP gear.
4. Drop CREDITS under `apps/web/public/assets/harbor-quest/cosmetics/CREDITS.md` when you land packs (same pattern as mounts).

## Suggested next imports

1. ~~Quaternius Modular Outfits Fantasy (cloak + hood + helm parts)~~ **shipped v6.3**
2. ~~Universal Animation Library (death / wave / bow for deeds / titles)~~ **shipped v6.6** (UAL1 + UAL2, in-place)
3. Gobkit Free Minions (animated companion skins to replace the soft fox primitive)
4. Optional: Kenney Animated Characters skins for town NPCs
5. More Quaternius modular outfits — free Standard (verified 29 Jan 2026) still has only Ranger + Peasant. Knight / Mage / Noble / Wizard are outside that zip.

Henry owns OGA mount `.blend` export; this list is for **cosmetics / companions / flair**, not mount packs.
