import { PolicyPage } from "@/components/shared/PolicyPage";

export default function RefundPolicyPage() {
  return <PolicyPage eyebrow="Thanh toán" title="Chính sách hủy và hoàn tiền" description="Quy định áp dụng cho đơn hàng ở chợ sách và các gói hội viên trong bản demo." sections={[
    { title: "Gói hội viên", content: <p>Hủy gia hạn không làm mất quyền của kỳ đã xác nhận; quyền đọc tiếp tục đến ngày kết thúc. Bản demo chưa thực hiện chuyển tiền thật nên trạng thái hoàn tiền chỉ dùng để mô phỏng nghiệp vụ.</p> },
    { title: "Đơn hàng vật lý", content: <p>Đơn chưa được người bán xử lý có thể gửi yêu cầu hủy. Khi đơn đã vận chuyển, việc hoàn trả cần được hai bên xác nhận theo tình trạng thực tế của sách.</p> },
    { title: "sách điện tử", content: <p>Do nội dung số được cấp quyền ngay sau thanh toán, yêu cầu hoàn tiền phải được xem xét dựa trên lỗi truy cập, nội dung không đúng mô tả hoặc giao dịch trùng.</p> },
    { title: "Giao dịch trùng", content: <p>Hệ thống dùng mã yêu cầu duy nhất để hạn chế tạo hai lần. Nếu vẫn phát sinh bản ghi trùng, quản trị viên phải kiểm tra audit log trước khi điều chỉnh.</p> },
  ]} />;
}
