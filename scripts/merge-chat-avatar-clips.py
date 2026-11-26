#!/usr/bin/env python3
"""
Merge Meshy 3d_rigging clip GLBs into chat-avatar deep.glb.

Each clip GLB shares the same 24-bone Meshy skeleton as the base mesh.
We copy animation channel/sampler/accessor/bufferView/buffer blobs into the
base GLB and rename the clip (e.g. Armature|Casual_Walk_inplace|baselayer → Walk).

Usage:
  python3 scripts/merge-chat-avatar-clips.py \
    --base apps/web/public/chat-avatar/boy/deep.glb \
    --out apps/web/public/chat-avatar/boy/deep.glb \
    --clip Walk=/tmp/chat-avatar-clips/boy/Walk.glb \
    --clip Interact=/tmp/…/Interact.glb \
    --clip Study=/tmp/…/Study.glb \
    --clip Work=/tmp/…/Work.glb
"""
from __future__ import annotations

import argparse
import json
import struct
import sys
from pathlib import Path


def read_glb(path: Path) -> tuple[dict, bytes]:
    data = path.read_bytes()
    if data[0:4] != b"glTF":
        raise SystemExit(f"not a GLB: {path}")
    _version, length = struct.unpack_from("<II", data, 4)
    offset = 12
    json_chunk = None
    bin_chunk = b""
    while offset < length:
        chunk_len, chunk_type = struct.unpack_from("<II", data, offset)
        offset += 8
        chunk = data[offset : offset + chunk_len]
        offset += chunk_len
        if chunk_type == 0x4E4F534A:  # JSON
            json_chunk = json.loads(chunk.decode("utf-8"))
        elif chunk_type == 0x004E4942:  # BIN
            bin_chunk = chunk
    if json_chunk is None:
        raise SystemExit(f"no JSON chunk: {path}")
    return json_chunk, bin_chunk


def write_glb(path: Path, gltf: dict, bin_blob: bytes) -> None:
    json_bytes = json.dumps(gltf, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    # pad JSON to 4-byte boundary with spaces
    json_pad = (4 - (len(json_bytes) % 4)) % 4
    json_bytes += b" " * json_pad
    bin_pad = (4 - (len(bin_blob) % 4)) % 4
    bin_blob_padded = bin_blob + (b"\x00" * bin_pad)
    total = 12 + 8 + len(json_bytes) + 8 + len(bin_blob_padded)
    out = bytearray()
    out += struct.pack("<4sII", b"glTF", 2, total)
    out += struct.pack("<II", len(json_bytes), 0x4E4F534A)
    out += json_bytes
    out += struct.pack("<II", len(bin_blob_padded), 0x004E4942)
    out += bin_blob_padded
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(out)


def append_accessor(base: dict, base_bin: bytearray, src: dict, src_bin: bytes, acc_i: int) -> int:
    """Copy one accessor (+ its bufferView bytes) into base; return new accessor index."""
    acc = dict(src["accessors"][acc_i])
    bv_i = acc.get("bufferView")
    if bv_i is None:
        base.setdefault("accessors", []).append(acc)
        return len(base["accessors"]) - 1
    bv = dict(src["bufferViews"][bv_i])
    byte_offset = bv.get("byteOffset", 0)
    byte_length = bv["byteLength"]
    # Align new data to 4 bytes
    pad = (4 - (len(base_bin) % 4)) % 4
    base_bin.extend(b"\x00" * pad)
    new_offset = len(base_bin)
    base_bin.extend(src_bin[byte_offset : byte_offset + byte_length])
    new_bv = {
        "buffer": 0,
        "byteOffset": new_offset,
        "byteLength": byte_length,
    }
    if "byteStride" in bv:
        new_bv["byteStride"] = bv["byteStride"]
    if "target" in bv:
        new_bv["target"] = bv["target"]
    base.setdefault("bufferViews", []).append(new_bv)
    acc["bufferView"] = len(base["bufferViews"]) - 1
    # drop sparse if present (Meshy clips are dense)
    acc.pop("sparse", None)
    base.setdefault("accessors", []).append(acc)
    return len(base["accessors"]) - 1


def merge_clip(base: dict, base_bin: bytearray, clip_path: Path, rename: str) -> None:
    src, src_bin = read_glb(clip_path)
    anims = src.get("animations") or []
    if not anims:
        raise SystemExit(f"no animations in {clip_path}")
    # Prefer first animation (Meshy ships one clip per rigging job)
    anim = anims[0]
    new_channels = []
    new_samplers = []
    for ch in anim.get("channels", []):
        samp_i = ch["sampler"]
        samp = dict(anim["samplers"][samp_i])
        # Remap input/output accessors
        samp["input"] = append_accessor(base, base_bin, src, src_bin, samp["input"])
        samp["output"] = append_accessor(base, base_bin, src, src_bin, samp["output"])
        new_samplers.append(samp)
        new_ch = {
            "sampler": len(new_samplers) - 1,
            "target": dict(ch["target"]),
        }
        # Keep node index — same Meshy skeleton layout as base.
        new_channels.append(new_ch)
    # Remove existing clip with same name
    existing = base.get("animations") or []
    base["animations"] = [a for a in existing if a.get("name") != rename]
    base["animations"].append(
        {
            "name": rename,
            "samplers": new_samplers,
            "channels": new_channels,
        }
    )
    print(f"  + {rename} from {clip_path.name} ({len(new_channels)} channels)")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", required=True, type=Path)
    ap.add_argument("--out", required=True, type=Path)
    ap.add_argument(
        "--clip",
        action="append",
        default=[],
        help="NAME=path.glb (repeatable). Replaces same-named clips.",
    )
    args = ap.parse_args()
    if not args.clip:
        print("need at least one --clip NAME=path", file=sys.stderr)
        return 2

    gltf, bin_blob = read_glb(args.base)
    base_bin = bytearray(bin_blob)
    names_before = [a.get("name") for a in gltf.get("animations") or []]
    print(f"base {args.base} clips={names_before}")

    for spec in args.clip:
        if "=" not in spec:
            raise SystemExit(f"bad --clip {spec!r}; want NAME=path")
        name, path_s = spec.split("=", 1)
        merge_clip(gltf, base_bin, Path(path_s), name.strip())

    # Update buffer byteLength
    gltf.setdefault("buffers", [{"byteLength": 0}])
    gltf["buffers"][0]["byteLength"] = len(base_bin)

    write_glb(args.out, gltf, bytes(base_bin))
    names_after = [a.get("name") for a in gltf.get("animations") or []]
    size_mib = args.out.stat().st_size / (1024 * 1024)
    print(f"wrote {args.out} ({size_mib:.2f} MiB) clips={names_after}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
