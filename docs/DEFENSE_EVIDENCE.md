# Bằng chứng Bảo vệ Đồ án — BookVerse AI Hybrid Recommendation

## 1. Trạng thái Tổng quan Hệ thống

| Hạng mục | Trạng thái | Chi tiết kỹ thuật & Bằng chứng kiểm định |
|----------|-----------|------------------------------------------|
| **Database Schema & Migration** | ✅ **INFRASTRUCTURE_READY** | Migration `20260901000000_add_user_interaction_log` đã áp dụng (Additive only, bảo toàn 100% dữ liệu gốc) |
| **Quy trình Thu thập Consent** | ✅ **INFRASTRUCTURE_READY** | `ConsentProvider`, `ConsentBanner`, API `POST /api/consent` theo phiên bản `v1` |
| **Telemetry 9 Luồng Nghiên cứu** | ✅ **INFRASTRUCTURE_READY** | Tích hợp đầy đủ 9/9 events qua `recordResearchInteraction` service với idempotency key nghiệp vụ và không lưu PII |
| **Admin Research Dashboard** | ✅ **INFRASTRUCTURE_READY** | `/admin/research-data`, thống kê consent & tương tác, export ẩn danh CSV/JSON |
| **Pipeline Dữ liệu thật (Python)** | ✅ **INFRASTRUCTURE_READY** | `ai_service/pipeline/real_data_pipeline.py` (Quality gate, dedup, temporal split, IMPRESSION weight = 0.0) |
| **Benchmark Suite Học thuật** | ✅ **INFRASTRUCTURE_READY** | `ai_service/evaluation/benchmark_suite.py` chạy trên bộ dữ liệu chuẩn 2.200 sách (Validation tuning + Test lock) |
| **Database Integration Tests** | ✅ **ALL PASSED (7/7)** | `tests/integration/research-interactions.integration.ts` chạy trên database kiểm thử riêng biệt `bookverse_ai_test` |
| **TypeScript Unit Tests** | ✅ **ALL PASSED (263/263)** | `npm test` toàn bộ pass |
| **Python Pytest Suite** | ✅ **ALL PASSED (82/82)** | `python -m pytest ai_service/tests` toàn bộ pass |
| **Typecheck, Lint & Build** | ✅ **ALL PASSED** | `tsc --noEmit` (0 errors), `eslint` (0 warnings), Next.js production build compiled |
| **Dữ liệu Người dùng Thật** | ⏳ **BLOCKED_BY_DATA (0 records)** | Cam kết trung thực: Hệ thống sẵn sàng thu thập, hiện có 0 tương tác người dùng thật trong DB phát triển (cần pilot 28 ngày) |
| **Hiệu năng Hybrid Thực tế** | ⏳ **NO_PROMOTION** | Trên tập synthetic, Hybrid chưa vượt baseline đơn lẻ; cờ `HYBRID_DYNAMIC_ALPHA=false` được giữ nguyên |

---

## 2. Chi tiết 9 Luồng Thu thập Tương tác Nghiên cứu (Research Tracking)

Tất cả các luồng đều thông qua service chuẩn hóa `recordResearchInteraction` ([`lib/research-interactions-service.ts`](file:///d:/Doantotnghiep/lib/research-interactions-service.ts)):
1. **Chỉ ghi khi đã đăng nhập và đồng ý consent** (`consented = true`, `revokedAt IS NULL`).
2. **Loại bỏ 100% PII** (email, họ tên, địa chỉ, số điện thoại).
3. **Idempotency key nghiệp vụ ổn định** (dùng ID của record vừa tạo, cho phép thao tác mới nhưng chống network retry trùng lặp).
4. **Không chạy telemetry trong transaction** làm hỏng luồng thanh toán hoặc ghi nhận nghiệp vụ chính; **`await` telemetry ngay sau khi commit transaction**.

| # | Event Type | File & Hàm tích hợp | Điều kiện kích hoạt & Dữ liệu ghi | Cấu trúc Idempotency Key |
|---|---|---|---|---|
| 1 | `IMPRESSION` | [`components/recommendation/RecommendationTrackedLink.tsx`](file:///d:/Doantotnghiep/components/recommendation/RecommendationTrackedLink.tsx) | Thẻ sách hiển thị $\ge 50\%$ viewport trong $\ge 500\text{ms}$ **TRONG KHU VỰC GỢI Ý** (bắt buộc có `requestId`). | `imp:${requestId}:${bookId}` |
| 2 | `RECOMMENDATION_CLICK` | [`components/recommendation/RecommendationTrackedLink.tsx`](file:///d:/Doantotnghiep/components/recommendation/RecommendationTrackedLink.tsx) | Người dùng click vào sách trong khu vực gợi ý (bắt buộc có `requestId`). | `click:${requestId}:${bookId}` |
| 3 | `VIEW` | [`components/shared/BookViewTracker.tsx`](file:///d:/Doantotnghiep/components/shared/BookViewTracker.tsx) | Người dùng mở trang chi tiết sách. Dùng `useRef` lưu UUID ổn định cho phiên xem, chống duplicate khi React re-render. | `view:${bookId}:${eventUuid}` |
| 4 | `SEARCH` | [`components/catalog/CatalogSearchTracker.tsx`](file:///d:/Doantotnghiep/components/catalog/CatalogSearchTracker.tsx) | Người dùng tìm kiếm từ khóa hợp lệ. Metadata chỉ chứa query đã sanitize. | `search:${query}:${searchUuid}` |
| 5 | `FAVORITE` | [`actions/library.actions.ts`](file:///d:/Doantotnghiep/actions/library.actions.ts) | Sau khi `favoriteBook.create` commit thành công. | `favorite:${favorite.id}` |
| 6 | `BOOKMARK` | [`actions/reader.actions.ts`](file:///d:/Doantotnghiep/actions/reader.actions.ts) | Sau khi `bookmark.create` commit thành công. `eventValue` là số trang đánh dấu. | `bookmark:${bookmark.id}` |
| 7 | `ADD_TO_CART` | [`actions/marketplace.actions.ts`](file:///d:/Doantotnghiep/actions/marketplace.actions.ts) | Sau khi transaction giỏ hàng commit thành công. | `cart:${orderItem.id}:${quantity}` |
| 8 | `PURCHASE` | [`lib/checkout-service.ts`](file:///d:/Doantotnghiep/lib/checkout-service.ts) & [`actions/seller.actions.ts`](file:///d:/Doantotnghiep/actions/seller.actions.ts) | **CHỈ** sau khi đơn hàng xác nhận `PAID_DEMO` hoặc `COMPLETED`. Tuyệt đối **KHÔNG** ghi đơn `CANCELLED`/`REFUNDED`. | `purchase:${order.id}:${orderItem.id}:${eligibleStatus}` |
| 9 | `RATING` | [`actions/book-detail.actions.ts`](file:///d:/Doantotnghiep/actions/book-detail.actions.ts) | Sau khi lưu đánh giá và `refreshBookRating` thành công. `eventValue` là điểm 1-5 sao. | `rating:${review.id}:${updatedAt}` |

---

## 3. Kết quả Thực nghiệm Học thuật trên Dataset Chuẩn (2.200 Sách, 940 Độc giả)

Thực hiện đánh giá khoa học qua pipeline [`ai_service/evaluation/benchmark_suite.py`](file:///d:/Doantotnghiep/ai_service/evaluation/benchmark_suite.py) trên dataset `data/json/bookverse_ultra_seed_2200.json` (Dataset fingerprint: `a19c20e3227100020bfff94cdea19576368c9646a617aa47721354c7f4102963`):

### 3.1. Phân bổ Phân tầng Người dùng (Cohort Sizes)
- **Tập kiểm thử tổng thể (`all`)**: 940 người dùng
- **Phân tầng `cold_0`**: 0 người dùng
- **Phân tầng `sparse_1_2`**: 0 người dùng
- **Phân tầng `warm_3_plus`**: 940 người dùng

> **Nhận xét khoa học về phân tầng**: Do 100% người dùng đủ điều kiện test thuộc phân tầng `warm_3_plus` ($\ge 3$ interactions lịch sử), Fixed Hybrid và Dynamic Alpha cho kết quả xếp hạng và điểm số giống hệt nhau (NDCG@10 = 0.001865). Dataset synthetic hiện tại không có cohort cold/sparse trong tập test; do đó, hiệu quả phân tầng của Dynamic Alpha **chưa thể được chứng minh** trên tập dữ liệu này.

### 3.2. Bảng Kết quả Độc lập trên Test Set tại K=10 (940 Users)

| Thuật toán | Precision@10 | Recall@10 | HitRate@10 | NDCG@10 | MRR@10 | Catalog Coverage |
|---|---:|---:|---:|---:|---:|---:|
| **Popularity** | 0.001383 | 0.006223 | 0.013830 | **0.003395** | 0.003897 | 0.0065 |
| **Content-based** | 0.000745 | 0.002837 | 0.007447 | **0.001876** | 0.002402 | 0.8180 |
| **Behavior-based (CF)** | 0.001383 | 0.004495 | 0.013830 | **0.002928** | 0.004530 | 0.9660 |
| **Hybrid Production (Fixed)** | 0.000745 | 0.002748 | 0.007447 | **0.001865** | 0.002501 | 0.8125 |
| **Hybrid Dynamic Alpha** | 0.000745 | 0.002748 | 0.007447 | **0.001865** | 0.002501 | 0.8125 |
| **Hybrid RRF** | 0.001596 | 0.005612 | 0.015957 | **0.003088** | 0.003689 | 0.9565 |
| **Random Seeded Sanity** | 0.001702 | 0.005205 | 0.017021 | **0.003601** | 0.005686 | 0.9895 |

### 3.3. Đánh giá Trung thực & Khách quan:
1. **Random Sanity đạt NDCG@10 cao nhất (0.003601)**: Do dữ liệu synthetic thiếu cấu trúc sở thích phân cụm tự nhiên của con người và có tính chất nhiễu phân bố đều.
2. **Ý nghĩa Catalog Coverage**: Hybrid đạt Catalog Coverage cao hơn Popularity (81.25% vs 0.65%), cho thấy danh sách đề xuất phân tán trên nhiều đầu sách hơn. Chỉ số này chưa chứng minh mức độ liên quan, sự hài lòng hoặc khả năng giảm filter bubble trong vận hành thực tế.
3. **Quyết định Feature Flag**: Giữ `HYBRID_DYNAMIC_ALPHA=false` (`NO_PROMOTION`).

---

## 4. Kết quả Kiểm thử Toàn diện

```
1. scripts/cleanup_integration_test_artifacts.ts     --> 0 test artifacts in dev DB
2. npx prisma validate                              --> VALID
3. npm run typecheck                                 --> 0 errors (tsc --noEmit)
4. npm run lint                                      --> 0 warnings (--max-warnings=0)
5. npm test                                          --> 263/263 passed
6. npx tsx --test tests/integration/*.integration.ts --> 19/19 passed (on bookverse_ai_test)
7. python -m pytest ai_service/tests                 --> 82/82 passed
8. python -m ai_service.evaluation.benchmark_suite   --> SUCCESS (Checksum: f8368bd3efd35bbd5addfbab76d69928)
```