#!/usr/bin/env python3
"""
Harbor Quest · Phase 2 texture revamp (anime / Wuxia painterly flatten).

Batch-process PNG / TGA (and JPEG) albedos:
  1. Bilateral / edge-aware blur — kill grain, grit, and micro-dirt
  2. Saturation boost + black-level lift — bright open-world palette
  3. Write to assets/revamped_textures/ (mirrors relative paths)

Usage:
  python3 scripts/harbor-revamp-textures.py
  python3 scripts/harbor-revamp-textures.py --input docs/harbor-quest/assets --output assets/revamped_textures
  python3 scripts/harbor-revamp-textures.py --self-test

Requires: Pillow + OpenCV (opencv-python-headless). Falls back to a
numpy bilateral if OpenCV is missing.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import numpy as np

try:
    from PIL import Image
except ImportError as exc:  # pragma: no cover
    raise SystemExit(
        "Pillow is required. Install with: python3 -m pip install pillow opencv-python-headless",
    ) from exc

try:
    import cv2

    HAS_CV2 = True
except ImportError:
    cv2 = None  # type: ignore
    HAS_CV2 = False

REPO = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT = REPO / "assets" / "revamped_textures"
DEFAULT_INPUTS = (
    REPO / "apps" / "web" / "public" / "assets" / "harbor-quest",
    REPO / "docs" / "harbor-quest" / "assets",
    REPO / "assets",
)
IMAGE_SUFFIXES = {".png", ".tga", ".jpg", ".jpeg", ".webp"}
SKIP_DIR_NAMES = {
    "revamped_textures",
    "node_modules",
    ".git",
    "cinematics",  # key-art / VO stills — not game albedos
}


def srgb_to_linear(c: np.ndarray) -> np.ndarray:
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def linear_to_srgb(c: np.ndarray) -> np.ndarray:
    return np.where(c <= 0.0031308, c * 12.92, 1.055 * np.power(np.clip(c, 0, None), 1 / 2.4) - 0.055)


def _numpy_bilateral(rgb: np.ndarray, radius: int = 3, sigma_space: float = 2.4, sigma_color: float = 0.12) -> np.ndarray:
    """Slow-but-correct bilateral for the no-OpenCV fallback (small textures)."""
    h, w, _ = rgb.shape
    out = np.zeros_like(rgb)
    yy, xx = np.mgrid[-radius : radius + 1, -radius : radius + 1]
    space = np.exp(-(xx * xx + yy * yy) / (2 * sigma_space * sigma_space)).astype(np.float32)
    for y in range(h):
        y0, y1 = max(0, y - radius), min(h, y + radius + 1)
        for x in range(w):
            x0, x1 = max(0, x - radius), min(w, x + radius + 1)
            patch = rgb[y0:y1, x0:x1]
            sy0, sx0 = y0 - (y - radius), x0 - (x - radius)
            k = space[sy0 : sy0 + (y1 - y0), sx0 : sx0 + (x1 - x0)][..., None]
            delta = patch - rgb[y, x]
            color = np.exp(-np.sum(delta * delta, axis=2, keepdims=True) / (2 * sigma_color * sigma_color))
            wgt = k * color
            out[y, x] = np.sum(patch * wgt, axis=(0, 1)) / np.maximum(wgt.sum(), 1e-8)
    return out


def flatten_micro_noise(rgb: np.ndarray, strength: float = 1.0) -> np.ndarray:
    """Bilateral flatten — preserves cloth/lantern edges, kills grit."""
    d = max(5, int(round(7 * strength)) | 1)
    sigma_color = 28 + 22 * strength
    sigma_space = 6 + 6 * strength
    if HAS_CV2:
        u8 = np.clip(rgb * 255.0, 0, 255).astype(np.uint8)
        flat = cv2.bilateralFilter(u8, d=d, sigmaColor=sigma_color, sigmaSpace=sigma_space)
        # Second pass at a slightly wider spatial sigma so 2k photos flatten into zones.
        if strength >= 0.85:
            flat = cv2.bilateralFilter(flat, d=d, sigmaColor=sigma_color * 0.8, sigmaSpace=sigma_space * 1.25)
        return flat.astype(np.float32) / 255.0
    return _numpy_bilateral(rgb, radius=2 if rgb.shape[0] > 64 else 1, sigma_color=0.1 * strength)


def boost_palette(rgb: np.ndarray, saturation: float = 1.28, black_lift: float = 0.07) -> np.ndarray:
    """HSV saturation + lift crushed blacks toward a bright Wuxia mid-tone."""
    if HAS_CV2:
        hsv = cv2.cvtColor(np.clip(rgb, 0, 1), cv2.COLOR_RGB2HSV)
        hsv[..., 1] = np.clip(hsv[..., 1] * saturation, 0, 1)
        rgb = cv2.cvtColor(hsv, cv2.COLOR_HSV2RGB)
    else:
        mx = rgb.max(axis=2)
        mn = rgb.min(axis=2)
        chroma = mx - mn
        sat = np.divide(chroma, np.maximum(mx, 1e-6))
        sat2 = np.clip(sat * saturation, 0, 1)
        scale = np.divide(sat2, np.maximum(sat, 1e-6), out=np.ones_like(sat), where=sat > 1e-5)
        mean = rgb.mean(axis=2, keepdims=True)
        rgb = np.clip(mean + (rgb - mean) * scale[..., None], 0, 1)
    # Lift in linear so shadows go teal-paper, not milky grey.
    lin = srgb_to_linear(np.clip(rgb, 0, 1))
    lin = black_lift + lin * (1.0 - black_lift)
    return np.clip(linear_to_srgb(lin), 0, 1)


def revamp_rgba(rgba: np.ndarray, saturation: float = 1.28, black_lift: float = 0.07, flatten: float = 1.0) -> np.ndarray:
    rgb = rgba[..., :3].astype(np.float32)
    if rgb.max() > 1.5:
        rgb = rgb / 255.0
    alpha = rgba[..., 3]
    if alpha.max() > 1.5:
        alpha = alpha / 255.0
    rgb = flatten_micro_noise(rgb, strength=flatten)
    rgb = boost_palette(rgb, saturation=saturation, black_lift=black_lift)
    out = np.zeros_like(rgba, dtype=np.uint8)
    out[..., :3] = np.clip(rgb * 255.0 + 0.5, 0, 255).astype(np.uint8)
    out[..., 3] = np.clip(alpha * 255.0 + 0.5, 0, 255).astype(np.uint8)
    return out


def load_rgba(path: Path) -> np.ndarray:
    img = Image.open(path)
    if img.mode != "RGBA":
        img = img.convert("RGBA")
    return np.asarray(img)


def save_rgba(path: Path, rgba: np.ndarray) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(rgba, mode="RGBA").save(path)


def iter_textures(roots: list[Path]) -> list[Path]:
    found: list[Path] = []
    for root in roots:
        if not root.exists():
            continue
        if root.is_file() and root.suffix.lower() in IMAGE_SUFFIXES:
            found.append(root)
            continue
        for p in root.rglob("*"):
            if not p.is_file() or p.suffix.lower() not in IMAGE_SUFFIXES:
                continue
            if any(part in SKIP_DIR_NAMES for part in p.parts):
                continue
            found.append(p)
    return sorted(set(found))


def rel_under(path: Path, roots: list[Path]) -> Path:
    for root in roots:
        try:
            return path.relative_to(root)
        except ValueError:
            continue
    return Path(path.name)


def process_file(src: Path, dest: Path, saturation: float, black_lift: float, flatten: float) -> None:
    rgba = load_rgba(src)
    out = revamp_rgba(rgba, saturation=saturation, black_lift=black_lift, flatten=flatten)
    # Always write PNG so TGA/JPEG land in a web-safe folder.
    dest = dest.with_suffix(".png")
    save_rgba(dest, out)


def self_test(output: Path) -> None:
    """Noisy grit square → flattened, lifted, saturated result."""
    rng = np.random.default_rng(7)
    h = w = 64
    base = np.zeros((h, w, 4), dtype=np.uint8)
    base[..., 0] = 90
    base[..., 1] = 70
    base[..., 2] = 55
    base[..., 3] = 255
    grit = rng.integers(-40, 40, size=(h, w, 3), dtype=np.int16)
    base[..., :3] = np.clip(base[..., :3].astype(np.int16) + grit, 0, 255).astype(np.uint8)
    # Hard painted edge the filter must keep.
    base[20:44, 20:44, :3] = (40, 140, 120)

    src = output / "_selftest" / "noisy-grit.png"
    dest = output / "_selftest" / "noisy-grit.revamped.png"
    save_rgba(src, base)
    process_file(src, dest, saturation=1.3, black_lift=0.08, flatten=1.0)
    out = load_rgba(dest)

    src_std = base[..., :3].astype(np.float32).std()
    out_std = out[..., :3].astype(np.float32).std()
    if out_std >= src_std:
        raise SystemExit(f"self-test: expected flatten (std {out_std:.2f} < {src_std:.2f})")
    # Edge square stays a distinct zone (not fully bled into the brown field).
    zone = out[24:40, 24:40, 1].mean()
    field = out[2:12, 2:12, 1].mean()
    if zone <= field + 15:
        raise SystemExit(f"self-test: edge zone was over-blurred ({zone:.1f} vs field {field:.1f})")
    # Black lift — darkest pixel is no longer 0.
    if int(out[..., :3].min()) < 8:
        raise SystemExit("self-test: black lift did not raise crushed blacks")
    print(f"harbor-revamp-textures self-test: ok  flatten {src_std:.1f}→{out_std:.1f}  wrote {dest}")


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    p = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    p.add_argument("--input", action="append", type=Path, help="File or directory (repeatable).")
    p.add_argument("--output", type=Path, default=DEFAULT_OUTPUT, help="Destination root.")
    p.add_argument("--saturation", type=float, default=1.28)
    p.add_argument("--black-lift", type=float, default=0.07)
    p.add_argument("--flatten", type=float, default=1.0, help="Bilateral strength (0.4–1.4).")
    p.add_argument("--self-test", action="store_true")
    p.add_argument("--dry-run", action="store_true")
    return p.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    output: Path = args.output if args.output.is_absolute() else REPO / args.output
    if args.self_test:
        self_test(output)
        return 0

    roots = [p if p.is_absolute() else REPO / p for p in (args.input or DEFAULT_INPUTS)]
    files = iter_textures(roots)
    if not files:
        print("harbor-revamp-textures: no PNG/TGA/JPEG textures found under", ", ".join(str(r) for r in roots))
        return 0

    print(f"harbor-revamp-textures: {len(files)} file(s)  cv2={HAS_CV2}  → {output}")
    for src in files:
        dest = output / rel_under(src, roots)
        if args.dry_run:
            print("  would write", dest.with_suffix(".png"))
            continue
        process_file(src, dest, args.saturation, args.black_lift, args.flatten)
        print("  wrote", dest.with_suffix(".png"))
    return 0


if __name__ == "__main__":
    sys.exit(main())
