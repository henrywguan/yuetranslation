#!/usr/bin/env python3
"""Regenerate original Harbor Quest miss SFX (no third-party game samples)."""
from __future__ import annotations

import math
import random
import struct
import wave
from pathlib import Path

SR = 44100
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "apps/web/public/assets/harbor-quest"
rng = random.Random(20260913)


def clamp(x: float) -> float:
    return max(-1.0, min(1.0, x))


def write_wav(path: Path, samples: list[float]) -> None:
    peak = max(abs(s) for s in samples) or 1.0
    gain = 10 ** (-1.5 / 20) / peak
    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        frames = b"".join(struct.pack("<h", int(clamp(s * gain) * 32767)) for s in samples)
        w.writeframes(frames)
    print(f"wrote {path} ({len(samples) / SR:.3f}s)")


def env_adsr(i: int, n: int, a=0.01, d=0.08, s=0.45, r=0.2) -> float:
    t = i / SR
    dur = n / SR
    if t < a:
        return t / a
    if t < a + d:
        return 1.0 - (1.0 - s) * ((t - a) / d)
    if t < dur - r:
        return s
    if t >= dur:
        return 0.0
    return s * max(0.0, (dur - t) / r)


def noise() -> float:
    return rng.uniform(-1.0, 1.0)


def make_man_hit() -> list[float]:
    """Original body-hit + grunt — fantasy-RPG combat feel, not a Jagex sample."""
    dur = 0.42
    n = int(SR * dur)
    out = [0.0] * n
    for i in range(n):
        t = i / SR
        e = math.exp(-t * 14.0)
        f = 95.0 * (1.0 - 0.35 * min(1.0, t / 0.12))
        thud = math.sin(2 * math.pi * f * t) * 0.7 + math.sin(2 * math.pi * f * 2 * t) * 0.18
        out[i] += thud * e * 0.85
    for i in range(int(SR * 0.08)):
        t = i / SR
        e = math.exp(-t * 55.0)
        out[i] += noise() * e * 0.55
    for i in range(int(SR * 0.28)):
        t = i / SR
        e = env_adsr(i, int(SR * 0.28), a=0.02, d=0.06, s=0.35, r=0.12)
        f0 = 180.0 * (1.0 - 0.22 * min(1.0, t / 0.2))
        g = (
            math.sin(2 * math.pi * f0 * t)
            + 0.45 * math.sin(2 * math.pi * f0 * 2.1 * t)
            + 0.2 * math.sin(2 * math.pi * f0 * 3.3 * t)
            + noise() * 0.15
        )
        out[i] += g * e * 0.38
    for i in range(int(SR * 0.025)):
        t = i / SR
        out[i] += math.sin(2 * math.pi * 1400 * t) * math.exp(-t * 180) * 0.22
    return out


def make_oof() -> list[float]:
    """Original short vocal oof — block-game hurt feel, not a Mojang sample."""
    dur = 0.38
    n = int(SR * dur)
    out = [0.0] * n
    for i in range(n):
        t = i / SR
        if t < 0.05:
            f0 = 240.0 + 40.0 * (t / 0.05)
            e = t / 0.05
        else:
            u = (t - 0.05) / 0.33
            f0 = 280.0 * (1.0 - 0.45 * min(1.0, u))
            e = math.exp(-(t - 0.05) * 7.5) * (1.0 if t < 0.32 else max(0.0, (dur - t) / 0.06))
        f1 = 320.0 + 80.0 * min(1.0, t / 0.15)
        f2 = 700.0 + 120.0 * min(1.0, t / 0.2)
        carrier = math.sin(2 * math.pi * f0 * t)
        form = (
            math.sin(2 * math.pi * f1 * t) * 0.55
            + math.sin(2 * math.pi * f2 * t) * 0.25
            + carrier * 0.85
            + 0.12 * math.sin(2 * math.pi * f0 * 2 * t)
            + noise() * 0.08 * e
        )
        out[i] = form * e * 0.55
    y = 0.0
    a = 0.18
    for i in range(n):
        y = y + a * (out[i] - y)
        out[i] = y
    return out


def main() -> None:
    write_wav(OUT / "miss-thud.wav", make_man_hit())
    write_wav(OUT / "miss-oof.wav", make_oof())
    (OUT / "README.md").write_text(
        """# Harbor Quest SFX (original)

Procedurally synthesized for JyutTranslate Harbor Quest.

- `miss-thud.wav` — original body-hit / grunt cue inspired by classic fantasy-RPG combat hits (not a RuneScape / Jagex asset).
- `miss-oof.wav` — original short vocal “oof” inspired by block-game hurt cues (not a Minecraft / Mojang asset).

Regenerate: `python3 scripts/gen-harbor-miss-sfx.py`

Do not replace these with ripped game files.
""",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
