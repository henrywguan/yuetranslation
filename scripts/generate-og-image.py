#!/usr/bin/env python3
"""Generate apps/web/public/og.png (1200×630) for social previews."""
from __future__ import annotations

import os
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "apps/web/public/og.png"
ICON = ROOT / "apps/web/public/pwa-512.png"

W, H = 1200, 630


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf",
    ]
    for path in candidates:
        if os.path.exists(path):
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def main() -> None:
    img = Image.new("RGB", (W, H), "#07131f")
    draw = ImageDraw.Draw(img)

    # Harbor → jade wash
    for y in range(H):
        t = y / (H - 1)
        r = int(7 + (18 - 7) * t)
        g = int(19 + (80 - 19) * t)
        b = int(31 + (70 - 31) * t)
        draw.line([(0, y), (W, y)], fill=(r, g, b))

    # Soft jade glow orb
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gdraw = ImageDraw.Draw(glow)
    gdraw.ellipse((720, -40, 1280, 520), fill=(61, 207, 182, 38))
    gdraw.ellipse((860, 80, 1180, 400), fill=(61, 207, 182, 55))
    img = Image.alpha_composite(img.convert("RGBA"), glow).convert("RGB")
    draw = ImageDraw.Draw(img)

    if ICON.exists():
        mark = Image.open(ICON).convert("RGBA").resize((168, 168), Image.Resampling.LANCZOS)
        img.paste(mark, (96, 210), mark)
        draw = ImageDraw.Draw(img)

    title = font(72, bold=True)
    sub = font(30, bold=False)
    draw.text((300, 220), "JyutTranslate", fill="#f4f7f8", font=title)
    draw.text(
        (300, 320),
        "Live Cantonese translation with Jyutping",
        fill="#9bb4c0",
        font=sub,
    )
    draw.text((300, 372), "Voice · Camera · Documents", fill="#3dcfb6", font=sub)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    img.save(OUT, "PNG", optimize=True)
    print(f"wrote {OUT}")


if __name__ == "__main__":
    main()
