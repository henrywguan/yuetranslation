#!/usr/bin/env python3
"""Flat 2.0 Drops-style stills for Cam quiz stop-sign Reel (Harbor/Jade/Ink).

Uses Henry's real stop-sign photo. Mixed EN+粵 lines composite Latin + CJK fonts
so 粵 never tofu's (□).
"""
from __future__ import annotations

import math
import os
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H = 1080, 1920
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs/social/reel-cam-quiz-stop/source"
OUT.mkdir(parents=True, exist_ok=True)
LOGO = ROOT / "docs/brand/favicon.png"
PHOTO = OUT / "stop-sign-photo.png"

HARBOR = (7, 19, 31, 255)
HARBOR_PANEL = (10, 28, 44, 230)
JADE = (61, 207, 182, 255)
JADE_SOFT = (61, 207, 182, 70)
JADE_BRIGHT = (126, 240, 220, 255)
INK = (232, 244, 255, 255)
MUTE = (232, 244, 255, 160)
WRONG = (232, 244, 255, 90)

LATIN_BOLD = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
]
LATIN = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
]
CJK = [
    "/usr/share/fonts/truetype/wqy/wqy-microhei.ttc",
    "/usr/share/fonts/truetype/droid/DroidSansFallbackFull.ttf",
]


def _first(paths: list[str]) -> str | None:
    for p in paths:
        if os.path.exists(p):
            return p
    return None


def font_latin(size: int, bold: bool = True) -> ImageFont.ImageFont:
    p = _first(LATIN_BOLD if bold else LATIN) or _first(LATIN)
    return ImageFont.truetype(p, size) if p else ImageFont.load_default()


def font_cjk(size: int) -> ImageFont.ImageFont:
    p = _first(CJK)
    return ImageFont.truetype(p, size) if p else ImageFont.load_default()


def tw(d, text, f):
    b = d.textbbox((0, 0), text, font=f)
    return b[2] - b[0], b[3] - b[1]


def has_han(s: str) -> bool:
    return any("\u4e00" <= c <= "\u9fff" for c in s)


def draw_mixed(d: ImageDraw.ImageDraw, xy: tuple[float, float], text: str, size: int, fill, bold: bool = True):
    """Draw mixed Latin+CJK without tofu — CJK runs use a CJK face."""
    x, y = xy
    fl = font_latin(size, bold=bold)
    fc = font_cjk(size)
    buf = ""
    mode = None  # 'latin' | 'cjk'

    def flush():
        nonlocal x, buf, mode
        if not buf:
            return
        f = fc if mode == "cjk" else fl
        d.text((x, y), buf, font=f, fill=fill)
        x += tw(d, buf, f)[0]
        buf = ""

    for ch in text:
        m = "cjk" if has_han(ch) else "latin"
        if mode is None:
            mode = m
        elif m != mode:
            flush()
            mode = m
        buf += ch
    flush()
    return x


def mixed_width(d, text: str, size: int, bold: bool = True) -> int:
    fl = font_latin(size, bold=bold)
    fc = font_cjk(size)
    w = 0
    buf = ""
    mode = None

    def flush():
        nonlocal w, buf, mode
        if not buf:
            return
        f = fc if mode == "cjk" else fl
        w += tw(d, buf, f)[0]
        buf = ""

    for ch in text:
        m = "cjk" if has_han(ch) else "latin"
        if mode is None:
            mode = m
        elif m != mode:
            flush()
            mode = m
        buf += ch
    flush()
    return w


def field():
    im = Image.new("RGBA", (W, H), HARBOR)
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    g = ImageDraw.Draw(glow)
    g.ellipse([W // 2 - 420, 180, W // 2 + 420, 900], fill=JADE_SOFT)
    g.ellipse([W // 2 - 280, 1100, W // 2 + 380, 1700], fill=(18, 70, 90, 80))
    g.ellipse([80, 400, 280, 600], fill=(61, 207, 182, 35))
    g.ellipse([820, 1400, 1040, 1620], fill=(61, 207, 182, 40))
    glow = glow.filter(ImageFilter.GaussianBlur(80))
    im.alpha_composite(glow)
    return im


def rounded(im, xy, fill, outline=None, radius=28, width=2):
    layer = Image.new("RGBA", im.size, (0, 0, 0, 0))
    ImageDraw.Draw(layer).rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=width)
    im.alpha_composite(layer)


def load_photo_square(size: int = 640) -> Image.Image:
    """Crop Henry's stop-sign photo to a square focused on the sign."""
    if not PHOTO.exists():
        raise SystemExit(f"missing {PHOTO} — copy Henry's stop-sign photo first")
    src = Image.open(PHOTO).convert("RGBA")
    # Prefer center-upper crop (sign sits mid-left)
    w, h = src.size
    side = min(w, h)
    # Bias toward sign (slightly left / upper of center)
    left = max(0, int(w * 0.12))
    top = max(0, int(h * 0.05))
    if left + side > w:
        left = w - side
    if top + side > h:
        top = h - side
    crop = src.crop((left, top, left + side, top + side)).resize((size, size), Image.Resampling.LANCZOS)
    # Soft circular vignette edge for Flat frame
    return crop


def cam_upload_asset() -> Image.Image:
    """Prepare Cam upload input — clear STOP lettering, portrait-friendly."""
    src = Image.open(PHOTO).convert("RGB")
    w, h = src.size
    # Wider crop keeping full STOP readable for Vision
    side_w = min(w, int(h * 0.95))
    side_h = side_w
    left = max(0, int(w * 0.08))
    top = max(0, int(h * 0.02))
    if left + side_w > w:
        left = w - side_w
    if top + side_h > h:
        top = h - side_h
    return src.crop((left, top, left + side_w, top + side_h)).resize((1080, 1080), Image.Resampling.LANCZOS)


def save(name, im):
    path = OUT / name
    im.convert("RGB").save(path, quality=95)
    print("wrote", path)
    return path


def still_hook():
    im = field()
    d = ImageDraw.Draw(im)
    frame = (100, 480, 980, 1360)
    rounded(im, frame, fill=(10, 28, 44, 210), outline=JADE, radius=40, width=4)
    photo = load_photo_square(720)
    # mask rounded
    mask = Image.new("L", photo.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, photo.size[0] - 1, photo.size[1] - 1], radius=28, fill=255)
    framed = Image.new("RGBA", photo.size, (0, 0, 0, 0))
    framed.paste(photo, (0, 0), mask)
    im.alpha_composite(framed, ((W - framed.size[0]) // 2, 560))
    # dashed jade ring
    cx, cy, r = W // 2, 920, 390
    for i in range(28):
        a0 = i * (2 * math.pi / 28)
        a1 = a0 + 0.1
        x0, y0 = cx + r * math.cos(a0), cy + r * math.sin(a0)
        x1, y1 = cx + r * math.cos(a1), cy + r * math.sin(a1)
        d.line([(x0, y0), (x1, y1)], fill=JADE, width=4)
    return im


def still_quiz(correct: bool = False):
    im = field()
    options = [
        ("停車", "ting4 ce1", True),
        ("停止", "ting2 zi2", False),
        ("唔好行", "m4 hou2 haang4", False),
    ]
    y0 = 520
    for i, (zh, jp, is_ok) in enumerate(options):
        y = y0 + i * 280
        xy = (120, y, 960, y + 220)
        if correct and is_ok:
            fill = (20, 90, 80, 240)
            outline = JADE
            alpha_ink = INK
        elif correct and not is_ok:
            fill = (10, 28, 44, 120)
            outline = (61, 207, 182, 40)
            alpha_ink = WRONG
        else:
            fill = HARBOR_PANEL
            outline = (61, 207, 182, 160)
            alpha_ink = INK
        rounded(im, xy, fill=fill, outline=outline, radius=32, width=3)
        d = ImageDraw.Draw(im)
        d.rounded_rectangle(
            [140, y + 40, 152, y + 180],
            radius=4,
            fill=JADE if (not correct or is_ok) else (61, 207, 182, 50),
        )
        fz = font_cjk(64)
        fj = font_latin(28, bold=False)
        d.text((200, y + 48), zh, font=fz, fill=alpha_ink)
        d.text((200, y + 130), jp, font=fj, fill=JADE_BRIGHT if (not correct or is_ok) else MUTE)
        if correct and is_ok:
            d.ellipse([820, y + 60, 920, y + 160], outline=JADE, width=5)
            d.line([(845, y + 110), (875, y + 140), (905, y + 80)], fill=JADE, width=6)
    d = ImageDraw.Draw(im)
    for yy in range(480, 1400, 28):
        d.line([(70, yy), (70, yy + 14)], fill=JADE, width=4)
    return im


def still_end():
    im = field()
    if LOGO.exists():
        logo = Image.open(LOGO).convert("RGBA").resize((180, 180), Image.Resampling.LANCZOS)
        im.alpha_composite(logo, ((W - 180) // 2, 720))
    d = ImageDraw.Draw(im)
    chip = "JYUTTRANSLATE"
    f = font_latin(22, bold=True)
    cw, ch = tw(d, chip, f)
    rounded(
        im,
        ((W - cw) // 2 - 28, 940, (W + cw) // 2 + 28, 940 + ch + 28),
        fill=(7, 19, 31, 200),
        outline=JADE,
        radius=999,
        width=2,
    )
    d.text(((W - cw) / 2, 954), chip, font=f, fill=JADE)
    line = "Cam it in the app"
    f2 = font_latin(44, bold=True)
    lw, _ = tw(d, line, f2)
    d.text(((W - lw) / 2, 1060), line, font=f2, fill=INK)
    url = "jyuttranslate.com"
    f3 = font_latin(32, bold=True)
    uw, _ = tw(d, url, f3)
    rounded(
        im,
        ((W - uw) // 2 - 40, 1160, (W + uw) // 2 + 40, 1240),
        fill=(10, 28, 44, 230),
        outline=JADE,
        radius=28,
        width=2,
    )
    d.text(((W - uw) / 2, 1182), url, font=f3, fill=JADE_BRIGHT)
    return im


def still_hook_type():
    """Transparent kinetic type — mixed fonts so 粵 never tofu's."""
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    t1 = "What's the right 粵?"
    t2 = "邊個啱？"
    w1 = mixed_width(d, t1, 64, bold=True)
    f2 = font_cjk(56)
    w2, _ = tw(d, t2, f2)
    rounded(
        im,
        ((W - w1) // 2 - 36, 160, (W + w1) // 2 + 36, 280),
        fill=HARBOR_PANEL,
        outline=(61, 207, 182, 100),
        radius=28,
        width=2,
    )
    draw_mixed(d, ((W - w1) / 2, 185), t1, 64, INK, bold=True)
    rounded(
        im,
        ((W - w2) // 2 - 36, 300, (W + w2) // 2 + 36, 400),
        fill=HARBOR_PANEL,
        outline=JADE,
        radius=28,
        width=2,
    )
    d.text(((W - w2) / 2, 318), t2, font=f2, fill=JADE_BRIGHT)
    return im


# Cam upload asset (real photo)
cam = cam_upload_asset()
cam.save(OUT / "stop-sign.png")
print("wrote", OUT / "stop-sign.png")

save("01-hook.jpg", still_hook())
save("02-quiz.jpg", still_quiz(False))
save("03-reveal.jpg", still_quiz(correct=True))
save("04-end.jpg", still_end())
hook_type = still_hook_type()
hook_type.save(OUT / "01-hook-type.png")
# Tofu self-check: sample a few pixels of the 粵 glyph region shouldn't be empty panel
print("wrote", OUT / "01-hook-type.png")
print("done", OUT)
print("TOFU_CHECK: open 01-hook-type.png and confirm 粵 renders (not □)")
