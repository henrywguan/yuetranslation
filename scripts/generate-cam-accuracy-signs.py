#!/usr/bin/env python3
"""Render Cam accuracy sign PNGs + a minimal DOCX. Args: signs_dir docs_dir"""
from __future__ import annotations

import math
import sys
import zipfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance

SIGNS = Path(sys.argv[1] if len(sys.argv) > 1 else "fixtures/cam-accuracy/signs")
DOCS = Path(sys.argv[2] if len(sys.argv) > 2 else "fixtures/cam-accuracy/documents")
SIGNS.mkdir(parents=True, exist_ok=True)
DOCS.mkdir(parents=True, exist_ok=True)

CJK_CANDIDATES = [
    Path("/home/ubuntu/.local/share/fonts/NotoSansHK-Bold.ttf"),
    Path("/usr/share/fonts/truetype/droid/DroidSansFallbackFull.ttf"),
    Path("/usr/share/fonts/truetype/wqy/wqy-microhei.ttc"),
]
LATIN_CANDIDATES = [
    Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"),
    Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"),
]


def load_font(paths: list[Path], size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for p in paths:
        if p.exists():
            try:
                return ImageFont.truetype(str(p), size=size)
            except OSError:
                continue
    return ImageFont.load_default()


def cjk(size: int) -> ImageFont.ImageFont:
    return load_font(CJK_CANDIDATES, size)


def latin(size: int) -> ImageFont.ImageFont:
    return load_font(LATIN_CANDIDATES, size)


def save(img: Image.Image, name: str) -> None:
    path = SIGNS / name
    img.convert("RGB").save(path, "PNG", optimize=True)
    print("wrote", path)


def rounded_rect(draw: ImageDraw.ImageDraw, xy, fill, radius=24, outline=None, width=3):
    draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=width)


def sign_mtr_exit():
    img = Image.new("RGB", (900, 500), (18, 92, 62))
    d = ImageDraw.Draw(img)
    d.text((60, 80), "出口", font=cjk(96), fill=(255, 255, 255))
    d.text((60, 220), "EXIT", font=latin(42), fill=(210, 240, 220))
    rounded_rect(d, (520, 120, 820, 320), fill=(255, 255, 255), radius=16)
    d.text((560, 150), "A2", font=latin(72), fill=(18, 92, 62))
    d.text((560, 250), "中環", font=cjk(40), fill=(18, 92, 62))
    save(img, "01-mtr-exit-zh.png")


def sign_no_entry():
    img = Image.new("RGB", (720, 720), (245, 245, 245))
    d = ImageDraw.Draw(img)
    d.ellipse((120, 80, 600, 560), outline=(200, 32, 32), width=28)
    d.line((180, 180, 540, 460), fill=(200, 32, 32), width=28)
    d.text((160, 580), "不准進入", font=cjk(48), fill=(30, 30, 30))
    d.text((190, 650), "職員專用", font=cjk(32), fill=(90, 90, 90))
    save(img, "02-no-entry-zh.png")


def sign_wet_floor():
    img = Image.new("RGB", (640, 800), (250, 190, 20))
    d = ImageDraw.Draw(img)
    # cone-ish triangle
    d.polygon([(320, 80), (80, 520), (560, 520)], fill=(240, 160, 10), outline=(40, 40, 40))
    d.text((150, 560), "CAUTION", font=latin(48), fill=(20, 20, 20))
    d.text((160, 640), "WET FLOOR", font=latin(40), fill=(20, 20, 20))
    save(img, "03-wet-floor-en.png")


def sign_restaurant_board():
    img = Image.new("RGB", (800, 1000), (28, 28, 30))
    d = ImageDraw.Draw(img)
    d.text((80, 60), "今日特餐", font=cjk(56), fill=(250, 210, 90))
    d.line((80, 140, 720, 140), fill=(90, 90, 90), width=2)
    rows = [("乾炒牛河", "$48"), ("凍檸茶", "$22"), ("菠蘿油", "$18"), ("西多士", "$28")]
    y = 180
    for name, price in rows:
        d.text((80, y), name, font=cjk(40), fill=(240, 240, 240))
        d.text((560, y), price, font=latin(36), fill=(250, 210, 90))
        y += 90
    d.text((80, 880), "現金優惠 · 歡迎光臨", font=cjk(28), fill=(180, 180, 180))
    save(img, "04-restaurant-board-zh.png")


def sign_opening_hours():
    img = Image.new("RGB", (760, 520), (250, 250, 252))
    d = ImageDraw.Draw(img)
    rounded_rect(d, (40, 40, 720, 480), fill=(255, 255, 255), outline=(40, 40, 40), width=4, radius=8)
    d.text((80, 80), "營業時間", font=cjk(48), fill=(20, 20, 20))
    d.text((80, 180), "每日 10:00–22:00", font=cjk(36), fill=(30, 30, 30))
    d.text((80, 260), "逢星期三休息", font=cjk(32), fill=(160, 40, 40))
    d.text((80, 360), "OPEN DAILY · CLOSED WED", font=latin(22), fill=(100, 100, 100))
    save(img, "05-opening-hours-zh.png")


def sign_pharmacy():
    img = Image.new("RGB", (900, 480), (245, 250, 255))
    d = ImageDraw.Draw(img)
    d.rectangle((0, 0, 900, 90), fill=(0, 110, 90))
    d.text((40, 22), "PHARMACY", font=latin(40), fill=(255, 255, 255))
    d.text((60, 140), "PRESCRIPTION PICKUP", font=latin(36), fill=(10, 40, 50))
    d.text((60, 220), "Please take a number", font=latin(30), fill=(40, 40, 40))
    d.text((60, 300), "Queue here →", font=latin(30), fill=(0, 110, 90))
    save(img, "06-pharmacy-en.png")


def sign_street_bilingual():
    img = Image.new("RGB", (1000, 360), (230, 232, 235))
    d = ImageDraw.Draw(img)
    rounded_rect(d, (40, 50, 960, 310), fill=(40, 90, 70), radius=12)
    d.text((80, 90), "德輔道中", font=cjk(64), fill=(255, 255, 255))
    d.text((80, 200), "DES VOEUX ROAD CENTRAL", font=latin(28), fill=(220, 235, 225))
    save(img, "07-street-bilingual.png")


def sign_construction():
    img = Image.new("RGB", (860, 540), (255, 140, 0))
    d = ImageDraw.Draw(img)
    d.rectangle((30, 30, 830, 510), outline=(20, 20, 20), width=8)
    d.text((80, 80), "前方施工", font=cjk(64), fill=(20, 20, 20))
    d.text((80, 200), "請改道", font=cjk(48), fill=(20, 20, 20))
    d.text((80, 320), "小心車輛", font=cjk(40), fill=(20, 20, 20))
    d.text((80, 420), "ROADWORK AHEAD", font=latin(24), fill=(60, 40, 10))
    save(img, "08-construction-zh.png")


def sign_hotel():
    img = Image.new("RGB", (880, 560), (18, 28, 38))
    d = ImageDraw.Draw(img)
    d.text((60, 50), "LOBBY", font=latin(28), fill=(120, 160, 150))
    for i, label in enumerate(["Check-in", "Concierge", "Luggage storage"]):
        y = 140 + i * 110
        rounded_rect(d, (60, y, 820, y + 80), fill=(30, 45, 58), radius=10, outline=(61, 207, 182), width=2)
        d.text((90, y + 18), label, font=latin(36), fill=(232, 244, 255))
    save(img, "09-hotel-lobby-en.png")


def sign_dim_sum():
    img = Image.new("RGB", (700, 980), (255, 252, 245))
    d = ImageDraw.Draw(img)
    d.text((40, 30), "點心紙", font=cjk(44), fill=(120, 30, 30))
    items = ["蝦餃", "燒賣", "叉燒包", "腸粉", "流沙包", "鳳爪", "排骨", "叉燒酥"]
    y = 110
    for name in items:
        d.rectangle((40, y, 100, y + 50), outline=(80, 80, 80), width=2)
        d.text((130, y + 4), name, font=cjk(36), fill=(20, 20, 20))
        y += 90
    save(img, "10-dim-sum-menu-zh.png")


def sign_angled_no_smoking():
    base = Image.new("RGB", (700, 500), (250, 250, 250))
    d = ImageDraw.Draw(base)
    rounded_rect(d, (80, 60, 620, 420), fill=(255, 255, 255), outline=(180, 30, 30), width=6, radius=8)
    d.text((160, 140), "嚴禁吸煙", font=cjk(56), fill=(180, 30, 30))
    d.text((200, 260), "違者罰款", font=cjk(36), fill=(40, 40, 40))
    # perspective-ish warp via transform
    w, h = base.size
    coeffs = find_coeffs(
        [(0, 40), (w, 0), (w, h - 30), (40, h)],
        [(0, 0), (w, 0), (w, h), (0, h)],
    )
    warped = base.transform((w, h), Image.PERSPECTIVE, coeffs, Image.BICUBIC, fillcolor=(40, 40, 45))
    save(warped, "11-angled-no-smoking-zh.png")


def find_coeffs(source_coords, target_coords):
    """Map target→source for PIL PERSPECTIVE."""
    matrix = []
    for s, t in zip(source_coords, target_coords):
        matrix.append([t[0], t[1], 1, 0, 0, 0, -s[0] * t[0], -s[0] * t[1]])
        matrix.append([0, 0, 0, t[0], t[1], 1, -s[1] * t[0], -s[1] * t[1]])
    A = matrix
    B = [c for pair in source_coords for c in pair]
    # Gaussian elimination for 8x8
    n = 8
    M = [A[i] + [B[i]] for i in range(n)]
    for i in range(n):
        pivot = max(range(i, n), key=lambda r: abs(M[r][i]))
        M[i], M[pivot] = M[pivot], M[i]
        div = M[i][i] or 1e-12
        M[i] = [v / div for v in M[i]]
        for j in range(n):
            if i == j:
                continue
            factor = M[j][i]
            M[j] = [a - factor * b for a, b in zip(M[j], M[i])]
    return [M[i][8] for i in range(n)]


def sign_low_contrast():
    img = Image.new("RGB", (640, 320), (210, 212, 208))
    d = ImageDraw.Draw(img)
    d.text((80, 70), "Push", font=latin(64), fill=(185, 188, 182))
    d.text((360, 70), "Pull", font=latin(64), fill=(185, 188, 182))
    img = ImageEnhance.Contrast(img).enhance(0.85)
    img = img.filter(ImageFilter.GaussianBlur(radius=0.6))
    save(img, "12-low-contrast-en.png")


def write_docx():
    """Minimal Word OOXML with a few paragraphs."""
    title = "Invoice"
    paras = [
        "Invoice #JT-1042",
        "Bill to: Harbor Language Lab",
        "Description: Translation services (EN ↔ 粵)",
        "Amount: HK$ 1,280.00",
        "Total due upon receipt. Thank you.",
    ]
    document_xml = [
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">',
        "<w:body>",
    ]
    document_xml.append(
        f"<w:p><w:r><w:rPr><w:b/></w:rPr><w:t>{title}</w:t></w:r></w:p>"
    )
    for p in paras:
        document_xml.append(f"<w:p><w:r><w:t>{_xml_escape(p)}</w:t></w:r></w:p>")
    document_xml.append("<w:sectPr/></w:body></w:document>")
    content_types = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>
"""
    rels = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>
"""
    out = DOCS / "08-en-invoice.docx"
    with zipfile.ZipFile(out, "w", compression=zipfile.ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml", content_types)
        z.writestr("_rels/.rels", rels)
        z.writestr("word/document.xml", "\n".join(document_xml))
    print("wrote", out)


def _xml_escape(s: str) -> str:
    return (
        s.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def main():
    sign_mtr_exit()
    sign_no_entry()
    sign_wet_floor()
    sign_restaurant_board()
    sign_opening_hours()
    sign_pharmacy()
    sign_street_bilingual()
    sign_construction()
    sign_hotel()
    sign_dim_sum()
    sign_angled_no_smoking()
    sign_low_contrast()
    write_docx()


if __name__ == "__main__":
    main()
