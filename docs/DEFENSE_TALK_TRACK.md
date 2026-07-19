# Talk track bảo vệ BookVerse AI

Cập nhật: 16/07/2026. Nội dung này ưu tiên tuyên bố có thể kiểm tra lại, không thay thế demo trực tiếp.

## Mở đầu ngắn

“BookVerse AI là đồ án tích hợp nền tảng sách, marketplace mô phỏng, cộng đồng, reader, recommendation, telemetry và pipeline đánh giá. Điểm chính của đồ án là luồng nghiệp vụ có transaction/stock/idempotency, an toàn dữ liệu test-demo, fallback rõ ràng và khả năng đo lường; em không khẳng định chất lượng AI cao khi metric hiện tại chưa chứng minh.”

## Nên nói

- Cover V2 là `GENERATED_DEMO_ASSET` được tạo riêng cho fallback, có tỷ lệ 2:3 và cùng sách dùng cùng artwork trên các trang.
- BookVerse hiện có **0 bìa thật có giấy phép được duyệt**. Hệ thống đã có manifest để thêm nguồn hợp pháp sau này.
- Dataset 2.200 sách và phần lớn interaction/order là `SYNTHETIC_DATA`/`DEMO_DATA`, phù hợp kiểm thử pipeline nhưng không đại diện người dùng thật.
- Recommendation có temporal split, leakage guard và nhiều baseline; metric hiện thấp, Hybrid production chưa vượt baseline tốt nhất.
- CTR production là `NOT_AVAILABLE`; telemetry test/instrumented demo không được gọi là hành vi người dùng thật.
- Checkout là mô phỏng thanh toán, nhưng transaction, kiểm tra stock, chống oversell, self-purchase và idempotency là logic thật đã có integration test.
- Seller Quality Score là công thức deterministic theo quy tắc, server tính lại; không phải AI và không phải điểm uy tín từ người mua thật.
- Production mock bị khóa; khi provider không có credential, giao diện báo local/degraded fallback.
- Đóng góp chính là tích hợp hệ thống, kiểm soát dữ liệu, telemetry, evaluation pipeline và khả năng tái lập.

## Không nên nói

- “Có 2.200 bìa thật” hoặc “bìa lấy từ nhà xuất bản”.
- “Đã loại toàn bộ mock” mà không nói rõ development/test fixture còn được guard.
- “Recommendation chính xác cao”, “Hybrid vượt baseline” hoặc “CTR đã cải thiện”.
- “Dữ liệu phản ánh người dùng thật” hoặc tự đưa SUS/UAT chưa tổ chức.
- “Marketplace thanh toán thật”.
- “Production-ready hoàn toàn”, “đã deploy G1” hoặc “secret đã rotate”.
- “OpenAI/Gemini đã PASS” khi chưa chạy credential thật.
- “GitHub Actions PASS” khi chưa có workflow run thành công trên CI runner.

## Cách demo bìa

1. Mở Home, Catalog, Detail, Marketplace và Community.
2. Chỉ rõ nhãn `BookVerse Demo` trên fallback.
3. Giải thích null/path lỗi/404/timeout về fallback và reducer không retry vô hạn.
4. Mở cùng một book ở hai trang để chứng minh artwork/layout deterministic.
5. Nói rõ ảnh thật chỉ thành `REAL_VALID` khi tải được và có entry giấy phép trong manifest.

## Cách trả lời câu hỏi khó

**Vì sao không dùng bìa thật?**
“Em chưa có nguồn cấp quyền đủ rõ, nên không tự lấy ảnh Internet. Em giữ fallback demo và manifest giấy phép để tránh trình bày sai nguồn.”

**AI có tốt không?**
“Chưa có bằng chứng để gọi là tốt. Behavior HitRate@10 hiện `0,021008`, Hybrid production `0,008403`; kết quả cho thấy pipeline đo được nhưng model cần dữ liệu thật và tuning trên validation mới.”

**CTR bao nhiêu?**
“`NOT_AVAILABLE`. Log test đã cleanup và không phải dữ liệu người dùng production.”

**Đã production-ready chưa?**
“Chưa. Source/image candidate đã harden và build local, nhưng G1 chưa deploy, chưa rotate secret, chưa có real-user UAT và còn dependency advisory mức moderate.”

**Seller score có phải AI không?**
“Không. Đây là `seller-quality-v1`, bắt đầu 70 điểm, cộng/trừ theo đơn hoàn tất, đơn hủy, report, mô tả và listing được duyệt; clamp 0–100.”

## Kết thúc trung thực

“Đồ án đã có nền tảng kỹ thuật đủ để demo và kiểm thử có bằng chứng, nhưng chưa được gọi là production-ready. Bước tiếp theo là bổ sung bìa có giấy phép, CI thực chạy, UAT người thật và thu telemetry có consent trước khi tune recommendation hoặc báo CTR.”
