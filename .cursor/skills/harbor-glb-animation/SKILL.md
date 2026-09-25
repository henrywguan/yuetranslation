---
name: harbor-glb-animation
description: >-
  Harbor Quest Scout / character GLB motion. Use when a Meshy or Higgsfield
  character looks frozen on cast, reel, sit, or arm swing; when auto-rigging
  an unskinned GLB; or when Henry hands clips, Mixamo FBX, stills, or video
  to remodel animations.
---

# Harbor GLB animation

Read [`docs/harbor-quest/GLB-ANIMATION.md`](../../../docs/harbor-quest/GLB-ANIMATION.md) before changing `harborScoutRig.ts`, `harborFishingAnim.ts`, or importing a new character GLB.

## Do not assume T-pose

Meshy / Higgsfield Scout-style GLBs are usually **unskinned A-pose** (sleeves hang at the hips). A T-pose arm chain sits in empty air beside the head. Bones rotate, ticks return true, `hq-arm-r` is skipped, visible sleeves never move.

## If Henry wants remodeled motion

1. **Best:** skinned `.glb` with named clips (`Idle`, `Walking_A`, `Sitting_Idle`, `Cast` / `Reel`). Play those — do not auto-rig over them.
2. **Very good:** Mixamo/KayKit FBX *with skin*, one clip per file. Convert and retarget onto our mesh (never ship the Mixamo/KayKit body).
3. **Good for auto-rig:** labeled stills (`cast-wind`, `cast-fling`, `wait`, `reel-lift`) plus optional video for timing.
4. **Video alone** is a feel reference — it cannot be applied as a skeleton.

Prove sleeve / hand verts move. Bones existing is not a pass.
