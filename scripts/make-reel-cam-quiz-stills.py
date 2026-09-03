#!/usr/bin/env python3
"""Flat 2.0 Drops-style stills for Cam quiz stop-sign Reel (Harbor/Jade/Ink)."""
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

HARBOR = (7, 19, 31, 255)
HARBOR_PANEL = (10, 28, 44, 230)
JADE = (61, 207, 182, 255)
JADE_SOFT = (61, 207, 182, 70)
JADE_BRIGHT = (126, 240, 220, 255)
INK = (232, 244, 255, 255)
MUTE = (232, 244, 255, 160)
WRONG = (232, 244, 255, 90)


def font(size: int, bold: bool = True, cjk: bool = False) -> ImageFont.ImageFont:
    cands = []
    if cjk:
        cands += [
            "/usr/share/fonts/truetype/wqy/wqy-microhei.ttc",
            "/usr/share/fonts/truetype/droid/DroidSansFallbackFull.ttf",
        ]
    if bold:
        cands += [
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
            "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        ]
    cands += [
        "/usr/share/fonts/truetype/wqy/wqy-microhei.ttc",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ]
    for p in cands:
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def tw(d, text, f):
    b = d.textbbox((0, 0), text, font=f)
    return b[2] - b[0], b[3] - b[1]


def field():
    im = Image.new("RGBA", (W, H), HARBOR)
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    g = ImageDraw.Draw(glow)
    g.ellipse([W // 2 - 420, 180, W // 2 + 420, 900], fill=JADE_SOFT)
    g.ellipse([W // 2 - 280, 1100, W // 2 + 380, 1700], fill=(18, 70, 90, 80))
    glow = glow.filter(ImageFilter.GaussianBlur(80))
    im.alpha_composite(glow)
    return im


def rounded(im, xy, fill, outline=None, radius=28, width=2):
    layer = Image.new("RGBA", im.size, (0, 0, 0, 0))
    ImageDraw.Draw(layer).rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=width)
    im.alpha_composite(layer)


def make_stop_sign(size=520):
    """Clean photoreal-ish STOP octagon for Cam input + hook."""
    s = size
    im = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    # octagon points
    m = s * 0.22
    pts = [
        (m, 0),
        (s - m, 0),
        (s, m),
        (s, s - m),
        (s - m, s),
        (m, s),
        (0, s - m),
        (0, m),
    ]
    d.polygon(pts, fill=(196, 30, 36, 255), outline=(255, 255, 255, 255))
    # inset white border
    inset = 18
    pts2 = [
        (m + inset * 0.4, inset),
        (s - m - inset * 0.4, inset),
        (s - inset, m + inset * 0.4),
        (s - inset, s - m - inset * 0.4),
        (s - m - inset * 0.4, s - inset),
        (m + inset * 0.4, s - inset),
        (inset, s - m - inset * 0.4),
        (inset, m + inset * 0.4),
    ]
    d.polygon(pts2, outline=(255, 255, 255, 255))
    f = font(int(s * 0.22), bold=True)
    t = "STOP"
    twid, th = tw(d, t, f)
    d.text(((s - twid) / 2, (s - th) / 2 - 4), t, font=f, fill=(255, 255, 255, 255))
    # soft shadow under
    shadow = Image.new("RGBA", (s + 40, s + 40), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.ellipse([20, s - 10, s + 20, s + 30], fill=(0, 0, 0, 90))
    shadow = shadow.filter(ImageFilter.GaussianBlur(18))
    out = Image.new("RGBA", (s + 40, s + 40), (0, 0, 0, 0))
    out.alpha_composite(shadow, (0, 0))
    out.alpha_composite(im, (20, 10))
    return out


def save(name, im):
    path = OUT / name
    im.convert("RGB").save(path, quality=95)
    print("wrote", path)
    return path


# --- A: Hook ---
def still_hook():
    im = field()
    d = ImageDraw.Draw(im)
    # jade frame
    frame = (140, 520, 940, 1320)
    rounded(im, frame, fill=(10, 28, 44, 200), outline=JADE, radius=36, width=4)
    sign = make_stop_sign(560)
    im.alpha_composite(sign, ((W - sign.size[0]) // 2, 620))
    # dashed jade ring ticks
    cx, cy, r = W // 2, 920, 340
    for i in range(24):
        a0 = i * (2 * math.pi / 24)
        a1 = a0 + 0.12
        x0, y0 = cx + r * math.cos(a0), cy + r * math.sin(a0)
        x1, y1 = cx + r * math.cos(a1), cy + r * math.sin(a1)
        d.line([(x0, y0), (x1, y1)], fill=JADE, width=4)
    # space for kinetic type (blank top)
    return im


# --- B: Quiz pills (blank text areas — we'll burn type in motion pass) ---
def still_quiz(filled=False, correct=False):
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
        # left jade bar
        d.rounded_rectangle([140, y + 40, 152, y + 180], radius=4, fill=JADE if (not correct or is_ok) else (61, 207, 182, 50))
        fz = font(64, bold=True, cjk=True)
        fj = font(28, bold=False)
        zw, zh_h = tw(d, zh, fz)
        d.text((200, y + 48), zh, font=fz, fill=alpha_ink)
        d.text((200, y + 130), jp, font=fj, fill=JADE_BRIGHT if (not correct or is_ok) else MUTE)
        if correct and is_ok:
            # check mark
            d.ellipse([820, y + 60, 920, y + 160], outline=JADE, width=5)
            d.line([(845, y + 110), (875, y + 140), (905, y + 80)], fill=JADE, width=6)
    # dashed path on left
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
    f = font(22, bold=True)
    cw, ch = tw(d, chip, f)
    rounded(im, ((W - cw) // 2 - 28, 940, (W + cw) // 2 + 28, 940 + ch + 28), fill=(7, 19, 31, 200), outline=JADE, radius=999, width=2)
    d.text(((W - cw) / 2, 954), chip, font=f, fill=JADE)
    line = "Cam it in the app"
    f2 = font(44, bold=True)
    lw, _ = tw(d, line, f2)
    d.text(((W - lw) / 2, 1060), line, font=f2, fill=INK)
    url = "jyuttranslate.com"
    f3 = font(32, bold=True)
    uw, _ = tw(d, url, f3)
    rounded(im, ((W - uw) // 2 - 40, 1160, (W + uw) // 2 + 40, 1240), fill=(10, 28, 44, 230), outline=JADE, radius=28, width=2)
    d.text(((W - uw) / 2, 1182), url, font=f3, fill=JADE_BRIGHT)
    return im


def still_hook_type():
    """Transparent kinetic type layer."""
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    f1 = font(72, bold=True)
    f2 = font(56, bold=True, cjk=True)
    t1 = "What's the right 粵?"
    t2 = "邊個啱？"
    w1, _ = tw(d, t1, f1)
    w2, _ = tw(d, t2, f2)
    # panels
    rounded(im, ((W - w1) // 2 - 36, 160, (W + w1) // 2 + 36, 280), fill=HARBOR_PANEL, outline=(61, 207, 182, 100), radius=28, width=2)
    d.text(((W - w1) / 2, 185), t1, font=f1, fill=INK)
    rounded(im, ((W - w2) // 2 - 36, 300, (W + w2) // 2 + 36, 400), fill=HARBOR_PANEL, outline=JADE, radius=28, width=2)
    d.text(((W - w2) / 2, 318), t2, font=f2, fill=JADE_BRIGHT)
    return im


sign_only = make_stop_sign(640)
sign_only.convert("RGBA").save(OUT / "stop-sign.png")
print("wrote", OUT / "stop-sign.png")

save("01-hook.jpg", still_hook())
save("02-quiz.jpg", still_quiz(False))
save("03-reveal.jpg", still_quiz(correct=True))
save("04-end.jpg", still_end())
still_hook_type().save(OUT / "01-hook-type.png")
print("done", OUT)
