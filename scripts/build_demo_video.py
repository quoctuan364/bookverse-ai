"""Dựng video demo BookVerse AI từ ảnh chụp giao diện thật và lời đọc tiếng Việt.

Script chỉ tạo tệp mới trong outputs/demo-video, không sửa dữ liệu của hệ thống.
"""

from __future__ import annotations

import asyncio
import os
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFont


PROJECT_ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = PROJECT_ROOT / "outputs" / "demo-video"
TOOLS_DIR = PROJECT_ROOT / "outputs" / "demo-tools"
WIDTH, HEIGHT = 1600, 900

sys.path.insert(0, str(TOOLS_DIR))

import edge_tts  # noqa: E402
import imageio_ffmpeg  # noqa: E402


SCENES = [
    {
        "image": "01-trang-chu.png",
        "title": "BOOKVERSE AI",
        "caption": "Nền tảng đọc, khám phá và trao đổi sách",
        "voice": "Em xin chào thầy cô. Đây là BookVerse AI, đồ án xây dựng nền tảng đọc, khám phá và trao đổi sách trong cùng một hệ thống. Video trình bày nhanh luồng sử dụng chính ở góc nhìn độc giả.",
        "intro": True,
    },
    {
        "image": "01-trang-chu.png",
        "title": "1. TRANG CHỦ",
        "caption": "Tìm sách, tiếp tục đọc và khám phá bằng ngôn ngữ tự nhiên",
        "voice": "Trang chủ tập trung vào hành động tìm cuốn sách tiếp theo. Người dùng có thể tìm theo từ khóa, mô tả nhu cầu bằng ngôn ngữ tự nhiên, tiếp tục sách đang đọc hoặc đi thẳng tới kho Ebook. Các bìa công khai đều lấy từ danh mục sách thật đã được xác minh.",
    },
    {
        "image": "02-catalog-bo-loc.png",
        "title": "2. DANH MỤC VÀ BỘ LỌC",
        "caption": "Lọc theo giá, thể loại, ngôn ngữ, đánh giá và tồn kho",
        "voice": "Danh mục hỗ trợ tìm theo tên sách, tác giả, ISBN hoặc nhà xuất bản. Người dùng có thể kết hợp thể loại, khoảng giá, ngôn ngữ, năm xuất bản, mức đánh giá, tình trạng còn hàng và cách sắp xếp. Ví dụ đang lọc các sách từ bốn sao và còn hàng.",
    },
    {
        "image": "03-chi-tiet-sach.png",
        "title": "3. CHI TIẾT SÁCH",
        "caption": "Thông tin đủ để đọc thử, mua hoặc lưu sách",
        "voice": "Trang chi tiết cung cấp bìa, tác giả, giá, mô tả và thông tin hỗ trợ quyết định. Hệ thống cho biết nội dung có thể đọc thử hay đọc toàn bộ, tình trạng tin bán và cách theo dõi đơn hàng. Người dùng có thể lưu yêu thích, thêm giỏ hoặc mở trình đọc.",
    },
    {
        "image": "04-thu-vien-doc.png",
        "title": "4. THƯ VIỆN CÁ NHÂN",
        "caption": "Quản lý quyền đọc và tiếp tục đúng vị trí đã dừng",
        "voice": "Khu vực đọc sách tổng hợp các đầu sách người dùng được cấp quyền truy cập, tiến độ đang đọc và vị trí gần nhất. Nhờ đó người dùng có thể tiếp tục đúng nội dung đã dừng mà không phải tìm lại thủ công.",
    },
    {
        "image": "05-trinh-doc.png",
        "title": "5. TRÌNH ĐỌC EBOOK",
        "caption": "Mục lục, bookmark, highlight, tùy chỉnh đọc và AI theo ngữ cảnh",
        "voice": "Trình đọc hỗ trợ mục lục, chuyển trang, bookmark, highlight, ghi chú, tìm trong sách, đổi phông và cỡ chữ, chế độ màu, tự cuộn và đọc thành tiếng. Bên cạnh nội dung là trợ lý AI theo ngữ cảnh để hỗ trợ đặt câu hỏi trong quá trình đọc.",
    },
    {
        "image": "06-tro-ly-ai.png",
        "title": "6. TRỢ LÝ AI",
        "caption": "Hiểu ý định, truy xuất dữ liệu và trả lời có căn cứ",
        "voice": "Trợ lý AI tiếp nhận câu hỏi tự nhiên, xác định ý định rồi truy xuất dữ liệu nội bộ phù hợp trước khi trả lời. Với yêu cầu tìm sách, hệ thống sử dụng danh mục và cơ chế gợi ý có giải thích. Nếu dịch vụ bên ngoài không sẵn sàng, giao diện hiển thị rõ trạng thái dự phòng thay vì giả lập kết quả.",
    },
    {
        "image": "07-cho-sach-cu.png",
        "title": "7. CHỢ SÁCH CŨ",
        "caption": "Tin bán, tình trạng sách, người bán và giỏ hàng",
        "voice": "Chợ sách cũ giúp sách có thêm một vòng đời. Người dùng có thể tìm tin bán, xem tình trạng sách, người bán, giá và thêm sản phẩm vào giỏ. Luồng người bán còn có quản lý tin đăng, đơn hàng và doanh thu.",
    },
    {
        "image": "08-dashboard.png",
        "title": "8. DASHBOARD CÁ NHÂN",
        "caption": "Theo dõi thời gian, tiến độ và thói quen đọc",
        "voice": "Dashboard tổng hợp số phút đọc, tiến độ trung bình, số phiên, số trang và biểu đồ thói quen theo thời gian. Đây là dữ liệu cá nhân của tài khoản đang đăng nhập, đồng thời tạo tín hiệu cho chức năng gợi ý sách.",
    },
    {
        "image": "01-trang-chu.png",
        "title": "BOOKVERSE AI",
        "caption": "Khám phá sách · Đọc Ebook · Giao dịch · Trợ lý AI",
        "voice": "Tóm lại, BookVerse AI kết nối bốn luồng chính: khám phá sách, đọc Ebook, giao dịch sách và hỗ trợ bằng AI. Hệ thống được thiết kế responsive, có phân quyền, kiểm tra accessibility và công khai rõ dữ liệu demo cũng như trạng thái tích hợp. Em cảm ơn thầy cô đã theo dõi.",
        "outro": True,
    },
]


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    name = "segoeuib.ttf" if bold else "segoeui.ttf"
    path = Path(os.environ.get("WINDIR", "C:/Windows")) / "Fonts" / name
    return ImageFont.truetype(str(path), size=size)


def fit_text(draw: ImageDraw.ImageDraw, text: str, max_width: int, size: int) -> list[str]:
    words = text.split()
    lines: list[str] = []
    current = ""
    text_font = font(size)
    for word in words:
        candidate = f"{current} {word}".strip()
        if draw.textbbox((0, 0), candidate, font=text_font)[2] <= max_width:
            current = candidate
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def make_slide(scene: dict[str, object], index: int) -> Path:
    source = Image.open(OUTPUT_DIR / str(scene["image"])).convert("RGB")
    source = source.resize((WIDTH, HEIGHT), Image.Resampling.LANCZOS)
    canvas = source.copy()
    draw = ImageDraw.Draw(canvas, "RGBA")

    if scene.get("intro") or scene.get("outro"):
        canvas = ImageEnhance.Brightness(canvas).enhance(0.35)
        draw = ImageDraw.Draw(canvas, "RGBA")
        draw.rounded_rectangle((170, 240, 1430, 660), radius=36, fill=(5, 61, 55, 225), outline=(255, 214, 92, 180), width=2)
        draw.text((800, 350), str(scene["title"]), font=font(72, True), fill=(255, 255, 255), anchor="mm")
        draw.text((800, 475), str(scene["caption"]), font=font(34), fill=(255, 219, 103), anchor="mm")
        draw.text((800, 570), "ĐỒ ÁN TỐT NGHIỆP · LƯƠNG NGUYỄN QUỐC TUẤN", font=font(23, True), fill=(226, 242, 238), anchor="mm")
    else:
        draw.rounded_rectangle((42, 42, 650, 155), radius=22, fill=(5, 61, 55, 230), outline=(255, 214, 92, 190), width=2)
        draw.text((75, 67), str(scene["title"]), font=font(32, True), fill=(255, 255, 255))
        draw.rectangle((0, 735, WIDTH, HEIGHT), fill=(4, 35, 33, 225))
        draw.rectangle((0, 735, 14, HEIGHT), fill=(240, 185, 48, 255))
        lines = fit_text(draw, str(scene["caption"]), WIDTH - 150, 32)
        for line_index, line in enumerate(lines[:2]):
            draw.text((70, 770 + line_index * 44), line, font=font(32, True), fill=(255, 255, 255))
        draw.text((1470, 842), "BOOKVERSE AI", font=font(20, True), fill=(171, 220, 210), anchor="ra")

    slide_path = OUTPUT_DIR / f"slide-{index:02d}.png"
    canvas.save(slide_path, quality=95)
    return slide_path


async def create_voice(text: str, output: Path) -> None:
    communicate = edge_tts.Communicate(text, voice="vi-VN-HoaiMyNeural", rate="-3%")
    await communicate.save(str(output))


def run(command: list[str]) -> None:
    subprocess.run(command, check=True)


async def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    clips: list[Path] = []

    for index, scene in enumerate(SCENES, start=1):
        slide = make_slide(scene, index)
        audio = OUTPUT_DIR / f"voice-{index:02d}.mp3"
        clip = OUTPUT_DIR / f"clip-{index:02d}.mp4"
        await create_voice(str(scene["voice"]), audio)
        run([
            ffmpeg, "-y", "-loglevel", "error",
            "-loop", "1", "-framerate", "30", "-i", str(slide),
            "-i", str(audio),
            # Chỉ fade-in vì độ dài mỗi lời đọc khác nhau. Fade-out cố định có thể
            # làm màn hình tối trước khi lời dẫn của cảnh kết thúc.
            "-vf", "fade=t=in:st=0:d=0.35,format=yuv420p",
            "-af", "apad=pad_dur=0.7,afade=t=in:st=0:d=0.25",
            "-c:v", "libx264", "-preset", "medium", "-crf", "20",
            "-c:a", "aac", "-b:a", "160k", "-shortest", str(clip),
        ])
        clips.append(clip)

    concat_file = OUTPUT_DIR / "clips.txt"
    concat_file.write_text("".join(f"file '{clip.as_posix()}'\n" for clip in clips), encoding="utf-8")
    final_video = OUTPUT_DIR / "BookVerse_AI_Demo_GiangVien.mp4"
    run([
        ffmpeg, "-y", "-loglevel", "error", "-f", "concat", "-safe", "0",
        "-i", str(concat_file), "-c", "copy", "-movflags", "+faststart", str(final_video),
    ])
    print(final_video)


if __name__ == "__main__":
    asyncio.run(main())
