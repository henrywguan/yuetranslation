# Harbor Quest · GLB animation (auto-rig + clips)

**Date:** 2026-09-20  
**Use when:** a new Meshy / Higgsfield / catalog character walks but **cast, reel, sit, or arm swing does not move the visible mesh** — or when teaching an agent to remodel a GLB’s motion.

Code: [`harborScoutRig.ts`](../../apps/web/src/landing/learn/harborScoutRig.ts) · [`harborFishingAnim.ts`](../../apps/web/src/landing/learn/harborFishingAnim.ts) · [`harborProtagonistAnim.ts`](../../apps/web/src/landing/learn/harborProtagonistAnim.ts) · [`harborProtagonistGlb.ts`](../../apps/web/src/landing/learn/harborProtagonistGlb.ts)

---

## Paste-ready agent prompt

Copy the block below into a new agent chat when another unskinned character looks frozen on fishing / sit / arm swing.

```
Harbor Quest character looks frozen on cast / reel / sit / arm swing.

Do not assume T-pose. Meshy / Higgsfield Scout-style GLBs are usually
unskinned A-pose: sleeves hang at the hips. A T-pose arm chain (shoulder
→ wrist almost horizontal at ~0.78H) sits in empty air beside the head.
Bones rotate, tickScoutSkeletonFish / tickScoutSkeletonLocomotion return
true, the hq-arm-r fallback is skipped, and the visible sleeves never move.
The rod then parents to an invisible T-pose wrist.

Read docs/harbor-quest/GLB-ANIMATION.md first.

Fix in:
- apps/web/src/landing/learn/harborScoutRig.ts (layoutBones + skin weights
  + walk/idle/sit/fish poses)
- apps/web/src/landing/learn/harborFishingAnim.ts (rod on SCOUT_BONE.handR)
- smokes: harborScoutRig.smoke.ts, harborFishingAnim.smoke.ts

Required:
1. Slice the live GLB (world-space width vs height). If widest at ~0.45–0.55H
   and shoulders are narrower, it is A-pose — hang the arm bones:
   shoulder ~0.78H, elbow ~0.61H, wrist ~0.46H, wrist X ~0.42W.
2. Side-aware weights (same-side limbs, don’t paint head/hair onto arms).
3. Retune poses for hanging arms (rotate X to lift/swing). Do not “drop
   T-pose arms” with large Z.
4. Prove it: bind-pose right sleeve verts (world x>0.18, y 0.55–1.12) must
   move >0.20 on cast wind, and handR must travel hip → up/back → forward.
   Bones existing is not enough.
5. Keep the sailor in frame during fishing (don’t look-at 70% at the splash).
6. Offline smokes + apps/web tsc -b. No paid DeepSeek/Azure. No live-mic changes.
```

**Rule of thumb:** if the new GLB has **no skins** and **arms down**, retarget the auto-rig to that bind before writing any animation. If it already has a real skeleton, drive those bones — do not paint a second T-pose on top.

---

## What went wrong on Scout (2026-09-20)

Meshy image→3D (`scout-female.glb` / `scout-male.glb`) ships **one unskinned mesh, zero clips**. Runtime `rigHarborScoutGlb` paints a humanoid armature from the bounding box.

The first layout assumed **T-pose** (arms straight out at shoulder height). The mesh is **A-pose** (widest at the hips). Rotating `scout-bone-upper-arm-r` twitched empty air; `tickScoutSkeletonFish` still returned `true`, so the procedural `hq-arm-r` fallback never ran.

Fix: hang the arm chain (shoulder → elbow → wrist down the sleeve), side-aware weights, A-pose cast/reel numbers, sailor kept in frame. See PR lineage around Harbor fishing skeleton.

---

## How to teach an agent to remodel a GLB’s animations

Ranked by what actually works. Video is a **feel reference**, not a file the agent can apply as motion.

### 1. Best — skinned GLB / GLTF **with clips inside**

Give the agent a `.glb` (or `.gltf` + `.bin` + textures) that already has:

- A `SkinnedMesh` + `skinIndex` / `skinWeight`
- Named clips that match Harbor vocabulary when possible: `Idle`, `Walking_A`, `Sitting_Idle`, plus `Cast` / `Wait` / `Reel` / `Catch` if you have them

Then prompt: *“This GLB is already skinned. Play these clip names in `tickHarborProtagonistAnim` / fishing; do not auto-rig over the authored skeleton.”*

This is the only drop-in that replaces the procedural bone ticks.

**Export settings that matter:** Y-up, meters, applied transforms, one humanoid root, clip names not `Take 001`. Bind pose should match the mesh (A-pose mesh + A-pose bind, or T-pose + T-pose — never mix).

### 2. Very good — Mixamo / KayKit **FBX or GLB per clip**

Harbor already reserved KayKit clip names (`Idle`, `Walking_A`) for a future retarget. See [`character-looks-v1-v4.md`](./character-looks-v1-v4.md).

Workflow Henry can run:

1. Upload the character to [Mixamo](https://www.mixamo.com) (or use a CC0 KayKit humanoid).
2. Auto-rig there (Mixamo needs a **T-pose or A-pose it can detect** — Meshy A-pose usually works).
3. Download **each** clip as FBX, *with skin*, 30 fps, *in place* (not root-motion hop).
4. Drop the files in chat or under `docs/harbor-quest/assets/` / `apps/web/public/assets/harbor-quest/`.
5. Prompt: *“Convert these Mixamo FBX clips to GLB and retarget onto the Harbor Scout. Keep our mesh; do not ship the Mixamo/KayKit body.”*

`.fbx` is fine. The agent can convert to `.glb` with Blender or `fbx2gltf`. Do **not** ship KayKit knight/mage bodies as Harbor sailors.

### 3. Good for *this* pipeline — stills of the poses you want

For the auto-rig (no authored clips), the agent retunes bone numbers. The most useful pack is **4–6 stills**, same camera, labeled:

| File name idea | Beat |
|---|---|
| `cast-wind.png` | Rod arm fully back over the shoulder |
| `cast-fling.png` | Arm whipped toward the water |
| `cast-wait.png` | Hold, rod pointing at the bobber |
| `reel-lift.png` | Rod hoisted, cranking |
| `sit-canoe.png` | Hands on lap / gunwales |
| `walk-pass.png` | Opposite arm/leg mid-stride |

A short screen recording of another game or a phone video of you acting the cast is useful **with** those stills (timing: “wind 0–0.35, fling by 0.65s”). Alone, video is not enough to retarget a skeleton.

### 4. Useful, not sufficient — video / Recordly / Higgsfield

| What you send | What the agent can do |
|---|---|
| Phone / Recordly clip of the desired motion | Match timing, amplitude, camera framing; rewrite procedural poses |
| Higgsfield character sheet / turnaround | Silhouette + bind pose (A vs T), not animation |
| Higgsfield video of a *different* body | Feel only — cannot copy that skeleton onto our mesh |
| “Make it look like this YouTube short” | Reference only; still need our GLB + a rig |

The agent cannot extract a production skeleton from an MP4 and paste it onto `scout-female.glb`.

### 5. Avoid as the *only* source

- `.blend` with unapplied modifiers / linked libraries (export GLB/FBX instead)
- Alembic / USD caches (no Harbor loader)
- Mixamo “without skin” (clip-only, no bind) unless we already have a matching Mixamo rig
- A second Meshy GLB that is also unskinned — that repeats the A-pose bug unless the auto-rig is retargeted

---

## What to say in the prompt (remodel)

```
Remodel Harbor Scout motion to match the attached references.

1. Inspect the live GLB bind (A-pose vs T-pose vs already-skinned).
2. If the files include authored clips, play those. Do not paint a second armature.
3. If they are stills / video only, retune harborScoutRig poses (don’t fake a clip).
4. Prove sleeve / hand verts move — bones existing is not a pass.
5. Keep canoe sit, iOS Lambert+cel, and live-mic untouched.
```

Attach the GLB (or path under `apps/web/public/assets/harbor-quest/`) **and** the clip/FBX/stills in the same turn.

---

## Smell tests (fail = reject)

1. Bones exist / `tickScoutSkeletonFish` returns true, but the sleeve does not move → reject (wrong bind or weak weights).
2. Rod floats beside the head → wrist bone is still T-pose in empty air.
3. New GLB is skinned with clips, but we still auto-rig over it → reject.
4. Walk looks alive, cast does not → arm layout is wrong (the Scout 2026-09-20 bug).

Smoke: `npx tsx apps/web/src/landing/learn/harborScoutRig.smoke.ts` · `npx tsx apps/web/src/landing/learn/harborFishingAnim.smoke.ts`
