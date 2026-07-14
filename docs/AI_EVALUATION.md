# Đánh giá recommendation theo thời gian — Checkpoint E

Ngày đánh giá: 14/07/2026.

Database: `bookverse_ai_test` ở chế độ transaction `READ ONLY`.

Evaluation version: `temporal-eval-v1`

## 1. Mục tiêu và kết luận ngắn

Checkpoint E xây dựng một quy trình đánh giá recommendation có thể chạy lại, tách train/test theo thời gian và so sánh cùng một ground truth trên cùng candidate catalog. Quy trình không ghi database, không dùng bảng `Recommendation` làm nhãn, không thay trọng số production và không đọc database demo để tính metric.

Kết quả trung thực: behavior-based có Hit Rate@10 cao nhất là `0,021008`; content-based có Recall@10 cao nhất trong các baseline học từ lịch sử là `0,010812`. Hybrid dùng trọng số production chỉ đạt Hit Rate@10 `0,008403`, thấp hơn popularity, content, behavior và cả random seeded ở một số metric. Vì vậy chưa có bằng chứng để gọi chất lượng recommendation hiện tại là tốt.

## 2. Audit recommendation production trước Checkpoint E

Production trong `ai_service/main.py` giữ nguyên các trọng số:

- Reading category: `12`.
- Reading author: `6`.
- Purchase category: `8`.
- Popularity: `3`.

Điểm đọc thô cộng thời gian đọc `min(timeSpent / 300, 8)` và số session; bookmark nhân `4`; interaction `READ/BOOKMARK/VIEW` lần lượt nhân `3/4/1`. Category/author nhận các hệ số lan truyền đang có trong production. Purchase count nhân `5` trước normalize. Popularity cộng interaction, reading session nhân `2`, bookmark nhân `3` và order item nhân `4`.

| Feature | Nguồn dữ liệu production | Timestamp | Nguy cơ leakage khi đánh giá cũ | Cách cô lập trong Checkpoint E |
|---|---|---|---|---|
| Reading category/author | `reading_sessions`, `bookmarks`, `interaction_events` | `createdAt` | Query production đọc toàn bộ lịch sử | Chỉ lấy row có `createdAt < cutoff` |
| Purchase category | `Order` + `OrderItem` | `Order.createdAt` | Production chưa lọc cutoff và chưa lọc trạng thái order | Chỉ lấy trước cutoff và status hợp lệ |
| Popularity | interaction, session, bookmark, order item | `createdAt` | Có thể dùng tín hiệu tương lai của toàn catalog | Dựng lại hoàn toàn từ train snapshot |
| Content | Category canonical/root, author | Book/Category không có lịch sử trạng thái | Có thể trộn metadata hiện tại với thời điểm quá khứ | Chỉ dùng Book tạo trước cutoff; rating hiện tại đặt `0` |
| Behavior | Chưa có baseline độc lập trong production | Event positive có `createdAt` | Không áp dụng | Item-item cosine chỉ từ strong-positive train |
| Community | Không có score community độc lập | Một số interaction có `createdAt` | Dễ coi VIEW/SEARCH/COMMENT là positive quá mạnh | Không tạo score community giả; chỉ giữ interaction production hỗ trợ |

Candidate production hiện đọc toàn bộ Book và không có cutoff. Logic xếp hạng loại Book đã thấy của user, ưu tiên score, popularity, rating và Book ID; nếu không có preference dương thì fallback popularity. Evidence trả về gồm bằng chứng đọc, mua hoặc xu hướng; cold-start dùng popularity. Checkpoint E không sửa hành vi này mà tạo candidate snapshot riêng cho evaluator.

## 3. Dataset đánh giá

| Thành phần | Số row |
|---|---:|
| Book nguồn | 2.200 |
| InteractionEvent | 18.000 |
| ReadingSession | 6.200 |
| Bookmark | 2.799 |
| Favorite | 48 |
| Review | 3.600 |
| OrderItem | 4.714 |
| Positive event sau khi áp policy | 14.799 |
| Positive train | 12.206 |
| Positive test | 2.593 |
| Train feature event | 14.473 |

Dataset fingerprint SHA-256:

```text
e96d9c4db04455bf88800c0b7035ae25ac19870a4775f3dc5b4d94a0a459e2b3
```

Đây là dữ liệu synthetic, phù hợp để kiểm tra pipeline và tính tái lập nhưng chưa đại diện hành vi người dùng thật.

## 4. Positive-label policy và ground truth

Strong positive được chấp nhận:

- Purchase có quantity dương và order thuộc `PAID`, `PAID_DEMO`, `SHIPPED` hoặc `COMPLETED`.
- ReadingSession có `timeSpent >= 300` giây hoặc `progressPercent >= 50`.
- Bookmark và Favorite.
- Review có rating từ `4` trở lên.

Các event bị loại:

- `VIEW`, `SEARCH`, `ADD_TO_CART`, `COMMENT`, `REACTION`, `HIGHLIGHT`, `CHATBOT_QUERY` và các interaction yếu khác.
- `InteractionEvent.PURCHASE`, vì event không mang `orderId` để xác minh trạng thái đơn.
- Order `PENDING`, `CANCELLED`, `REFUNDED` hoặc quantity không dương.
- Reading dưới cả hai ngưỡng và review dưới 4 sao.

Event ID được prefix theo nguồn để tránh collision. Khi một user có nhiều positive trên cùng Book, evaluator giữ event sớm nhất; nếu timestamp bằng nhau, `eventId` tăng dần là tie-break ổn định. Ground truth chỉ giữ Book thuộc candidate snapshot và chưa xuất hiện trong feature train của chính user.

## 5. Temporal split

Chiến lược được chọn là global temporal cutoff:

```text
cutoff = 2026-06-01T00:00:00
train  = timestamp < cutoff
test   = timestamp >= cutoff
```

Global cutoff phù hợp hơn leave-last-N cho bộ dữ liệu này vì nó mô phỏng đúng câu hỏi: “dùng trạng thái hệ thống trước một thời điểm để dự đoán hành vi sau thời điểm đó”, đồng thời cho phép khóa popularity và catalog về cùng một snapshot cho tất cả user.

- Positive train lớn nhất: `2026-05-31T05:00:00`.
- Positive test nhỏ nhất: `2026-06-01T05:00:00`.
- Candidate: 2.000 Book `ACTIVE`, chưa xóa và được tạo trước cutoff.
- Test users trước eligibility: 986.
- User đủ điều kiện: 952; bị loại: 34.
- Ground-truth user–Book: 2.349.
- Test user–Book sau deduplicate: 2.588.
- Loại ngoài candidate: 220; loại vì đã thấy trong train: 19.

## 6. Evaluation pipeline

```mermaid
flowchart LR
    A["Nguồn read-only"] --> B["Chuẩn hóa strong-positive"]
    B --> C{"Cutoff 01/06/2026"}
    C -->|"trước cutoff"| D["Train snapshot"]
    C -->|"từ cutoff"| E["Held-out test"]
    D --> F["User profile + popularity + item similarity"]
    E --> G["Deduplicate + lọc seen/candidate"]
    H["Catalog hợp lệ tại cutoff"] --> F
    H --> G
    F --> I["Popularity / Content / Behavior / Hybrid / Random sanity"]
    G --> J["Ground truth"]
    I --> K["Metric @5 và @10"]
    J --> K
    K --> L["JSON + CSV + Markdown + checksum"]
```

## 7. Baseline và model so sánh

- Popularity: điểm phổ biến chỉ từ interaction, reading, bookmark và purchase hợp lệ trước cutoff.
- Content-based: affinity category/author của user chỉ từ train snapshot.
- Behavior-based: item-item cosine từ co-occurrence strong positive trong train.
- Hybrid production: đúng công thức và trọng số production, nhưng nhận snapshot train thay vì toàn lịch sử.
- Random seeded: sanity check với seed cố định; không được xem là AI baseline thực tế.

Tất cả phương pháp dùng chung cutoff, positive policy, candidate catalog, user cohort, filtering policy và `K = 5, 10`. Checkpoint E không tối ưu tham số hay trọng số trên test set.

## 8. Công thức metric

Với user `u`, danh sách top-K là `R_u^K`, ground truth là `G_u`, số hit là `h_u = |R_u^K ∩ G_u|`:

- `Precision@K = (1 / |U|) Σ_u h_u / K`.
- `Recall@K = (1 / |U|) Σ_u h_u / |G_u|`.
- `HitRate@K = (1 / |U|) Σ_u 1[h_u > 0]`.
- `DCG@K = Σ_(i=1..K) rel_i / log2(i + 1)`.
- `NDCG@K = DCG@K / IDCG@K`, với `IDCG` là DCG của thứ tự lý tưởng.
- `MRR@K = (1 / |U|) Σ_u 1 / rank_u`, bằng 0 nếu không có hit trong top-K.
- `CatalogCoverage@K = |∪_u R_u^K| / |C|`, với `C` là candidate catalog.

CTR không được suy từ purchase/recommendation count:

```text
CTR: NOT_AVAILABLE — chưa có impression/exposure log đáng tin cậy.
```

## 9. Kết quả thật — cohort all

| Phương pháp | K | Precision | Recall | Hit Rate | NDCG | MRR | Coverage |
|---|---:|---:|---:|---:|---:|---:|---:|
| Popularity | 5 | 0,001681 | 0,003361 | 0,008403 | 0,002508 | 0,003589 | 0,0035 |
| Popularity | 10 | 0,001366 | 0,006197 | 0,013655 | 0,003516 | 0,004230 | 0,0065 |
| Content | 5 | 0,002941 | 0,006488 | 0,012605 | 0,004827 | 0,005795 | 0,1380 |
| Content | 10 | 0,002416 | **0,010812** | 0,019958 | **0,006419** | **0,006625** | 0,2065 |
| Behavior | 5 | **0,003361** | 0,006329 | **0,014706** | 0,003821 | 0,004342 | 0,8435 |
| Behavior | 10 | **0,002521** | 0,010530 | **0,021008** | 0,005374 | 0,005089 | 0,9665 |
| Hybrid production | 5 | 0,000630 | 0,000788 | 0,003151 | 0,000745 | 0,001523 | 0,1280 |
| Hybrid production | 10 | 0,000840 | 0,002451 | 0,008403 | 0,001496 | 0,002188 | 0,1995 |
| Random seeded sanity | 5 | 0,000840 | 0,001225 | 0,004202 | 0,001044 | 0,001926 | 0,9120 |
| Random seeded sanity | 10 | 0,001050 | 0,005252 | 0,010504 | 0,002367 | 0,002683 | 0,9900 |

## 10. Cold-start và cohort

| Cohort | User | Nhận xét |
|---|---:|---|
| `cold_0` | 12 | Không có Book trong train feature |
| `sparse_1_2` | 1 | Có 1–2 Book; mẫu quá nhỏ để kết luận |
| `warm_3_plus` | 939 | Có ít nhất 3 Book trong train feature |

Kết quả @10 tiêu biểu:

| Phương pháp | Cohort | Recall@10 | HitRate@10 | NDCG@10 |
|---|---|---:|---:|---:|
| Popularity | cold_0 | 0 | 0 | 0 |
| Content | cold_0 | 0,375000 | 0,416667 | 0,172214 |
| Behavior | cold_0 | 0,375000 | 0,416667 | 0,172214 |
| Hybrid production | cold_0 | 0 | 0 | 0 |
| Content | warm_3_plus | 0,006169 | 0,014909 | 0,004308 |
| Behavior | warm_3_plus | 0,005884 | 0,015974 | 0,003248 |
| Hybrid production | warm_3_plus | 0,002219 | 0,007455 | 0,001356 |

Content và behavior trùng kết quả cold-start vì khi không có feature, cả hai rơi về thứ tự Book ID ổn định; việc trùng ground truth synthetic là artifact, không phải bằng chứng cá nhân hóa. Cohort sparse chỉ có một user nên metric dù có thể tính vẫn không có ý nghĩa thống kê.

## 11. Runtime scoring

Đo trên 952 user; thời gian chỉ bao gồm bước xếp hạng từng phương pháp, không gồm tải database:

| Phương pháp | Trung bình (ms/user) | p95 (ms/user) |
|---|---:|---:|
| Popularity | 2,796 | 4,387 |
| Content | 6,025 | 9,674 |
| Behavior | 2,385 | 4,054 |
| Hybrid production | 9,449 | 14,550 |
| Random seeded sanity | 0,708 | 1,159 |

## 12. Phòng chống data leakage

Các assertion của run thực tế đều đạt:

- `max(train_timestamp) < min(test_timestamp)`: `true`.
- Event ID trùng train/test: `0`.
- Future event trong user feature: `0`.
- Cancelled/refunded purchase trong positive: `0`.
- Held-out Book xuất hiện trong feature train của chính user: `0`.
- Future popularity event được dùng: `0`.
- Current Book rating dùng để scoring: `false`.

Evaluator fail-closed nếu database name khác chính xác `bookverse_ai_test`. Loader mở PostgreSQL transaction read-only, chạy `SET TRANSACTION READ ONLY`, đọc lại `transaction_read_only=on` rồi rollback transaction.

## 13. Tính tái lập và output

Hai lượt chạy độc lập cùng input/config/seed tạo cùng normalized checksum:

```text
ef61b3fc02a4d18735fa3d446815d910bbadb989fdfd7d6286dca6b4fc8c568e
```

Runtime timestamp, output path và timing không tham gia checksum chuẩn hóa. Mỗi lượt tạo thư mục mới theo timestamp và checksum; không ghi đè run trước:

```text
outputs/evaluation/<UTC timestamp>-<checksum 12 ký tự>/
├── evaluation.json
├── metrics.csv
└── summary.md
```

JSON lưu version, commit/dirty state, seed, K, split, cutoff, positive policy, database profile, count, production weights, dataset fingerprint, leakage assertions, metrics, runtime, parity và hạn chế.

## 14. Production parity

Fixture cố định gồm ba user `U0792`, `U1734`, `U0864`, mỗi user 10 recommendation. So sánh Book ID, score với tolerance `1e-6` và toàn bộ evidence:

- User: 3.
- Row: 30/30.
- Max score delta: `0`.
- Kết quả: `PASS`.

`ai_service/main.py`, endpoint, response contract và trọng số production không bị sửa trong Checkpoint E.

## 15. Phân tích kết quả

Behavior đạt coverage và Hit Rate cao nhất, cho thấy co-occurrence khai thác được nhiều catalog hơn popularity. Content cho Recall/NDCG/MRR@10 tốt nhất, nhưng các giá trị tuyệt đối vẫn thấp. Hybrid production thua từng baseline riêng lẻ, nên các trọng số hiện tại chưa được dataset temporal này ủng hộ.

Không được sửa trọng số dựa trên test của run này. Nếu muốn cải thiện hybrid, cần tạo validation window riêng, chọn tham số trên validation rồi chỉ đánh giá một lần trên test cuối. Đồng thời phải chuẩn hóa interaction taxonomy: phần lớn event synthetic như `READ_PAGE` không trùng ba loại production đang hiểu là `READ/BOOKMARK/VIEW`.

## 16. Hạn chế

1. Dataset synthetic có pattern/tie và hành vi không giống log production thật.
2. Không có lịch sử trạng thái Book/Category tại cutoff; evaluator dùng trạng thái `ACTIVE` hiện tại và Book tạo trước cutoff.
3. Rating hiện tại không có snapshot lịch sử nên bị loại khỏi scoring.
4. `InteractionEvent.PURCHASE` không có orderId nên không thể xác minh trạng thái và bị loại.
5. Không có impression/exposure log, do đó CTR là `NOT_AVAILABLE`.
6. Cohort cold có 12 user và sparse chỉ có 1 user; chưa đủ để kết luận rộng.
7. Production vẫn đọc toàn lịch sử theo thiết kế online; evaluator cô lập bằng module snapshot riêng chứ không thay API production.

## 17. Cài đặt và chạy lại

PowerShell:

```powershell
cd D:\Doantotnghiep
python -m venv ai_service\.venv
ai_service\.venv\Scripts\Activate.ps1
pip install -r ai_service\requirements-dev.txt

$env:DATABASE_URL="postgresql://USER:PASSWORD@localhost:5433/bookverse_ai_test?schema=public"
$env:RUN_EVALUATION_INTEGRATION="1"

python -m compileall -q ai_service
python -m pytest ai_service/tests -q
python ai_service/evaluate.py --parity-only
python ai_service/evaluate.py
```

Có thể dùng wrapper sau khi đã activate virtual environment:

```powershell
npm run test:python
npm run evaluation:ai
```

Không dùng URL database demo. Loader sẽ từ chối trước khi đọc nếu database name không phải `bookverse_ai_test`.

## 18. Hướng cải thiện đúng phương pháp

- Thu impression, recommendation exposure, click và conversion có request/model version.
- Chuẩn hóa taxonomy interaction giữa Next.js, FastAPI và dataset.
- Tạo ba cửa sổ train/validation/test; chỉ tune trên validation.
- Thử learned ranking hoặc calibrated hybrid sau khi đủ log thật.
- Theo dõi metric theo cohort với cỡ mẫu tối thiểu và confidence interval.
- Không triển khai trọng số mới chỉ vì một run test có số đẹp hơn.
