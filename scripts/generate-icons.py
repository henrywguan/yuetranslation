#!/usr/bin/env python3
"""Render pwa-192.png / pwa-512.png: glow-jade radial + centered 粵."""

from __future__ import annotations

import math
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

# Glow jade → dark harbor (aligned with favicon.svg + brand tokens)
STOPS = (
    (0.00, (184, 255, 240)),  # #b8fff0 — luminous jade core
    (0.18, (126, 240, 220)),  # #7ef0dc
    (0.38, (61, 207, 182)),  # #3dcfb6
    (0.58, (31, 143, 122)),  # #1f8f7a
    (0.78, (11, 61, 54)),  # #0b3d36
    (1.00, (7, 19, 31)),  # #07131f
)
GLYPH = "粵"
JADE = (126, 240, 220)  # #7ef0dc
FONT_CANDIDATES = (
    Path.home() / ".local/share/fonts/NotoSansHK-Bold.ttf",
    Path("/usr/share/fonts/truetype/wqy/wqy-microhei.ttc"),
    Path("/usr/share/fonts/truetype/droid/DroidSansFallbackFull.ttf"),
)


def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def mix(c0: tuple[int, int, int], c1: tuple[int, int, int], t: float) -> tuple[int, int, int]:
    return (
        int(round(lerp(c0[0], c1[0], t))),
        int(round(lerp(c0[1], c1[1], t))),
        int(round(lerp(c0[2], c1[2], t))),
    )


def sample(t: float) -> tuple[int, int, int]:
    t = max(0.0, min(1.0, t))
    for i in range(len(STOPS) - 1):
        t0, c0 = STOPS[i]
        t1, c1 = STOPS[i + 1]
        if t <= t1:
            u = 0.0 if t1 == t0 else (t - t0) / (t1 - t0)
            return mix(c0, c1, u)
    return STOPS[-1][1]


def rounded_mask(size: int, radius: float) -> Image.Image:
    mask = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle((0, 0, size - 1, size - 1), radius=radius, fill=255)
    return mask


def load_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for path in FONT_CANDIDATES:
        if path.is_file():
            return ImageFont.truetype(str(path), size=size)
    return ImageFont.load_default()


def render(size: int) -> Image.Image:
    cx = cy = (size - 1) / 2
    # Match SVG r≈72% of half-diagonal feel; use radius relative to half-size.
    radius = size * 0.72
    px = Image.new("RGB", (size, size))
    data = px.load()
    for y in range(size):
        for x in range(size):
            d = math.hypot(x - cx, y - cy) / radius
            data[x, y] = sample(d)

    # Soft jade bloom behind the glyph.
    glow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    gdraw = ImageDraw.Draw(glow)
    font = load_font(int(size * 0.58))
    anchor = (cx, cy + size * 0.015)
    gdraw.text(anchor, GLYPH, font=font, fill=(*JADE, 230), anchor="mm")
    glow = glow.filter(ImageFilter.GaussianBlur(radius=max(3, size * 0.045)))

    glyph = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(glyph)
    # Stroke underlay thickens CJK strokes so 粵 reads at favicon sizes.
    stroke_w = max(2, size // 64)
    draw.text(
        anchor,
        GLYPH,
        font=font,
        fill=(*JADE, 255),
        anchor="mm",
        stroke_width=stroke_w,
        stroke_fill=(*JADE, 255),
    )

    base = px.convert("RGBA")
    base = Image.alpha_composite(base, glow)
    base = Image.alpha_composite(base, glyph)

    # Subtle rim highlight.
    rim = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    rdraw = ImageDraw.Draw(rim)
    inset = max(1, size // 64)
    rdraw.rounded_rectangle(
        (inset, inset, size - 1 - inset, size - 1 - inset),
        radius=size * 0.22,
        outline=(184, 255, 240, 90),
        width=max(1, size // 128),
    )
    base = Image.alpha_composite(base, rim)

    mask = rounded_mask(size, size * 0.22)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(base, (0, 0), mask=mask)
    return out


def main() -> None:
    out_dir = Path(sys.argv[1] if len(sys.argv) > 1 else "apps/web/public")
    out_dir.mkdir(parents=True, exist_ok=True)
    for size in (192, 512):
        img = render(size)
        path = out_dir / f"pwa-{size}.png"
        img.save(path, format="PNG", optimize=True)
        print(f"wrote {path}")


if __name__ == "__main__":
    main()
