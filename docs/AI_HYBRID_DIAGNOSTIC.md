# Chẩn đoán Hybrid Recommender BookVerse

Cập nhật: 30/07/2026. Báo cáo này phân biệt rõ baseline lịch sử, rolling
temporal backtest thăm dò và final-test cũ đã được quan sát. Không có số liệu
production/CTR/UAT thật trong báo cáo.

## 1. Trạng thái ban đầu đã tái lập

Trước khi sửa evaluator, hai lượt `evaluation:research` trên cùng
`bookverse_ai_test` tái tạo cùng profile được chọn, metric và checksum. Artifact
baseline cuối nằm tại:

```text
outputs/research-evaluation/20260730T052219736053Z/
```

Kết quả lịch sử xác nhận `no_reading_category` thắng validation nhưng thua
production, Content và Behavior ở final cũ. Final này đã được xem nên không còn
độc lập cho các ứng viên mới.

## 2. Audit correctness

| Nguy cơ | Kết quả | Bằng chứng |
|---|---|---|
| Split sai timestamp | PASS | Cutoff chuẩn hóa UTC-naive; train `< cutoff`, test `>= cutoff` |
| Future event vào feature/popularity | PASS | Assertion bằng 0 ở cả năm window |
| Positive ngoài candidate | CONTROLLED | Loại và đếm riêng; cold-item cũng được báo cáo |
| Seen item lọt ground truth | PASS | Ground truth loại item đã thấy; overlap assertion bằng 0 |
| User không có positive bị tính mẫu số | PASS | Chỉ user có ground truth khác rỗng được tính |
| Event/item trùng | PASS | Trùng event ID bị từ chối; user–book positive được deduplicate |
| Tie không deterministic | PASS | Mergesort và Book ID tie-break; RRF cũng tie-break Book ID |
| Công thức metric | PASS | Regression test có kết quả Precision/Recall/Hit/NDCG/MRR biết trước |
| Candidate pool khác nhau | PASS | Tất cả thuật toán dùng cùng catalog tại cutoff và cùng user |
| Negative sampling | Không dùng | Candidate pool là toàn catalog hợp lệ tại cutoff |
| Coverage khác mẫu số | PASS | Cùng `candidateBooks` của window |
| Trộn cold/warm | PASS | `cold_0`, `sparse_1_2`, `warm_3_plus` báo riêng |
| Seed/thứ tự/timezone | PASS | Random khóa 5 seed `20260714`–`20260718`; input sort ổn định; timestamp chuẩn hóa |

Không phát hiện bug công thức metric hoặc leakage làm sai kết luận cũ. Thay đổi
evaluator chỉ bổ sung debug data opt-in và regression test; mặc định không đổi
contract, metric hoặc production parity.

## 3. Chẩn đoán dữ liệu

- Catalog: **2.200** sách.
- User có strong-positive: **1.112**.
- Strong-positive event: **14.799**.
- Cặp user–book positive duy nhất: **14.748**.
- Matrix density: **0,006028**.
- Positive item/user: trung bình **13,26**, trung vị **13**, p95 **20**.
- Phân phối label: 5.998 reading complete, 3.092 review ≥4, 2.862 purchase
  hợp lệ, 2.799 bookmark và 48 favorite.

Cold-start thay đổi mạnh theo thời gian. W1 có 58 cold user, 307 sparse và
cold-item ground-truth rate 25%; đến W5 chỉ còn 1 sparse, 713 warm và gần như
không còn cold item. Vì vậy metric W5 hầu như là kết quả warm-start, không đủ
để kết luận chất lượng cold-start.

## 4. Ba nguyên nhân quan trọng nhất

### 4.1 Hybrid không chứa Behavior co-occurrence

Tên “hybrid” hiện mô tả tổng của reading-category, reading-author,
purchase-category và popularity. Item-item co-occurrence tạo nên Behavior
baseline không tham gia công thức. Năm ví dụ `U0428`, `U0636`, `U0738`,
`U0931`, `U1314` đều có Behavior hit ground truth trong top-10 trong khi Hybrid
miss.

### 4.2 Tín hiệu content thô và xung đột với Behavior

Content–Behavior top-10 Jaccard trung bình chỉ **0,003620**; Spearman trên hợp
top-10 là **-0,641479**. Reading score chỉ khác 0 trên trung bình **35,34%**
candidate; purchase score trên **11,68%**. Reading component có median user-max
12, purchase 8 và popularity 3. Các item cùng category/author nhận nhiều score
giống nhau, sau đó phụ thuộc popularity/Book ID để phá tie.

### 4.3 Dữ liệu synthetic tạo variance temporal cao

Behavior NDCG@10 qua năm window là `0,003560±0,001365`; production hybrid là
`0,003521±0,001852`. Random sanity trên 5 seed × 5 window đạt
`0,003607±0,002136` NDCG@10 theo năm window; mức gần các baseline và độ lệch
chuẩn lớn cho thấy
tín hiệu tuyệt đối rất yếu. Random chỉ là sanity check, không phải ứng viên
triển khai. Hybrid luôn trả đủ 10 item trong W5, nên giả thuyết “thiếu
backfill” đã bị bác bỏ.

## 5. Protocol mới không dùng final cũ để tune

Primary metric được khóa trước khi chạy là **NDCG@10**. Secondary gồm
Precision, Recall, Hit Rate, MRR và Coverage tại K=10.

Năm cửa sổ rolling đều kết thúc trước final cũ:

1. 01/02–01/03.
2. 01/03–01/04.
3. 01/04–01/05.
4. 01/05–01/06.
5. 01/06–20/06.

Không gian ứng viên khóa trước:

- `rrf_equal`: Content 1, Behavior 1, Popularity 0,25.
- `rrf_behavior_focused`: Content 0,75, Behavior 1,5, Popularity 0,25.
- `weighted_rank_behavior`: percentile-rank theo từng nguồn rồi cộng
  0,75/1,5/0,25.
- `gated_history`: cold dùng Popularity; sparse phối Content/Behavior/Popularity;
  warm ưu tiên Behavior.

Không thử time decay hoặc implicit weight mới vì dữ liệu hiện không có
provenance đủ mạnh để tách tác động một cách đáng tin cậy. CART không phải
strong-positive; PURCHASE event thiếu orderId không được dùng thay OrderItem;
rating chỉ dùng khi Review ≥4.

## 6. Kết quả rolling before/after

| Phương pháp | NDCG@10 mean±std | HitRate@10 mean±std | Coverage mean |
|---|---:|---:|---:|
| Popularity | 0,003474±0,001516 | 0,012108±0,004323 | 0,007630 |
| Content | 0,003004±0,000945 | 0,011573±0,002846 | 0,212323 |
| **Behavior** | **0,003560±0,001365** | 0,013912±0,004146 | 0,882160 |
| Hybrid production | 0,003521±0,001852 | 0,012044±0,005745 | 0,213129 |
| Random sanity, 5 seed | 0,003607±0,002136 | 0,012269±0,006044 | 0,990253 |
| RRF equal | 0,003186±0,001407 | 0,011371±0,004489 | 0,778004 |
| RRF Behavior-focused | 0,003551±0,001376 | 0,013912±0,004146 | 0,882160 |
| Weighted rank Behavior | 0,003182±0,001284 | 0,011717±0,004311 | 0,818662 |
| Gated history | 0,003359±0,001242 | **0,014480±0,005119** | **0,892522** |

Random được lấy mean năm seed trong từng window trước, sau đó báo mean±std trên
đúng năm temporal window như các phương pháp khác. Seed variance được lưu riêng.
Paired Random−Behavior có mean `+0,000047`, std `0,002014`; Random cao hơn ở
2/5 window. Vì vậy chỉ kết luận **không quan sát được ưu thế ổn định**, không
tuyên bố Random thắng hoặc có ý nghĩa thống kê mạnh.

RRF Behavior-focused nhỉnh hơn production `+0,000030` NDCG trung bình nhưng
thấp hơn Behavior `-0,000009`. Nó chỉ thắng baseline mạnh nhất **1/5** window,
thấp hơn gate yêu cầu **4/5**.

W5 validation có 713/714 user thuộc warm cohort. Behavior đạt NDCG@10
`0,004192`, production hybrid `0,000451`, RRF Behavior-focused `0,004155`.
Sparse chỉ có một user và mọi phương pháp đều không hit; không diễn giải rộng.

## 7. Decision gate

Tiêu chí thăm dò:

1. Mean NDCG@10 phải vượt baseline mạnh nhất.
2. Hit Rate không giảm quá 10%.
3. Thắng ít nhất 4/5 temporal window.
4. Correctness/regression phải PASS.
5. Muốn promote bắt buộc có `final_v2` chưa từng quan sát.

Kết quả:

- Best baseline: `behavior`.
- Best candidate: `rrf_behavior_focused`.
- Mean-primary improvement so với best baseline: **không đạt**.
- Window stability: **1/5**, không đạt.
- `final_v2`: **không có**.
- Candidate decision: **`REJECT_CANDIDATE`**.
- Deployment decision:
  **`RETAIN_CURRENT_PENDING_NEW_UNSEEN_DATA`**.
- Nhãn tổng quát: **`NO_PROMOTION`**.

`NO_PROMOTION` không có nghĩa Hybrid là mô hình tốt nhất. Cấu hình hiện tại chỉ
được giữ ổn định vì chưa có final_v2 độc lập hoặc thử nghiệm trực tuyến. Không
đổi trọng số hoặc thuật toán production. Nếu sau này Behavior tiếp tục
thắng trên telemetry thật, nên đổi cách định vị hệ thống thành recommender
Behavior/co-occurrence có fallback Content, nhưng chỉ sau một decision gate mới.

## 8. Provenance và artifact

Artifact mới, không ghi đè:

```text
outputs/hybrid-audit/20260730T063523453561Z/
├── hybrid-audit.json
├── hybrid-audit.md
└── source-manifest.json
```

- Commit nền: `1081e2046b8b603ccdecc6d2e0721d6598b907c2`.
- Working tree: dirty, được ghi rõ.
- Dataset fingerprint:
  `609905d90e9a8896c3f028f02e941c532553040263f0d5ea4bcb7e1bec6c2dea`.
- Source manifest:
  `84337ea1fcc16ec1367a2ab0b146c2490a9d2b627afa430199b219b33f7f6f5b`.
- Report checksum:
  `b5da260331fb153d47775449a64b8ebb2fd32149fa11d3bc51c00f95da27dc2f`.
- Seed random sanity: `20260714`, `20260715`, `20260716`, `20260717`,
  `20260718`.

## 9. Threats to validity

1. Dữ liệu synthetic/demo không đại diện hành vi người dùng thật.
2. Không có final_v2 unseen; rolling backtest chỉ mang tính exploratory.
3. Candidate fusion chỉ hợp top-10 từ ba nguồn, chưa phải candidate generator sâu.
4. W5 gần như toàn warm user; cold/sparse estimate không ổn định.
5. Rating không có snapshot as-of-cutoff nên không dùng làm feature.
6. Trạng thái Book/Category lịch sử không có snapshot đầy đủ.
7. Random nhiều seed gần ngang baseline cho thấy synthetic generator không tạo
   tín hiệu recommendation đủ mạnh; không thể suy diễn thành hiệu quả thực tế.
