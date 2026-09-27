import { PolicyPage } from "@/components/shared/PolicyPage";

export default function TermsPage() {
  return <PolicyPage eyebrow="Quy định sử dụng" title="Điều khoản chung" description="Các nguyên tắc áp dụng khi sử dụng thư viện, cộng đồng, chợ sách và trợ lý Nova của BookVerse." sections={[
    { title: "Tài khoản", content: <p>Người dùng chịu trách nhiệm bảo mật thông tin đăng nhập và cung cấp thông tin phù hợp. Tài khoản có hành vi phá hoại, gian lận hoặc vi phạm quyền người khác có thể bị khóa.</p> },
    { title: "Nội dung số", content: <p>Quyền đọc sách điện tử là quyền truy cập cá nhân, không phải quyền sở hữu hay phát tán. Không được sao chép, tải lại hoặc chia sẻ nội dung trái phép.</p> },
    { title: "Marketplace", content: <p>Người bán chịu trách nhiệm về tính chính xác, tình trạng và quyền bán sản phẩm. Người mua cần kiểm tra thông tin đơn trước khi xác nhận.</p> },
    { title: "Cộng đồng", content: <p>Không đăng nội dung quấy rối, thù ghét, spam, vi phạm pháp luật hoặc xâm phạm bản quyền. Moderator có thể ẩn nội dung vi phạm theo quyền được phân công.</p> },
    { title: "Giới hạn bản demo", content: <p>BookVerse là đồ án tốt nghiệp. Thanh toán thử nghiệm không tạo giao dịch ngân hàng thật; một số sách, mức giá và gợi ý dùng dữ liệu minh họa và được ghi chú rõ.</p> },
  ]} />;
}
