# Harbor Quest · Character Looks v1–v4

**Status:** Active build  
**Audience:** Henry + engineering agents  
**Related:** [RS-LIKE-CRAFT-BIBLE.md](./RS-LIKE-CRAFT-BIBLE.md) · [mmo-social-v1.md](./mmo-social-v1.md) · Maple cash-shop research (chat) · [World of ClaudeCraft](https://github.com/levy-street/world-of-claudecraft) modular patterns (systems only)

**Product north star:** Sailors *want* to dress up and pay because outfits change **silhouette**, beauty changes **identity**, and motion makes the body feel alive — not because a box got a new hex color.

### Locked decisions (2026-09-18 · Henry)

| Decision | Lock |
|---|---|
| Ship **v1 → v4** as one program | Silhouette wardrobe → modular compose → barber depth → KayKit-style locomotion |
| KayKit-style idle/walk | **In scope** (v4) — leave pure bob-mannequin behind |
| Aesthetic | Harbor / Jade / RS-like chunk — **not** Maple chibi paste, **not** Jagex meshes |
| Monetization | Cosmetic-only (no learning power). Maple *systems* (overlay, beauty loop, showoff) — ethical Harbor pricing (prefer deterministic sets; gacha optional later) |
| Asset source | Procedural Three.js first; optional CC0 KayKit *animation clips* / rig ideas later — never Jagex cache |

---

## Why (problem)

Today River Scout is a **shared box mannequin**. Most hat / top / bottom / shoes IDs are **recolors**. VIP boats/lanterns already prove unique meshes sell; clothing does not. MapleStory’s cash shop works because every paid piece **changes what others see**. Harbor must do the same.

---

## Phase map

| Phase | Name | Outcome | Primary files |
|---|---|---|---|
| **v1** | Silhouette wardrobe | Mid / high / VIP clothing = distinct mesh families; common may stay scout-base + light detail | `harborClothingMeshes.ts`, `harborGear.ts`, `applyLookToProtagonist` |
| **v2** | Modular compose | One body + slot parts assembled by look (ClaudeCraft `assembleModular` pattern, Harbor-scale) | `harborModularLook.ts`, sockets on protagonist |
| **v3** | Barber that matters | Hair volumes, eyes, face variants, dyes — create/barber change identity at distance | `harborAppearance.ts`, `harborProtagonist.ts`, `HarborCharacterCreate` |
| **v4** | Locomotion clips | Idle + walk driven by limb hierarchy (KayKit-style clip vocabulary); seated canoe kept | `harborProtagonistAnim.ts`, `harborWorld.ts` tick |

Showoff cosmetics (nametag frames, chairs, pets) stay in the Maple remapping backlog — **after** v1–v4 silhouettes exist.

---

## v1 — Silhouette wardrobe

### Rules

1. Every catalog row reports a **mesh family** via `harborGearMeshInfo` (already).
2. **Non-common** hat / top / bottom / shoes get `uniqueMesh: true` *or* a shared family that is still a **different silhouette** from the default scout straw/robe/pants/boots (e.g. all mid hats may share `hat-scholar-cap` family, but that family ≠ straw traveler).
3. `applyLookToProtagonist` **swaps** clothing meshes (hide base tagged parts, attach family builds), then applies palette + VIP overlays + tier detail.
4. Outfitter / character-create preview must show the **same** silhouette as the world Scout.
5. Poly budget: worn piece ~80–600 tris (craft bible). Prefer chunky planes over bevel spam.

### Acceptance

- [ ] Equipping `hat-bamboo` vs `hat-scholar` vs `hat-festival` is obvious at play-camera distance without reading the bag.
- [ ] Smoke: each non-common clothing id maps to a builder; base scout hat/robe hidden when swapped.
- [ ] VIP overlays still stack (cape / crest).

---

## v2 — Modular compose

### Rules

1. Protagonist exposes stable part roots: `body_skin`, `hair`, `eyes`, `under_top`, `under_bottom`, slots `slot_hat` … `slot_shoes`, sockets unchanged.
2. `composeHarborLook(appearance, look)` returns (or mutates) a Scout whose visible children match the pick set — **geometry change on look change**, not only material tint.
3. Underclothes **replaced** when a slot covers them (Maple / ClaudeCraft rule).
4. Far LOD later: bake composed mesh; not required for v2 land.

### Acceptance

- [ ] Changing only `look.hat` does not rebuild unrelated slots’ GPU buffers unnecessarily (cache by family).
- [ ] Smoke: modular part name table ↔ builders.

---

## v3 — Barber / beauty depth

### Rules

1. Extend `HarborAppearance` with `eyeStyle`, `faceStyle` (and keep skin / hair style / hair color).
2. Hair styles become **volume silhouettes** (not 1–2 boxes); eyes readable planes with color.
3. Barber mode + character create share the same builders as the world Scout.
4. Soft currency / free: base styles. Premium dyes / rare faces: Family–Business or future Harbor Cash (pricing TBD with Henry).

### Acceptance

- [ ] Two sailors with different hair+eyes are distinguishable in a remote crowd.
- [ ] `appearanceEqual` / sanitize / progress merge cover new fields.

---

## v4 — KayKit-style idle / walk

### Rules

1. Standing Scout gains a **limb hierarchy** (`hips` → `thigh_l/r` → `shin_l/r`, `spine` → `arm_l/r`) even while meshes stay procedural.
2. Replace world `walkBob`-only with `tickHarborProtagonistAnim(root, { mode: 'idle'|'walk', dt, t })` rotating limbs.
3. Clip vocabulary (names only for now): `Idle`, `Walking_A` — compatible with future CC0 KayKit Character Animations retarget onto a Harbor rig GLB.
4. Seated canoe pose stays a separate mannequin (or seated clip later); do not break boat sit.
5. Remotes use the same tick (cheap) so other sailors look alive.

### Acceptance

- [ ] Walking Scout shows alternating leg swing + arm counter-swing; idle has slight breath/sway.
- [ ] Reduced-motion preference damps amplitude (existing `reduced` path).
- [ ] Smoke: anim module exports tick + clip name constants.

### KayKit note

[KayKit Character Animations](https://kaylousberg.itch.io/kaykit-character-animations) / Character Packs are **CC0**. Harbor may later load clip-only GLBs and retarget onto an original Harbor skeleton. **Do not** ship KayKit knight/mage bodies as Harbor sailors.

---

## Maple systems we still want (post v1–v4)

Documented for sequencing — not blocking this program:

1. Style **overlay** layer (mask look without changing skill/gear identity)
2. Outfit **presets** + try-on
3. Seasonal drops + optional style box (ethics review)
4. Showoff: nametag frame, chat bubble, pier chair, pet

---

## Non-goals

- P2W cosmetics that buy pier clears, XP, or TTS skips
- Jagex meshes / OSRS player kitbash
- Full ClaudeCraft skinned LOD / morph union pipeline in v1
- Abandoning RS-like proportion grammar for soft PBR fashion dolls

---

## Implementation order (agents)

1. PRD (this file)  
2. v1 clothing mesh library + `applyLook` swap  
3. v2 modular scaffold (part roots + compose entry)  
4. v3 appearance fields + eyes/hair volume bump  
5. v4 limb hierarchy + world/remote tick  
6. Smokes + outfitter visual check (Henry local)

---

## Success metric

Henry’s bar: *“I want to dress this sailor and pay for it.”* If VIP clothing still reads as a tinted box at orbit camera, v1 failed.
