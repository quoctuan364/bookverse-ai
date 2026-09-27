import { PolicyPage } from "@/components/shared/PolicyPage";

export default function CopyrightPage() {
  return <PolicyPage eyebrow="Nội dung số" title="Bản quyền và nguồn dữ liệu" description="Cam kết về sách điện tử, ảnh bìa, thông tin mô tả và quy trình xử lý nội dung có dấu hiệu vi phạm." sections={[
    { title: "sách điện tử", content: <p>Chỉ nội dung có nguồn và quyền sử dụng phù hợp mới nên được phát hành toàn văn. Người chưa có quyền chỉ được xem phần đọc thử giới hạn theo chính sách hệ thống.</p> },
    { title: "Ảnh bìa và thông tin mô tả", content: <p>Thông tin mô tả có thể đến từ nguồn mở và phải ghi rõ nguồn. Ảnh bìa cần được kiểm tra nguồn, giấy phép và chất lượng trước khi sử dụng.</p> },
    { title: "Nội dung do người dùng đăng", content: <p>Người đăng phải có quyền chia sẻ nội dung. BookVerse có thể ẩn bài viết, tin bán sách hoặc tài nguyên khi nhận được báo cáo hợp lệ.</p> },
    { title: "Yêu cầu gỡ bỏ", content: <p>Chủ sở hữu quyền có thể gửi mã sách, URL, bằng chứng sở hữu và mô tả vi phạm qua trang trợ giúp. Quản trị viên cần lưu lại quyết định và lịch sử xử lý.</p> },
  ]} />;
}
