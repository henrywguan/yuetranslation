#!/usr/bin/env python3
"""
Studio-grade frame renderer for Cam quiz stop-sign Reel.

Apple-demo motion language (Harbor/Jade):
  - Parallax layers + soft light sweeps
  - Blur dissolves / luminous iris (not Ken Burns / hard cuts)
  - Spring stagger pills, focus-rack correct reveal
  - Breathing winner pill + ambient mote field

Writes numbered JPEG sequences under out/_studio/ for ffmpeg assemble.
"""
from __future__ import annotations

import math
import os
import shutil
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageEnhance, ImageFont, ImageChops

W, H = 1080, 1920
FPS = 30
ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "docs/social/reel-cam-quiz-stop/source"
OUT = ROOT / "docs/social/reel-cam-quiz-stop/out/_studio"
LOGO = ROOT / "docs/brand/favicon.png"

HARBOR = (7, 19, 31, 255)
JADE = (61, 207, 182)
JADE_BRIGHT = (126, 240, 220)
INK = (232, 244, 255)


def clamp(v, a=0.0, b=1.0):
    return max(a, min(b, v))


def smoothstep(t: float) -> float:
    t = clamp(t)
    return t * t * (3 - 2 * t)


def smootherstep(t: float) -> float:
    t = clamp(t)
    return t * t * t * (t * (t * 6 - 15) + 10)


def ease_out_cubic(t: float) -> float:
    t = clamp(t)
    return 1 - (1 - t) ** 3


def ease_in_out_cubic(t: float) -> float:
    t = clamp(t)
    return 4 * t * t * t if t < 0.5 else 1 - (-2 * t + 2) ** 3 / 2


def spring(t: float, damp=0.72) -> float:
    """Overshoot settle — soft Apple-like spring."""
    t = clamp(t)
    return 1 - math.exp(-6.5 * t) * math.cos(t * math.pi * 2.2) * damp * (1 - t)


def harbor_field(w=W, h=H) -> Image.Image:
    im = Image.new("RGBA", (w, h), HARBOR)
    glow = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    # soft radial washes (Apple keynote depth)
    for (cx, cy, r, a) in [
        (540, 420, 520, 55),
        (200, 1500, 380, 35),
        (900, 1100, 420, 30),
        (540, 960, 700, 18),
    ]:
        gd.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(*JADE, a))
    glow = glow.filter(ImageFilter.GaussianBlur(90))
    im.alpha_composite(glow)
    return im


def vignette(im: Image.Image, strength=0.35) -> Image.Image:
    w, h = im.size
    mask = Image.new("L", (w, h), 0)
    md = ImageDraw.Draw(mask)
    md.ellipse([-w * 0.15, -h * 0.05, w * 1.15, h * 1.05], fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(120))
    dark = Image.new("RGBA", (w, h), (0, 0, 0, int(255 * strength)))
    inv = ImageChops.invert(mask)
    dark.putalpha(inv)
    out = im.convert("RGBA")
    out.alpha_composite(dark)
    return out


def soft_light_sweep(im: Image.Image, t: float, y0=400, y1=1400) -> Image.Image:
    """Thin luminous jade bar sweeping down — Apple specular feel."""
    overlay = Image.new("RGBA", im.size, (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    y = int(y0 + (y1 - y0) * smootherstep(t % 1.0))
    for dy, a in [(-40, 8), (-18, 18), (0, 32), (18, 18), (40, 8)]:
        od.rectangle([0, y + dy, W, y + dy + 10], fill=(*JADE_BRIGHT, a))
    overlay = overlay.filter(ImageFilter.GaussianBlur(12))
    out = im.copy()
    out.alpha_composite(overlay)
    return out


def mote_field(im: Image.Image, t: float, n=18, amp=1.0) -> Image.Image:
    overlay = Image.new("RGBA", im.size, (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    for k in range(n):
        px = (60 + k * 97 + t * (10 + (k % 5) * 3) * amp) % (W + 80) - 40
        py = (120 + k * 163 + 28 * math.sin(t * 1.15 + k)) % (H + 60) - 30
        s = 3 + (k % 5)
        a = int((55 + 40 * math.sin(t * 2.1 + k)) * amp)
        od.ellipse([px - s, py - s, px + s, py + s], fill=(*JADE_BRIGHT, max(0, a)))
    overlay = overlay.filter(ImageFilter.GaussianBlur(0.8))
    out = im.copy()
    out.alpha_composite(overlay)
    return out


def parallax_paste(base: Image.Image, layer: Image.Image, ox: float, oy: float, scale=1.0) -> Image.Image:
    if abs(scale - 1.0) > 0.001:
        nw, nh = int(layer.width * scale), int(layer.height * scale)
        layer = layer.resize((nw, nh), Image.Resampling.LANCZOS)
    out = base.copy()
    x = int((W - layer.width) / 2 + ox)
    y = int((H - layer.height) / 2 + oy)
    out.alpha_composite(layer, (x, y))
    return out


def load_rgba(path: Path, size=None) -> Image.Image:
    im = Image.open(path).convert("RGBA")
    if size:
        im = im.resize(size, Image.Resampling.LANCZOS)
    return im


def blur_mix(a: Image.Image, b: Image.Image, t: float, blur_max=18) -> Image.Image:
    """Luxury dissolve: A blurs+fades while B rises from soft focus."""
    t = smootherstep(t)
    a_b = a.filter(ImageFilter.GaussianBlur(blur_max * t))
    b_b = b.filter(ImageFilter.GaussianBlur(blur_max * (1 - t)))
    # slight brightness bloom at midpoint
    bloom = abs(t - 0.5) * 2
    gain = 1.0 + 0.08 * (1 - bloom)
    a_b = ImageEnhance.Brightness(a_b).enhance(gain)
    b_b = ImageEnhance.Brightness(b_b).enhance(gain)
    return Image.blend(a_b.convert("RGB"), b_b.convert("RGB"), t)


def luminous_iris(a: Image.Image, b: Image.Image, t: float) -> Image.Image:
    """Expanding soft iris with jade rim light + mid-burst flash."""
    t = smootherstep(t)
    r = int(40 + t * 1600)
    mask = Image.new("L", (W, H), 0)
    md = ImageDraw.Draw(mask)
    md.ellipse([540 - r, 960 - r, 540 + r, 960 + r], fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(28))
    base = Image.composite(b.convert("RGBA"), a.convert("RGBA"), mask)
    rim = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    rd = ImageDraw.Draw(rim)
    thick = max(2, int(22 * (1 - t * 0.7)))
    rd.ellipse([540 - r - 8, 960 - r - 8, 540 + r + 8, 960 + r + 8], outline=(*JADE_BRIGHT, int(200 * (1 - t * 0.5))), width=thick)
    for k in range(24):
        ang = k * (2 * math.pi / 24) + t * 3.0
        x = 540 + r * math.cos(ang)
        y = 960 + r * math.sin(ang)
        rd.ellipse([x - 6, y - 6, x + 6, y + 6], fill=(*JADE_BRIGHT, int(200 * (1 - t * 0.35))))
    # radial light burst near midpoint
    burst = 1.0 - abs(t - 0.45) * 2.2
    if burst > 0:
        rd.ellipse([540 - 80, 960 - 80, 540 + 80, 960 + 80], fill=(*JADE_BRIGHT, int(90 * burst)))
    rim = rim.filter(ImageFilter.GaussianBlur(3))
    base.alpha_composite(rim)
    if burst > 0.2:
        base = ImageEnhance.Brightness(base).enhance(1.0 + 0.18 * burst)
    return base.convert("RGB")


def write_seq(dir: Path, frames: list[Image.Image]):
    dir.mkdir(parents=True, exist_ok=True)
    for i, fr in enumerate(frames):
        fr.convert("RGB").save(dir / f"f{i:04d}.jpg", quality=93, optimize=True)
    print(f"  {dir.name}: {len(frames)} frames")


# ── Segments ─────────────────────────────────────────────────────────

def render_hook(n: int) -> list[Image.Image]:
    photo = load_rgba(SRC / "01-hook.jpg", (W, H))
    typ = load_rgba(SRC / "01-hook-type.png", (W, H))
    frames = []
    for i in range(n):
        t = i / FPS
        u = i / max(1, n - 1)
        # parallax: photo drifts slowly opposite to type
        ox = 8 * math.sin(t * 0.35)
        oy = -12 * u + 6 * math.cos(t * 0.4)
        scale = 1.04 - 0.03 * smootherstep(u)  # gentle settle (not KB punch)
        field = harbor_field()
        # photo with soft edge vignette feel
        ph = parallax_paste(field, photo, ox * 0.6, oy * 0.6, scale)
        # type: fade + scale up from 0.94 with spring
        type_u = smootherstep(clamp((t - 0.35) / 0.9))
        ts = 0.94 + 0.06 * spring(type_u, damp=0.55)
        ty = -24 * (1 - ease_out_cubic(type_u))
        ta = ease_out_cubic(type_u)
        r, g, b, a = typ.split()
        a = a.point(lambda p, fa=ta: int(p * fa))
        typ_f = Image.merge("RGBA", (r, g, b, a))
        if abs(ts - 1) > 0.001:
            nw, nh = int(W * ts), int(H * ts)
            typ_s = typ_f.resize((nw, nh), Image.Resampling.LANCZOS)
        else:
            typ_s = typ_f
        ph = parallax_paste(ph, typ_s, ox * -0.4, ty + oy * -0.3, 1.0)
        ph = mote_field(ph, t, n=12, amp=0.7)
        if 1.2 < t < 2.6:
            ph = soft_light_sweep(ph, (t - 1.2) / 1.4, 300, 900)
        ph = vignette(ph, 0.28)
        frames.append(ph.convert("RGB"))
    return frames


def render_quiz(n: int) -> list[Image.Image]:
    quiz = load_rgba(SRC / "02-quiz.jpg", (W, H))
    # blank out pills for stagger
    blank = quiz.copy()
    d = ImageDraw.Draw(blank)
    for y in (510, 790, 1070):
        d.rounded_rectangle([110, y, 970, y + 230], radius=32, fill=HARBOR)

    bands = [(500, 760), (780, 1040), (1060, 1320)]
    frames = []
    for i in range(n):
        t = i / FPS
        frame = blank.copy()
        # ambient before/during
        field = harbor_field()
        # use quiz photo bg without pills? use blank which has sign header area
        frame = blank.copy()

        for pi, (y0, y1) in enumerate(bands):
            start = 0.35 + pi * 0.22
            u = spring(clamp((t - start) / 0.55), damp=0.65)
            if u <= 0:
                continue
            pill = quiz.crop((0, y0, W, y1))
            # overshoot scale + lift
            sc = 0.92 + 0.08 * u
            oy = int(48 * (1 - u) ** 2)
            nw, nh = int(W * sc), int((y1 - y0) * sc)
            pill_s = pill.resize((nw, nh), Image.Resampling.LANCZOS)
            # shadow under pill
            sh = Image.new("RGBA", (W, H), (0, 0, 0, 0))
            sd = ImageDraw.Draw(sh)
            sd.rounded_rectangle(
                [130, y0 - oy + 18, 950, y0 - oy + nh + 10],
                radius=28,
                fill=(0, 0, 0, int(60 * u)),
            )
            sh = sh.filter(ImageFilter.GaussianBlur(16))
            frame.alpha_composite(sh)
            px = (W - nw) // 2
            frame.alpha_composite(pill_s, (px, y0 - oy - (nh - (y1 - y0)) // 2))

        # once all landed — light sweep + motes + pulse ring
        if t > 1.2:
            frame = soft_light_sweep(frame, (t - 1.2) * 0.35, 450, 1400)
        frame = mote_field(frame, t, n=16, amp=0.85 if t > 1.0 else 0.4)
        if t > 1.4:
            breath = 0.5 + 0.5 * math.sin(t * 2.6)
            ring = Image.new("RGBA", (W, H), (0, 0, 0, 0))
            rd = ImageDraw.Draw(ring)
            rr = int(230 + 20 * breath)
            rd.ellipse([540 - rr, 900 - rr, 540 + rr, 900 + rr], outline=(*JADE, int(35 + 40 * breath)), width=2)
            ring = ring.filter(ImageFilter.GaussianBlur(1))
            frame.alpha_composite(ring)
        frame = vignette(frame, 0.3)
        frames.append(frame.convert("RGB"))
    return frames


def render_reveal(n: int) -> list[Image.Image]:
    """Focus-rack: wrong pills blur/fade; correct breathes with specular edge."""
    rev = load_rgba(SRC / "03-reveal.jpg", (W, H))
    # approximate bands from still layout
    correct = (90, 480, 990, 780)
    wrongs = [(110, 800, 970, 1020), (110, 1080, 970, 1300)]
    frames = []
    for i in range(n):
        t = i / FPS
        u = smootherstep(clamp(t / 0.9))  # intro settle
        breath = 0.5 + 0.5 * math.sin(t * 2.35)

        field = harbor_field()
        # deep ambient
        field = mote_field(field, t, n=22, amp=1.0)

        # paste full reveal then selectively process
        base = field.copy()
        base.alpha_composite(rev)

        # focus-rack wrong pills: blur + darken over first second then hold
        rack = smootherstep(clamp(t / 1.1))
        for (x0, y0, x1, y1) in wrongs:
            region = base.crop((x0, y0, x1, y1))
            region = region.filter(ImageFilter.GaussianBlur(1 + 5 * rack))
            region = ImageEnhance.Brightness(region).enhance(1 - 0.35 * rack)
            region = ImageEnhance.Color(region).enhance(1 - 0.5 * rack)
            base.paste(region, (x0, y0))

        # correct pill breathe + entrance pop
        x0, y0, x1, y1 = correct
        pill = rev.crop((x0, y0, x1, y1))
        pop = spring(clamp(t / 0.7), damp=0.5)  # overshoot entrance
        sc = (0.88 + 0.12 * pop) * (1.0 + 0.06 * breath)
        nw, nh = int(pill.width * sc), int(pill.height * sc)
        pill_s = pill.resize((nw, nh), Image.Resampling.LANCZOS)
        # luminous aura — stronger
        aura = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        ad = ImageDraw.Draw(aura)
        pad = int(28 + 28 * breath)
        ad.rounded_rectangle(
            [x0 - pad, y0 - pad, x1 + pad, y1 + pad],
            radius=48,
            fill=(*JADE, int(55 + 70 * breath)),
        )
        aura = aura.filter(ImageFilter.GaussianBlur(26))
        base.alpha_composite(aura)
        # dim original correct slot
        dim = Image.new("RGBA", (x1 - x0, y1 - y0), (7, 19, 31, 160))
        slot = Image.alpha_composite(rev.crop((x0, y0, x1, y1)), dim)
        base.paste(slot, (x0, y0))
        cx, cy = (x0 + x1) // 2, (y0 + y1) // 2
        base.alpha_composite(pill_s, (cx - nw // 2, cy - nh // 2))

        # particle burst on entrance
        if t < 1.4:
            burst_u = clamp(t / 1.2)
            burst = Image.new("RGBA", (W, H), (0, 0, 0, 0))
            bd = ImageDraw.Draw(burst)
            for k in range(28):
                ang = k * (2 * math.pi / 28) + t
                dist = 40 + 220 * ease_out_cubic(burst_u)
                px = cx + dist * math.cos(ang)
                py = cy + dist * math.sin(ang) * 0.85
                s = 3 + (k % 4)
                bd.ellipse([px - s, py - s, px + s, py + s], fill=(*JADE_BRIGHT, int(160 * (1 - burst_u))))
            burst = burst.filter(ImageFilter.GaussianBlur(1))
            base.alpha_composite(burst)

        # specular edge tick on breath peak
        if breath > 0.85:
            edge = Image.new("RGBA", (W, H), (0, 0, 0, 0))
            ed = ImageDraw.Draw(edge)
            ed.rounded_rectangle(
                [cx - nw // 2 - 2, cy - nh // 2 - 2, cx + nw // 2 + 2, cy + nh // 2 + 2],
                radius=36,
                outline=(*JADE_BRIGHT, int(120 * (breath - 0.85) / 0.15)),
                width=3,
            )
            base.alpha_composite(edge)

        # soft ring
        ring = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        rd = ImageDraw.Draw(ring)
        rr = int(210 + 28 * breath)
        rd.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], outline=(*JADE_BRIGHT, int(45 + 60 * breath)), width=2)
        ring = ring.filter(ImageFilter.GaussianBlur(1.2))
        base.alpha_composite(ring)

        # intro: scale whole scene from 1.04 → 1.0 (Apple push-in settle, not continuous KB)
        if u < 1:
            sc0 = 1.05 - 0.05 * ease_out_cubic(u)
            nw, nh = int(W * sc0), int(H * sc0)
            scaled = base.resize((nw, nh), Image.Resampling.LANCZOS)
            canvas = harbor_field()
            canvas.alpha_composite(scaled, ((W - nw) // 2, (H - nh) // 2))
            base = canvas

        base = vignette(base, 0.32)
        frames.append(base.convert("RGB"))
    return frames


def render_end(n: int) -> list[Image.Image]:
    end = load_rgba(SRC / "04-end.jpg", (W, H))
    logo = load_rgba(LOGO) if LOGO.exists() else None
    frames = []
    for i in range(n):
        t = i / FPS
        u = smootherstep(clamp(t / 0.85))
        field = harbor_field()
        # end card rises with soft blur→sharp
        card = end.filter(ImageFilter.GaussianBlur(10 * (1 - u)))
        card.putalpha(int(255 * ease_out_cubic(u)))
        # fix alpha properly
        r, g, b, a = end.split()
        a = a.point(lambda p, uu=u: int(p * ease_out_cubic(uu)))
        card = Image.merge("RGBA", (r, g, b, a))
        sc = 0.96 + 0.04 * ease_out_cubic(u)
        nw, nh = int(W * sc), int(H * sc)
        card_s = card.resize((nw, nh), Image.Resampling.LANCZOS)
        field.alpha_composite(card_s, ((W - nw) // 2, (H - nh) // 2))
        field = mote_field(field, t, n=10, amp=0.5)
        # logo settle
        if logo and t > 0.3:
            lu = smootherstep(clamp((t - 0.3) / 0.7))
            ls = 0.88 + 0.12 * spring(lu, damp=0.4)
            side = int(160 * ls)
            lg = logo.resize((side, side), Image.Resampling.LANCZOS)
            # soft glow under logo
            g = Image.new("RGBA", (W, H), (0, 0, 0, 0))
            gd = ImageDraw.Draw(g)
            cx, cy = W // 2, int(H * 0.42)
            gd.ellipse([cx - 90, cy - 90, cx + 90, cy + 90], fill=(*JADE, int(40 * lu)))
            g = g.filter(ImageFilter.GaussianBlur(28))
            field.alpha_composite(g)
            field.alpha_composite(lg, (cx - side // 2, cy - side // 2))
        field = vignette(field, 0.36)
        frames.append(field.convert("RGB"))
    return frames


def render_tx_blur(a_path_or_img, b_path_or_img, n: int) -> list[Image.Image]:
    a = a_path_or_img if isinstance(a_path_or_img, Image.Image) else load_rgba(a_path_or_img, (W, H)).convert("RGB")
    b = b_path_or_img if isinstance(b_path_or_img, Image.Image) else load_rgba(b_path_or_img, (W, H)).convert("RGB")
    if isinstance(a, Image.Image) and a.mode != "RGB":
        a = a.convert("RGB")
    if isinstance(b, Image.Image) and b.mode != "RGB":
        b = b.convert("RGB")
    return [blur_mix(a, b, i / max(1, n - 1)) for i in range(n)]


def render_tx_iris(a_img: Image.Image, b_img: Image.Image, n: int) -> list[Image.Image]:
    a = a_img.convert("RGB")
    b = b_img.convert("RGB")
    return [luminous_iris(a, b, i / max(1, n - 1)) for i in range(n)]


def main():
    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir(parents=True)

    print("studio render…")
    hook_n = int(3.4 * FPS)
    quiz_n = int(5.8 * FPS)
    reveal_n = int(5.2 * FPS)
    end_n = int(2.8 * FPS)
    tx_n = int(1.0 * FPS)
    iris_n = int(1.15 * FPS)

    hook = render_hook(hook_n)
    write_seq(OUT / "hook", hook)

    quiz = render_quiz(quiz_n)
    write_seq(OUT / "quiz", quiz)

    reveal = render_reveal(reveal_n)
    write_seq(OUT / "reveal", reveal)

    end = render_end(end_n)
    write_seq(OUT / "end", end)

    # transitions from last/first frames
    write_seq(OUT / "tx_hq", render_tx_blur(hook[-1], quiz[0], tx_n))
    # quiz → cam: iris into a harbor plate (cam video follows in ffmpeg)
    cam_plate = harbor_field().convert("RGB")
    # soft jade center glow as Cam arrives
    gp = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(gp)
    gd.ellipse([200, 500, 880, 1400], fill=(*JADE, 50))
    gp = gp.filter(ImageFilter.GaussianBlur(70))
    plate = cam_plate.convert("RGBA")
    plate.alpha_composite(gp)
    write_seq(OUT / "tx_qc", render_tx_iris(quiz[-1], plate.convert("RGB"), iris_n))

    # cam→reveal needs last Cam frame (extracted by assemble script before this runs)
    cam_still = SRC / "live/_cam-last.jpg"
    if cam_still.exists():
        cam_still_im = load_rgba(cam_still, (W, H)).convert("RGB")
    else:
        cam_still_im = plate.convert("RGB")
    write_seq(OUT / "tx_cr", render_tx_blur(cam_still_im, reveal[0], tx_n))
    write_seq(OUT / "tx_re", render_tx_blur(reveal[-1], end[0], tx_n))

    # meta for assemble
    meta = {
        "fps": FPS,
        "hook": hook_n / FPS,
        "tx_hq": tx_n / FPS,
        "quiz": quiz_n / FPS,
        "tx_qc": iris_n / FPS,
        "reveal": reveal_n / FPS,
        "tx_cr": tx_n / FPS,
        "end": end_n / FPS,
        "tx_re": tx_n / FPS,
    }
    (OUT / "meta.txt").write_text("\n".join(f"{k}={v}" for k, v in meta.items()))
    print("done studio frames →", OUT)


if __name__ == "__main__":
    main()
