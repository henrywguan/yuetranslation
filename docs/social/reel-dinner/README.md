# Dinner Reel — 口語 vs 書面 (higgsedit)

**Deliverable:** 20s · 1080×1920 · 30fps · silent (add bed later if Henry wants)

## Beats

| Beat | Time | Role |
|------|------|------|
| Hook | 0.0–3.4 | Kinetic: “Most apps translate Chinese.” → “Not Cantonese.” |
| Strike | 3.4–7.4 | EN prompt → 書面 `你回家吃晚飯嗎？` → red strike wipe |
| Reveal | 7.4–15.6 | Real UI still + Ken Burns + result-card close-up |
| CTA | 15.6–20.0 | Logo (粵) · JyutTranslate · jyuttranslate.com · Conversation |

## On-screen (reveal)

- 你返唔返嚟食飯㗎？
- `nei5 faan2 m4 faan1 lai4 sik6 faan6 gaa3`

## Rebuild

Assets live in the Higgsfield sandbox project; local script:

```bash
# In higgs-sandbox after curling media/ + fonts:
higgsedit fonts add jyut-dinner-reel Anton Inter "Inter:600" "Inter:700" "JetBrains Mono" "Noto Sans TC" "Noto Sans TC:700"
SKIP_RENDER=1 higgsedit build edit.jsx
higgsedit render jyut-dinner-reel --engine node --out renders/jyut-dinner-reel.mp4
```

## Caption draft

Google gives you textbook Mandarin. Families say 口語.

JyutTranslate shows real HK Cantonese + Jyutping.

Try Conversation mode free → jyuttranslate.com

## Hashtags

#Cantonese #粵語 #Jyutping #HongKong #LanguageLearning #Family
