# Harbor Quest — RS-like Low-Poly Craft Bible

**Purpose:** Technical + aesthetic rules for building *original* Harbor Quest 3D assets that *read as* classic RuneScape 2 / OSRS-era low-poly, without copying Jagex meshes, textures, names, UI chrome, characters, or other IP.

**Audience:** Modeling agents, art direction, Harbor Quest pipeline work.

**Legal posture (non-lawyer summary):** Imitate **principles** (budget, silhouette language, lighting model, proportion grammar). Do **not** import, rip, trace, recolor, or redistribute Jagex cache assets. Do **not** use RuneScape / OSRS / Jagex trademarks in product branding. Jagex’s Fan Content Policy explicitly forbids making a video game using Jagex Property — Harbor Quest must be original IP that only borrows *generic era techniques*. See §7.

---

## 0. Era target

| Era | What to take | What to ignore |
| --- | --- | --- |
| **RS2 / pre-HD (~2004–2007) → OSRS baseline** | Integer verts, triangulated faces, HSL face colors, Gouraud lighting, chunky architecture, readable silhouettes, 128×128 texture idioms | RS3 NXT PBR, high-res skins, normal maps as primary detail, soft organic sculpts |
| **RSC (pre-RS2)** | Optional scenery reference only (OB3 n-gons, 15-bit fills) | Sprite characters; paper-thin walls |
| **RSPS tooling lore** | Why Metasequoia / Datmaker / PRI / TSKIN exist — *constraints that shaped the look* | Cache packing, private-server pipelines (Harbor Quest is not an RSPS) |

**North-star quote (Jagex, Oct 2002 3-D update):** buildings should be “satisfyingly chunky,” windows “extruded from the walls, rather than being flat texture maps.” That single sentence is the architecture grammar.

---

## 1. Geometry rules

### 1.0 Hard engine ceilings (why the look exists)

Community docs of the classic client’s rasterizer (Rune-Server “Rendering and Animation System”) cite practical ceilings that still shape authentic RS-like work:

| Constraint | Typical classic client behavior |
| --- | --- |
| **~4096 triangles / model** | Above this, models often fail to draw (invisible) |
| **~2000 triangles** when priority / anim metadata is present | Stricter path for animated pieces |
| **Fixed-point / quantized verts** | Vertices closer than ~4 units can snap together — micro-detail collapses |
| **Aggressive batching + CPU raster heritage** | High poly hurts tick time, not just GPU fill |

Harbor Quest is **not** bound to those exact ints, but staying well under them is how you keep the silhouette language honest. Treat **silhouette + few large planes** as the art goal; treat the numbers as a smell test (“would a 2005 client choke?”).

### 1.1 Poly budgets (practical, silhouette-first)

Hard format ceilings in classic RS model headers are far higher than art budgets (unsigned short → tens of thousands of verts/faces). The *look* comes from staying well below modern game counts.

| Asset class | Target triangles (Harbor Quest) | Notes |
| --- | --- | --- |
| Prop / small item (mug, coin, key) | 12–80 | Boxy primitives; silhouette > bevels |
| Handheld weapon / tool | 40–250 | Inventory icon readability matters |
| Worn equipment piece | 80–600 | Match player limb thickness |
| Furniture / crate / barrel | 50–400 | Extrude details; avoid thin walls |
| Medium scenery (cart, stall, boat hull section) | 200–1,200 | Prefer modular chunks |
| Tree / bush | 80–500 | Canopy as few large planes or a low cone stack |
| Rock / cliff chunk | 40–300 | Faceted; no organic subdivision |
| Humanoid character (full body) | 400–2,000 | Prefer modular kit (head / torso / arms / legs) |
| Boat (complete small vessel) | 300–2,000 | Chunky gunwales; thick masts |

**Rules of thumb**

1. **If a face is never readable at play-camera distance, delete it.**
2. **Silhouette first:** block out with cubes/cylinders; only then cut bevels (usually 1 hard bevel max).
3. **Boxiness is a feature:** 90° corners, planar walls, extruded frames. Soft subdivision = wrong era.
4. **Triangles only** for engine-faithful exports historically (Datmaker: “contains quads” error). For Harbor Quest GLTF/Three.js you *may* use quads in Blender, but **triangulate on export** and author as if every face is a triangle.
5. **Weld vertices aggressively.** Shared edges = cheaper lighting + no cracks. Avoid duplicate verts along seams unless you need a hard lighting break.
6. **Integer-ish coordinates.** Classic RS verts round to integers on encode. Author on a coarse grid (e.g. 1 unit = 1 “RS unit”); avoid sub-unit jitter that reads as modern CAD.
7. **No floating micro-geo.** Rivets, rope strands, fingernails: paint or imply with a color strip, don’t mesh them.
8. **Consistent world scale.** Build against a locked Harbor Quest mannequin. Never free-scale “until it looks cool” without checking adjacent props.

### 1.2 Topology habits

- Prefer **edge loops only where animation bends** (elbow, knee, shoulder, waist).
- Prefer **planar patches** for architecture (walls, roofs, docks).
- Prefer **faceted cylinders** (6–8 sides) for posts, masts, limbs — not 16–32 smooth tubes.
- **Mirrored half-body** for characters, then apply mirror; keep centerline clean.
- Avoid Ngons in final mesh; avoid T-junctions on visible hard edges.

### 1.3 UV simplicity

Classic RS texturing often **does not store UVs per vertex**. Pre-474 / 317-style models use **texture mapping triangles** (PMN / “texture triangles”): three 3D points defining UV(0,0), UV(0,1), UV(1,0) of a square texture plane projected onto one or more faces. Cap historically cited at **64 texture triangles per model**.

For Harbor Quest (modern renderer):

- Keep UVs **sparse and planar** (box project, tri-planar for rocks).
- Prefer **one texture island per material region**, not packed PBR atlases with dozens of islands.
- Allow **stretch** on side faces; classic look tolerates stretch.
- Do **not** author high-frequency normal-map detail as the primary craft; use geometry + flat albedo.

---

## 2. Materials / shading

### 2.1 Lighting model (the “OSRS look”)

Classic client path:

1. Model stores **per-face base color** (Jagex **HSL16**).
2. Runtime `light(ambient, contrast, lightDir)` computes **per-corner lit colors** (`faceColors1/2/3` in RuneLite terms).
3. Rasterizer **Gouraud-interpolates** across the triangle (or uses a single color for flat faces via render/draw type).

**Harbor Quest shader target**

- **Vertex / Gouraud-style lighting**, not PBR specular workflows.
- Soft, directional key + high ambient fill (readable indoors and out).
- Optional **flat shading** on architecture panels; **smooth/Gouraud** on organic-ish forms (heads, rocks) *without* raising poly count.
- Avoid strong realtime shadows as the primary form-giver; form should read in lit vertex colors alone.
- Slight **value banding** is acceptable; oversmooth gradients read modern.

### 2.2 Color encoding lessons (even if you use RGB)

Jagex HSL16 packing (community tooling / ob2blender):

| Channel | Bits | Range |
| --- | --- | --- |
| Hue | 6 | 0–31 |
| Saturation | 3 | 0–7 (very coarse) |
| Lightness | 7 | 0–63 |

**Practice:** pick colors that survive quantization. Saturation differences that are subtle in Blender can collapse. Prefer **distinct value steps** over adjacent hues. Build a Harbor Quest palette of ~32–64 locked swatches (wood, stone, water, cloth, metal, skin, foliage) and stick to it.

RSC OB3 used **15-bit RGB fills** (5 bits/channel) with separate front/back fills and intensity — same lesson: limited palette, intentional posterization.

### 2.3 Flat vs smooth

| Use flat | Use smooth / Gouraud |
| --- | --- |
| Walls, crates, docks, planks, armor plates | Heads, round rocks, soft cloth bags, fruit |
| Anything that should read as “carpentered” | Anything that should read as “carved blob” |

Do **not** fake smoothness with 4× poly density.

### 2.4 Textures

| Rule | Spec |
| --- | --- |
| Native OSRS idiom size | **128×128** (community dumps; resize with nearest-neighbor) |
| Harbor Quest stills | Prefer 64–128; 256 only for hero props if mip carefully |
| Filtering | Start with **nearest** or light bilinear; heavy anisotropic = wrong era |
| Content | Hand-painted or simple procedural: wood grain, stone speck, thatch, water, lava |
| Atlas | Shared material atlas OK; avoid photo-real scans |
| Transparency | Hard cutouts / limited alpha (leaves, fences); glass as tinted translucent faces |
| Animated | Scroll/cycle UVs for water/lava (classic trick), not shader foam |

**Material priority for authenticity:** untextured **face colors** > simple albedo textures > anything with roughness/metalness maps.

### 2.5 Vertex colors

Optional Harbor Quest path that strongly sells the era:

- Bake a **single directional light** into vertex colors.
- Keep ambient high so dark sides stay readable.
- Do not bake AO cavities that look like modern Substance workflows.

---

## 3. Proportion language

### 3.1 Humanoids (OSRS / 2007 player grammar)

From OSRS body-type docs + common visual analysis of the 2007 model:

- **Head:** oversized oval (Body type A) or pointed-chin oval (Body type B); facial features are **planes + color**, not sculpted pores.
- **Torso:** stocky rectangle / slab; shoulders slightly wider than hips; little waist pinch on type A.
- **Limbs:** short relative to torso; thick cylinders (faceted).
- **Hands / feet:** conspicuously large (“chunky hands”); mittens > articulated fingers unless close-up hero.
- **Neck:** short stub.
- **Stance:** slightly bow-legged / planted; idle reads as toy-soldier, not fashion mannequin.

**Harbor Quest characters** should obey this grammar even when costumes differ — that is the readable “RS-like” signal.

### 3.2 Items & gear scale

- Weapons are **oversized** vs real life (especially blades / hilts) so they read in third person.
- Shields are thick slabs, not thin discs.
- Bags / pouches are **inflated** volumes.
- Jewelry is chunky enough to catch light as a few faces.

### 3.3 Environment scale

- Doorways and walls feel **thick** (chunky masonry).
- Stairs: deep treads, few steps, exaggerated risers OK.
- Furniture: blocky; chair legs are posts, not spindles.
- Boats: thick gunwales, blunt bows, stubby masts; sails as few large quads/tri fans.

---

## 4. Environment / architecture / nature / characters / boats

### 4.1 Architecture

Jagex 2002 brief still applies:

1. **Chunky walls** (extruded thickness, not paper planes).
2. **Extruded windows / door frames** (geometry recess or protruding sill).
3. Roofs as **simple prism / hip** volumes; thatch = texture or jagged edge strip, not millions of straw strands.
4. Modular kit: wall, corner, door, window, roof, pier plank — snap on a grid.
5. Color blocking: wall base vs trim vs roof as separate face-color materials.

### 4.2 Trees

- Trunk: 5–8 sided tapered prism.
- Canopy: 1–3 overlapping low-poly volumes (icosa-ish blobs or layered discs), **not** leaf cards by the hundreds.
- Roots: optional 2–4 wedge feet.
- Species difference = **silhouette + palette**, not bark normal maps.

### 4.3 Rocks / cliffs

- Start from a cube; cut corners; keep large planar facets.
- Cliff faces: stacked extruded shelves.
- Avoid sculpt → remesh → high poly decimate pipelines that leave organic noise.

### 4.4 Characters / NPCs

- Readable **role silhouette** at distance (hat, cape, tool, belly).
- Prefer **kitbash** of Harbor Quest body + unique hat/prop over unique full-body topology each time.
- Faces: 3–6 color regions (skin, hair, eyes, lips, cheeks). Eyes are simple inserts, not specular spheres.

### 4.5 Boats / docks (Harbor Quest–critical)

- Hull: faceted longitudinal planks or a low prism hull with thick rail.
- Dock: repeated plank modules + chunky piles (faceted cylinders).
- Ropes: single extruded beams or textured ribbons — not cable simulation.
- Water interaction: separate water plane with scrolling simple texture; boat does not need foam meshes.

---

## 5. Animation / posing conventions

From RSPS / OSRS pipeline lore (for *understanding* the look; Harbor Quest uses modern skeletons):

| Classic RS concept | Meaning | Harbor Quest translation |
| --- | --- | --- |
| **TSKIN** | Face/vert labels assigning parts to anim groups | Use clear bone influence groups; avoid mushy weights |
| **VSKIN** | Weights; values >1.0 split across layers | Keep weights simple; max 2–3 influences |
| **PRI** | Face draw priority (order / “see-through” fix) | Sort translucent faces; avoid intersecting alpha |
| Fixed anim indices | Client expects known skeleton | One shared humanoid rig for all Harbor NPCs |
| Item anim helpers | Swords/shields/hats auto-attached | Attachment sockets: `hand_r`, `hand_l`, `head`, `back` |

**Pose language**

- Combat: readable wind-ups, few frames, strong holds (gameplay clarity).
- Idle: slight sway or bob; avoid mocap micro-noise.
- Walk: short stride, stamped contact; classic “puppet” timing.
- Prefer **snappy** keys over floaty easing for combat tells.

**Do not** ship animations that only work because they were ripped from OSRS caches.

---

## 6. Toolchains (historical) & Harbor Quest export

### 6.1 Historical RSPS stack (context only)

| Tool | Role |
| --- | --- |
| **Metasequoia (MQO)** | Dominant final editor: simple polys, predictable triangulation, PRI/TSKIN layers |
| **Datmaker** | MQO ↔ `.dat` for 317-ish clients; rejects quads; material colors not image textures |
| **Blender** | Blockout / retopo / UV; historically *must* clean → MQO/Datmaker |
| **C# Model Viewer / Suic toolkit / Qodat / rsmv** | Higher-rev viewing, texture packing, cache exploration |
| **ob2blender / RuneBlend forks** | Direct `.ob2`/`.dat` import-export; HSL16; attribute-based PRI/TSKIN/VSKIN/ALPHA |

### 6.2 Harbor Quest recommended stack

1. **Blender** (primary) — box model, kitbash, vertex color bake preview.
2. Optional **Metasequoia** if an artist prefers classic RS muscle memory.
3. Export **glTF 2.0** (or engine-native) with:
   - triangulated mesh
   - applied transforms
   - welded verts
   - albedo (+ optional vertex colors)
   - no required metallic/roughness workflow
4. Engine shader: **unlit albedo × vertex light** or custom Gouraud-ish material.

### 6.3 Export constraints checklist

- [ ] Origin / forward axis matches Harbor Quest convention (document once; never guess).
- [ ] Scale locked to mannequin.
- [ ] No non-uniform scale left in the object transform.
- [ ] Materials named from Harbor palette IDs, not “Material.017”.
- [ ] One draw call–friendly mesh per logical object when possible.
- [ ] Collision mesh optional separate low box — do not use render mesh for physics if dense.

---

## 7. SAFE vs NOT SAFE

### 7.1 SAFE to imitate (aesthetic principles)

- Low poly budgets and boxy silhouettes
- Chunky architecture / extruded openings
- Oversized heads, hands, weapons
- Gouraud / vertex lighting with high ambient
- Limited, posterized palettes
- 64–128px hand-painted textures with nearest filtering
- Faceted trees/rocks; modular docks/boats
- Readable combat poses; simple attachment sockets
- “Graphical integrity” philosophy: *new content that looks authentically of-era*

### 7.2 NOT SAFE (Jagex IP / policy)

Per Jagex Terms, EULA, and [Fan Content Policy](https://legal.jagex.com/docs/policies/fan-content-policy) (§6.1.3 as published):

| Forbidden | Why |
| --- | --- |
| Extracting / shipping OSRS/RS meshes, textures, animations, audio, maps | Copyrighted materials |
| Recolors / slight edits of Jagex models | Still derivative of Jagex Property |
| Names: RuneScape, OSRS, Jagex, iconic item/NPC proper names, slogans | Trademarks / IP |
| UI chrome cloned from OSRS (orb layout, side stone icons, exact fonts/widgets) | Protectable expression + brand confusion |
| **Making a video game / private server / port using Jagex Property** | Explicit Fan Content Policy ban (Dragonwilds mods are a separate, narrow exception) |
| Marketing that implies Jagex endorsement | Fan Content Policy |
| “RuneScape clone” positioning | Competes / confuses |

**Harbor Quest naming:** Harbor / Jade / Ink brand language only. Describe style internally as “RS-like / era-low-poly,” never ship “RuneScape mode.”

### 7.3 Gray areas — default to NO

- Tracing screenshots as modeling reference → prefer **original blockouts** from verbal proportion rules + original concept.
- “Same silhouette as [specific OSRS item]” → redesign until a stranger would not identify the Jagex item.
- Parody of specific quests, gods, skills → create Harbor Quest lore instead.

---

## 7b. Harbor Quest / Three.js translation (current stack)

`harborWorld.ts` already encodes the right *spirit*: Lambert + `flatShading: true`, fog, chunky silhouettes, original kit (not Jagex IP). Tighten toward mastery:

| RS-era principle | Harbor Quest practice |
| --- | --- |
| Face HSL colors | Locked swatch hexes in `mat()`; avoid subtle adjacent hues |
| Flat vs Gouraud | Keep `flatShading: true` on architecture / docks / boats; allow smooth only on heads/rocks if needed |
| Low vert counts | Prefer `BoxGeometry` / low-segment cylinders (6–8) over spheres with high segments |
| Chunky walls | Extrude door/window frames as real boxes, never decals |
| Quantized verts | Snap prop positions to 0.25–0.5 world units; avoid “CAD jitter” |
| Texture triangles | Prefer untextured Lambert colors; if textured, 64–128 nearest-neighbor |
| Readable orbit | Mobile finger-orbit already matches OSRS camera *feel* — keep silhouettes readable at that distance |
| NPCs | Kitbash body + hat/prop; oversized head/hands; role reads at pier distance |

**Do not** add PBR, ambient occlusion maps, or high-segment tubes to “look better” — that breaks the era contract.

### 7c. Practical modeling drill (become fluent)

Build these five original pieces on a 1× mannequin grid until they pass the smell tests in §8:

1. **Crate** — thick walls, extruded lid lip, flat-shaded wood swatches (≤40 tris).
2. **Pier pile + plank** — 6-gon post, plank module that tiles; snap to 0.5u grid.
3. **Conical hat NPC bust** — oversized head, mitten hands, role color (≤800 tris).
4. **Ferry canoe** — blunt bow, thick gunwale, single mast, jade sail plane (≤600 tris).
5. **Jiangnan wall bay** — chunky wall, extruded window box, prism roof (≤200 tris).

If any piece needs a normal map to “read,” it failed — thicken or recolor instead.

---

## 8. Master checklist — Harbor Quest asset gate

Use this as a PR / agent acceptance checklist. An asset ships only if **all** Critical and **≥90%** Style boxes pass.

### A. Legal (Critical)

- [ ] Modeled from scratch (no cache import, no marketplace “OSRS model” pack)
- [ ] No Jagex texture pixels (including “inspiration” crops)
- [ ] No Jagex animation curves
- [ ] Name / examine text is original Harbor Quest lore
- [ ] Does not reproduce OSRS UI chrome
- [ ] Filename / metadata contain no trademarked Jagex names

### B. Geometry (Critical)

- [ ] Triangle count within class budget (§1.1)
- [ ] Clean silhouette at play-camera distance
- [ ] Boxy / faceted construction; no soft subdivision look
- [ ] Verts welded; no hairline cracks
- [ ] Triangulated export; no stray wires/points
- [ ] Built on Harbor unit grid; integer-ish verts
- [ ] Scale checked against official mannequin + adjacent set piece

### C. Materials / shading (Critical)

- [ ] Uses Harbor locked palette (or documented exception)
- [ ] Reads under Gouraud/vertex lighting without PBR crutches
- [ ] Textures ≤128 (hero ≤256) and look painted / simple
- [ ] Flat vs smooth intentional per surface type
- [ ] Alpha limited and sorted; no cape-through-body chaos

### D. Proportion / style

- [ ] Matches era proportion grammar (chunky, readable, slightly toy-like)
- [ ] Item scale oversized enough for third-person readability
- [ ] Architecture walls have thickness; openings extruded
- [ ] Trees/rocks are faceted volumes, not photo foliage
- [ ] Characters: large head/hands relative to limbs if humanoid

### E. Animation / sockets (if applicable)

- [ ] Uses shared Harbor humanoid (or creature) rig
- [ ] Weights simple; bends only at intended joints
- [ ] Attachment sockets present and tested
- [ ] Poses readable; timing snappy for combat tells
- [ ] No intersecting translucent faces in idle/combat holds

### F. Pipeline

- [ ] Blender (or MQO) source filed in repo / art drive
- [ ] Exported glTF (or engine format) validated in Harbor Quest scene
- [ ] Collision / interaction bounds set
- [ ] LOD not required unless hero; if present, LOD1 still RS-like (don’t suddenly go HQ)
- [ ] README note: “original Harbor Quest asset — RS-like style principles only”

### G. Smell test (two humans / two agents)

1. **Era test:** Could this pass as a custom prop in a 2007-style client screenshot?
2. **Originality test:** Would a veteran OSRS player say “that’s just the [Jagex item]”? If yes → redesign.
3. **Clarity test:** Is the object’s function obvious at gameplay camera in ≤0.5s?

---

## 9. Quick agent prompt (pasteable)

```
Build an ORIGINAL Harbor Quest [asset] in classic RS2/OSRS-era low-poly style.
Follow docs/harbor-quest/RS-LIKE-CRAFT-BIBLE.md.
Constraints: boxy silhouette, triangulated, poly budget for class, Harbor palette,
Gouraud/vertex-lit friendly, chunky proportions, 64–128px simple textures optional.
Do NOT copy or trace any Jagex/OSRS mesh, texture, name, or UI.
Return Blender source + glTF + checklist results A–G.
```

---

## 10. Source index (research)

| Source | Use |
| --- | --- |
| https://rsps.org/news/rsps-modeling-items-objects-guide | Metasequoia vs Blender; low-poly as engine constraint; revision differences; silhouette priorities |
| https://rsps.org/news/why-osrs-low-poly | Nostalgia + readability + accessibility rationale |
| https://rune-server.org/threads/runescapes-rendering-and-animation-system.340745/ | ~4096/2000 tri ceilings; quantized verts; VSKIN/TSKIN/PRI lore |
| https://legal.jagex.com/docs/policies/fan-content-policy | **No video games using Jagex Property**; trademark / derivative limits |

---

## 11. Harbor Quest addenda

- SFX already follow the same legal pattern: original synthesis inspired by *genre*, not ripped game audio (`apps/web/public/assets/harbor-quest/README.md`).
- Prefer Harbor brand colors (Harbor / Jade / Ink) mapped into the locked RS-like palette rather than copying OSRS UI gold/stone chrome.
- When in doubt: **reduce polygons, thicken forms, posterize color, enlarge the readable parts.**
