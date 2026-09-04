#!/usr/bin/env python3
"""
Recordly-style Cam zoom that actually locks onto Translate all.

Reads source/live/cam-upload-1080.mp4 + zoom-cues.json, writes
out/_studio/cam/f####.jpg with:
  - ease into the Translate all button (fills frame)
  - jade focus reticle + press flash at peak
  - ease out to the STOP overlay / sign center
"""
from __future__ import annotations

import json
import math
import shutil
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageEnhance

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "docs/social/reel-cam-quiz-stop/source/live"
OUT = ROOT / "docs/social/reel-cam-quiz-stop/out/_studio/cam"
W, H, FPS = 1080, 1920, 30
CAM_DUR = 11.5
JADE = (61, 207, 182)
JADE_B = (126, 240, 220)


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


def focus_reticle(im: Image.Image, cx: float, cy: float, t_peak: float) -> Image.Image:
    """Jade brackets around the button during punch-in."""
    overlay = Image.new("RGBA", im.size, (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    a = int(220 * t_peak)
    if a < 8:
        return im
    # At ~4× zoom the button dominates — brackets match that scale
    bw, bh = 520, 240
    x0, y0 = cx - bw / 2, cy - bh / 2
    x1, y1 = cx + bw / 2, cy + bh / 2
    L = 56
    w = 5
    col = (*JADE_B, a)
    # corners
    for (ax, ay, dx, dy) in [
        (x0, y0, 1, 1),
        (x1, y0, -1, 1),
        (x0, y1, 1, -1),
        (x1, y1, -1, -1),
    ]:
        od.line([(ax, ay), (ax + dx * L, ay)], fill=col, width=w)
        od.line([(ax, ay), (ax, ay + dy * L)], fill=col, width=w)
    # soft outer glow ring
    rr = int(90 + 30 * t_peak)
    od.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], outline=(*JADE, int(a * 0.45)), width=2)
    overlay = overlay.filter(ImageFilter.GaussianBlur(0.6))
    out = im.convert("RGBA")
    out.alpha_composite(overlay)
    return out.convert("RGB")


def press_flash(im: Image.Image, amount: float) -> Image.Image:
    if amount <= 0.01:
        return im
    flash = Image.new("RGBA", im.size, (*JADE_B, int(70 * amount)))
    out = im.convert("RGBA")
    out.alpha_composite(flash)
    return out.convert("RGB")


def crop_toward(im: Image.Image, cx: float, cy: float, zoom: float, pad_rgb=(7, 19, 31)) -> Image.Image:
    """Zoom into (cx,cy). Pads with harbor so the focus can sit above the UI top edge."""
    zoom = max(1.0, zoom)
    vw, vh = W / zoom, H / zoom
    # Pad source so crops can center near the top toolbar
    pad = int(max(W, H) * 0.55)
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

    zoom_in_at = max(0.4, (sec("zoom_in_target") or sec("pre_translate") or 3.5) - 0.15)
    peak_at = sec("translate_press") or 5.2
    # hold extreme close-up through press + a beat
    hold_end = (sec("translate_release") or peak_at + 0.5) + 0.35
    # start easing out toward overlay / sign
    zoom_out_at = max(hold_end, sec("result_visible") or 8.0)
    out_done = min(CAM_DUR - 0.3, (sec("zoom_out") or 10.0) + 0.4)

    # Focus targets in source 1080x1920 space
    # Button (Translate all)
    f_btn = (btn_cx, btn_cy)
    # Sign / overlay center (tight STOP crop sits mid-frame in Cam UI)
    f_sign = (W * 0.50, H * 0.52)
    # Start: slight bias toward toolbar so path feels intentional
    f_start = (W * 0.42, H * 0.28)

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
    print(f"render cam zoom → btn ({btn_cx:.0f},{btn_cy:.0f}) · {n} frames")

    for i in range(n):
        t = i / FPS
        # pick source frame (loop last if short)
        src_i = min(i, len(raws) - 1)
        im = Image.open(raws[src_i]).convert("RGB")
        if im.size != (W, H):
            im = im.resize((W, H), Image.Resampling.LANCZOS)

        # Zoom + focus timeline
        if t < zoom_in_at:
            u = t / max(0.01, zoom_in_at)
            zoom = 1.0 + 0.12 * smootherstep(u)
            fx = lerp(f_start[0], f_btn[0], smootherstep(u * 0.65))
            fy = lerp(f_start[1], f_btn[1], smootherstep(u * 0.65))
            reticle = 0.0
            flash = 0.0
        elif t < peak_at:
            u = smootherstep((t - zoom_in_at) / max(0.01, peak_at - zoom_in_at))
            zoom = 1.12 + (4.4 - 1.12) * u  # hard punch — button dominates
            fx = lerp(lerp(f_start[0], f_btn[0], 0.65), f_btn[0], u)
            fy = lerp(lerp(f_start[1], f_btn[1], 0.65), f_btn[1], u)
            reticle = u
            flash = 0.0
        elif t < hold_end:
            zoom = 4.4
            fx, fy = f_btn
            reticle = 1.0
            flash = 1.0 - clamp((t - peak_at) / 0.28)
        elif t < zoom_out_at:
            # stay locked on button a beat longer (no early drift)
            zoom = 4.4
            fx, fy = f_btn
            reticle = 0.85
            flash = 0.0
        elif t < out_done:
            u = smootherstep((t - zoom_out_at) / max(0.01, out_done - zoom_out_at))
            zoom = lerp(4.4, 1.0, u)
            fx = lerp(f_btn[0], f_sign[0], u)
            fy = lerp(f_btn[1], f_sign[1], u)
            reticle = max(0.0, 1.0 - u * 1.4)
            flash = 0.0
        else:
            zoom = 1.0
            fx, fy = f_sign
            reticle = 0.0
            flash = 0.0

        frame = crop_toward(im, fx, fy, zoom)
        if reticle > 0.05:
            # button is centered in the crop
            frame = focus_reticle(frame, W / 2, H / 2, reticle)
        if flash > 0.05:
            frame = press_flash(frame, flash)
            frame = ImageEnhance.Contrast(frame).enhance(1.0 + 0.18 * flash)

        frame.save(OUT / f"f{i:04d}.jpg", quality=93)

    shutil.rmtree(raw_dir, ignore_errors=True)
    print(f"cam zoom frames → {OUT} ({n})")


if __name__ == "__main__":
    main()
