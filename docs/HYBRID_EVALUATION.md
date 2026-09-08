# Đánh giá Mô hình Gợi ý Sách Hybrid — BookVerse AI

## 1. Tổng quan & Tuyên bố Tính Trung thực Khoa học

Tài liệu này ghi lại kiến trúc, công thức, quy trình tinh chỉnh trên tập Validation, và kết quả thực nghiệm trên tập Test của hệ thống gợi ý sách Hybrid (kết hợp Content-based, Collaborative Behavior và Global Popularity) trong đồ án BookVerse AI.

> **Tuyên bố trung thực theo quy định đồ án**:
> 1. Dữ liệu thực nghiệm được tạo tự động từ pipeline benchmark tái lập [`ai_service/evaluation/benchmark_suite.py`](file:///d:/Doantotnghiep/ai_service/evaluation/benchmark_suite.py) và artifact [`outputs/evaluation/hybrid_benchmark_metrics.csv`](file:///d:/Doantotnghiep/outputs/evaluation/hybrid_benchmark_metrics.csv) / [`outputs/evaluation/hybrid_benchmark_results.json`](file:///d:/Doantotnghiep/outputs/evaluation/hybrid_benchmark_results.json).
> 2. **Dữ liệu người dùng thật hiện tại**: `REAL_USER_DATA = 0` (Trạng thái: `BLOCKED_BY_DATA`).
> 3. Toàn bộ thực nghiệm dưới đây được thực hiện trên tập `SYNTHETIC_DATA` chuẩn của đồ án (2.200 sách, 18.000 tương tác, 940 độc giả đủ điều kiện kiểm thử).
> 4. **Không ngụy tạo số liệu**: Trên tập synthetic, mô hình Hybrid kết hợp điểm tuyến tính **CHƯA** vượt qua baseline đơn lẻ và RRF. Do đó, cờ tính năng `HYBRID_DYNAMIC_ALPHA=false` được giữ nguyên ở trạng thái **TẮT** (`NO_PROMOTION`).

---

## 2. Dataset Manifest & Phân chia Thời gian 3 Giai đoạn

### 2.1. Dataset Manifest
- **Nguồn dữ liệu**: Artifact chuẩn `data/json/bookverse_ultra_seed_2200.json` (SHA-256 Checksum: `f8368bd3efd35bbd5addfbab76d69928`).
- **Tổng số sách**: 2.200 sách (2.000 candidate books khả dụng sau khi lọc trạng thái).
- **Tổng số sự kiện tương tác**: 18.000 interaction events, 6.200 reading sessions, 2.800 bookmarks, 3.600 reviews, 4.708 order items.
- **Tổng số phản hồi tích cực (Positive Events)**: 14.950 events.
- **Dataset Fingerprint**: `a19c20e3227100020bfff94cdea19576368c9646a617aa47721354c7f4102963`.

### 2.2. Phân chia Thời gian 3 Giai đoạn (Chống Data Leakage)
1. **Train Set** ($t < \text{2026-05-01T00:00:00}$): 9.959 positive events — dùng để xây dựng profile sở thích thể loại, tác giả, và ma trận đồng xuất hiện hành vi.
2. **Validation Set** ($\text{2026-05-01T00:00:00} \le t < \text{2026-06-01T00:00:00}$): 2.407 positive events (906 users đủ điều kiện) — **CHỈ** dùng để tinh chỉnh cấu hình Dynamic Alpha ứng viên.
3. **Test Set** ($t \ge \text{2026-06-01T00:00:00}$): 2.584 positive events (940 users đủ điều kiện) — dùng để đánh giá độc lập duy nhất 1 lần sau khi đã khóa cấu hình (Locked Config).

### 2.3. Quality Gate
- $\text{Eligible Users} = 940 \ge 100$ (ĐẠT)
- $\text{Candidate Books} = 2.000 \ge 100$ (ĐẠT)
- $\text{Test Positives} = 2.584 \ge 100$ (ĐẠT)

---

## 3. Các Mô hình và Công thức Đánh giá

### 3.1. Hybrid Production (Fixed Weights)
$$\text{Score}(u, b) = 12.0 \cdot S_{\text{rc}}(u, b) + 6.0 \cdot S_{\text{ra}}(u, b) + 8.0 \cdot S_{\text{pc}}(u, b) + 3.0 \cdot S_{\text{pop}}(b)$$

### 3.2. Hybrid Dynamic Alpha (Tier-Based Gated Weights)
Phân tầng dựa trên số lượng tương tác lịch sử $N_{\text{hist}}$ của người dùng:
$$\text{Weights}(N_{\text{hist}}) = \begin{cases}
\text{COLD}: (0, 0, 0, 3.0) & \text{khi } N_{\text{hist}} = 0 \\
\text{SPARSE}: (6.0, 3.0, 3.0, 2.5) & \text{khi } 1 \le N_{\text{hist}} \le 4 \\
\text{WARM}: (12.0, 6.0, 8.0, 3.0) & \text{khi } N_{\text{hist}} \ge 5
\end{cases}$$

### 3.3. Hybrid RRF (Reciprocal Rank Fusion)
$$\text{RRF\_Score}(u, b) = \frac{1.0}{60 + \text{Rank}_{\text{content}}(u, b)} + \frac{1.0}{60 + \text{Rank}_{\text{behavior}}(u, b)} + \frac{0.25}{60 + \text{Rank}_{\text{popularity}}(u, b)}$$

---

## 4. Kết quả Tinh chỉnh trên Validation Set (Phase 1)

Đánh giá các cấu hình ứng viên trên 906 người dùng thuộc tập Validation (trích xuất trực tiếp từ `outputs/evaluation/hybrid_benchmark_results.json`):

| Cấu hình ứng viên | Ngưỡng phân tầng | Validation NDCG@10 | Validation Recall@10 | Trạng thái lựa chọn |
|---|---|---:|---:|---|
| **hybrid_production_fixed** | Cố định (12, 6, 8, 3) | **0.002591** | **0.003679** | ✅ **SELECTED** |
| **dynamic_alpha_gated_v1** | Cold: 0, Sparse: 1-4, Warm: $\ge 5$ | 0.002591 | 0.003679 | Không vượt trội |
| **dynamic_alpha_gated_v2** | Cold: 0, Sparse: 1-2, Warm: $\ge 3$ | 0.002591 | 0.003679 | Không vượt trội |

> **Khóa cấu hình**: Trên tập Validation, cấu hình Fixed Production đạt điểm tương đương các biến thể Dynamic Alpha. Cấu hình này được khóa để chuyển sang Phase 2 Test Set.

---

## 5. Kết quả Thực nghiệm Độc lập trên Test Set (Phase 2)

Kết quả đo đạc trên **940 người dùng kiểm thử** với candidate pool gồm **2.000 cuốn sách**:

### 5.1. Phân bổ Phân tầng Người dùng (Cohort Sizes)
- **Tập kiểm thử tổng thể (`all`)**: 940 người dùng
- **Phân tầng `cold_0`**: 0 người dùng
- **Phân tầng `sparse_1_2`**: 0 người dùng
- **Phân tầng `warm_3_plus`**: 940 người dùng

> **Nhận xét quan trọng về phân tầng**: Do đặc thù phân chia thời gian trên tập synthetic hiện tại, toàn bộ 940 người dùng đủ điều kiện test đều có lịch sử tương tác $\ge 3$ (thuộc phân tầng `warm_3_plus`). Vì không có người dùng thuộc nhóm `cold_0` hay `sparse_1_2` trong tập test, Fixed Hybrid và Dynamic Alpha cho kết quả xếp hạng và điểm số giống hệt nhau. Do đó, **hiệu quả phân tầng của Dynamic Alpha chưa thể được đánh giá độc lập theo từng cohort trên tập dữ liệu synthetic này**.

### 5.2. Bảng Kết quả Tổng hợp trên Test Set

| Thuật toán | K | Precision@K | Recall@K | Hit Rate@K | NDCG@K | MRR@K | Catalog Coverage |
|---|---:|---:|---:|---:|---:|---:|---:|
| **Popularity** | 5 | 0.001489 | 0.003050 | 0.007447 | 0.002225 | 0.003103 | 0.0035 |
| **Popularity** | 10 | 0.001383 | 0.006223 | 0.013830 | **0.003395** | 0.003897 | 0.0065 |
| **Content-based** | 5 | 0.001064 | 0.002216 | 0.005319 | 0.001598 | 0.002163 | 0.6880 |
| **Content-based** | 10 | 0.000745 | 0.002837 | 0.007447 | 0.001876 | 0.002402 | 0.8180 |
| **Behavior-based (CF)** | 5 | 0.002128 | 0.003395 | 0.010638 | 0.002540 | 0.004113 | 0.8425 |
| **Behavior-based (CF)** | 10 | 0.001383 | 0.004495 | 0.013830 | **0.002928** | 0.004530 | 0.9660 |
| **Hybrid Production (Fixed)** | 5 | 0.001064 | 0.002216 | 0.005319 | 0.001596 | 0.002216 | 0.6830 |
| **Hybrid Production (Fixed)** | 10 | 0.000745 | 0.002748 | 0.007447 | **0.001865** | 0.002501 | 0.8125 |
| **Hybrid Dynamic Alpha** | 5 | 0.001064 | 0.002216 | 0.005319 | 0.001596 | 0.002216 | 0.6830 |
| **Hybrid Dynamic Alpha** | 10 | 0.000745 | 0.002748 | 0.007447 | **0.001865** | 0.002501 | 0.8125 |
| **Hybrid RRF** | 5 | 0.001702 | 0.002917 | 0.008511 | 0.001990 | 0.002730 | 0.8095 |
| **Hybrid RRF** | 10 | 0.001596 | 0.005612 | 0.015957 | **0.003088** | 0.003689 | 0.9565 |
| **Random Seeded Sanity** | 5 | 0.002340 | 0.003546 | 0.011702 | 0.002880 | 0.005071 | 0.9005 |
| **Random Seeded Sanity** | 10 | 0.001702 | 0.005205 | 0.017021 | **0.003601** | 0.005686 | 0.9895 |

---

## 6. Phân tích Khoa học & Giải thích Hiện tượng Thực nghiệm

1. **Vì sao Random Seeded Sanity đạt NDCG@10 cao nhất (0.003601)?**
   - Hiện tượng này chứng minh rằng dữ liệu synthetic thiếu cấu trúc sở thích tự nhiên cô đặc (clustered taste communities) của con người và có mức độ nhiễu phân bố tương đối đều (uniform synthetic noise).
   - Trong không gian 2.000 cuốn sách với phân bổ tương đối đồng đều, việc lấy mẫu ngẫu nhiên có xác suất trúng tương đương hoặc nhỉnh hơn các mô hình heuristic bị chi phối bởi trọng số cố định.

2. **Ý nghĩa thực tế của Catalog Coverage**:
   - Hybrid đạt Catalog Coverage cao hơn Popularity trên benchmark synthetic (81.25% so với 0.65%), cho thấy danh sách đề xuất phân tán trên nhiều đầu sách hơn.
   - Chỉ số này phản ánh mức độ đa dạng danh mục đề xuất, **nhưng chưa chứng minh mức độ liên quan, sự hài lòng hoặc khả năng giảm filter bubble trong vận hành thực tế**.

3. **Kết luận khoa học**:
   - Metric hiện tại trên dữ liệu synthetic chưa đủ căn cứ để chứng minh Hybrid điểm tuyến tính hay Dynamic Alpha vượt trội so với các baseline.
   - Quyết định: **`NO_PROMOTION`** (giữ nguyên cờ `HYBRID_DYNAMIC_ALPHA=false`).

---

## 7. Kế hoạch Thực nghiệm Người dùng Thật (Pilot 28 Ngày)

1. Mở hệ thống cho người dùng thật trải nghiệm, thu thập sự đồng thuận minh bạch qua `ConsentBanner`.
2. Ghi nhận 9 loại sự kiện nghiên cứu vào bảng `user_interaction_logs` qua `recordResearchInteraction` service (có idempotency key và không lưu PII).
3. Sau 28 ngày pilot ($\ge 30$ người dùng, $\ge 500$ impressions, $\ge 50$ outcomes):
   - Chạy pipeline: `python -m ai_service.pipeline.real_data_pipeline`
   - Chạy benchmark: `python -m ai_service.evaluation.benchmark_suite --data-source database`
   - Cập nhật số liệu thực vào báo cáo tốt nghiệp.