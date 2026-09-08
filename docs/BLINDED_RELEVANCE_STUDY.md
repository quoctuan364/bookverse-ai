# Pilot blinded human-relevance study

Đây là nghiên cứu **perceived relevance** với 10–20 người, không phải CTR,
conversion hoặc bằng chứng hiệu quả production.

## Protocol

1. Thu consent và sở thích/lịch sử sách thật của từng người.
2. Content, Behavior và Hybrid sinh top-10 từ cùng catalog snapshot.
3. Ghi candidate vào `BLINDED_RELEVANCE_CANDIDATES_TEMPLATE.csv`.
   Mỗi candidate phải có tên sách, tác giả, thể loại và mô tả ngắn để người
   tham gia đánh giá; các dòng trùng Book giữa thuật toán phải dùng metadata
   giống nhau. Phiếu công khai giữ metadata này nhưng không chứa thuật toán hay
   rank nguồn.
4. Khóa seed randomization trước khi tạo phiếu.
5. Công cụ hợp nhất cùng một Book xuất hiện ở nhiều thuật toán thành một lần
   đánh giá, sau đó lưu mapping thuật toán trong secret key.
6. Phiếu người tham gia không chứa tên thuật toán hoặc rank nguồn.
7. Người dùng đánh giá relevance 1–5; không được người tổ chức điền thay.

```powershell
npm run study:relevance:prepare -- `
  --candidates=docs/BLINDED_RELEVANCE_CANDIDATES_TEMPLATE.csv `
  --seed=20260730

npm run study:relevance:analyze -- `
  --ratings=outputs/human-relevance/<run>/participant-rating-form.csv `
  --secret-key=outputs/human-relevance/<run>/organizer-secret-key.csv
```

Analyzer từ chối publish metric nếu dưới 10 hoặc trên 20 người, thiếu consent,
rating ngoài 1–5, assignment lạ hay rating trùng.

## Metric

- Graded NDCG@10.
- Precision@10 với relevant = rating ≥4.
- Mean relevance.

Kết quả phải ghi rõ cỡ mẫu, protocol, seed và limitation. Không gọi kết quả này
là CTR hoặc chứng minh thuật toán tốt hơn trong production.
