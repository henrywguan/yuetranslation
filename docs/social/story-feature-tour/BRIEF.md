# Instagram Story — Studio feature tour

**Status:** Assembled · Studio Hybrid  

**Rebuild:**

```bash
node scripts/build-story-feature-tour.mjs
```

**Motion / audio (v2):** LANCZOS eased open zoom + punch-ins on Solo/Conversation/Cam; transition whoosh/hit/click/riser; `amix normalize=0` + loudnorm so Stories audio is audible on phone.
**Output:** `out/story-feature-tour.mp4` · **~11s** · **9:16** (1080×1920)  
**Template feel:** Apple / Google studio product demo (not Drops quiz)  
**Logo:** `docs/brand/favicon.png` only  

---

## Brand lock (from product design tokens)

Source of truth: `apps/web/src/index.css` `[data-theme='dark']` + approved IG canon `docs/social/ig-posts/DESIGN.md`.

| Token | Hex / value | Story use |
| --- | --- | --- |
| Harbor | `#07131f` | Full-bleed field, iris, end card |
| Harbor mid | `#0a1c2c` | Soft depth |
| Harbor deep | `#081820` | Atmosphere base |
| Harbor blue | `#12324a` | Radial glow only |
| Harbor teal | `#0b3d36` | Secondary atmosphere |
| Jade | `#3dcfb6` | Accents, VO iris rim, URL |
| Jade bright | `#7ef0dc` | Spec highlights |
| Ink | `#e8f4ff` | Primary type |
| Muted | ink @ 58% | Supporting lines |
| Display | **Syne** | Brand / CTA |
| Body 粵 | **Noto Sans HK** | Product UI (real capture) |

**Theme for all UI captures:** dark (`yue-theme=dark`) so chrome matches Harbor/Jade.

**Anti-patterns:** purple gradients, cream/serif AI defaults, fake app UI, regenerated logo, Inter/system display fonts on overlays.

---

## Creative arc (~11s)

| Time | Beat | Visual | VO / audio |
| --- | --- | --- | --- |
| 0.0–2.0s | Open | Harbor field + favicon settle | Soft sweep · ElevenLabs: “Other apps translate written Chinese. We give you Cantonese.” |
| 2.0–4.8s | Solo | **Real** Solo UI — EN → 粵 + Jyutping (seeded) | Hook VO continues · punch-in |
| 4.8–7.1s | Conversation | **Real** Conversation split / panes (seeded) | Soft sweep |
| 7.1–9.5s | Cam | **Real** Cam upload glass on a sign | Soft sweep · “Speak it. Read it. Cam it.” |
| 9.5–11.5s | End | Iris → Harbor end card · favicon · jyuttranslate.com | Soft sweep · bed resolve |

---

## Production pattern

1. **Real UI** — Puppeteer capture / screencast; seed `window.__yueStore` (no live DeepSeek/Azure for Solo/Convo). Cam clip reused from prior live Recordly capture (no new Vision call).
2. **Atmosphere** — Recraft V4.1 with **locked `colors`** array from tokens above (no invented purple).
3. **VO** — Seed Audio (Juno preset) · 3 short lines.
4. **Bed / SFX** — Local ffmpeg (Harbor-soft bed + whoosh + click); Higgsfield cannot do standalone music/SFX.
5. **Assemble** — ffmpeg: Ken Burns / blur dissolves / iris · Apple-demo pacing.

### Credits (actual this pass)

| Item | ~Credits |
| --- | --- |
| Seed Audio ×4 (incl. 1 redo) | ~0.8 |
| Recraft atmosphere ×2 (palette locked; preferred local Harbor/Jade still for final) | ~2.5 |
| Real UI + local audio + edit | 0 |
| **Total** | **~3–4** |

Atmosphere in the cut: `source/atmosphere/harbor-jade-local.png` — exact token radials (Harbor `#07131f` · Jade `#3dcfb6`). Recraft jobs used the same hex `colors[]` but read too dark; kept local for brand fidelity.


---

## Sample Solo seed (offline)

| EN | 粵 | Jyutping |
| --- | --- | --- |
| Are you coming home for dinner? | 你返唔返嚟食飯㗎？ | nei5 faan1 m4 faan1 lai4 sik6 faan6 gaa3? |

## Caption (Story)

Meet JyutTranslate — Solo · Conversation · Cam.  
Real Hong Kong Cantonese + Jyutping.  
jyuttranslate.com

### Hashtags (exactly 5)

`#Cantonese #粵語 #Jyutping #CantoneseAmerican #JyutTranslate`
