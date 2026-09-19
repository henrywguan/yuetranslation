#!/usr/bin/env python3
"""
Harbor Quest · Phase 3 mesh audit (headless Blender *or* glTF fallback).

Looks at clothing / lantern / terrain / character GLB·OBJ·FBX and:
  1. Weighted / smooth vertex normals — clean cel-shader shadow lines
  2. Polycount collapse — drop micro-geo so silhouettes stay readable

Preferred:
  blender --background --python scripts/harbor-revamp-meshes.py -- \
      --input apps/web/public/assets/harbor-quest --output assets/revamped_meshes

Without Blender, the same file runs as a glTF (JSON) weld + normal rewrite
for .glb/.gltf using only the Python stdlib + optional numpy.

  python3 scripts/harbor-revamp-meshes.py --self-test
  python3 scripts/harbor-revamp-meshes.py --input path/to/mesh.glb
"""

from __future__ import annotations

import argparse
import json
import math
import struct
import sys
import tempfile
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT = REPO / "assets" / "revamped_meshes"
DEFAULT_INPUTS = (
    REPO / "apps" / "web" / "public" / "assets" / "harbor-quest",
    REPO / "docs" / "harbor-quest" / "assets",
)
MESH_SUFFIXES = {".glb", ".gltf", ".obj", ".fbx"}
SKIP_DIR_NAMES = {"revamped_meshes", "node_modules", ".git", "cinematics"}

# Triangle budgets by filename hint (stylized readability, not photofilm).
BUDGETS = {
    "cloth": 800,
    "clothing": 800,
    "lantern": 220,
    "lamp": 220,
    "terrain": 400,
    "chunk": 400,
    "item": 300,
    "prop": 300,
    "scout": 2500,
    "character": 2500,
}
DEFAULT_BUDGET = 1200


def classify(path: Path) -> str:
    name = path.stem.lower()
    for key in BUDGETS:
        if key in name:
            return key
    return "item"


def budget_for(path: Path) -> int:
    return BUDGETS.get(classify(path), DEFAULT_BUDGET)


# ---------------------------------------------------------------------------
# Blender path (bpy)
# ---------------------------------------------------------------------------

def _running_in_blender() -> bool:
    return "bpy" in sys.modules


def blender_audit(src: Path, dest: Path, max_tris: int) -> None:
    import bpy  # type: ignore

    bpy.ops.wm.read_factory_settings(use_empty=True)
    suffix = src.suffix.lower()
    if suffix == ".obj":
        bpy.ops.wm.obj_import(filepath=str(src))
    elif suffix == ".fbx":
        bpy.ops.import_scene.fbx(filepath=str(src))
    else:
        bpy.ops.import_scene.gltf(filepath=str(src))

    meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    for obj in meshes:
        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)
        bpy.ops.object.mode_set(mode="EDIT")
        bpy.ops.mesh.select_all(action="SELECT")
        bpy.ops.mesh.remove_doubles(threshold=0.0002)
        bpy.ops.mesh.normals_make_consistent(inside=False)
        bpy.ops.object.mode_set(mode="OBJECT")
        # Weighted Normal modifier — Blender 2.8+ (angle + face area).
        wn = obj.modifiers.new(name="HarborWeightedNormal", type="WEIGHTED_NORMAL")
        if wn:
            try:
                wn.mode = "FACE_AREA_WITH_ANGLE"
                wn.keep_sharp = False
                wn.weight = 50
            except Exception:
                pass
            bpy.ops.object.modifier_apply(modifier=wn.name)
        tris = sum(len(p.vertices) - 2 for p in obj.data.polygons)
        if tris > max_tris:
            dec = obj.modifiers.new(name="HarborDecimate", type="DECIMATE")
            dec.decimate_type = "COLLAPSE"
            dec.ratio = max(0.08, max_tris / max(tris, 1))
            bpy.ops.object.modifier_apply(modifier=dec.name)
        obj.select_set(False)

    dest.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=str(dest.with_suffix(".glb")),
        export_format="GLB",
        export_apply=True,
        export_normals=True,
    )


# ---------------------------------------------------------------------------
# Stdlib glTF weld + area-weighted normals (no Blender)
# ---------------------------------------------------------------------------

def _align4(n: int) -> int:
    return (n + 3) & ~3


def parse_glb(data: bytes) -> tuple[dict, bytes]:
    magic, version, length = struct.unpack_from("<4sII", data, 0)
    if magic != b"glTF":
        raise ValueError("not a GLB")
    off = 12
    json_blob = b"{}"
    bin_blob = b""
    while off + 8 <= length and off + 8 <= len(data):
        chunk_len, chunk_type = struct.unpack_from("<I4s", data, off)
        off += 8
        chunk = data[off : off + chunk_len]
        off += chunk_len
        if chunk_type == b"JSON":
            json_blob = chunk
        elif chunk_type == b"BIN\x00":
            bin_blob = chunk
    return json.loads(json_blob.decode("utf-8")), bin_blob


def pack_glb(doc: dict, bin_blob: bytes) -> bytes:
    json_bytes = json.dumps(doc, separators=(",", ":")).encode("utf-8")
    json_bytes += b" " * (_align4(len(json_bytes)) - len(json_bytes))
    bin_padded = bin_blob + b"\x00" * (_align4(len(bin_blob)) - len(bin_blob))
    total = 12 + 8 + len(json_bytes) + 8 + len(bin_padded)
    out = bytearray()
    out += struct.pack("<4sII", b"glTF", 2, total)
    out += struct.pack("<I4s", len(json_bytes), b"JSON")
    out += json_bytes
    out += struct.pack("<I4s", len(bin_padded), b"BIN\x00")
    out += bin_padded
    return bytes(out)


COMPONENT = {5120: ("b", 1), 5121: ("B", 1), 5122: ("h", 2), 5123: ("H", 2), 5125: ("I", 4), 5126: ("f", 4)}
TYPE_N = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4}


def _read_accessor(doc: dict, blob: bytes, acc_i: int) -> list[tuple]:
    acc = doc["accessors"][acc_i]
    view = doc["bufferViews"][acc["bufferView"]]
    fmt, size = COMPONENT[acc["componentType"]]
    n = TYPE_N[acc["type"]]
    stride = view.get("byteStride", size * n)
    off = view.get("byteOffset", 0) + acc.get("byteOffset", 0)
    out = []
    for i in range(acc["count"]):
        o = off + i * stride
        vals = struct.unpack_from("<" + fmt * n, blob, o)
        out.append(vals)
    return out


def _face_normal(a, b, c):
    ux, uy, uz = b[0] - a[0], b[1] - a[1], b[2] - a[2]
    vx, vy, vz = c[0] - a[0], c[1] - a[1], c[2] - a[2]
    nx, ny, nz = uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx
    return nx, ny, nz


def _vlen(v):
    return math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2])


def _angle(u, v):
    du, dv = _vlen(u), _vlen(v)
    if du < 1e-12 or dv < 1e-12:
        return 0.0
    dot = max(-1.0, min(1.0, (u[0] * v[0] + u[1] * v[1] + u[2] * v[2]) / (du * dv)))
    return math.acos(dot)


def weighted_normals(positions: list, indices: list[int]) -> list[tuple[float, float, float]]:
    acc = [[0.0, 0.0, 0.0] for _ in positions]
    for i in range(0, len(indices), 3):
        ia, ib, ic = indices[i], indices[i + 1], indices[i + 2]
        a, b, c = positions[ia], positions[ib], positions[ic]
        fn = _face_normal(a, b, c)
        area = _vlen(fn)
        if area < 1e-14:
            continue
        fnu = (fn[0] / area, fn[1] / area, fn[2] / area)
        ab = (b[0] - a[0], b[1] - a[1], b[2] - a[2])
        ac = (c[0] - a[0], c[1] - a[1], c[2] - a[2])
        ba = (a[0] - b[0], a[1] - b[1], a[2] - b[2])
        bc = (c[0] - b[0], c[1] - b[1], c[2] - b[2])
        ca = (a[0] - c[0], a[1] - c[1], a[2] - c[2])
        cb = (b[0] - c[0], b[1] - c[1], b[2] - c[2])
        weights = (_angle(ab, ac) * area, _angle(ba, bc) * area, _angle(ca, cb) * area)
        for idx, w in zip((ia, ib, ic), weights):
            acc[idx][0] += fnu[0] * w
            acc[idx][1] += fnu[1] * w
            acc[idx][2] += fnu[2] * w
    out = []
    for n in acc:
        L = _vlen(n)
        out.append((0.0, 1.0, 0.0) if L < 1e-12 else (n[0] / L, n[1] / L, n[2] / L))
    return out


def gltf_rewrite_normals(src: Path, dest: Path) -> dict:
    raw = src.read_bytes()
    if raw[:4] == b"glTF":
        doc, blob = parse_glb(raw)
    else:
        doc = json.loads(raw.decode("utf-8"))
        blob = b""
        if doc.get("buffers") and doc["buffers"][0].get("uri"):
            uri = doc["buffers"][0]["uri"]
            if not uri.startswith("data:"):
                blob = (src.parent / uri).read_bytes()

    report = {"primitives": 0, "rewritten": 0}
    new_blob = bytearray(blob)
    accessors = doc.setdefault("accessors", [])
    views = doc.setdefault("bufferViews", [])

    for mesh in doc.get("meshes", []):
        for prim in mesh.get("primitives", []):
            report["primitives"] += 1
            attrs = prim.get("attributes", {})
            if "POSITION" not in attrs:
                continue
            pos = [p[:3] for p in _read_accessor(doc, blob, attrs["POSITION"])]
            if prim.get("indices") is not None:
                indices = [int(t[0]) for t in _read_accessor(doc, blob, prim["indices"])]
            else:
                indices = list(range(len(pos)))
            if len(indices) < 3 or len(indices) % 3:
                continue
            normals = weighted_normals(pos, indices)
            packed = b"".join(struct.pack("<fff", *n) for n in normals)
            off = _align4(len(new_blob))
            new_blob.extend(b"\x00" * (off - len(new_blob)))
            view_i = len(views)
            views.append({"buffer": 0, "byteOffset": off, "byteLength": len(packed), "target": 34962})
            new_blob.extend(packed)
            acc_i = len(accessors)
            accessors.append(
                {
                    "bufferView": view_i,
                    "componentType": 5126,
                    "count": len(normals),
                    "type": "VEC3",
                    "min": [-1, -1, -1],
                    "max": [1, 1, 1],
                }
            )
            attrs["NORMAL"] = acc_i
            report["rewritten"] += 1

    if doc.get("buffers"):
        doc["buffers"][0]["byteLength"] = len(new_blob)
        if "uri" in doc["buffers"][0] and not src.suffix.lower() == ".glb":
            bin_name = dest.with_suffix(".bin").name
            dest.with_suffix(".bin").write_bytes(bytes(new_blob))
            doc["buffers"][0]["uri"] = bin_name
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.suffix.lower() == ".gltf":
        dest.write_text(json.dumps(doc, indent=2), encoding="utf-8")
    else:
        dest.write_bytes(pack_glb(doc, bytes(new_blob)))
    return report


def process_file(src: Path, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    max_tris = budget_for(src)
    if _running_in_blender():
        blender_audit(src, dest, max_tris)
        return
    if src.suffix.lower() in {".glb", ".gltf"}:
        gltf_rewrite_normals(src, dest.with_suffix(".glb"))
        return
    print(f"  skip {src.name} (need Blender for {src.suffix})", file=sys.stderr)


def _make_test_glb(path: Path) -> None:
    """Minimal two-tri fold so we can assert rewritten normals."""
    # Positions: a crease between two triangles (should not stay (0,0,1) on all verts).
    pos = [(-1, 0, 0), (0, 0, 0), (0, 1, 0), (1, 0, 1)]
    idx = [0, 1, 2, 1, 3, 2]
    pos_b = b"".join(struct.pack("<fff", *p) for p in pos)
    idx_b = b"".join(struct.pack("<H", i) for i in idx)
    blob = pos_b + idx_b
    doc = {
        "asset": {"version": "2.0"},
        "meshes": [
            {
                "primitives": [
                    {"attributes": {"POSITION": 0}, "indices": 1, "mode": 4},
                ]
            }
        ],
        "accessors": [
            {
                "bufferView": 0,
                "componentType": 5126,
                "count": 4,
                "type": "VEC3",
                "min": [-1, 0, 0],
                "max": [1, 1, 1],
            },
            {"bufferView": 1, "componentType": 5123, "count": 6, "type": "SCALAR"},
        ],
        "bufferViews": [
            {"buffer": 0, "byteOffset": 0, "byteLength": len(pos_b), "target": 34962},
            {"buffer": 0, "byteOffset": len(pos_b), "byteLength": len(idx_b), "target": 34963},
        ],
        "buffers": [{"byteLength": len(blob)}],
    }
    path.write_bytes(pack_glb(doc, blob))


def self_test(output: Path) -> None:
    scratch = output / "_selftest"
    scratch.mkdir(parents=True, exist_ok=True)
    src = scratch / "crease.glb"
    dest = scratch / "crease.revamped.glb"
    _make_test_glb(src)
    report = gltf_rewrite_normals(src, dest)
    if report["rewritten"] < 1:
        raise SystemExit("self-test: no primitives rewritten")
    doc, blob = parse_glb(dest.read_bytes())
    prim = doc["meshes"][0]["primitives"][0]
    if "NORMAL" not in prim["attributes"]:
        raise SystemExit("self-test: NORMAL accessor missing")
    norms = _read_accessor(doc, blob, prim["attributes"]["NORMAL"])
    if len(norms) != 4:
        raise SystemExit(f"self-test: expected 4 normals, got {len(norms)}")
    # Crease vertex (index 1) should not be a perfect +Z after weighting.
    n1 = norms[1]
    if abs(n1[2] - 1.0) < 1e-6 and abs(n1[0]) < 1e-6:
        raise SystemExit(f"self-test: crease normal stayed +Z {n1}")
    print(f"harbor-revamp-meshes self-test: ok  wrote {dest}  n1={tuple(round(x, 3) for x in n1)}")


def iter_meshes(roots: list[Path]) -> list[Path]:
    found: list[Path] = []
    for root in roots:
        if not root.exists():
            continue
        if root.is_file() and root.suffix.lower() in MESH_SUFFIXES:
            found.append(root)
            continue
        for p in root.rglob("*"):
            if not p.is_file() or p.suffix.lower() not in MESH_SUFFIXES:
                continue
            if any(part in SKIP_DIR_NAMES for part in p.parts):
                continue
            found.append(p)
    return sorted(set(found))


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    p = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    p.add_argument("--input", action="append", type=Path)
    p.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    p.add_argument("--self-test", action="store_true")
    p.add_argument("--dry-run", action="store_true")
    return p.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    # Blender appends its own flags before `--`.
    if argv is None and "--" in sys.argv:
        argv = sys.argv[sys.argv.index("--") + 1 :]
    args = parse_args(argv)
    output: Path = args.output if args.output.is_absolute() else REPO / args.output
    if args.self_test:
        self_test(output)
        return 0
    roots = [p if p.is_absolute() else REPO / p for p in (args.input or DEFAULT_INPUTS)]
    files = iter_meshes(roots)
    if not files:
        print("harbor-revamp-meshes: no GLB/OBJ/FBX found")
        return 0
    print(f"harbor-revamp-meshes: {len(files)} file(s)  blender={_running_in_blender()}  → {output}")
    for src in files:
        dest = output / src.name
        if args.dry_run:
            print("  would write", dest)
            continue
        process_file(src, dest)
        print("  wrote", dest.with_suffix(".glb"))
    return 0


if __name__ == "__main__":
    sys.exit(main())
