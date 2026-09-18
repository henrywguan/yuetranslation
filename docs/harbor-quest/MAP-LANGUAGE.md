# Harbor Quest · Map Language (Where Winds Meet *feel*)

**Lock:** Premium Chinese open-world *atmosphere* — layered land, winding paths, scenic overlooks, valley mist. **Original Harbor geometry only** (never copy Where Winds Meet assets, POIs, or IP).

## Smell tests

1. Does the inland read as **one flat slab corridor**? → stagger terrace pads + valley mist between layers.
2. Are bank roads **ruler-straight**? → use `windingDirtLane` S-curves.
3. Is there nowhere to **stop and look**? → scenic pavilions + terrace plazas on hills/forest/village terraces.
4. Does the river feel like a **tube**? → oxbows / creeks / tributaries already peel inland; keep soft rounded water bodies.

## Kit (code)

| Piece | Role |
|---|---|
| `HARBOR_MAP_LANGUAGE` | Feature lock flags (smoke-tested) |
| `scenicPavilion` | Open-air hip-roof overlook + stone bench |
| `terracePlaza` | Stone disc + lantern pedestal (relax / chat) |
| `windingDirtLane` | S-curve packed-earth paths |
| `valleyMistRibbon` | Soft fog between bank → terrace → foothill |
| Staggered shelves | Scalloped inland / terrace / foothill pads per chunk |
| Soft oxbow | Rounded lagoon (not a box pond) |

## Explore depth

- `HARBOR_EXPLORE_X` reaches foothill terraces (~22)
- Switchback climbs link inland ↔ terrace roads
- Overlook chairs face the river for rest / chat loops

## Non-goals

- Do not paste WWM map screenshots into the repo as assets
- Do not rename Harbor landmarks after WWM places
- Voxel / Minecraft flat shelves are a regression
