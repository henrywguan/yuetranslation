# Harbor Quest · V2 Mesh World (reborn)

**Date:** 2026-09-19  
**Henry lock:** The playable Harbor is **mesh-only**. Procedural `hqBox` / cylinder craft is **v1 archive** — not the live look.

## Classification

| Era | What it is | Status |
|---|---|---|
| **V1** | `harborCraft.ts` `hqBox` / `CylinderGeometry` world, stacked-primitive Scout, RS craft bible as the default builder | **Frozen.** Kept for smokes / fallback only. Never ship as the player camera look. |
| **V2** | Authored GLBs under `apps/web/public/assets/harbor-quest/v2/` loaded via `harborV2Assets.ts` + Lambert/cel | **Live.** River, Scout, pier, village, boats, lanterns, landmarks, trees, bridges. |

## Smell tests (fail = reject)

1. Does the default river camera still show stacked boxes / floating face cards? → reject.
2. Does any player-visible prop come from `hqBox` when a V2 GLB exists? → reject.
3. Do materials use MeshStandard/MeshToon cel on iPhone? → reject (Lambert + `applyHarborCel` only).

## Engineering

| Module | Role |
|---|---|
| `harborV2Assets.ts` | Manifest + preload + instance helpers |
| `harborProtagonistGlb.ts` | Scout GLBs (canoe plant; land gated off until skinned) |
| `harborGlbAssets.ts` | Generic GLB load + Lambert/cel convert |
| `harborWorld.ts` | Prefer V2 instances for canoe / pier / village / landmarks / trees / bridges |

## Kit catalog (wave 1 + 2)

| Asset id | File | Role |
|---|---|---|
| `canoe` | `v2/canoe.glb` | River hull |
| `pier-module` | `v2/pier-module.glb` | Tileable pier |
| `house-village` | `v2/house-village.glb` | Village house |
| `lantern-paper` | `v2/lantern-paper.glb` | Shore + boat lantern |
| `stall-market` | `v2/stall-market.glb` | Market stall |
| `save-shack` | `v2/save-shack.glb` | Save vault landmark |
| `outfitter` | `v2/outfitter.glb` | Outfitter boutique |
| `willow` | `v2/willow.glb` | Riverside willow |
| `bridge-arch` | `v2/bridge-arch.glb` | Stone arch bridge |

First-camera wave: pier NPCs + landmark hosts keep the **procedural anime dress-up** cast (role hair, props, robe palettes) so land walk / idle can run. Scout GLBs are static T-pose (no skin/clips) — `HARBOR_SCOUT_GLB_LAND = false`; canoe still plants `scout-*.glb`. Bank / Arena / Barber reuse house + Save shells with palette tints. Banks and dirt lanes swap in `v2/tex-grass.png` + `v2/tex-dirt.png`.

Scout characters: `scout-female.glb` / `scout-male.glb` (canoe plant; land cast waits on skinned + animated GLBs).

## Credit reality

Meshy textured image→3D ≈ 30 credits / mesh; Tripo H3.1 ≈ 9. Full unique-prop regen is multi-wave. V2 ships a **kit** that tiles the river, then expands (NPCs, animals, Guan realm, bank / barber / arena).
