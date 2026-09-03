#!/usr/bin/env python3
"""Harbor instructional overlays as *layers* for animated carousel compositing.

Each slide exports separate transparent PNGs so the build can:
  - pop captions in/out so they don't cover the UI the whole time
  - keep jade rings on a pre-zoom layer so they track UI under Ken Burns
  - pulse rings during their hold window

Matches docs/social/ig-posts/INSTRUCTIONAL-NIGHT-MODE.md tokens.
"""
from __future__ import annotations

import json
import os
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H = 1080, 1350
ROOT = Path(__file__).resolve().parents[1]
OVER = ROOT / "docs/social/carousel-solo-convo/overlays"
LAYERS = OVER / "layers"
OVER.mkdir(parents=True, exist_ok=True)
LAYERS.mkdir(parents=True, exist_ok=True)
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
    cands: list[str] = []
    if bold:
        cands += [
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
            "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        ]
    cands += [
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
    if any("\u4e00" <= ch <= "\u9fff" for ch in text):
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


def blank() -> Image.Image:
    return Image.new("RGBA", (W, H), (0, 0, 0, 0))


def rounded_panel(
    im: Image.Image,
    xy: tuple[int, int, int, int],
    fill,
    outline=BORDER,
    radius: int = 28,
    width: int = 2,
) -> None:
    overlay = blank()
    ImageDraw.Draw(overlay).rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=width)
    im.alpha_composite(overlay)


def soft_glow(im: Image.Image, cx: int, cy: int, r: int, color=JADE_SOFT) -> None:
    layer = blank()
    ImageDraw.Draw(layer).ellipse([cx - r, cy - r, cx + r, cy + r], fill=color)
    layer = layer.filter(ImageFilter.GaussianBlur(radius=max(18, r // 4)))
    im.alpha_composite(layer)


def draw_chip(im: Image.Image, y: int, label: str) -> None:
    d = ImageDraw.Draw(im)
    f = font_ui(18, bold=True, text=label)
    tw, th = text_size(d, label, f)
    pad_x, pad_y = 22, 10
    box_w, box_h = tw + pad_x * 2, th + pad_y * 2
    x0 = (W - box_w) // 2
    rounded_panel(im, (x0, y, x0 + box_w, y + box_h), fill=(7, 19, 31, 200), outline=JADE, radius=999, width=2)
    ImageDraw.Draw(im).text((x0 + pad_x, y + pad_y - 1), label, font=f, fill=JADE)


def draw_title(im: Image.Image, y: int, title: str, subtitle: str | None = None) -> None:
    soft_glow(im, W // 2, y + 50, 220)
    d = ImageDraw.Draw(im)
    ft = font_ui(44, bold=True, text=title)
    fs = font_ui(22, bold=False, text=subtitle or "")
    tw, th = text_size(d, title, ft)
    sw, sh = text_size(d, subtitle or "", fs) if subtitle else (0, 0)
    pad_x, pad_y = 40, 28
    box_w = min(max(max(tw, sw) + pad_x * 2, 520), W - 80)
    box_h = th + (18 + sh if subtitle else 0) + pad_y * 2
    x0 = (W - box_w) // 2
    rounded_panel(im, (x0, y, x0 + box_w, y + box_h), fill=HARBOR_PANEL, outline=BORDER, radius=32, width=2)
    d = ImageDraw.Draw(im)
    d.text(((W - tw) / 2, y + pad_y - 2), title, font=ft, fill=INK)
    if subtitle:
        d.text(((W - sw) / 2, y + pad_y + th + 10), subtitle, font=fs, fill=JADE_BRIGHT)


def draw_callout(im: Image.Image, xy: tuple[int, int, int, int], title: str, body: str | None = None) -> None:
    soft_glow(im, (xy[0] + xy[2]) // 2, (xy[1] + xy[3]) // 2, 90)
    rounded_panel(im, xy, fill=HARBOR_PANEL, outline=BORDER, radius=24, width=2)
    d = ImageDraw.Draw(im)
    ft = font_ui(24, bold=True, text=title)
    fb = font_ui(18, bold=False, text=body or "")
    d.rounded_rectangle([xy[0] + 14, xy[1] + 18, xy[0] + 20, xy[3] - 18], radius=4, fill=JADE)
    d.text((xy[0] + 34, xy[1] + 22), title, font=ft, fill=INK)
    if body:
        d.text((xy[0] + 34, xy[1] + 56), body, font=fb, fill=MUTE)


def draw_ring(im: Image.Image, cx: int, cy: int, r: int) -> None:
    soft_glow(im, cx, cy, r + 36, JADE_SOFT)
    d = ImageDraw.Draw(im)
    d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=JADE, width=7)
    d.ellipse([cx - r + 12, cy - r + 12, cx + r - 12, cy + r - 12], outline=(61, 207, 182, 100), width=3)


def draw_bounds_rect(im: Image.Image, xy: tuple[int, int, int, int], radius: int = 28) -> None:
    """Jade rectangular highlight around a UI block (replaces odd circular targets)."""
    x0, y0, x1, y1 = xy
    soft_glow(im, (x0 + x1) // 2, (y0 + y1) // 2, max(x1 - x0, y1 - y0) // 2 + 40, JADE_SOFT)
    d = ImageDraw.Draw(im)
    d.rounded_rectangle([x0, y0, x1, y1], radius=radius, outline=JADE, width=6)
    # inner hairline
    d.rounded_rectangle(
        [x0 + 10, y0 + 10, x1 - 10, y1 - 10],
        radius=max(8, radius - 8),
        outline=(61, 207, 182, 110),
        width=2,
    )


def save_layer(slide: str, name: str, im: Image.Image) -> str:
    folder = LAYERS / slide
    folder.mkdir(parents=True, exist_ok=True)
    path = folder / f"{name}.png"
    im.save(path)
    print("layer", path.relative_to(ROOT))
    return str(path.relative_to(ROOT))


def compose_preview(slide: str, layer_rels: list[str]) -> None:
    im = blank()
    for rel in layer_rels:
        p = ROOT / rel
        if p.exists():
            im.alpha_composite(Image.open(p).convert("RGBA"))
    out = OVER / f"{slide}.png"
    # Keep legacy filenames used by older docs
    legacy = {
        "hook": "hook.png",
        "solo-anatomy": "solo-anatomy.png",
        "solo-howto": "solo-howto.png",
        "convo-anatomy": "convo-anatomy.png",
        "convo-howto": "convo-howto.png",
        "cta": "cta.png",
    }
    im.save(OVER / legacy[slide])
    print("overlay", OVER / legacy[slide])


manifest: dict = {"w": W, "h": H, "slides": {}}


def pack_hook() -> None:
    layers: list[str] = []
    scrim = blank()
    d = ImageDraw.Draw(scrim)
    d.rectangle([0, 0, W, 320], fill=(7, 19, 31, 110))
    d.rectangle([0, 1050, W, H], fill=(7, 19, 31, 130))
    layers.append(save_layer("hook", "scrim", scrim))

    chip = blank()
    soft_glow(chip, W // 2, 180, 280)
    draw_chip(chip, 70, "HOW IT WORKS")
    layers.append(save_layer("hook", "chip", chip))

    title = blank()
    draw_title(title, 120, "Two ways to talk", "Solo  ·  Conversation")
    layers.append(save_layer("hook", "title", title))

    # mode highlight rings — centers measured on 01-solo-ready (1080 space)
    # Was (220,1175) — far left of dock. Solo/獨白 ≈ (415, 1185); Conversation ≈ (540, 1185).
    ra = blank()
    draw_ring(ra, 415, 1185, 56)
    layers.append(save_layer("hook", "ring-solo", ra))

    rb = blank()
    draw_ring(rb, 540, 1185, 56)
    layers.append(save_layer("hook", "ring-convo", rb))

    foot = blank()
    draw_callout(foot, (180, 1240, 900, 1320), "Pick Solo or Conversation below", None)
    layers.append(save_layer("hook", "footer", foot))

    compose_preview("hook", layers)
    manifest["slides"]["hook"] = {
        "seconds": 7,
        "focus": "tabs",
        "zoomEnd": 1.06,
        "rings": [
            {"file": "ring-solo", "track": True, "pulse": True, "in": 0.6, "out": 6.4},
            {"file": "ring-convo", "track": True, "pulse": True, "in": 1.0, "out": 6.4},
        ],
        "captions": [
            {"file": "scrim", "in": 0.0, "out": 6.6, "style": "fade"},
            {"file": "chip", "in": 0.15, "out": 6.3, "style": "pop-down"},
            {"file": "title", "in": 0.35, "out": 6.2, "style": "pop-down"},
            {"file": "footer", "in": 1.2, "out": 6.5, "style": "pop-up"},
        ],
    }


def pack_solo_anatomy() -> None:
    layers: list[str] = []
    chip = blank()
    draw_chip(chip, 48, "SOLO 獨白")
    layers.append(save_layer("solo-anatomy", "chip", chip))

    title = blank()
    draw_title(title, 96, "Solo anatomy", "One-sided translate + Jyutping")
    layers.append(save_layer("solo-anatomy", "title", title))

    # 1 · Type English — ring on the English line (higher than mid-gap)
    r1 = blank()
    draw_ring(r1, 540, 200, 82)
    layers.append(save_layer("solo-anatomy", "ring-en", r1))

    # 2 · Read 粵 — rectangular bounds around Chinese + Jyutping result (incl. ？)
    r2 = blank()
    draw_bounds_rect(r2, (240, 380, 880, 575), radius=28)
    layers.append(save_layer("solo-anatomy", "bounds-yue", r2))

    c1 = blank()
    draw_callout(c1, (90, 100, 520, 200), "1 · Type English", "Your side of the line")
    layers.append(save_layer("solo-anatomy", "callout-en", c1))

    c2 = blank()
    draw_callout(c2, (540, 590, 1000, 700), "2 · Read 粵 + tones", "Jyutping on every character")
    layers.append(save_layer("solo-anatomy", "callout-yue", c2))

    c3 = blank()
    draw_callout(c3, (160, 1220, 920, 1310), "Auto-speak on", "Hear it while you learn")
    layers.append(save_layer("solo-anatomy", "callout-speak", c3))

    compose_preview("solo-anatomy", layers)
    manifest["slides"]["solo-anatomy"] = {
        "seconds": 8,
        "focus": "center",
        "zoomEnd": 1.06,
        "rings": [
            {"file": "ring-en", "track": True, "pulse": True, "in": 0.45, "out": 3.4},
            {"file": "bounds-yue", "track": True, "pulse": True, "in": 3.1, "out": 7.4},
        ],
        "captions": [
            {"file": "chip", "in": 0.1, "out": 2.6, "style": "pop-down"},
            {"file": "title", "in": 0.2, "out": 2.5, "style": "pop-down"},
            {"file": "callout-en", "in": 0.5, "out": 3.3, "style": "pop-left"},
            {"file": "callout-yue", "in": 3.2, "out": 6.2, "style": "pop-right"},
            {"file": "callout-speak", "in": 5.5, "out": 7.6, "style": "pop-up"},
        ],
    }


def pack_solo_howto() -> None:
    layers: list[str] = []
    chip = blank()
    draw_chip(chip, 48, "SOLO  ·  HOW TO")
    layers.append(save_layer("solo-howto", "chip", chip))

    title = blank()
    draw_title(title, 96, "Type or speak", "Then hear real spoken Cantonese")
    layers.append(save_layer("solo-howto", "title", title))

    r1 = blank()
    draw_ring(r1, 540, 420, 90)
    layers.append(save_layer("solo-howto", "ring-en", r1))

    r2 = blank()
    draw_ring(r2, 540, 720, 110)
    layers.append(save_layer("solo-howto", "ring-yue", r2))

    s1 = blank()
    draw_callout(s1, (48, 320, 430, 430), "Step 1", "English in")
    layers.append(save_layer("solo-howto", "step1", s1))

    s2 = blank()
    draw_callout(s2, (48, 470, 430, 580), "Step 2", "Cantonese + Jyutping")
    layers.append(save_layer("solo-howto", "step2", s2))

    s3 = blank()
    draw_callout(s3, (48, 620, 430, 730), "Step 3", "Auto-speak plays")
    layers.append(save_layer("solo-howto", "step3", s3))

    compose_preview("solo-howto", layers)
    manifest["slides"]["solo-howto"] = {
        "seconds": 12,
        "live": True,
        "rings": [
            {"file": "ring-en", "track": False, "pulse": True, "in": 0.8, "out": 5.5},
            {"file": "ring-yue", "track": False, "pulse": True, "in": 5.2, "out": 11.2},
        ],
        "captions": [
            {"file": "chip", "in": 0.1, "out": 4.2, "style": "pop-down"},
            {"file": "title", "in": 0.25, "out": 4.0, "style": "pop-down"},
            {"file": "step1", "in": 0.6, "out": 4.5, "style": "pop-left"},
            {"file": "step2", "in": 5.0, "out": 8.5, "style": "pop-left"},
            {"file": "step3", "in": 8.2, "out": 11.5, "style": "pop-left"},
        ],
    }


def pack_convo_anatomy() -> None:
    layers: list[str] = []
    chip = blank()
    draw_chip(chip, 40, "CONVERSATION 對話")
    layers.append(save_layer("convo-anatomy", "chip", chip))

    title = blank()
    draw_title(title, 88, "One phone, two people", "Face-to-face split")
    layers.append(save_layer("convo-anatomy", "title", title))

    r1 = blank()
    draw_ring(r1, 540, 380, 100)
    layers.append(save_layer("convo-anatomy", "ring-yue", r1))

    r2 = blank()
    draw_ring(r2, 540, 900, 100)
    layers.append(save_layer("convo-anatomy", "ring-en", r2))

    mid = blank()
    soft_glow(mid, W // 2, 520, 80)
    ImageDraw.Draw(mid).rounded_rectangle([480, 510, 600, 530], radius=10, fill=JADE)
    layers.append(save_layer("convo-anatomy", "mid-bar", mid))

    c1 = blank()
    draw_callout(c1, (200, 280, 880, 390), "粵 on top — rotated for them", None)
    layers.append(save_layer("convo-anatomy", "callout-yue", c1))

    c2 = blank()
    draw_callout(c2, (200, 900, 880, 1010), "English below — facing you", None)
    layers.append(save_layer("convo-anatomy", "callout-en", c2))

    compose_preview("convo-anatomy", layers)
    manifest["slides"]["convo-anatomy"] = {
        "seconds": 8,
        "focus": "center",
        "zoomEnd": 1.1,
        "rings": [
            {"file": "ring-yue", "track": True, "pulse": True, "in": 0.5, "out": 3.8},
            {"file": "ring-en", "track": True, "pulse": True, "in": 3.5, "out": 7.2},
        ],
        "captions": [
            {"file": "chip", "in": 0.1, "out": 2.4, "style": "pop-down"},
            {"file": "title", "in": 0.2, "out": 2.3, "style": "pop-down"},
            {"file": "callout-yue", "in": 0.5, "out": 3.5, "style": "pop-down"},
            {"file": "mid-bar", "in": 1.0, "out": 7.0, "style": "fade"},
            {"file": "callout-en", "in": 3.5, "out": 6.5, "style": "pop-up"},
        ],
    }


def pack_convo_howto() -> None:
    layers: list[str] = []
    chip = blank()
    draw_chip(chip, 48, "CONVERSATION  ·  HOW TO")
    layers.append(save_layer("convo-howto", "chip", chip))

    title = blank()
    draw_title(title, 96, "Talk face to face", "Hold · translate · auto-speak replies")
    layers.append(save_layer("convo-howto", "title", title))

    r1 = blank()
    draw_ring(r1, 540, 380, 100)
    layers.append(save_layer("convo-howto", "ring-yue", r1))

    r2 = blank()
    draw_ring(r2, 540, 880, 100)
    layers.append(save_layer("convo-howto", "ring-en", r2))

    foot = blank()
    draw_callout(foot, (60, 1180, 1020, 1310), "Same phone. Two directions. Real 口語.", None)
    layers.append(save_layer("convo-howto", "footer", foot))

    compose_preview("convo-howto", layers)
    manifest["slides"]["convo-howto"] = {
        "seconds": 11,
        "live": True,
        "rings": [
            {"file": "ring-en", "track": False, "pulse": True, "in": 0.8, "out": 5.0},
            {"file": "ring-yue", "track": False, "pulse": True, "in": 4.8, "out": 10.2},
        ],
        "captions": [
            {"file": "chip", "in": 0.1, "out": 3.8, "style": "pop-down"},
            {"file": "title", "in": 0.25, "out": 3.6, "style": "pop-down"},
            {"file": "footer", "in": 7.5, "out": 10.6, "style": "pop-up"},
        ],
    }


def pack_cta() -> None:
    layers: list[str] = []
    field = Image.new("RGBA", (W, H), HARBOR)
    soft_glow(field, W // 2 - 120, H // 2 - 180, 340, (18, 80, 70, 120))
    soft_glow(field, W // 2 + 160, H // 2 + 220, 300, (12, 50, 90, 110))
    layers.append(save_layer("cta", "field", field))

    logo_l = blank()
    if LOGO.exists():
        logo = Image.open(LOGO).convert("RGBA").resize((148, 148), Image.Resampling.LANCZOS)
        shadow = blank()
        ImageDraw.Draw(shadow).rounded_rectangle(
            [(W - 180) // 2 + 10, 370, (W - 180) // 2 + 170, 530],
            radius=42,
            fill=(61, 207, 182, 60),
        )
        shadow = shadow.filter(ImageFilter.GaussianBlur(12))
        logo_l.alpha_composite(shadow)
        logo_l.alpha_composite(logo, ((W - 148) // 2, 376))
    layers.append(save_layer("cta", "logo", logo_l))

    copy = blank()
    draw_chip(copy, 560, "JYUTTRANSLATE")
    d = ImageDraw.Draw(copy)
    line1 = "English ↔ Cantonese"
    line2 = "Free to try · Solo + Conversation"
    tw, _ = text_size(d, line1, font(36, True))
    d.text(((W - tw) / 2, 620), line1, font=font(36, True), fill=JADE_BRIGHT)
    tw2, _ = text_size(d, line2, font(24, False))
    d.text(((W - tw2) / 2, 690), line2, font=font(24, False), fill=MUTE)
    rounded_panel(copy, (260, 760, 820, 860), fill=HARBOR_MID, outline=JADE, radius=28, width=2)
    url = "jyuttranslate.com"
    tw3, _ = text_size(d, url, font(32, True))
    d.text(((W - tw3) / 2, 790), url, font=font(32, True), fill=JADE)
    layers.append(save_layer("cta", "copy", copy))

    compose_preview("cta", layers)
    manifest["slides"]["cta"] = {
        "seconds": 7,
        "focus": "center",
        "zoomEnd": 1.08,
        "rings": [],
        "captions": [
            {"file": "field", "in": 0.0, "out": 6.8, "style": "fade"},
            {"file": "logo", "in": 0.2, "out": 6.6, "style": "pop-down"},
            {"file": "copy", "in": 0.45, "out": 6.7, "style": "pop-up"},
        ],
    }


pack_hook()
pack_solo_anatomy()
pack_solo_howto()
pack_convo_anatomy()
pack_convo_howto()
pack_cta()

man_path = LAYERS / "manifest.json"
man_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
print("manifest", man_path)
