# Dinner Reel v3 — zoom into the UI (no bob)

**Duration:** ~23s · **1080×1920 · 30fps · silent**

| Beat | Time | Signature move |
|------|------|----------------|
| Hook | 0.0–3.0 | Kinetic Syne type + jade glow |
| Strike | 3.0–6.6 | EN → 書面 wipe strike |
| Reveal | 6.6–18.6 | **Ken Burns:** establish → punch INTO translation → pull → dive INTO other variations |
| CTA | 18.6–23.0 | `docs/brand/favicon.png` chop · Syne wordmark · jyuttranslate.com |

## Camera rules (reveal)

- **No** left/right bobbing on a full-page screenshot
- Vertical pan + scale only — punch ~3× into translation, pull, then ~3.3× into variation cards
- Overlay callouts repeat the Cantonese + Jyutping so the beat lands even on small screens
- **UI still must be hi-DPI** (capture at deviceScaleFactor 2–3 via `scripts/capture-ui-reel-still.mjs`) so zooms stay sharp — never reuse a soft 1× phone grab

## On-screen

- Primary: `你返唔返嚟食飯㗎？` · `nei5 faan2 m4 faan1 lai4 sik6 faan6 gaa3`
- Variations chapter: **Same meaning, different ways to say**
- Variations callouts: `你返唔返嚟食飯呀？` · `你返唔返屋企食飯呀？`

## Brand

- Harbor / Jade / Ink
- Fonts: Syne · Noto Sans HK · Noto Sans
- Logo: **`docs/brand/favicon.png`** (do not regenerate)

## Render (Higgsfield sandbox)

```bash
# media/: ui-reel-still.png (hi-DPI Solo capture) + logo-mark.png (= favicon.png)
# refresh still:
#   node scripts/capture-ui-reel-still.mjs /path/to/ui-reel-still.png
SKIP_RENDER=1 higgsedit build edit.jsx
higgsedit fonts add jyut-dinner-reel-v3 "Syne:700" "Noto Sans:600" "Noto Sans HK:700"
# CJK subset for 粵口語 + dinner phrases before frames
higgsedit render jyut-dinner-reel-v3 --engine node --out jyut-dinner-reel-v3/renders/jyut-dinner-reel.mp4
```

## Caption

Google gives you textbook Chinese. Families say 口語.
JyutTranslate shows the real line — and the other ways to say it.
Try Conversation · free to start → jyuttranslate.com

#Cantonese #粵語 #Jyutping #HongKong #LanguageLearning
