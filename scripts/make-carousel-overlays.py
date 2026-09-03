#!/usr/bin/env python3
"""Harbor instructional night-mode overlays for Solo/Conversation carousel."""
from __future__ import annotations

import os
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

W, H = 1080, 1350
OVER = Path(__file__).resolve().parents[1] / "docs/social/carousel-solo-convo/overlays"
OVER.mkdir(parents=True, exist_ok=True)

JADE = (61, 207, 182, 235)
INK = (232, 244, 255, 255)
MUTE = (232, 244, 255, 170)
SCRIM = (7, 19, 31, 70)
CTA_SCRIM = (7, 19, 31, 150)


def font(size: int) -> ImageFont.ImageFont:
    for p in (
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    ):
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def centered(d: ImageDraw.ImageDraw, y: int, text: str, f, fill) -> None:
    bbox = d.textbbox((0, 0), text, font=f)
    tw = bbox[2] - bbox[0]
    d.text(((W - tw) / 2, y), text, font=f, fill=fill)


def save(name: str, draw_fn) -> None:
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    draw_fn(d)
    path = OVER / f"{name}.png"
    im.save(path)
    print("overlay", path)


F = font(40)
F2 = font(26)
F3 = font(22)
Fsm = font(20)
Fbig = font(52)

save(
    "hook",
    lambda d: (
        d.rectangle([0, 0, W, H], fill=SCRIM),
        centered(d, 130, "Two ways to talk", F, INK),
        centered(d, 190, "Solo  ·  Conversation", F2, JADE),
        d.ellipse([218, 1128, 322, 1232], outline=JADE, width=3),
        d.ellipse([488, 1128, 592, 1232], outline=JADE, width=3),
        centered(d, 1260, "Pick a mode below", Fsm, MUTE),
    ),
)

save(
    "solo-anatomy",
    lambda d: (
        d.ellipse([470, 270, 610, 410], outline=JADE, width=3),
        centered(d, 230, "1  ·  Type English", F2, JADE),
        d.ellipse([450, 540, 630, 720], outline=JADE, width=3),
        centered(d, 750, "2  ·  Read Yue + Jyutping", F2, JADE),
        centered(d, 1255, "Auto-speak on  ·  learn while you hear", Fsm, MUTE),
    ),
)

save(
    "solo-howto",
    lambda d: (
        centered(d, 90, "Solo  ·  how to", F, INK),
        centered(d, 145, "Type or speak  →  hear real spoken Cantonese", F3, JADE),
    ),
)

save(
    "convo-anatomy",
    lambda d: (
        centered(d, 80, "Conversation", F, INK),
        centered(d, 135, "One phone  ·  two people", F2, JADE),
        d.line([(540, 175), (540, 250)], fill=JADE, width=3),
        d.polygon([(540, 270), (528, 248), (552, 248)], fill=JADE),
        centered(d, 300, "Yue faces them (rotated)", F3, JADE),
        centered(d, 980, "English faces you", F3, JADE),
    ),
)

save(
    "convo-howto",
    lambda d: (
        centered(d, 90, "Talk face to face", F, INK),
        centered(d, 145, "Hold  ·  translate  ·  auto-speak replies", F3, JADE),
    ),
)

save(
    "cta",
    lambda d: (
        d.rectangle([0, 0, W, H], fill=CTA_SCRIM),
        centered(d, 520, "JyutTranslate", Fbig, INK),
        centered(d, 590, "English  ↔  Cantonese", F2, JADE),
        centered(d, 660, "Free to try  ·  Solo + Conversation", F3, MUTE),
        centered(d, 740, "jyuttranslate.com", F, JADE),
    ),
)
