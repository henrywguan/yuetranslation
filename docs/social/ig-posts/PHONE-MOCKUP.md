# Phone mockup canon (REQUIRED)

**Henry rule (2026-09-07):** Whenever a social / ad / Story / carousel piece needs a **mobile mockup**, ship **realistic device chrome with insets automatically** — never paste a screenshot edge-to-edge into a rounded rectangle.

Cheap overlays look fake. Insets make real UI feel like it’s *inside* a phone.

## Always include

1. **Bezel inset** — thick frame padding around the screen (≈12–18px at 1080-wide art; scale with mock size).
2. **Top hardware** — match the capture device:
   - **iPhone 13 / 13 Pro (Henry’s phone):** notch (speaker + camera)
   - **iPhone 14 Pro+:** Dynamic Island
3. **Home indicator** — thin light pill near the bottom (overlay; do not crop the capture).
4. **Optional side buttons** — volume / power nibs for depth.
5. **Real UI only** — product screenshots or Recordly captures; never AI-fake app chrome.
6. **Full screenshot, no clipping** — size the screen to the capture’s native aspect ratio and show the **entire** image (`object-fit: fill` in a matching box). Do **not** crop status bar, bottom tabs, or speak CTA. Overlay notch/island on top of the capture for seamlessness.

## Capture defaults

| Device | Resolution | Aspect |
| --- | --- | --- |
| **iPhone 13 Pro** (Henry) | **1170×2532** | `1170 / 2532` |

Set `--phone-shot-w` / `--phone-shot-h` (or equivalent) to the capture size so the mock screen matches exactly.

## Do not

- Edge-to-edge screenshot flush to the outer phone radius  
- Thin 1–2px “frame” with no visible bezel  
- `object-fit: cover` / negative margins that clip the real UI  
- Letterboxing that leaves empty bars inside the screen  
- Invented UI instead of a real capture  
- Wrong top hardware (island on a notch capture, or vice versa) when device is known  

## Implementation reference

| Piece | Path |
| --- | --- |
| CSS (reuse / fork) | `docs/social/ig-posts/lang-launch.css` — `.phone`, `.phone__bezel`, `.phone__notch`, `.phone__screen`, `.phone__shot`, `.phone__home`, `.phone__side*` |
| HTML pattern | `docs/social/ig-posts/mandarin-support-*.html` |
| Example carousel | [`MANDARIN-SUPPORT-ADS.md`](./MANDARIN-SUPPORT-ADS.md) |

```html
<div class="phone">
  <span class="phone__side phone__side--vol-up" aria-hidden="true"></span>
  <span class="phone__side phone__side--vol-down" aria-hidden="true"></span>
  <span class="phone__side phone__side--power" aria-hidden="true"></span>
  <div class="phone__bezel">
    <div class="phone__notch" aria-hidden="true"></div>
    <div class="phone__screen">
      <img class="phone__shot" src="…real-ui…" width="1170" height="2532" alt="…" />
    </div>
    <div class="phone__home" aria-hidden="true"></div>
  </div>
</div>
```

For FFmpeg / video composites: pad the **full** capture inside a device plate; overlay notch/island + home bar — never scale/crop away UI.
