# Mandarin support launch ads

Portrait **1080×1350** promos matching the Tagalog “Uy, Pare!” layout.

| File | Variant |
| --- | --- |
| `mandarin-support-en.html` → `out/ig-ad-mandarin-support-en.png` | Hook **大家好！** · English body |
| `mandarin-support-zh.html` → `out/ig-ad-mandarin-support-zh.png` | Hook **大家好！** · Traditional Chinese body |

**Locked (unchanged from Tagalog promo):** CTA `2 Months Free Family Plan` · fine print `Code: JYUTTESTER1023 • Ends 10/23 • Cancel before renewal to avoid automatic charge!`

**Logo:** `docs/brand/favicon.png` (PWA / product mark) + Syne **JyutTranslate** — never invent a 文+A mark.

**Phone:** Details sheet with pinyin ruby + character breakdown for 大家好.

```bash
node docs/social/ig-posts/render.mjs
```
