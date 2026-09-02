# Dinner Reel v2 — brand assets + fluid camera

**Duration:** ~21s · **1080×1920 · 30fps · silent**

| Beat | Time | Signature move |
|------|------|----------------|
| Hook | 0.0–3.2 | Kinetic Syne type + jade orbital glow |
| Strike | 3.2–7.0 | EN → 書面 wipe strike |
| Orbit | 7.0–16.4 | Real UI · 2.5D bullet-time orbit → punch zoom into result |
| CTA | 16.4–21.0 | Product logo mark (J+粵) · Syne wordmark · jyuttranslate.com |

## Brand

- Harbor `#07131f` · Jade `#3dcfb6` · Ink `#e8f4ff`
- Fonts: **Syne** (display) · **Noto Sans HK** (粵) · **Noto Sans** (UI English)
- Logo: rendered `JyutLogo` mark (jade J+粵)
- Real UI stills: dinner Solo result

## On-screen (orbit)

`你返唔返嚟食飯㗎？` · `nei5 faan2 m4 faan1 lai4 sik6 faan6 gaa3`

## Render

```bash
# In Higgsfield sandbox after media is in ./media/
SKIP_RENDER=1 higgsedit build edit.jsx
higgsedit fonts add jyut-dinner-reel-v2 "Syne:700" "Noto Sans:600" "Noto Sans HK:700"
# Google css2 Latin-only for HK — replace with a text= CJK subset (粵口語…) before frames
SKIP_RENDER=1 higgsedit build edit.jsx   # proof frames
higgsedit render jyut-dinner-reel-v2 --out jyut-dinner-reel-v2/renders/jyut-dinner-reel.mp4
```

**Delivered:** 1080×1920 · 30fps · 21.0s · H.264 · silent (~8.4 MB)

## Caption

Google gives you textbook Chinese. Families say 口語.
JyutTranslate shows real HK Cantonese + Jyutping.
Try Conversation · free to start → jyuttranslate.com

#Cantonese #粵語 #Jyutping #HongKong #LanguageLearning
