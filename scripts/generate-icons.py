#!/usr/bin/env python3
"""Render pwa-192.png / pwa-512.png / apple-touch-icon.png: glow-jade radial + centered 粵."""

from __future__ import annotations

import math
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

# Mostly dark harbor; tiny soft jade kiss under the glyph only
STOPS = (
    (0.00, (20, 86, 75)),  # #14564b
    (0.18, (11, 61, 54)),  # #0b3d36
    (0.40, (8, 24, 32)),  # #081820
    (0.70, (7, 19, 31)),  # #07131f
    (1.00, (5, 14, 22)),  # #050e16
)
GLYPH = "粵"
JADE = (126, 240, 220)  # #7ef0dc
JADE_EDGE = (61, 207, 182)  # #3dcfb6
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


def render(size: int, *, maskable: bool = False) -> Image.Image:
    cx = cy = (size - 1) / 2
    # Wider falloff so dark harbor fills more of the tile.
    radius = size * 0.48
    px = Image.new("RGB", (size, size))
    data = px.load()
    for y in range(size):
        for x in range(size):
            d = math.hypot(x - cx, y - cy) / radius
            data[x, y] = sample(d)

    glyph_scale = 0.42 if maskable else 0.54
    font = load_font(int(size * glyph_scale))
    anchor = (cx, cy + size * 0.015)

    glyph = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(glyph)
    stroke_w = max(1, size // 96)
    draw.text(
        anchor,
        GLYPH,
        font=font,
        fill=(*JADE, 245),
        anchor="mm",
        stroke_width=stroke_w,
        stroke_fill=(*JADE_EDGE, 220),
    )

    base = px.convert("RGBA")
    # No bloom layer — glyph sits clean on harbor so the field reads clearly.
    base = Image.alpha_composite(base, glyph)

    rim = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    rdraw = ImageDraw.Draw(rim)
    inset = max(1, size // 64)
    rdraw.rounded_rectangle(
        (inset, inset, size - 1 - inset, size - 1 - inset),
        radius=size * 0.22,
        outline=(126, 240, 220, 55),
        width=max(1, size // 128),
    )
    base = Image.alpha_composite(base, rim)

    mask = rounded_mask(size, size * 0.22)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(base, (0, 0), mask=mask)
    if maskable:
        # Maskable icons should fill the full square; Android applies the mask.
        return base
    return out


def main() -> None:
    out_dir = Path(sys.argv[1] if len(sys.argv) > 1 else "apps/web/public")
    out_dir.mkdir(parents=True, exist_ok=True)
    # PWA manifest icons + iOS Home Screen (Safari uses apple-touch-icon, not SVG favicon).
    targets = (
        (192, "pwa-192.png"),
        (512, "pwa-512.png"),
        (180, "apple-touch-icon.png"),
        (512, "pwa-512-maskable.png", True),
    )
    for entry in targets:
        if len(entry) == 3:
            size, name, maskable = entry
        else:
            size, name = entry
            maskable = False
        img = render(size, maskable=maskable)
        path = out_dir / name
        img.save(path, format="PNG", optimize=True)
        print(f"wrote {path}")


if __name__ == "__main__":
    main()
