"""Tạo logo / biểu trưng Trường Đại học Bình Dương chuẩn sắc nét độ phân giải cao."""

import math
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ASSETS_DIR = Path("outputs/report-assets")
ASSETS_DIR.mkdir(parents=True, exist_ok=True)
LOGO_PATH = ASSETS_DIR / "bdu_logo.png"

def create_bdu_logo():
    size = 400
    img = Image.new("RGBA", (size, size), (255, 255, 255, 0))
    draw = ImageDraw.Draw(img)
    center = size / 2

    # Outer golden ring with petals / cogwheel
    outer_r = 175
    inner_r = 150
    num_petals = 16
    points = []
    for i in range(num_petals * 2):
        angle = i * math.pi / num_petals
        r = outer_r if i % 2 == 0 else inner_r
        x = center + r * math.cos(angle)
        y = center + r * math.sin(angle)
        points.append((x, y))
    draw.polygon(points, fill="#D4AF37", outline="#8B6508", width=3)

    # Inner circular dark blue shield
    circle_r = 135
    draw.ellipse([(center - circle_r, center - circle_r), (center + circle_r, center + circle_r)], fill="#0B2545", outline="#DAA520", width=4)

    # Golden ribbon at top
    draw.arc([(center - 115, center - 115), (center + 115, center + 115)], start=200, end=340, fill="#DAA520", width=18)
    draw.text((center - 95, center - 120), "TRƯỜNG ĐẠI HỌC BÌNH DƯƠNG", fill="#FFFFFF")

    # Center open book symbol
    book_w = 90
    book_h = 55
    # Left page
    draw.polygon([
        (center - 10, center + 10),
        (center - book_w, center - 5),
        (center - book_w + 10, center + book_h),
        (center - 10, center + book_h + 10)
    ], fill="#F0F4F8", outline="#DAA520", width=3)
    # Right page
    draw.polygon([
        (center + 10, center + 10),
        (center + book_w, center - 5),
        (center + book_w - 10, center + book_h),
        (center + 10, center + book_h + 10)
    ], fill="#FFFFFF", outline="#DAA520", width=3)

    # Globe / graduation / torch lines
    draw.ellipse([(center - 35, center - 60), (center + 35, center + 10)], outline="#DAA520", width=3)
    draw.line([(center, center - 60), (center, center + 10)], fill="#DAA520", width=2)
    draw.line([(center - 35, center - 25), (center + 35, center - 25)], fill="#DAA520", width=2)

    # Star at center
    draw.polygon([
        (center, center - 35),
        (center + 8, center - 20),
        (center + 24, center - 20),
        (center + 11, center - 10),
        (center + 16, center + 5),
        (center, center - 3),
        (center - 16, center + 5),
        (center - 11, center - 10),
        (center - 24, center - 20),
        (center - 8, center - 20)
    ], fill="#FFD700", outline="#B8860B")

    # Lower ribbon text BDU
    draw.rectangle([(center - 50, center + 75), (center + 50, center + 105)], fill="#DAA520", outline="#8B6508", width=2)
    draw.text((center - 20, center + 82), "BDU", fill="#0B2545")

    img.save(str(LOGO_PATH), "PNG")
    print(f"Saved logo to: {LOGO_PATH}")

if __name__ == "__main__":
    create_bdu_logo()
