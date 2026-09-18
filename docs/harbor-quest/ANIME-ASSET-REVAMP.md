# Harbor Quest · Anime Asset Revamp (locked)

**Date:** 2026-09-18  
**Henry lock:** Full break from voxel / RS-era low-poly for **characters and world**. Target feel: premium Chinese anime open-world dress-up (Genshin / Honkai / Where Winds Meet *atmosphere* — **original Harbor OCs and architecture only**, never copy those IPs).

## North star

| Layer | Lock |
|---|---|
| Characters | ~7-heads-tall anime fashion silhouettes, large eyes, soft hair volumes, slim limbs, visible neck — **addictively dressable** |
| Wardrobe | Soft tapered / rounded meshes — **no box-slab clothing** that re-imposes Minecraft silhouettes |
| World | Stylized painted anime harbor — soft shading, curved roofs, mist, jade/ink palette — **not** chunky RS voxels |
| Assets | Higgsfield sheets + keyart under `docs/harbor-quest/assets/` drive procedural chase |
| Meshy GLB | Gated off until standing mesh is proven visible (`HARBOR_SCOUT_GLB_ENABLED`) |

## Smell tests (fail = reject)

1. Does the Scout still read as stacked cubes / potato mannequin at play camera? → push proportions + wardrobe softforms further.
2. Does Outfitter clothing look like painted boxes on a doll? → replace family builders with cylinders / cones / spheres.
3. Does Guan Harbor look like a Minecraft pier? → soften materials (`flatShading: false`), raise fill light, prefer curved roof volumes.

## Higgsfield canon (this revamp)

| File | Role |
|---|---|
| `scout-female-anime-sheet-v2.png` | ♀ River Scout dress-up target |
| `scout-male-anime-sheet-v2.png` | ♂ River Scout dress-up target |
| `guan-harbor-anime-keyart-v2.png` | World atmosphere target |

## Engineering entry points

- `apps/web/src/landing/learn/harborFigure.ts` — proportions + face + limbs
- `apps/web/src/landing/learn/harborProtagonist.ts` — Scout assembly
- `apps/web/src/landing/learn/harborClothingMeshes.ts` — silhouette wardrobe
- `apps/web/src/landing/learn/harborWorld.ts` — lighting / architecture softness
- `docs/harbor-quest/RS-LIKE-CRAFT-BIBLE.md` §3.1 / §4 — characters + world anime lock overrides era-chunky defaults


## Wave 2+ (2026-09-18 cont.)

| Layer | Change |
|---|---|
| Roofs | `hqAnimeHipRoof` on village homes + all landmark buildings (Save / Outfitter / Bank / Arena / Barber) + boat cabins |
| Boats | Tapered cylinder hulls, soft prow cones, cylinder gunwales — not box barges |
| NPCs | Soft sash cylinders; role hair volumes (no box hats); landmark hosts unique soft kits |
| Hair | Scout styles polished toward v2 sheets (short / topknot / long / fringe / curtains / ridge / pony / twin / wave) |
| Clothes | VIP families get soft emissive sheen on silhouette meshes |
| Map | `HARBOR_EXPLORE_X` → 22; inland terrace shelf + terrace roads; denser village/forest inland; overlook chairs (Where Winds Meet depth — original Harbor geometry) |
| VIP gear | Soft cape cylinders, fan leaf arcs, boat ornament spheres |


## Wave 3 — everything softforms

| Layer | Change |
|---|---|
| Tier detail | All mid/high overlays cylinders/spheres/tori — **zero BoxGeometry** |
| Handhelds | Soft lanterns, fan leaf arcs, oar cylinders |
| Shore + boat lanterns | Cylinder / sphere / torus kits |
| Craft props | Soft rocks, hoop-banded crates, round chairs/stools, anime stall roofs |
| Sails | Billowed hemisphere shells |


## Map language

See [`MAP-LANGUAGE.md`](./MAP-LANGUAGE.md) — Where Winds Meet *feel* for level / map design (layered terraces, winding paths, scenic pavilions, valley mist). Original Harbor only.
