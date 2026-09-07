# Mandarin support launch ads (carousel)

Portrait **1080×1350** · Tagalog-style promo layout · **real UI only**

| Slide | HTML | PNG | Phone UI |
| --- | --- | --- | --- |
| 1 EN | `mandarin-support-en.html` | `out/ig-ad-mandarin-support-en.png` | `source/mandarin-ads/ui-en-cmn.jpg` |
| 2 ZH | `mandarin-support-zh.html` | `out/ig-ad-mandarin-support-zh.png` | `source/mandarin-ads/ui-zh-yue-cmn.jpg` |
| 3 Details | `mandarin-support-details.html` | `out/ig-ad-mandarin-support-details.png` | `source/mandarin-ads/ui-details.jpg` |

**Logo:** `apps/web/public/pwa-512.png` (copied to `source/mandarin-ads/pwa-512.png` for render) — not favicon.

**Phone chrome:** follows [`PHONE-MOCKUP.md`](./PHONE-MOCKUP.md) — bezel insets, Dynamic Island, home indicator (not edge-to-edge overlays).

**Locked CTA / fine print:** `2 Months Free Family Plan` · `Code: JYUTTESTER1023 • Ends 10/23 • Cancel before renewal to avoid automatic charge!`

**Caption:** `out/ig-ad-mandarin-support-caption.txt`

```bash
node docs/social/ig-posts/render.mjs
```
