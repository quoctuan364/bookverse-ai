import { PolicyPage } from "@/components/shared/PolicyPage";

export default function PrivacyPage() {
  return <PolicyPage eyebrow="Quyền riêng tư" title="Chính sách bảo mật" description="Giải thích dữ liệu BookVerse thu thập, mục đích sử dụng và quyền kiểm soát của người dùng." sections={[
    { title: "Dữ liệu được lưu", content: <p>Hệ thống lưu thông tin tài khoản, hồ sơ đọc, đánh dấu trang, đoạn tô sáng, đơn hàng, lịch sử hội viên và các tương tác cần thiết để vận hành tính năng. Mật khẩu được băm, không lưu dưới dạng văn bản thuần.</p> },
    { title: "Mục đích sử dụng", content: <p>Dữ liệu được dùng để xác thực, lưu tiến độ đọc, xử lý đơn hàng, cấp quyền sách điện tử, cải thiện gợi ý và bảo vệ hệ thống. Dữ liệu demo phải được phân biệt với dữ liệu người dùng thật.</p> },
    { title: "Gợi ý và trợ lý", content: <p>Câu hỏi gửi cho Nova được xử lý để tạo phản hồi. BookVerse chỉ dùng dữ liệu hoạt động để gợi ý sách khi người dùng đã đồng ý.</p> },
    { title: "Quyền của người dùng", content: <p>Bạn có thể chỉnh sửa hồ sơ, thay đổi mật khẩu và yêu cầu xem, xuất hoặc xóa dữ liệu cá nhân. Một số bản ghi giao dịch có thể cần giữ lại để bảo toàn tính toàn vẹn kiểm toán.</p> },
    { title: "An toàn dữ liệu", content: <p>Quyền truy cập sách điện tử được kiểm tra ở server. Thông tin nhạy cảm phải đặt trong biến môi trường và không được đưa vào mã nguồn hoặc log công khai.</p> },
  ]} />;
}
