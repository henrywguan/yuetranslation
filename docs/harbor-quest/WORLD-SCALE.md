# Harbor Quest · World Scale

**Goal:** The world is big enough to **explore, fish, relax, and chat** without feeling like a corridor demo.

## Extent locks (smoke-tested)

| Constant | Role |
|---|---|
| `HARBOR_EXPLORE_X` (32) | On-foot inland reach (foothill terraces) |
| `HARBOR_VOYAGE_Z_MAX` (360) | Long river sail / walk span |
| `HARBOR_VOYAGE_Z_MIN` (−8) | Slight room behind start |
| `GUAN_HARBOR_BOUNDS` | Expanded Guan ocean sail box |
| `GUAN_WATER_PLANE.size` (128) | Matching ocean visual |

## Activity coverage

| Activity | Where |
|---|---|
| **Explore** | Winding inland + terrace roads, staggered shelves, scenic pavilions |
| **Fish** | Guan spots + horizon shoals; main-river buoys (`RIVER_FISH_SPOTS`) |
| **Relax** | Terrace plazas (4-stool sit rings), overlook chairs, scenic pavilion benches |
| **Chat** | Presence channel + plaza sit clusters (`HARBOR_SOCIAL_SIT_CLUSTER`); talk radius 5.2 |

## Smell tests

1. Can you walk inland past the first terrace into foothill mist? → explore X + shelves
2. Can you cast on the main river without teleporting to Guan? → river buoys
3. Is there a place to sit facing the river with a friend? → plaza / overlook stools
4. Does sailing Guan feel like open water, not a puddle? → bounds + water plane
