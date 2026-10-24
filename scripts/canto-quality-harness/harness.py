#!/usr/bin/env python3
"""
Offline Cantonese quality harness for JyutTranslate.

Uses PyCantonese for Jyutping / segmentation sanity checks against
phrases.json (and optional Common Voice transcript fixtures).

Does NOT call DeepSeek, Azure, or any paid API.

Usage:
  python3 scripts/canto-quality-harness/harness.py
  python3 scripts/canto-quality-harness/harness.py --cv-tsv /path/to/validated.tsv

Common Voice (optional):
  Point --cv-tsv at a Mozilla Common Voice zh-HK or yue validated.tsv
  (CC0). Only the sentence column is read — no audio download required.
  Do not re-host Common Voice corpora; fetch via Mozilla Data Collective.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PHRASES = ROOT / "apps/api/src/canto/data/phrases.json"
FIXTURES = Path(__file__).resolve().parent / "fixtures" / "yue_sentences.json"

HAN_RE = re.compile(r"[\u3400-\u9fff\uf900-\ufaff]")
JP_TOKEN_RE = re.compile(r"[a-z]+[1-6]", re.I)


def load_phrases() -> list[dict]:
    data = json.loads(PHRASES.read_text(encoding="utf-8"))
    if isinstance(data, list):
        return data
    if isinstance(data, dict) and "entries" in data:
        return list(data["entries"])
    if isinstance(data, dict) and "phrases" in data:
        return list(data["phrases"])
    raise SystemExit(f"Unexpected phrases.json shape: {type(data)}")


def yue_surfaces(phrases: list[dict]) -> list[str]:
    out: list[str] = []
    for row in phrases:
        target = row.get("targetLang") or row.get("to")
        text = row.get("text") or row.get("yue") or row.get("target")
        if target in ("yue", "zh", None) and isinstance(text, str) and HAN_RE.search(text):
            out.append(text.strip())
            for alt in row.get("alternatives") or []:
                if isinstance(alt, str) and HAN_RE.search(alt):
                    out.append(alt.strip())
            continue
        # Fallback: any short Han field with colloquial particles
        for v in row.values():
            if isinstance(v, str) and HAN_RE.search(v) and len(v) <= 80:
                if re.search(r"[係唔喺哋冇嘅咗㗎喇喎啲咩緊]", v):
                    out.append(v)
    seen: set[str] = set()
    uniq: list[str] = []
    for s in out:
        if s not in seen:
            seen.add(s)
            uniq.append(s)
    return uniq


def load_fixture_sentences() -> list[str]:
    if not FIXTURES.exists():
        return []
    data = json.loads(FIXTURES.read_text(encoding="utf-8"))
    return [s.strip() for s in data.get("sentences", []) if isinstance(s, str) and s.strip()]


def load_cv_sentences(tsv_path: Path, limit: int) -> list[str]:
    """Read sentence column from Common Voice validated.tsv (no audio)."""
    lines = tsv_path.read_text(encoding="utf-8").splitlines()
    if not lines:
        return []
    header = lines[0].split("\t")
    try:
        idx = header.index("sentence")
    except ValueError:
        raise SystemExit(f"No 'sentence' column in {tsv_path}")
    out: list[str] = []
    for line in lines[1:]:
        cols = line.split("\t")
        if len(cols) <= idx:
            continue
        sent = cols[idx].strip()
        if HAN_RE.search(sent):
            out.append(sent)
        if len(out) >= limit:
            break
    return out


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--cv-tsv",
        type=Path,
        help="Optional Common Voice validated.tsv (zh-HK or yue). Sentences only.",
    )
    parser.add_argument("--cv-limit", type=int, default=200, help="Max CV sentences to check")
    parser.add_argument("--max-phrases", type=int, default=400, help="Max phrase surfaces")
    args = parser.parse_args()

    try:
        import pycantonese as pc
    except ImportError:
        print(
            "PyCantonese not installed. Run:\n"
            "  pip install -r scripts/canto-quality-harness/requirements.txt",
            file=sys.stderr,
        )
        return 2

    phrases = load_phrases()
    surfaces = yue_surfaces(phrases)[: args.max_phrases]
    surfaces.extend(load_fixture_sentences())
    cv_n = 0
    if args.cv_tsv:
        cv = load_cv_sentences(args.cv_tsv, args.cv_limit)
        cv_n = len(cv)
        surfaces.extend(cv)

    if not surfaces:
        print("No Yue surfaces found to check", file=sys.stderr)
        return 1

    jp_ok = 0
    jp_fail = 0
    seg_ok = 0
    examples_fail: list[str] = []

    for text in surfaces:
        han_chars = [ch for ch in text if HAN_RE.match(ch)]
        if not han_chars:
            continue

        try:
            labeled = pc.characters_to_jyutping(text)
        except Exception as e:
            jp_fail += 1
            if len(examples_fail) < 8:
                examples_fail.append(f"{text!r}: {e}")
            continue

        jp_vals: list[str] = []
        if isinstance(labeled, list):
            for item in labeled:
                if isinstance(item, (tuple, list)) and len(item) >= 2:
                    jp = item[1]
                    if isinstance(jp, str) and JP_TOKEN_RE.search(jp):
                        jp_vals.append(jp)

        # Require Jyutping on a majority of Han chars (punctuation may be None)
        han_labeled = sum(1 for item in labeled if isinstance(item, (tuple, list)) and HAN_RE.match(str(item[0])))
        if jp_vals and (len(jp_vals) / max(han_labeled, 1)) >= 0.5:
            jp_ok += 1
        else:
            jp_fail += 1
            if len(examples_fail) < 8:
                examples_fail.append(f"weak jyutping: {text!r} -> {labeled!r}")

        try:
            segs = pc.segment(text)
            if isinstance(segs, list) and segs:
                seg_ok += 1
        except Exception:
            pass

    total = jp_ok + jp_fail
    rate = (jp_ok / total) if total else 0.0
    report = {
        "ok": rate >= 0.85 and total >= 10,
        "engine": "pycantonese",
        "surfacesChecked": total,
        "jyutpingLabeled": jp_ok,
        "jyutpingFailed": jp_fail,
        "jyutpingRate": round(rate, 4),
        "segmentOk": seg_ok,
        "phrasesFile": str(PHRASES.relative_to(ROOT)),
        "commonVoiceSentences": cv_n,
        "examplesFail": examples_fail,
    }
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
