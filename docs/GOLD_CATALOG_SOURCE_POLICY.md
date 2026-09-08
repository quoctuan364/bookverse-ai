# Chính sách nguồn Gold Catalog V1

1. Chỉ dùng API/URL nguồn có thể truy vết; ưu tiên Google Books rồi Open Library.
2. Không scrape retailer, Google Images, Tiki, Shopee, Fahasa, Amazon hoặc nguồn không cho phép.
3. API key chỉ đọc từ environment, không ghi log/commit. Lượt pilot này không có Google Books credential nên giữ trạng thái `BLOCKED_MISSING_CREDENTIAL`.
4. Open Library response được cache raw, gắn User-Agent, retry giới hạn và backoff. Không tự bịa title, author, ISBN, mô tả, NXB hoặc giá.
5. Cover chỉ được kết luận `TECHNICALLY_VERIFIED` khi redirect hợp lệ, HTTP 200, content type image, decode được, kích thước/tỷ lệ đạt policy và có checksum. `RIGHTS_NOT_VERIFIED` vẫn là trạng thái bắt buộc nếu chưa có bằng chứng license.
6. Ảnh không được tải vào Git khi quyền tái phân phối chưa được xác minh. UI phải có fallback và không hiển thị cover rights như claim bản quyền.
7. Mapping category LOW không được tự nâng confidence; output dùng `NEEDS_REVIEW`, rationale và sample title evidence.
8. Dữ liệu pilot là metadata nguồn, không phải dữ liệu người dùng thật, rating BookVerse, giá, stock, seller, order, review, interaction hoặc CTR.
