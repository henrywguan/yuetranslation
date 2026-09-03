# Instructional night / dark mode post

**Template name (say this to recall):** `instructional night/dark mode post`  
**Aliases:** instructional night mode · dark mode IG post · Harbor instructional · night instructional  

Henry loved these. This is the **approved static Instagram look** for product education: Meet JyutTranslate, Learn as you speak, Why switch, brand splash, feature grids, tone maps.

> **Index:** listed in [`../TEMPLATES.md`](../TEMPLATES.md).  
> For implementation: follow [`DESIGN.md`](./DESIGN.md) + HTML in this folder (`shared.css`, `render.mjs`).  
> This file is the **named recall sheet** + layout variants + reference gallery.

---

## When to use

| Use this template | Don’t use this template |
| --- | --- |
| Feature explainers, tones, Jyutping, “Meet the app” | Emotional family story Reels (use storybook + real UI overlay) |
| Saveable carousels / feed squares / portrait covers | Photoreal lifestyle / Marketing Studio B-roll |
| Brand splash / profile-adjacent graphics | AI-regenerated logos or fake UI |

---

## Locked look (must match)

| Token | Value |
| --- | --- |
| Background | Harbor `#07131f` with soft jade/teal **radial glows** (not flat black) |
| Accent | Jade `#3dcfb6` (+ bright `#7ef0dc` for Jyutping / URL / labels) |
| Text | Ink `#e8f4ff` · mute ~58% for support lines |
| Logo | **`docs/brand/favicon.png` only** (glass 粵 chop) — never regenerate |
| Display | **Syne** 700–800 |
| Body EN | **Noto Sans** |
| Body 粵 | **Noto Sans HK** |
| Panels | Dark rounded Harbor cards / stacks / 2×2 grids |
| Labels | Jade caps (`EXAMPLE 實例`, `SIX TONES 六聲`, `TONE MAP 聲調`, `SOLO 獨白`…) |
| Footer | Quiet rule + `jyuttranslate.com` (teal) · optional “Free to try · families & ABCs” |

**Anti-patterns:** purple gradients, cream/serif “AI default,” Inter/system fonts, emoji spam, Chao staff on the wrong side, inventing a new logo.

---

## Layout variants (all same template family)

### A — Feature stack + example (portrait)
Brand row → H1 + jade subtitle + hook → stacked feature cards → `EXAMPLE 實例` phrase block → footer.  
Reference: [`references/01-meet-features-example.jpg`](./references/01-meet-features-example.jpg)

### B — 2×2 feature grid (square)
Brand row → H1 + jade line → four mode cards (Solo / Conversation / Cam / Learn) → footer.  
Reference: [`references/02-meet-2x2-grid.jpg`](./references/02-meet-2x2-grid.jpg)

### C — Brand splash (minimal portrait)
Centered glass 粵 chop → **JyutTranslate** → jade `English ↔ Cantonese` → URL → soft CTA.  
Reference: [`references/03-brand-splash.jpg`](./references/03-brand-splash.jpg)

### D — Learn + six tones (portrait)
Brand row → “Learn as you speak” / jade “Jyutping + Chao tones” → example phrase → 3×2 tone tiles → footer.  
Reference: [`references/04-learn-six-tones.jpg`](./references/04-learn-six-tones.jpg)  
HTML baselines: `jyutping-tones-square.html` · `jyutping-tones-portrait.html`

### E — Why switch + tone map row (portrait)
Brand row → “Why should you switch?” → 3 benefit cards → horizontal 6-tone map → footer.  
Reference: [`references/05-why-switch-tone-map.jpg`](./references/05-why-switch-tone-map.jpg)

---

## Production (prefer $0 credits)

1. Fork the matching HTML template (or `intro-*.html` / `jyutping-tones-*.html`).
2. Keep `shared.css` / fonts / favicon wiring; change copy + example phrase only.
3. `node docs/social/ig-posts/render.mjs`
4. Ship **1080×1080** and/or **1080×1350** as needed.
5. Do **not** rebuild these as Midjourney/Higgsfield posters unless Henry asks for AI art.

---

## Recall phrase for agents

> Make an **instructional night/dark mode post** (JyutTranslate Harbor instructional template).

Read this file + `DESIGN.md`, match the reference JPGs in `references/`, and stay on the HTML/CSS render path.
