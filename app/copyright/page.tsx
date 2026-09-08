import { PolicyPage } from "@/components/shared/PolicyPage";

export default function CopyrightPage() {
  return <PolicyPage eyebrow="Nội dung số" title="Bản quyền và nguồn dữ liệu" description="Cam kết về Ebook, ảnh bìa, metadata và quy trình xử lý nội dung có dấu hiệu vi phạm." sections={[
    { title: "Ebook", content: <p>Chỉ nội dung có nguồn và quyền sử dụng phù hợp mới nên được phát hành toàn văn. Người chưa có quyền chỉ được xem phần đọc thử giới hạn theo chính sách hệ thống.</p> },
    { title: "Ảnh bìa và metadata", content: <p>Metadata có thể đến từ nguồn mở và phải lưu provenance. Ảnh bìa cần được kiểm tra nguồn, giấy phép và chất lượng trước khi đánh dấu đã xác minh.</p> },
    { title: "Nội dung do người dùng đăng", content: <p>Người đăng phải có quyền chia sẻ nội dung. BookVerse có thể ẩn bài viết, listing hoặc tài nguyên khi nhận được báo cáo hợp lệ.</p> },
    { title: "Yêu cầu gỡ bỏ", content: <p>Chủ sở hữu quyền có thể gửi mã sách, URL, bằng chứng sở hữu và mô tả vi phạm qua trang trợ giúp. Quản trị viên cần lưu lại quyết định và lịch sử xử lý.</p> },
  ]} />;
}
