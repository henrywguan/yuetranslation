#!/usr/bin/env python3
"""
Cinematic motion frames for Studio feature-tour Story.
Smooth eased zoom / punch (LANCZOS) — avoids choppy ffmpeg zoompan.
"""
from __future__ import annotations

import math
import os
import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "docs/social/story-feature-tour"
SRC = BASE / "source"
LIVE = SRC / "live"
OUT = BASE / "out" / "_studio"
W, H, FPS = 1080, 1920, 30


def ease_in_out_cubic(t: float) -> float:
    t = max(0.0, min(1.0, t))
    return 4 * t * t * t if t < 0.5 else 1 - (-2 * t + 2) ** 3 / 2


def ease_out_quart(t: float) -> float:
    t = max(0.0, min(1.0, t))
    return 1 - (1 - t) ** 4


def ease_in_out_quint(t: float) -> float:
    t = max(0.0, min(1.0, t))
    return 16 * t**5 if t < 0.5 else 1 - (-2 * t + 2) ** 5 / 2


def zoom_crop(img: Image.Image, zoom: float, cx: float = 0.5, cy: float = 0.5) -> Image.Image:
    """Crop centered at (cx,cy) fraction with zoom >= 1, then resize to WxH."""
    zoom = max(1.001, zoom)
    iw, ih = img.size
    cw, ch = iw / zoom, ih / zoom
    x0 = cx * iw - cw / 2
    y0 = cy * ih - ch / 2
    x0 = max(0, min(iw - cw, x0))
    y0 = max(0, min(ih - ch, y0))
    crop = img.crop((int(x0), int(y0), int(x0 + cw), int(y0 + ch)))
    return crop.resize((W, H), Image.Resampling.LANCZOS)


def write_frames(dirpath: Path, frames: list[Image.Image]) -> None:
    dirpath.mkdir(parents=True, exist_ok=True)
    for i, fr in enumerate(frames):
        fr.convert("RGB").save(dirpath / f"f{i:04d}.jpg", quality=93, optimize=True)


def encode_dir(dirpath: Path, out_mp4: Path, dur: float) -> None:
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-framerate",
            str(FPS),
            "-i",
            str(dirpath / "f%04d.jpg"),
            "-t",
            f"{dur:.3f}",
            "-c:v",
            "libx264",
            "-pix_fmt",
            "yuv420p",
            "-crf",
            "16",
            "-preset",
            "medium",
            "-an",
            str(out_mp4),
        ],
        check=True,
        capture_output=True,
    )


def render_open(open_card: Path, atmos: Path, n: int) -> list[Image.Image]:
    """Harbor field → logo settle with cinematic ease-out zoom (wide → lock)."""
    card = Image.open(open_card).convert("RGB").resize((W, H), Image.Resampling.LANCZOS)
    # Start wider (more atmosphere), ease into locked brand card.
    frames = []
    for i in range(n):
        t = i / max(1, n - 1)
        e = ease_out_quart(t)
        # 1.22 → 1.0 (settle), slight upward drift toward logo
        z = 1.22 - 0.22 * e
        cy = 0.48 - 0.02 * e
        fr = zoom_crop(card, z, 0.5, cy)
        # Soft fade-in from Harbor black for first ~12 frames
        if i < 12:
            a = ease_in_out_cubic(i / 11)
            black = Image.new("RGB", (W, H), (7, 19, 31))
            fr = Image.blend(black, fr, a)
        frames.append(fr)
    return frames


def render_end(end_card: Path, n: int) -> list[Image.Image]:
    """Cinematic CTA reveal — no zoom. Fade up from Harbor + soft iris light."""
    card = Image.open(end_card).convert("RGB").resize((W, H), Image.Resampling.LANCZOS)
    harbor = Image.new("RGB", (W, H), (7, 19, 31))
    # Soft radial matte for iris (white = reveal)
    yy, xx = np.mgrid[0:H, 0:W]
    cx, cy = W * 0.5, H * 0.42
    dist = np.sqrt(((xx - cx) / (W * 0.72)) ** 2 + ((yy - cy) / (H * 0.55)) ** 2)
    frames = []
    for i in range(n):
        t = i / max(1, n - 1)
        # Hold dark briefly, then ease reveal
        reveal = ease_out_quart(max(0.0, (t - 0.08) / 0.72))
        # Expanding iris: start tight, open to full
        radius = 0.12 + 1.15 * ease_in_out_cubic(reveal)
        mask_f = np.clip((radius - dist) / 0.18, 0.0, 1.0)
        # Extra global fade so edges don't clip harshly
        mask_f = np.clip(mask_f * (0.35 + 0.65 * reveal), 0.0, 1.0)
        mask = Image.fromarray((mask_f * 255).astype(np.uint8), mode="L")
        fr = Image.composite(card, harbor, mask)
        # Soft brightness lift as it settles (no scale/zoom)
        if reveal > 0.55:
            lift = ease_in_out_cubic((reveal - 0.55) / 0.45) * 0.04
            arr = np.array(fr, dtype=np.float32)
            arr = np.clip(arr * (1.0 + lift), 0, 255).astype(np.uint8)
            fr = Image.fromarray(arr)
        frames.append(fr)
    return frames


def extract_video_frames(src: Path, n: int) -> list[Image.Image]:
    tmp = OUT / "_vframes"
    if tmp.exists():
        for p in tmp.glob("*"):
            p.unlink()
    tmp.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(src),
            "-vf",
            f"scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},fps={FPS}",
            "-frames:v",
            str(n + 2),
            str(tmp / "v%04d.jpg"),
        ],
        check=True,
        capture_output=True,
    )
    files = sorted(tmp.glob("v*.jpg"))[:n]
    while len(files) < n and files:
        files.append(files[-1])
    return [Image.open(f).convert("RGB") for f in files]


def punch_frames(
    frames: list[Image.Image],
    z0: float,
    z1: float,
    cx: float = 0.5,
    cy: float = 0.45,
    ease=ease_in_out_cubic,
) -> list[Image.Image]:
    n = len(frames)
    out = []
    for i, fr in enumerate(frames):
        t = i / max(1, n - 1)
        e = ease(t)
        z = z0 + (z1 - z0) * e
        cxi = 0.5 + (cx - 0.5) * e
        cyi = 0.5 + (cy - 0.5) * e
        out.append(zoom_crop(fr, z, cxi, cyi))
    return out


def transition_pulse(
    a: list[Image.Image], b: list[Image.Image], xf_frames: int, pulse_b: bool = True
) -> tuple[list[Image.Image], list[Image.Image]]:
    """Slight overshoot zoom into the last frames of A / first of B for energy.
    Set pulse_b=False to keep B static (e.g. end-card cinematic reveal)."""
    a2 = list(a)
    b2 = list(b)
    for i in range(min(xf_frames, len(a2))):
        t = (i + 1) / xf_frames
        idx = len(a2) - xf_frames + i
        if 0 <= idx < len(a2):
            z = 1.0 + 0.05 * ease_in_out_cubic(t)
            a2[idx] = zoom_crop(a2[idx], z, 0.5, 0.45)
    if pulse_b:
        for i in range(min(xf_frames, len(b2))):
            t = 1 - (i / max(1, xf_frames - 1))
            z = 1.0 + 0.07 * ease_out_quart(t)
            b2[i] = zoom_crop(b2[i], z, 0.5, 0.45)
    return a2, b2


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    open_card = SRC / "open-card.png"
    end_card = SRC / "end-card.png"
    atmos = SRC / "atmosphere" / "harbor-jade-local.png"
    solo = LIVE / "solo-1080.mp4"
    convo = LIVE / "conversation-1080.mp4"
    cam = LIVE / "cam-1080.mp4"
    for p in (open_card, end_card, solo, convo, cam):
        if not p.exists():
            raise SystemExit(f"missing {p}")

    # Timing — open+solo cover ElevenLabs hook VO (~4.4s)
    T = {
        "open": 2.0,
        "solo": 3.0,
        "convo": 2.2,
        "cam": 2.5,
        "end": 2.4,
        "xf": 0.32,
    }
    n = {k: max(8, int(round(v * FPS))) for k, v in T.items() if k != "xf"}
    xf_n = max(6, int(round(T["xf"] * FPS)))

    print("render open…")
    open_f = render_open(open_card, atmos, n["open"])

    print("render solo punch…")
    solo_raw = extract_video_frames(solo, n["solo"])
    # Punch toward Cantonese result (lower-mid)
    solo_f = punch_frames(solo_raw, 1.02, 1.12, cx=0.5, cy=0.52, ease=ease_in_out_quint)

    print("render conversation punch…")
    convo_raw = extract_video_frames(convo, n["convo"])
    convo_f = punch_frames(convo_raw, 1.03, 1.14, cx=0.5, cy=0.42, ease=ease_in_out_cubic)

    print("render cam punch…")
    cam_raw = extract_video_frames(cam, n["cam"])
    # Into glass overlay on sign
    cam_f = punch_frames(cam_raw, 1.04, 1.18, cx=0.5, cy=0.40, ease=ease_in_out_quint)

    print("render end…")
    end_f = render_end(end_card, n["end"])

    # Transition energy pulses between segments
    open_f, solo_f = transition_pulse(open_f, solo_f, xf_n)
    solo_f, convo_f = transition_pulse(solo_f, convo_f, xf_n)
    convo_f, cam_f = transition_pulse(convo_f, cam_f, xf_n)
    cam_f, end_f = transition_pulse(cam_f, end_f, xf_n, pulse_b=False)

    segs = {
        "open": open_f,
        "solo": solo_f,
        "convo": convo_f,
        "cam": cam_f,
        "end": end_f,
    }
    meta = []
    for name, frames in segs.items():
        d = OUT / name
        write_frames(d, frames)
        dur = len(frames) / FPS
        encode_dir(d, OUT / f"{name}.mp4", dur)
        meta.append(f"{name}={dur:.4f}")
        print(f"  {name}: {len(frames)} frames ({dur:.2f}s)")

    meta.append(f"xf={T['xf']:.4f}")
    (OUT / "meta.txt").write_text("\n".join(meta) + "\n")
    print("done", OUT)


if __name__ == "__main__":
    main()
