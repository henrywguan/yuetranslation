#!/usr/bin/env python3
"""Harbor instructional night-mode overlays for Solo/Conversation carousel.

Panels, jade chips, and soft glows — not bare floating text.
Matches docs/social/ig-posts/INSTRUCTIONAL-NIGHT-MODE.md tokens.
"""
from __future__ import annotations

import os
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H = 1080, 1350
ROOT = Path(__file__).resolve().parents[1]
OVER = ROOT / "docs/social/carousel-solo-convo/overlays"
OVER.mkdir(parents=True, exist_ok=True)
LOGO = ROOT / "docs/brand/favicon.png"

HARBOR = (7, 19, 31, 255)
HARBOR_MID = (10, 28, 44, 245)
HARBOR_PANEL = (10, 28, 44, 220)
JADE = (61, 207, 182, 255)
JADE_SOFT = (61, 207, 182, 90)
JADE_BRIGHT = (126, 240, 220, 255)
INK = (232, 244, 255, 255)
MUTE = (232, 244, 255, 168)
BORDER = (61, 207, 182, 70)


def font(size: int, bold: bool = True) -> ImageFont.ImageFont:
    cands = []
    if bold:
        cands += [
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
            "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        ]
    cands += [
        # CJK-capable first so 口語 / 粵語 / 獨白 render (DejaVu has no Han)
        "/usr/share/fonts/truetype/wqy/wqy-microhei.ttc",
        "/usr/share/fonts/truetype/droid/DroidSansFallbackFull.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    ]
    for p in cands:
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def font_ui(size: int, bold: bool = True, text: str = "") -> ImageFont.ImageFont:
    """Prefer CJK-capable face when the string contains Han characters."""
    needs_cjk = any("\u4e00" <= ch <= "\u9fff" for ch in text)
    if needs_cjk:
        for p in (
            "/usr/share/fonts/truetype/wqy/wqy-microhei.ttc",
            "/usr/share/fonts/truetype/droid/DroidSansFallbackFull.ttf",
        ):
            if os.path.exists(p):
                return ImageFont.truetype(p, size)
    return font(size, bold)


def text_size(d: ImageDraw.ImageDraw, text: str, f) -> tuple[int, int]:
    bbox = d.textbbox((0, 0), text, font=f)
    return bbox[2] - bbox[0], bbox[3] - bbox[1]


def centered_text(d: ImageDraw.ImageDraw, y: int, text: str, f, fill) -> None:
    tw, _ = text_size(d, text, f)
    d.text(((W - tw) / 2, y), text, font=f, fill=fill)


def rounded_panel(im: Image.Image, xy: tuple[int, int, int, int], fill, outline=BORDER, radius=28, width=2) -> None:
    overlay = Image.new("RGBA", im.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    d.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=width)
    im.alpha_composite(overlay)


def soft_glow(im: Image.Image, cx: int, cy: int, r: int, color=JADE_SOFT) -> None:
    layer = Image.new("RGBA", im.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=color)
    layer = layer.filter(ImageFilter.GaussianBlur(radius=max(18, r // 4)))
    im.alpha_composite(layer)


def jade_chip(im: Image.Image, y: int, label: str) -> None:
    """Centered jade-caps chip like EXAMPLE 實例 / SOLO 獨白."""
    d = ImageDraw.Draw(im)
    f = font_ui(18, bold=True, text=label)
    tw, th = text_size(d, label, f)
    pad_x, pad_y = 22, 10
    box_w = tw + pad_x * 2
    box_h = th + pad_y * 2
    x0 = (W - box_w) // 2
    y0 = y
    rounded_panel(im, (x0, y0, x0 + box_w, y0 + box_h), fill=(7, 19, 31, 200), outline=JADE, radius=999, width=2)
    d = ImageDraw.Draw(im)
    d.text((x0 + pad_x, y0 + pad_y - 1), label, font=f, fill=JADE)


def title_card(im: Image.Image, y: int, title: str, subtitle: str | None = None) -> int:
    """Harbor rounded title card; returns bottom y."""
    soft_glow(im, W // 2, y + 50, 220)
    d = ImageDraw.Draw(im)
    ft = font_ui(44, bold=True, text=title)
    fs = font_ui(22, bold=False, text=subtitle or "")
    tw, th = text_size(d, title, ft)
    sw, sh = text_size(d, subtitle or "", fs) if subtitle else (0, 0)
    inner_h = th + (18 + sh if subtitle else 0)
    pad_x, pad_y = 40, 28
    box_w = max(tw, sw) + pad_x * 2
    box_w = min(max(box_w, 520), W - 80)
    box_h = inner_h + pad_y * 2
    x0 = (W - box_w) // 2
    rounded_panel(im, (x0, y, x0 + box_w, y + box_h), fill=HARBOR_PANEL, outline=BORDER, radius=32, width=2)
    d = ImageDraw.Draw(im)
    d.text(((W - tw) / 2, y + pad_y - 2), title, font=ft, fill=INK)
    if subtitle:
        d.text(((W - sw) / 2, y + pad_y + th + 10), subtitle, font=fs, fill=JADE_BRIGHT)
    return y + box_h


def callout_card(im: Image.Image, xy: tuple[int, int, int, int], title: str, body: str | None = None) -> None:
    soft_glow(im, (xy[0] + xy[2]) // 2, (xy[1] + xy[3]) // 2, 90)
    rounded_panel(im, xy, fill=HARBOR_PANEL, outline=BORDER, radius=24, width=2)
    d = ImageDraw.Draw(im)
    ft = font_ui(24, bold=True, text=title)
    fb = font_ui(18, bold=False, text=body or "")
    # left jade accent bar
    d.rounded_rectangle([xy[0] + 14, xy[1] + 18, xy[0] + 20, xy[3] - 18], radius=4, fill=JADE)
    d.text((xy[0] + 34, xy[1] + 22), title, font=ft, fill=INK)
    if body:
        d.text((xy[0] + 34, xy[1] + 56), body, font=fb, fill=MUTE)


def ring(im: Image.Image, cx: int, cy: int, r: int) -> None:
    soft_glow(im, cx, cy, r + 30, JADE_SOFT)
    d = ImageDraw.Draw(im)
    d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=JADE, width=4)
    d.ellipse([cx - r + 8, cy - r + 8, cx + r - 8, cy + r - 8], outline=(61, 207, 182, 50), width=2)


def save(name: str, build) -> None:
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    build(im)
    path = OVER / f"{name}.png"
    im.save(path)
    print("overlay", path)


def build_hook(im: Image.Image) -> None:
    # light top scrim so brand stays readable
    scrim = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(scrim)
    d.rectangle([0, 0, W, 320], fill=(7, 19, 31, 110))
    d.rectangle([0, 1050, W, H], fill=(7, 19, 31, 130))
    im.alpha_composite(scrim)
    soft_glow(im, W // 2, 180, 280)
    jade_chip(im, 70, "HOW IT WORKS")
    bottom = title_card(im, 120, "Two ways to talk", "Solo  ·  Conversation")
    # mode highlight rings near bottom tabs
    ring(im, 270, 1185, 58)
    ring(im, 540, 1185, 58)
    callout_card(im, (180, 1240, 900, 1320), "Pick Solo or Conversation below", None)


def build_solo_anatomy(im: Image.Image) -> None:
    jade_chip(im, 48, "SOLO 獨白")
    title_card(im, 96, "Solo anatomy", "One-sided translate + Jyutping")
    # EN input callout
    ring(im, 540, 360, 78)
    callout_card(im, (90, 200, 520, 300), "1 · Type English", "Your side of the line")
    # Yue + Jyutping
    ring(im, 540, 620, 96)
    callout_card(im, (520, 700, 990, 810), "2 · Read 粵 + tones", "Jyutping on every character")
    # auto-speak footer chip
    callout_card(im, (160, 1220, 920, 1310), "Auto-speak on", "Hear it while you learn")


def build_solo_howto(im: Image.Image) -> None:
    jade_chip(im, 48, "SOLO  ·  HOW TO")
    title_card(im, 96, "Type or speak", "Then hear real spoken Cantonese")
    # side rail steps
    callout_card(im, (48, 320, 430, 430), "Step 1", "English in")
    callout_card(im, (48, 470, 430, 580), "Step 2", "Cantonese + Jyutping")
    callout_card(im, (48, 620, 430, 730), "Step 3", "Auto-speak plays")
    soft_glow(im, 780, 520, 160)


def build_convo_anatomy(im: Image.Image) -> None:
    jade_chip(im, 40, "CONVERSATION 對話")
    title_card(im, 88, "One phone, two people", "Face-to-face split")
    # arrow-ish jade chevron between panes
    d = ImageDraw.Draw(im)
    soft_glow(im, W // 2, 420, 120)
    callout_card(im, (200, 280, 880, 390), "粵 on top — rotated for them", None)
    # mid divider accent
    d.rounded_rectangle([480, 520, 600, 540], radius=10, fill=JADE)
    callout_card(im, (200, 900, 880, 1010), "English below — facing you", None)


def build_convo_howto(im: Image.Image) -> None:
    jade_chip(im, 48, "CONVERSATION  ·  HOW TO")
    title_card(im, 96, "Talk face to face", "Hold · translate · auto-speak replies")
    callout_card(im, (60, 1180, 1020, 1310), "Same phone. Two directions. Real 口語.", None)


def build_cta(im: Image.Image) -> None:
    # full Harbor field with radial jade glows (instructional splash)
    base = Image.new("RGBA", (W, H), HARBOR)
    soft_glow(base, W // 2 - 120, H // 2 - 180, 340, (18, 80, 70, 120))
    soft_glow(base, W // 2 + 160, H // 2 + 220, 300, (12, 50, 90, 110))
    im.alpha_composite(base)
    # logo chop
    if LOGO.exists():
        logo = Image.open(LOGO).convert("RGBA").resize((148, 148), Image.Resampling.LANCZOS)
        # soft jade shadow
        shadow = Image.new("RGBA", (180, 180), (0, 0, 0, 0))
        sd = ImageDraw.Draw(shadow)
        sd.rounded_rectangle([10, 10, 170, 170], radius=42, fill=(61, 207, 182, 60))
        shadow = shadow.filter(ImageFilter.GaussianBlur(12))
        im.alpha_composite(shadow, ((W - 180) // 2, 360))
        im.alpha_composite(logo, ((W - 148) // 2, 376))
    jade_chip(im, 560, "JYUTTRANSLATE")
    d = ImageDraw.Draw(im)
    centered_text(d, 620, "English ↔ Cantonese", font(36, True), JADE_BRIGHT)
    centered_text(d, 690, "Free to try · Solo + Conversation", font(24, False), MUTE)
    # URL panel
    rounded_panel(im, (260, 760, 820, 860), fill=HARBOR_MID, outline=JADE, radius=28, width=2)
    centered_text(d, 790, "jyuttranslate.com", font(32, True), JADE)


save("hook", build_hook)
save("solo-anatomy", build_solo_anatomy)
save("solo-howto", build_solo_howto)
save("convo-anatomy", build_convo_anatomy)
save("convo-howto", build_convo_howto)
save("cta", build_cta)
