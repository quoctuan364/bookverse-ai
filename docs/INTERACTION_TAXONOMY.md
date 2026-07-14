# Interaction taxonomy — Checkpoint F1

## 1. Nguồn chuẩn

Nguồn chuẩn duy nhất là `shared/interaction-taxonomy.v1.json`, version `interaction-taxonomy.v1`. TypeScript đọc qua `lib/interaction-taxonomy.ts`; Python đọc qua `ai_service/taxonomy_manifest.py` và `ai_service/evaluation/taxonomy.py`. Parity test kiểm tra cùng version, checksum, event và alias ở cả hai runtime.

Không đổi tên hay ghi lại 18.000 `InteractionEvent` lịch sử. Loader ánh xạ alias khi đọc; event không nhận diện phải được báo cáo hoặc làm validation thất bại, không bị bỏ qua âm thầm.

## 2. Bảng taxonomy

`Positive` chỉ cho biết event có thể tạo strong-positive khi thỏa điều kiện; đây không phải nhãn click hoặc conversion mặc định.

| Canonical event | Ý nghĩa ngắn | Field bắt buộc | Field tùy chọn chính | Positive | Weight hiện tại | Privacy |
|---|---|---|---|---|---:|---|
| `BOOK_VIEW` | Mở trang chi tiết Book | userId, bookId, timestamp | source | Không | 1 | Pseudonymous behavior |
| `SEARCH` | Thực hiện tìm kiếm | userId, timestamp | resultCount, source | Không | — | Potentially sensitive text |
| `READING_START` | Bắt đầu phiên đọc | userId, bookId, timestamp | pageNumber, source | Không | 3 | Pseudonymous behavior |
| `READING_PROGRESS` | Cập nhật tiến độ đọc | userId, bookId, timestamp | progressPercent, timeSpentSeconds | Không | — | Pseudonymous behavior |
| `READING_COMPLETE` | Đọc ≥300 giây hoặc ≥50% | userId, bookId, timestamp | progressPercent, timeSpentSeconds | Có điều kiện | — | Pseudonymous behavior |
| `READING_HIGHLIGHT` | Tạo highlight | userId, bookId, timestamp | pageNumber, blockId | Không | — | User-generated content |
| `BOOKMARK_ADD` | Thêm bookmark | userId, bookId, timestamp | pageNumber | Có | 4 | Pseudonymous behavior |
| `BOOKMARK_REMOVE` | Xóa bookmark | userId, bookId, timestamp | pageNumber | Không | — | Pseudonymous behavior |
| `FAVORITE_ADD` | Thêm yêu thích | userId, bookId, timestamp | — | Có | — | Pseudonymous behavior |
| `FAVORITE_REMOVE` | Xóa yêu thích | userId, bookId, timestamp | — | Không | — | Pseudonymous behavior |
| `CART_ADD` | Thêm vào giỏ, chưa phải mua | userId, bookId, timestamp | listingId, quantity | Không | — | Transactional |
| `CART_REMOVE` | Xóa khỏi giỏ | userId, bookId, timestamp | listingId, quantity | Không | — | Transactional |
| `PURCHASE` | OrderItem thuộc order hợp lệ | userId, bookId, timestamp, orderId | orderItemId, quantity, status | Có điều kiện | 5 | Transactional |
| `REVIEW_CREATE` | Tạo review | userId, bookId, timestamp, rating | reviewId | rating ≥4 | — | User-generated content |
| `COMMUNITY_COMMENT` | Tạo bình luận cộng đồng | userId, timestamp | bookId, postId, commentId | Không | — | User-generated content |
| `REACTION` | Reaction nội dung cộng đồng | userId, timestamp, targetId | bookId, reactionType | Không | — | User-generated content |
| `COMMUNITY_REPORT` | Báo cáo nội dung | userId, timestamp, targetId | bookId, targetType | Không | — | Security/moderation |
| `ASSISTANT_QUERY` | Truy vấn assistant | userId, timestamp | sessionId | Không | — | Potentially sensitive text |
| `RECOMMENDATION_REQUEST` | Server tạo danh sách recommendation | requestId, userId, timestamp, algorithmVersion, taxonomyVersion, surface | candidateProfile, filterProfile | Không | — | Pseudonymous behavior |
| `RECOMMENDATION_IMPRESSION` | Card thấy ≥50% liên tục ≥1 giây | requestId, userId, bookId, timestamp | — | Không | — | Pseudonymous behavior |
| `RECOMMENDATION_CLICK` | Chọn Book thuộc request sở hữu | requestId, userId, bookId, timestamp | — | Không | — | Pseudonymous behavior |
| `RECOMMENDATION_CONVERSION` | Strong-positive được server quy attribution | requestId, userId, bookId, timestamp, sourceEventId | conversionType, attributionAnchor | Không | — | Transactional |

Production weight trong bảng chỉ mô tả code hiện có; F1 không thay đổi weight.

## 3. Alias legacy và audit

Các nhóm chính: `VIEW/VIEW_BOOK → BOOK_VIEW`, `READ/READING → READING_START`, `READ_PAGE → READING_PROGRESS`, `BOOKMARK → BOOKMARK_ADD`, `FAVORITE → FAVORITE_ADD`, `ADD_TO_CART → CART_ADD`, `REVIEW/POSITIVE_REVIEW → REVIEW_CREATE`, `COMMENT → COMMUNITY_COMMENT`, `LIKE → REACTION`, `REPORT → COMMUNITY_REPORT`, `CHATBOT_QUERY → ASSISTANT_QUERY`. Toàn bộ 38 alias nằm trong JSON nguồn chuẩn.

Audit read-only trên `bookverse_ai_test`:

- 18.000/18.000 event ánh xạ được, unknown = 0, duplicate ID = 0.
- Thiếu identity/timestamp = 0; tất cả event audit được nhận diện là synthetic.
- Thiếu field nghiệp vụ bắt buộc ở dữ liệu cũ: 1.587 `PURCHASE` thiếu `orderId`, 1.587 `REACTION` thiếu `targetId`, 1.664 `REVIEW_CREATE` thiếu `rating`.
- Các event legacy thiếu field vẫn được report, không được tự nâng thành nhãn mạnh và không bị sửa trong database.

## 4. Quy tắc phân biệt nguồn

- API trả danh sách không phải impression; render component cũng chưa phải impression.
- `BOOK_VIEW` từ catalog không phải `RECOMMENDATION_CLICK`.
- Link Book do assistant trả về không thuộc recommendation engine, nên không ghi recommendation click.
- Search/chat thô không được lưu vào recommendation telemetry.

## 5. Kiểm tra

```powershell
npm run data:analyze-interactions
npm run test:taxonomy-parity
npm run test:unit
python -m pytest ai_service/tests -q
```

Checksum taxonomy đã kiểm tra: `e3931aa11d58e19b5f125dfbf3c32afc2a9f28193b753f691df4b0cd367b7c47`.
