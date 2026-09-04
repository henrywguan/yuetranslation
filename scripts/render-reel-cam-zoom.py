#!/usr/bin/env python3
"""
Cam segment: full-screen app UI → animated hand presses Translate all → punch-in zoom.

No camera-reticle / viewfinder overlays. The hand is the interaction cue.
"""
from __future__ import annotations

import json
import math
import shutil
import subprocess
from functools import lru_cache
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "docs/social/reel-cam-quiz-stop/source/live"
OUT = ROOT / "docs/social/reel-cam-quiz-stop/out/_studio/cam"
HAND_PATH = ROOT / "docs/social/reel-cam-quiz-stop/source/hand-tap.png"
W, H, FPS = 1080, 1920, 30
CAM_DUR = 11.5
JADE = (61, 207, 182)
HARBOR = (7, 19, 31)
# Fingertip in source/hand-tap.png (see hand-tap-tip.json)
TIP0 = (210.0, 95.0)


def clamp(v, a=0.0, b=1.0):
    return max(a, min(b, v))


def smootherstep(t: float) -> float:
    t = clamp(t)
    return t * t * t * (t * (t * 6 - 15) + 10)


def lerp(a, b, t):
    return a + (b - a) * t


def extract_frames(mp4: Path, dir: Path):
    dir.mkdir(parents=True, exist_ok=True)
    subprocess.check_call(
        [
            "ffmpeg", "-y", "-i", str(mp4),
            "-vf", f"fps={FPS},scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H}",
            "-q:v", "2",
            str(dir / "raw-%05d.jpg"),
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


def make_hand_asset(path: Path) -> Image.Image:
    """Soft illustrated index finger + palm for product-demo taps (generated once)."""
    path.parent.mkdir(parents=True, exist_ok=True)
    cw, ch = 520, 680
    im = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))
    tip = (int(TIP0[0]), int(TIP0[1]))

    shadow = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.ellipse([tip[0] - 50, tip[1] - 40, tip[0] + 70, tip[1] + 70], fill=(0, 0, 0, 70))
    sd.polygon(
        [
            (tip[0] - 20, tip[1] + 40),
            (tip[0] + 55, tip[1] + 50),
            (tip[0] + 160, tip[1] + 560),
            (tip[0] + 40, tip[1] + 580),
        ],
        fill=(0, 0, 0, 55),
    )
    im.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(22)))

    d = ImageDraw.Draw(im)
    skin = (240, 208, 186, 255)
    skin2 = (224, 180, 155, 255)
    skin3 = (250, 225, 208, 255)
    nail = (255, 242, 235, 245)
    d.ellipse([tip[0] - 10, tip[1] + 280, tip[0] + 220, tip[1] + 520], fill=skin)
    for i, (cy, rx, ry) in enumerate(
        [
            (tip[1] + 30, 38, 42),
            (tip[1] + 80, 40, 48),
            (tip[1] + 140, 44, 52),
            (tip[1] + 210, 50, 58),
            (tip[1] + 270, 58, 64),
        ]
    ):
        d.ellipse([tip[0] - rx, cy - ry, tip[0] + rx, cy + ry], fill=skin if i % 2 == 0 else skin2)
    d.polygon(
        [
            (tip[0] - 36, tip[1] + 20),
            (tip[0] + 36, tip[1] + 20),
            (tip[0] + 70, tip[1] + 300),
            (tip[0] - 20, tip[1] + 310),
        ],
        fill=skin,
    )
    d.ellipse([tip[0] - 48, tip[1] - 48, tip[0] + 48, tip[1] + 48], fill=skin3)
    d.ellipse([tip[0] - 26, tip[1] - 40, tip[0] + 26, tip[1] + 6], fill=nail)
    d.arc([tip[0] - 34, tip[1] + 8, tip[0] + 34, tip[1] + 50], 200, 340, fill=(200, 150, 130, 180), width=3)
    d.ellipse([tip[0] + 55, tip[1] + 200, tip[0] + 150, tip[1] + 320], fill=skin2)
    hi = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))
    ImageDraw.Draw(hi).ellipse([tip[0] - 28, tip[1] - 36, tip[0] + 10, tip[1] - 2], fill=(255, 255, 255, 70))
    im.alpha_composite(hi.filter(ImageFilter.GaussianBlur(3)))
    im.save(path)
    tip_json = path.with_name("hand-tap-tip.json")
    tip_json.write_text('{"x": %d, "y": %d}\n' % (tip[0], tip[1]))
    return im


def load_hand() -> Image.Image:
    if HAND_PATH.exists():
        return Image.open(HAND_PATH).convert("RGBA")
    return make_hand_asset(HAND_PATH)


@lru_cache(maxsize=32)
def prepared_hand(scale_q: int, angle_q: int) -> tuple[Image.Image, int, int]:
    """Cached rotated hand + tip offset inside that bitmap. scale_q = scale*100, angle_q = degrees."""
    hand = load_hand()
    s = scale_q / 100.0
    angle = float(angle_q)
    tip_s = (TIP0[0] * s, TIP0[1] * s)
    h0 = hand.resize(
        (max(1, int(hand.width * s)), max(1, int(hand.height * s))),
        Image.Resampling.LANCZOS,
    )
    marker = Image.new("RGBA", h0.size, (0, 0, 0, 0))
    ImageDraw.Draw(marker).point((int(tip_s[0]), int(tip_s[1])), fill=(255, 0, 0, 255))
    h_rot = h0.rotate(angle, resample=Image.Resampling.BICUBIC, expand=True, fillcolor=(0, 0, 0, 0))
    m_rot = marker.rotate(angle, resample=Image.Resampling.NEAREST, expand=True, fillcolor=(0, 0, 0, 0))
    mw, mh = m_rot.size
    mx = my = None
    for y in range(mh):
        for x in range(mw):
            p = m_rot.getpixel((x, y))
            if p[0] > 200 and p[3] > 200:
                mx, my = x, y
                break
        if mx is not None:
            break
    if mx is None:
        mx, my = int(mw * 0.35), int(mh * 0.18)
    return h_rot, mx, my


def paste_hand(
    base: Image.Image,
    tip_xy: tuple[float, float],
    *,
    scale: float = 1.0,
    angle: float = -32.0,
    alpha: float = 1.0,
    press: float = 0.0,
) -> Image.Image:
    if alpha <= 0.02:
        return base
    s = scale * (1.0 - 0.06 * press)
    h_rot, mx, my = prepared_hand(int(round(s * 100)), int(round(angle)))
    if alpha < 0.999:
        h_rot = h_rot.copy()
        a = h_rot.split()[3].point(lambda v, al=alpha: int(v * al))
        h_rot.putalpha(a)
    px = int(tip_xy[0] - mx)
    py = int(tip_xy[1] - my + 12 * press)
    out = base.convert("RGBA")
    out.alpha_composite(h_rot, (px, py))
    return out.convert("RGB")


def button_press_feedback(im: Image.Image, cx: float, cy: float, bw: float, bh: float, amount: float) -> Image.Image:
    """Subtle darken + soft jade rim on press — not a camera viewfinder."""
    if amount <= 0.02:
        return im
    overlay = Image.new("RGBA", im.size, (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    x0, y0 = cx - bw / 2 - 6, cy - bh / 2 - 4
    x1, y1 = cx + bw / 2 + 6, cy + bh / 2 + 4
    od.rounded_rectangle([x0, y0, x1, y1], radius=16, fill=(0, 0, 0, int(55 * amount)))
    od.rounded_rectangle([x0, y0, x1, y1], radius=16, outline=(*JADE, int(140 * amount)), width=2)
    r = 22 + 36 * amount
    od.ellipse([cx - r, cy - r, cx + r, cy + r], outline=(*JADE, int(70 * (1 - amount * 0.4))), width=2)
    out = im.convert("RGBA")
    out.alpha_composite(overlay.filter(ImageFilter.GaussianBlur(0.6)))
    return out.convert("RGB")


def crop_toward(im: Image.Image, cx: float, cy: float, zoom: float, pad_rgb=HARBOR) -> Image.Image:
    zoom = max(1.0, zoom)
    if abs(zoom - 1.0) < 0.001:
        return im if im.size == (W, H) else im.resize((W, H), Image.Resampling.LANCZOS)
    vw, vh = W / zoom, H / zoom
    pad = int(max(W, H) * 0.35)
    canvas = Image.new("RGB", (W + 2 * pad, H + 2 * pad), pad_rgb)
    canvas.paste(im, (pad, pad))
    cx_p, cy_p = cx + pad, cy + pad
    x0 = cx_p - vw / 2
    y0 = cy_p - vh / 2
    crop = canvas.crop((int(x0), int(y0), int(x0 + vw), int(y0 + vh)))
    return crop.resize((W, H), Image.Resampling.LANCZOS)


def main():
    mp4 = SRC / "cam-upload-1080.mp4"
    cues_path = SRC / "zoom-cues.json"
    if not mp4.exists():
        raise SystemExit(f"missing {mp4}")
    cues = json.loads(cues_path.read_text()) if cues_path.exists() else []

    def sec(label, default=None):
        c = next((x for x in cues if x.get("label") == label), None)
        return c["sec"] if c else default

    pre = next((x for x in cues if x.get("label") == "pre_translate"), None)
    press = next((x for x in cues if x.get("label") == "translate_press"), None)
    btn = (press or pre or {}).get("btn") or {"x": 164, "y": 192, "w": 104, "h": 52}
    btn_cx = float(btn["x"])
    btn_cy = float(btn["y"])
    btn_w = float(btn.get("w") or 104)
    btn_h = float(btn.get("h") or 52)

    # Full-screen first → hand presses → THEN punch-in (no reticle)
    hand_in_at = 1.1
    hand_arrive = max(2.35, (sec("pre_translate") or 3.5) - 1.0)
    press_at = sec("translate_press") or 5.2
    press_end = press_at + 0.28
    zoom_in_at = press_end + 0.12
    peak_at = zoom_in_at + 0.85
    hold_end = max(peak_at + 0.9, (sec("translate_release") or press_at + 0.8) + 0.5)
    zoom_out_at = max(hold_end, sec("result_visible") or 8.0)
    out_done = min(CAM_DUR - 0.3, (sec("zoom_out") or 10.0) + 0.4)

    # Punch focus slightly below button so header + sign still read as the app
    f_punch = (btn_cx + 40, btn_cy + 70)
    f_sign = (W * 0.50, H * 0.52)
    f_start = (W * 0.50, H * 0.48)

    hand_start = (btn_cx + 280, btn_cy + 420)
    hand_end = (btn_cx + 4, btn_cy + 4)

    # Warm cache
    load_hand()
    prepared_hand(58, -28)

    raw_dir = SRC / "_cam_raw"
    if raw_dir.exists():
        shutil.rmtree(raw_dir)
    print("extract cam frames…")
    extract_frames(mp4, raw_dir)
    raws = sorted(raw_dir.glob("raw-*.jpg"))
    if len(raws) < 10:
        raise SystemExit("too few cam frames")

    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir(parents=True)

    n = int(CAM_DUR * FPS)
    print(f"render cam · full UI → hand press → punch · btn ({btn_cx:.0f},{btn_cy:.0f}) · {n} frames")

    for i in range(n):
        t = i / FPS
        src_i = min(i, len(raws) - 1)
        im = Image.open(raws[src_i]).convert("RGB")
        if im.size != (W, H):
            im = im.resize((W, H), Image.Resampling.LANCZOS)

        if t < zoom_in_at:
            zoom = 1.0
            fx, fy = f_start
        elif t < peak_at:
            u = smootherstep((t - zoom_in_at) / max(0.01, peak_at - zoom_in_at))
            zoom = lerp(1.0, 3.15, u)
            fx = lerp(f_start[0], f_punch[0], u)
            fy = lerp(f_start[1], f_punch[1], u)
        elif t < zoom_out_at:
            zoom = 3.15
            fx, fy = f_punch
        elif t < out_done:
            u = smootherstep((t - zoom_out_at) / max(0.01, out_done - zoom_out_at))
            zoom = lerp(3.15, 1.0, u)
            fx = lerp(f_punch[0], f_sign[0], u)
            fy = lerp(f_punch[1], f_sign[1], u)
        else:
            zoom = 1.0
            fx, fy = f_sign

        # Hand only while full-screen — fully gone before punch so it doesn't blow up
        hand_alpha = 0.0
        hand_pos = hand_start
        press_amt = 0.0
        if hand_in_at <= t < zoom_in_at:
            if t < hand_arrive:
                u = smootherstep((t - hand_in_at) / max(0.01, hand_arrive - hand_in_at))
                hand_alpha = u
                hand_pos = (lerp(hand_start[0], hand_end[0], u), lerp(hand_start[1], hand_end[1], u))
            elif t < press_at:
                hand_alpha = 1.0
                wob = math.sin(t * 6.0) * 2.0
                hand_pos = (hand_end[0] + wob * 0.25, hand_end[1] + wob)
            elif t < press_end:
                hand_alpha = 1.0
                press_amt = smootherstep((t - press_at) / max(0.01, press_end - press_at))
                hand_pos = hand_end
            else:
                # release + fade out before zoom
                press_amt = max(0.0, 1.0 - (t - press_end) / 0.22)
                fade = clamp((t - press_end) / max(0.01, zoom_in_at - press_end))
                hand_alpha = max(0.0, 1.0 - smootherstep(fade))
                hand_pos = (hand_end[0], hand_end[1] + 8 * fade)

        frame = im
        if press_amt > 0.02:
            frame = button_press_feedback(frame, btn_cx, btn_cy, btn_w, btn_h, press_amt)
        if hand_alpha > 0.02:
            frame = paste_hand(frame, hand_pos, scale=0.58, angle=-28, alpha=hand_alpha, press=press_amt)

        frame = crop_toward(frame, fx, fy, zoom)
        frame.save(OUT / f"f{i:04d}.jpg", quality=93)

    shutil.rmtree(raw_dir, ignore_errors=True)
    print(f"cam frames → {OUT} ({n}) · hand={HAND_PATH.name}")


if __name__ == "__main__":
    main()
