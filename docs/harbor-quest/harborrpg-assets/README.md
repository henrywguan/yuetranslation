# HarborRPG · Free primary asset kit

**Status:** Gathered as vendor **zip archives** (CC0 / free commercial)  
**Why zips:** Unpacking ~32k binaries trips the cloud secret-scan hook and GitHub’s 100 MB file limit; LFS holds large zips.

## Unpack locally

```bash
# requires git-lfs
git lfs pull
bash docs/harbor-quest/harborrpg-assets/unpack.sh
```

Unpacked trees land in `unpacked/<vendor>/<pack>/` (gitignored).

## Vendors

| Vendor | Role | Path |
|---|---|---|
| KayKit | Heroes, anims | `kaykit/` |
| Quaternius | Modular PCs, outfits, monsters, anim libs | `quaternius/` |
| Kenney | Nature / town / dungeon / UI | `kenney/` |
| Poly Haven | Curated HDRI + PBR sample | `polyhaven/` |

Paid Extra/Pro/Source tiers were **not** purchased. Ultimate Monsters Drive pull was partial — see supplemental Quaternius monster zips.
