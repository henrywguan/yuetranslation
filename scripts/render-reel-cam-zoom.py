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

from PIL import Image, ImageDraw, ImageFilter, ImageFont
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "docs/social/reel-cam-quiz-stop/source/live"
OUT = ROOT / "docs/social/reel-cam-quiz-stop/out/_studio/cam"
HAND_PATH = ROOT / "docs/social/reel-cam-quiz-stop/source/hand-tap.png"
TIP_JSON = ROOT / "docs/social/reel-cam-quiz-stop/source/hand-tap-tip.json"
W, H, FPS = 1080, 1920, 30
CAM_DUR = 11.5
JADE = (61, 207, 182)
HARBOR = (7, 19, 31)
EMOJI_FONT = Path("/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf")


def _load_tip0() -> tuple[float, float]:
    if TIP_JSON.exists():
        data = json.loads(TIP_JSON.read_text())
        return float(data["x"]), float(data["y"])
    return 135.4, 34.0


TIP0 = _load_tip0()


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
    """Render the 👆 emoji (Noto Color Emoji) — never draw a custom hand silhouette."""
    path.parent.mkdir(parents=True, exist_ok=True)
    if not EMOJI_FONT.exists():
        raise SystemExit(f"missing emoji font: {EMOJI_FONT}")
    font = None
    for size in (109, 96, 72, 128):
        try:
            font = ImageFont.truetype(str(EMOJI_FONT), size=size)
            break
        except OSError:
            continue
    if font is None:
        raise SystemExit("could not load Noto Color Emoji")

    cw, ch = 400, 480
    canvas = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))
    glyph = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))
    ImageDraw.Draw(glyph).text((80, 20), "👆", font=font, embedded_color=True)
    if glyph.getbbox() is None:
        raise SystemExit("emoji render produced empty image")

    # Soft drop shadow from glyph alpha
    alpha = glyph.split()[3]
    shadow = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))
    shadow.paste((0, 0, 0, 110), (0, 0), alpha)
    canvas.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(10)), (6, 12))
    canvas.alpha_composite(glyph)

    arr = np.array(canvas)
    ys, xs = np.where(arr[:, :, 3] > 40)
    y_cut = int(ys.min() + max(4, (ys.max() - ys.min()) * 0.08))
    top = ys <= y_cut
    tip_x = float(xs[top].mean())
    tip_y = float(ys[top].min() + 8)

    canvas.save(path)
    TIP_JSON.write_text('{"x": %.1f, "y": %.1f}\n' % (tip_x, tip_y))
    global TIP0
    TIP0 = (tip_x, tip_y)
    return canvas


def load_hand() -> Image.Image:
    # Always prefer regenerating from 👆 if the on-disk asset is missing or stale custom art
    if HAND_PATH.exists():
        im = Image.open(HAND_PATH).convert("RGBA")
        # Old procedural blobs were ~520×680 skin-tone; emoji asset is 400×480
        if im.size == (400, 480) or im.size[0] <= 420:
            return im
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
    prepared_hand(145, 8)

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
            frame = paste_hand(frame, hand_pos, scale=1.45, angle=8, alpha=hand_alpha, press=press_amt)

        frame = crop_toward(frame, fx, fy, zoom)
        frame.save(OUT / f"f{i:04d}.jpg", quality=93)

    shutil.rmtree(raw_dir, ignore_errors=True)
    print(f"cam frames → {OUT} ({n}) · hand={HAND_PATH.name}")


if __name__ == "__main__":
    main()
