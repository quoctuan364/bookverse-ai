"""Thêm lời thuyết minh tiếng Việt vào video thao tác thật BookVerse AI."""

from __future__ import annotations

import asyncio
import subprocess
import sys
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = PROJECT_ROOT / "outputs" / "demo-walkthrough"
TOOLS_DIR = PROJECT_ROOT / "outputs" / "demo-tools"
RAW_VIDEO = OUTPUT_DIR / "BookVerse_AI_Demo_ThaoTacThat.webm"
VOICE_FILE = OUTPUT_DIR / "loi-thuyet-minh.mp3"
FINAL_VIDEO = OUTPUT_DIR / "BookVerse_AI_Demo_Gui_GiangVien.mp4"

sys.path.insert(0, str(TOOLS_DIR))

import edge_tts  # noqa: E402
import imageio_ffmpeg  # noqa: E402


NARRATION = """
Em xin chào thầy cô. Đây là video thao tác trực tiếp trên hệ thống BookVerse AI,
không phải video trình chiếu từ ảnh tĩnh. Đầu tiên, em đăng nhập bằng tài khoản
độc giả demo. Sau khi xác thực thành công, hệ thống chuyển về Dashboard cá nhân.
Dashboard độc giả chỉ hiển thị thời gian đọc, số sách hoàn thành, tiến độ trung
bình và biểu đồ thói quen; các chỉ số doanh thu của người bán đã được tách theo
đúng vai trò.

Trang chủ là điểm bắt đầu của hành trình đọc. Người dùng có thể tìm sách, xem số
liệu đang có trong cơ sở dữ liệu, khám phá các bìa sách thật và truy cập nhanh vào
những chức năng quan trọng. Tại danh mục, hệ thống hỗ trợ tìm kiếm tiếng Việt
không dấu, lọc dữ liệu và sắp xếp kết quả. Khi chọn một cuốn sách, trang chi tiết
hiển thị bìa, tác giả, đánh giá, giá, quyền đọc thử và tình trạng tin bán. Nội dung
Ebook trong đồ án là nội dung minh họa được BookVerse cấp quyền, dùng để chứng
minh đầy đủ chức năng trình đọc.

Trình đọc hỗ trợ mục lục, chuyển trang, lưu tiến độ, bookmark, highlight, ghi chú,
tùy chỉnh kiểu chữ và trợ lý theo ngữ cảnh. Tiếp theo là trợ lý BookVerse. Người
dùng đặt câu hỏi bằng ngôn ngữ tự nhiên; hệ thống hiểu ý định, truy xuất dữ liệu đã
kiểm chứng và trả lời có căn cứ. Khi không cấu hình mô hình bên ngoài, giao diện
nói rõ đang dùng tri thức nội bộ, không giả lập kết quả.

Chợ sách cho phép tìm tin bán, xem tình trạng, giá và thông tin người bán. Bộ lọc
trên điện thoại được thu gọn để sản phẩm xuất hiện sớm hơn. Khu vực cộng đồng hỗ
trợ bài viết và trao đổi trải nghiệm đọc. Trang hội viên trình bày rõ quyền truy cập
nội dung BookVerse. Hồ sơ, mục tiêu và lịch đọc giúp người dùng quản lý tài khoản
cũng như duy trì thói quen. Giỏ hàng phục vụ luồng thanh toán demo; khi trống,
giao diện không hiển thị khối tổng kết đơn hàng thừa.

Sau luồng độc giả, em đăng xuất và đăng nhập bằng tài khoản người bán. Kênh người
bán gồm tổng quan gian hàng, quản lý tin đăng, quản lý đơn và theo dõi doanh thu.
Những số liệu này chỉ xuất hiện với người bán hoặc tài khoản quản lý, không còn
lẫn vào Dashboard độc giả.

Cuối cùng, em đăng nhập bằng tài khoản quản trị viên. Admin Center cung cấp tổng
quan vận hành, biểu đồ analytics, quản lý đăng ký hội viên, kiểm tra chất lượng dữ
liệu và trạng thái tích hợp. Trang tích hợp chỉ hiển thị tên biến cấu hình và trạng
thái sẵn sàng, tuyệt đối không hiển thị giá trị khóa bí mật.

BookVerse AI hiện kết nối các luồng khám phá sách, đọc Ebook, trợ lý dữ liệu, cộng
đồng, giao dịch sách, người bán và quản trị trong cùng một hệ thống responsive có
phân quyền. Em cảm ơn thầy cô đã theo dõi video demo.
""".strip()


async def create_voice() -> None:
    communicator = edge_tts.Communicate(
        NARRATION,
        voice="vi-VN-NamMinhNeural",
        rate="+0%",
    )
    await communicator.save(str(VOICE_FILE))


def mux_video() -> None:
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    subprocess.run(
        [
            ffmpeg,
            "-y",
            "-loglevel",
            "error",
            "-i",
            str(RAW_VIDEO),
            "-i",
            str(VOICE_FILE),
            "-map",
            "0:v:0",
            "-map",
            "1:a:0",
            "-c:v",
            "libx264",
            "-preset",
            "medium",
            "-crf",
            "20",
            "-c:a",
            "aac",
            "-b:a",
            "160k",
            "-af",
            "apad",
            "-shortest",
            "-pix_fmt",
            "yuv420p",
            "-movflags",
            "+faststart",
            str(FINAL_VIDEO),
        ],
        check=True,
    )


async def main() -> None:
    if not RAW_VIDEO.exists():
        raise FileNotFoundError(f"Chưa có video thao tác thật: {RAW_VIDEO}")
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    await create_voice()
    mux_video()
    print(FINAL_VIDEO)


if __name__ == "__main__":
    asyncio.run(main())
