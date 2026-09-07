# Phone mockup canon (REQUIRED)

**Henry rule (2026-09-07):** Whenever a social / ad / Story / carousel piece needs a **mobile mockup**, ship **realistic device chrome with insets automatically** — never paste a screenshot edge-to-edge into a rounded rectangle.

Cheap overlays look fake. Insets make real UI feel like it’s *inside* a phone.

## Always include

1. **Bezel inset** — thick frame padding around the screen (≈12–18px at 1080-wide art; scale with mock size).
2. **Top hardware band** — black chrome strip with a **Dynamic Island** (speaker mesh + camera lens). Screenshot content starts *below* this band.
3. **Home indicator** — thin light pill at the bottom of the bezel.
4. **Optional side buttons** — volume / power nibs for depth.
5. **Real UI only** — product screenshots or Recordly captures; never AI-fake app chrome.
6. **Crop native status bar** — when the capture already has iOS status / island, shift/`object-fit` so that chrome is hidden under *our* island band (no double status bars).

## Do not

- Edge-to-edge screenshot flush to the outer phone radius  
- Thin 1–2px “frame” with no visible bezel  
- Missing island / speaker / camera on portrait phone mockups  
- Invented UI instead of a real capture  

## Implementation reference

| Piece | Path |
| --- | --- |
| CSS (reuse / fork) | `docs/social/ig-posts/lang-launch.css` — `.phone`, `.phone__bezel`, `.phone__top-chrome`, `.phone__island`, `.phone__screen`, `.phone__shot`, `.phone__home`, `.phone__side*` |
| HTML pattern | `docs/social/ig-posts/mandarin-support-*.html` |
| Example carousel | [`MANDARIN-SUPPORT-ADS.md`](./MANDARIN-SUPPORT-ADS.md) |

```html
<div class="phone">
  <span class="phone__side phone__side--vol-up" aria-hidden="true"></span>
  <span class="phone__side phone__side--vol-down" aria-hidden="true"></span>
  <span class="phone__side phone__side--power" aria-hidden="true"></span>
  <div class="phone__bezel">
    <div class="phone__top-chrome" aria-hidden="true"></div>
    <div class="phone__island" aria-hidden="true"></div>
    <div class="phone__screen">
      <img class="phone__shot" src="…real-ui…" alt="…" />
    </div>
    <div class="phone__home" aria-hidden="true"></div>
  </div>
</div>
```

For FFmpeg / video composites: same idea — pad the capture inside a device plate with island + home bar overlays; don’t scale the UI to the outer frame.
