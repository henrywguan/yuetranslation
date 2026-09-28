# Poly Haven starter set — HarborRPG

Curated free **CC0** sample pack for HarborRPG lighting and ground materials.
Downloaded via the [Poly Haven public API](https://api.polyhaven.com) (no key).

**License:** [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/) — public domain dedication. Free to use commercially with no attribution required (attribution appreciated).

**Downloaded:** 2026-09-28
**Total size on disk:** 75.21 MB (75,207,140 bytes)
**Asset count:** 22 (6 HDRIs · 10 texture sets · 6 models)

Resolutions kept small on purpose (HDRI **2K**, textures/models **1K**) so this stays under ~200 MB.

---

## HDRIs (`hdris/`)

| Asset ID | Role | Resolution | Format | Size | License | Source |
|---|---|---|---|---|---|---|
| `meadow_2` | outdoor daylight meadow | 2k | .hdr | 6.28 MB | CC0 | [meadow_2](https://polyhaven.com/a/meadow_2) |
| `noon_grass` | outdoor midday clear | 2k | .hdr | 6.37 MB | CC0 | [noon_grass](https://polyhaven.com/a/noon_grass) |
| `autumn_field_puresky` | outdoor daylight pure sky | 2k | .hdr | 4.37 MB | CC0 | [autumn_field_puresky](https://polyhaven.com/a/autumn_field_puresky) |
| `the_sky_is_on_fire` | dusk / sunset | 2k | .hdr | 6.00 MB | CC0 | [the_sky_is_on_fire](https://polyhaven.com/a/the_sky_is_on_fire) |
| `overcast_soil_puresky` | overcast soft daylight | 2k | .hdr | 4.57 MB | CC0 | [overcast_soil_puresky](https://polyhaven.com/a/overcast_soil_puresky) |
| `hayloft` | indoor barn / loft | 2k | .hdr | 6.97 MB | CC0 | [hayloft](https://polyhaven.com/a/hayloft) |

---

## Textures (`textures/<id>/`)

Each set includes **albedo (diff)**, **normal (nor_gl)**, **roughness**, and **AO** as JPG when available.

| Asset ID | Role | Resolution | Maps | Size | License | Source |
|---|---|---|---|---|---|---|
| `leafy_grass` | grass | 1k | diff, nor_gl, rough, ao | 4.23 MB | CC0 | [leafy_grass](https://polyhaven.com/a/leafy_grass) |
| `brown_mud_dry` | dirt | 1k | diff, nor_gl, rough, ao | 3.42 MB | CC0 | [brown_mud_dry](https://polyhaven.com/a/brown_mud_dry) |
| `stone_pathway` | stone path | 1k | diff, nor_gl, rough, ao | 2.73 MB | CC0 | [stone_pathway](https://polyhaven.com/a/stone_pathway) |
| `cobblestone_floor_04` | cobblestone | 1k | diff, nor_gl, rough, ao | 2.17 MB | CC0 | [cobblestone_floor_04](https://polyhaven.com/a/cobblestone_floor_04) |
| `weathered_brown_planks` | wood planks | 1k | diff, nor_gl, rough, ao | 0.82 MB | CC0 | [weathered_brown_planks](https://polyhaven.com/a/weathered_brown_planks) |
| `bark_brown_02` | bark | 1k | diff, nor_gl, rough, ao | 2.53 MB | CC0 | [bark_brown_02](https://polyhaven.com/a/bark_brown_02) |
| `rock_face_03` | rock | 1k | diff, nor_gl, rough, ao | 3.40 MB | CC0 | [rock_face_03](https://polyhaven.com/a/rock_face_03) |
| `aerial_beach_01` | sand | 1k | diff, nor_gl, rough, ao | 0.82 MB | CC0 | [aerial_beach_01](https://polyhaven.com/a/aerial_beach_01) |
| `forrest_ground_01` | forest ground | 1k | diff, nor_gl, rough, ao | 3.18 MB | CC0 | [forrest_ground_01](https://polyhaven.com/a/forrest_ground_01) |
| `grass_path_2` | grass path | 1k | diff, nor_gl, rough, ao | 2.27 MB | CC0 | [grass_path_2](https://polyhaven.com/a/grass_path_2) |

**Note:** Poly Haven has no dedicated water/foam PBR ground textures in this starter; use engine water shaders / foam overlays for shorelines.

---

## Models (`models/<id>/`)

glTF + `.bin` + embedded 1K texture maps (relative paths preserved).

| Asset ID | Role | Resolution | Format | Size | License | Source |
|---|---|---|---|---|---|---|
| `rock_moss_set_01` | mossy rock set | 1k | glTF | 1.94 MB | CC0 | [rock_moss_set_01](https://polyhaven.com/a/rock_moss_set_01) |
| `boulder_01` | boulder | 1k | glTF | 5.77 MB | CC0 | [boulder_01](https://polyhaven.com/a/boulder_01) |
| `wooden_crate_01` | wooden crate | 1k | glTF | 2.28 MB | CC0 | [wooden_crate_01](https://polyhaven.com/a/wooden_crate_01) |
| `Barrel_01` | barrel | 1k | glTF | 0.69 MB | CC0 | [Barrel_01](https://polyhaven.com/a/Barrel_01) |
| `fern_02` | fern | 1k | glTF | 1.15 MB | CC0 | [fern_02](https://polyhaven.com/a/fern_02) |
| `dry_branches_medium_01` | dry branches | 1k | glTF | 3.25 MB | CC0 | [dry_branches_medium_01](https://polyhaven.com/a/dry_branches_medium_01) |

---

## Layout

```
polyhaven/
  INVENTORY.md          # this file
  README.md             # short usage note
  hdris/*.hdr           # 2K HDR environment maps
  textures/<id>/*_1k.jpg
  models/<id>/*.gltf + .bin + textures/
```

## Re-download

Example API patterns:

- `https://api.polyhaven.com/assets?t=hdris`
- `https://api.polyhaven.com/assets?t=textures`
- `https://api.polyhaven.com/assets?t=models`
- `https://api.polyhaven.com/files/<id>` → download URLs in the JSON

