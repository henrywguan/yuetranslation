# Reel pack — Drops-style Cam quiz (stop sign)

**Status:** Script + still prompts ready · **waiting Henry OK before paid generation**  
**Template:** [`../DROPS-STYLE-MOTION.md`](../DROPS-STYLE-MOTION.md)  
**Format:** Instagram Reel · **9:16** · **~20s** (18–22)  
**Palette:** Harbor `#07131f` · Jade `#3dcfb6` · Ink `#e8f4ff`  
**Logo:** `docs/brand/favicon.png` only  

---

## 1. Full Reel script (on-screen + timing)

| Time | Beat | Visual | On-screen text | Audio |
| --- | --- | --- | --- | --- |
| **0:00–0:03** | Hook | Harbor field + soft jade glow. Photoreal **stop-sign photo** locks in (slight spring settle). Flat 2.0 jade corner ticks / dashed ring optional. | **What’s the right 粵?** / **邊個啱？** (Syne + Noto Sans HK, kinetic pop) | Soft bed in |
| **0:03–0:08** | Quiz | Three **Flat 2.0 option pills** stagger-pop (spring overshoot). Chinese bold + Jyutping under each. Optional dashed Jade path linking pills. | **A** 停車 · `ting4 ce1` · **B** 停止 · `ting2 zi2` · **C** 唔好行 · `m4 hou2 haang4` | Bed continues |
| **0:08–0:16** | Demo | Wipe / scale into **real Cam UI** (screen capture — never AI-fake). Taps: Cam → Upload image → pick stop-sign → Translate → OCR/translation overlay lands on sign → **停車** in results. | Minimal chrome; burned-in tip optional: **Cam → Upload** | Bed ducks under UI; optional soft whoosh on Translate |
| **0:16–0:20** | Reveal | Cut/composite back to quiz. **A 停車** fills Jade / check; B & C soft-fade. | **停車** · `ting4 ce1` ✓ | **粵 TTS:** 停車 (`ting4 ce1`) |
| **0:20–0:22** | CTA | Quiet Harbor end card · favicon chop · URL | **Cam it in the app** · **jyuttranslate.com** · favicon | Bed resolve / TTS tail |

### Quiz options (locked)

| | Chinese | Jyutping | Note |
| --- | --- | --- | --- |
| ✅ | 停車 | ting4 ce1 | Correct HK spoken |
| ❌ | 停止 | ting2 zi2 | Mandarin-leaning trap |
| ❌ | 唔好行 | m4 hou2 haang4 | Vague / wrong register |

---

## 2. Flat 2.0 still prompts (Higgsfield / Soul / Flux)

Generate **stills only** first. Animate bounce/stagger offline. Composite real Cam UI later.

### Shared negative prompt

```
purple, violet, magenta, gold coins, Language Drops branding, watercolor, clay 3D,
photoreal face, stock lifestyle b-roll, cyberpunk neon, lens flare spam,
fake phone UI, fake JyutTranslate screens, Inter font, cream pastel language-app aesthetic,
heavy texture, paper grain, cinematic shallow DOF on UI chrome, cartoon mascot spam
```

### Still A — Hook field + stop sign frame

```
Flat 2.0 game-UI still, vertical 9:16, deep Harbor background #07131f with soft jade #3dcfb6 radial glow,
centered photoreal red octagonal STOP sign photo in a clean rounded jade-outline frame,
minimal Flat vector chrome corners, no people, no fake app UI, premium language-learning game aesthetic remapped to teal jade not purple,
solid fills soft gradient only, empty space above for kinetic typography
```

### Still B — Three option pills (quiz chrome)

```
Flat 2.0 vertical 9:16 quiz UI on Harbor #07131f, three stacked rounded option pills with solid Ink #e8f4ff text areas and thin jade #3dcfb6 borders,
soft jade glow behind pills, dashed jade progress path optional on left, no photos, no faces, no phone mockup,
clean vector game interface Language Drops style remapped away from purple/gold to harbor teal,
leave pill interiors mostly blank for later typography (Chinese + Jyutping), springy playful but premium
```

### Still C — Correct reveal chrome

```
Flat 2.0 9:16 Harbor #07131f quiz reveal, one option pill glowing solid jade #3dcfb6 fill with white check mark,
two dimmed faded pills below, soft jade particle dots not neon, no faces, no fake UI screenshots,
clean vector language-learning game chrome, solid fills only
```

### Still D — Quiet end card

```
Minimal Harbor #07131f 9:16 end card, soft centered jade glow, large empty center for logo placement,
clean Flat 2.0, no text baked in, no purple, no gold, no lifestyle photo
```

**Logo:** composite `docs/brand/favicon.png` in edit — never bake a regenerated chop into the still.

### Photoreal stop-sign source (Cam input only)

Prefer a **real photo** Henry already has, or a rights-safe still:

```
Photoreal Hong Kong street stop sign, red octagon white STOP lettering, slightly weathered, natural daylight, straight-on, no people faces, no logos other than the sign, documentary photo for OCR demo
```

Do **not** use this as lifestyle B-roll — only as Cam upload input.

---

## 3. Shot list — real Cam upload capture (Recordly / screen)

Device: phone or desktop 9:16 Chrome · dark Harbor theme · Family entitlements · auto-speak ON if Cam TTS available.

| # | Action | Hold | Notes |
| --- | --- | --- | --- |
| 1 | Open app → dock **Cam** | 0.5s | Clean Harbor chrome |
| 2 | Choice modal: tap **Upload image** / **上載相片** | 0.8s | Highlight tap |
| 3 | System picker → select **stop-sign** image | 1.5s | Same asset as quiz |
| 4 | Upload editor shows photo | 1.0s | |
| 5 | Tap **Translate** / **翻譯** | 0.5s | |
| 6 | Wait OCR + overlay on sign | 2–4s | Must show **停車** (or clear 粵 result) |
| 7 | Results row / overlay readable | 1.5s | Hold for composite |

**Exact taps:** `Cam` → `Upload image` → pick file → `Translate`.

Export 1080×1920 (or crop 9:16). Never replace this beat with AI phone UI.

---

## 4. Caption · hashtags · Story teaser

### Caption

Most apps guess Mandarin.  
Street signs need **Hong Kong 粵**.

What’s the right 粵 for a stop sign?  
✅ **停車** · ting4 ce1  
(Not 停止. Not a vague 唔好行.)

Cam it in the app — upload the photo, hear it spoken.  
→ jyuttranslate.com

### Hashtags (5)

`#Cantonese` `#粵語` `#Jyutping` `#JyutTranslate` `#LearnCantonese`

### Story teaser (poll)

**Got it?** ✅ / **Missed it** 😅  
Sticker poll on a freeze of the three pills (before reveal).

---

## 5. Credit estimate — **waiting for your OK**

| Step | Tool | Est. credits | Notes |
| --- | --- | --- | --- |
| Flat 2.0 stills A–D | Higgsfield Soul / Nano / Flux **image** | **~4–8** still gens | Preferred path |
| Stop-sign photo | Own photo or 1 still | **0–1** | Prefer real photo |
| Animate bounce/stagger | CapCut / AE / Remotion / Recordly | **$0** | |
| Cam screen capture | Recordly / phone | **$0** | Required product proof |
| Soft bed | Free bed / existing pack | **$0** | |
| 粵 TTS 「停車」 | Azure `/api/tts` | Metered | Confirm in cloud before call |
| Higgsfield **video** (Soul Cinema etc.) | — | **Ask first** | **Not needed** if still→animate path |

**Recommended path (low credits):** stills A–D → local motion → composite Cam capture → TTS on reveal.  
**Do not** run paid Higgsfield video until Henry says yes.

---

## Approval gate

Reply with:

1. **OK stills** — generate Flat 2.0 stills A–D (+ stop-sign if needed)  
2. **OK TTS** — Azure 停車 line  
3. **OK video credits** — only if you want Higgsfield video instead of still→animate  

Default until then: **no paid generation**.
