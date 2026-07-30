# Manifest dữ liệu, nội dung và quyền sử dụng

Tài liệu này phân biệt rõ dữ liệu nghiệp vụ, dữ liệu nghiên cứu và tài sản trình
diễn. Trạng thái quyền được giữ fail-closed: thiếu bằng chứng nghĩa là chưa xác minh.

| Nhóm | Vị trí | Nguồn/loại | Mục đích | Trạng thái |
|---|---|---|---|---|
| Demo CSV | `data/demo` | Dữ liệu synthetic do dự án tạo | Seed luồng nghiệp vụ | `DEMO_DATA` |
| Ultra catalog | `data/json` | Dataset synthetic 2.200 sách | Benchmark và demo lớn | `SYNTHETIC_DATA` |
| Real catalog | `data/real-catalog` | Metadata Open Library đã chuẩn hóa | Thử pipeline provenance | `PARTIAL` |
| Gold catalog | `data/gold-catalog-v1` | Pilot có quality gate | Nghiên cứu chất lượng metadata | `PILOT` |
| Bìa curated | `public/covers/curated-real` | Tài sản khớp ISBN/metadata | Demo giao diện | Quyền tái phân phối `NOT_VERIFIED` |
| Artwork BookVerse | `public/covers/demo-art-v2` | Minh họa do BookVerse tạo | Fallback bìa | `BOOKVERSE_DEMO_ASSET` |
| Nội dung đọc sinh cục bộ | `BookChunk.embedding.contentLabel` | Template theo metadata | Demo Reader/RAG | `NỘI_DUNG_DEMO_BOOKVERSE` |
| Nội dung provider | `data/derived/bookverse-original-content` | Nội dung mới do provider sinh | Sổ tay đồng hành tùy chọn | `NỘI_DUNG_NGUYÊN_BẢN_BOOKVERSE` |
| Interaction benchmark | Database test | Synthetic | Temporal evaluation | Không đại diện người dùng thật |
| UAT | CSV do người tham gia điền | Người dùng thật, mã hóa Pxx | Đánh giá khả dụng | Chỉ `AVAILABLE` sau khi thu thật |

## Tuyên bố bắt buộc trên giao diện và báo cáo

- Nội dung đọc minh họa không phải bản dịch, trích đoạn hoặc nội dung nguyên tác.
- Giá demo không phải dữ liệu giá thị trường.
- Metadata Open Library không tự động trao quyền sử dụng ảnh bìa hoặc toàn văn.
- Recommendation từ synthetic interaction không được gọi là bằng chứng hiệu quả
  production.
- CTR giữ `NOT_AVAILABLE` cho đến khi có impression/click instrumented thật.

## Quy tắc tiếp nhận dữ liệu mới

1. Ghi URL nguồn, ngày truy cập, điều khoản và checksum.
2. Tách raw, normalized, rejected và report.
3. Không sửa raw; mọi chuyển đổi tạo artifact mới.
4. Không public file toàn văn khi chưa có quyền phân phối.
5. Không dùng trường thiếu provenance để tạo claim cá nhân hóa.

