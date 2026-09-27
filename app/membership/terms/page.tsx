export default function MembershipTermsPage() {
  return (
    <main className="bv-page">
      <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="text-4xl font-black text-bv-heading">Điều khoản hội viên</h1>
        <div className="bv-card mt-7 space-y-6 rounded-2xl p-7 leading-7 text-bv-text">
          <section><h2 className="font-black text-bv-heading">1. Phạm vi đọc sách</h2><p>Hội viên có thể đọc những sách điện tử thuộc gói trong thời gian gói còn hiệu lực. Một số sách bán riêng có thể không nằm trong gói.</p></section>
          <section><h2 className="font-black text-bv-heading">2. Bản đọc thử</h2><p>Tài khoản không có quyền đầy đủ chỉ được nhận tối đa 10% nội dung từ máy chủ.</p></section>
          <section><h2 className="font-black text-bv-heading">3. Hủy gói và hết hạn</h2><p>Việc hủy gia hạn không làm mất quyền lợi của kỳ đã thanh toán. Quyền hội viên kết thúc vào ngày hết hạn; sách điện tử đã mua riêng vẫn được giữ.</p></section>
          <section><h2 className="font-black text-bv-heading">4. Môi trường đồ án</h2><p>Thanh toán hiện là mô phỏng phục vụ trình diễn học thuật, không thực hiện giao dịch tiền thật.</p></section>
        </div>
      </article>
    </main>
  );
}
