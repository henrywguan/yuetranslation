# Cantonese quality harness

Offline linguistics checks for JyutTranslate — **no DeepSeek / Azure**.

## What it does

1. Loads Yue surfaces from `apps/api/src/canto/data/phrases.json` + local fixtures  
2. Runs [PyCantonese](https://pycantonese.org) Jyutping labeling + segmentation sanity  
3. Optionally reads **sentence text only** from a Mozilla Common Voice `validated.tsv` (`zh-HK` or `yue`, CC0)

## Setup

```bash
pip install -r scripts/canto-quality-harness/requirements.txt
```

## Run

```bash
# From repo root
npm run smoke:canto-quality
# or
python3 scripts/canto-quality-harness/harness.py
```

Optional Common Voice (local path — do not commit the corpus):

```bash
python3 scripts/canto-quality-harness/harness.py \
  --cv-tsv ~/data/cv-corpus-*/zh-HK/validated.tsv \
  --cv-limit 200
```

Common Voice datasets are CC0; follow Mozilla Data Collective terms (no re-hosting / no speaker re-ID).

## Related

- Dictionary attestation / OpenCC: `npm run smoke:canto`  
- Import readings: `npm run import:cc-cedict-readings --prefix apps/api`
