# BOOKVERSE AI — BÁO CÁO ĐỒ ÁN TỐT NGHIỆP (Phiên bản V2 — Hoàn thiện theo góp ý hội đồng)

> **Đây là phiên bản chính thức V2.** Xem `ACADEMIC_REPORT_DRAFT.md` cho bản gốc.
> Phiên bản này bổ sung: quy trình thu thập dữ liệu chi tiết, phân tích thuật toán đầy đủ, ERD, Deployment Diagram, benchmark hoàn chỉnh, 14 tài liệu tham khảo IEEE, câu hỏi bảo vệ và checklist.

**Sinh viên:** Lương Nguyễn Quốc Tuấn — MSSV: 22050098  
**Giảng viên hướng dẫn:** [Điền họ tên GVHD]  
**Khoa/Trường:** Khoa CNTT, Robot & Trí tuệ nhân tạo — Trường Đại học Bình Dương  
**Năm học:** 2025–2026

---

## Tóm tắt

BookVerse AI giải quyết tình trạng trải nghiệm sách bị phân mảnh giữa tìm kiếm, mua bán, đọc trực tuyến, quản lý tiến độ và hỗ trợ người dùng. Hệ thống được xây dựng theo kiến trúc web và AI microservice, gồm Next.js 15, PostgreSQL 16, Prisma 6 và FastAPI. Ngoài các luồng nghiệp vụ, đồ án triển khai hệ gợi ý kết hợp bốn tín hiệu: nội dung (content-based), hành vi (behavior-based), mua hàng (purchase-based) và độ phổ biến (popularity-based); kết quả được gắn evidence và kiểm soát provenance trước khi hiển thị dưới dạng cá nhân hóa. Trợ lý RAG (Retrieval-Augmented Generation) truy xuất tri thức nghiệp vụ và dữ liệu tài khoản đúng người dùng, có local fallback khi provider ngoài không sẵn sàng.

Về dữ liệu, hệ thống sử dụng kiến trúc hai lớp: (1) dataset tổng hợp 2.200 sách được sinh programmatically để kiểm tra pipeline và thực nghiệm temporal; (2) catalog thật 3.046 bản ghi từ Open Library chuẩn hóa và gắn nhãn nguồn. Quy trình thu thập dữ liệu qua hai kênh: Google Books API và Open Library API, kết hợp pipeline chuẩn hóa, validation và kiểm tra provenance.

Đánh giá recommendation sử dụng temporal split (cutoff 01/06/2026), 7 metric, 3 cohort và rolling backtest 5 cửa sổ. Behavior-based đạt Hit Rate@10 = 0,021008 (cao nhất); Content-based đạt NDCG@10 = 0,006419 (cao nhất). Hybrid production chưa vượt baseline — đồ án báo cáo trung thực và không tuyên bố mô hình đã tối ưu.

**Từ khóa:** hệ gợi ý, RAG, sách điện tử, temporal evaluation, explainability, provenance, Next.js, FastAPI, Open Library, Google Books API.

---

# Chương 1. Giới thiệu

## 1.1 Bối cảnh và động lực

Nền tảng sách số hiện nay tách biệt catalog, thương mại, trình đọc và hỗ trợ người dùng. Sự phân mảnh này khiến hành vi đọc không quay lại quá trình khám phá, còn gợi ý dễ trở thành danh sách phổ biến không cá nhân hóa và không giải thích.

Với một đồ án hướng AI, thách thức không chỉ là xây dựng API recommendation mà còn phải: (a) minh bạch về nguồn gốc và quy trình thu thập dữ liệu, (b) chứng minh dữ liệu nào tạo ra gợi ý, (c) tránh data leakage trong đánh giá, (d) báo cáo trung thực khi metric chưa đạt kỳ vọng.

## 1.2 Bài toán nghiên cứu

| Câu hỏi | Nội dung |
|---|---|
| RQ1 | Làm thế nào xây dựng nền tảng sách đủ nghiệp vụ để tạo ngữ cảnh cho AI? |
| RQ2 | Làm thế nào gợi ý sách có evidence, phân biệt dữ liệu thật với demo/synthetic? |
| RQ3 | Làm thế nào trợ lý trả lời nghiệp vụ và tài khoản mà hạn chế hallucination? |

## 1.3 Mục tiêu và kết quả

| Mục tiêu | Kết quả |
|---|---|
| Xây dựng luồng catalog, marketplace, order, membership, Reader | ✅ 226/226 unit test PASS |
| Thu thập dữ liệu qua 2 kênh có kiểm soát provenance | ✅ Google Books API + Open Library |
| Triển khai recommendation có baseline và evidence | ✅ 5 phương pháp, temporal evaluator |
| Triển khai trợ lý RAG có nguồn và fallback minh bạch | ✅ RAG + local fallback |
| Đánh giá theo thời gian, cohort và 7 metric | ✅ Rolling backtest, leakage assertions |
| Tạo quy trình clean-clone tái lập | ✅ Bootstrap deterministic |

## 1.4 Phạm vi

- Thanh toán: Sandbox (PAID_DEMO), không tiền thật.
- Nội dung đọc: gắn nhãn `NỘI_DUNG_DEMO_BOOKVERSE`.
- Benchmark: dataset synthetic, không tuyên bố hiệu quả production.
- Cover rights: `NOT_VERIFIED`, CTR: `NOT_AVAILABLE`.

## 1.5 Đóng góp chính

1. Kiến trúc full-stack và AI microservice bootstrap tái lập.
2. **Quy trình thu thập dữ liệu hai kênh** (Google Books API + Open Library) với pipeline validation và provenance.
3. Policy kiểm soát evidence/provenance trước khi gắn nhãn cá nhân hóa.
4. Temporal evaluator fail-closed trên database test và transaction read-only.
5. Pipeline validation–ablation–final không tự sửa trọng số production.
6. RAG nghiệp vụ kết hợp tri thức tĩnh, database và ownership.

---

# Chương 2. Cơ sở lý thuyết

## 2.1 Hệ gợi ý (Recommender Systems)

**Collaborative Filtering (CF):** GroupLens [1] là hệ thống CF sớm. User-based CF tìm người dùng tương tự; item-based CF tìm item tương tự qua co-occurrence hành vi.

**Content-Based Filtering:** Sử dụng thuộc tính item và hồ sơ sở thích. Ít phụ thuộc cộng đồng nhưng có thể over-specialization.

**Hybrid Recommender:** Kết hợp nhiều nguồn tín hiệu [2]. Không đảm bảo tự động vượt baseline — thực nghiệm đồ án xác nhận điều này.

**Matrix Factorization:** Biểu diễn user và item trong không gian latent [3] (SVD, ALS, BPR). Hướng phát triển khi có dữ liệu thật đủ dày.

**Behavior-based Co-occurrence:** Item-item similarity dựa trên co-occurrence strong-positive signals. Không cần feature item, chỉ cần lịch sử tương tác.

## 2.2 Đánh giá top-K

Với user `u`, danh sách top-K là `R_u^K`, ground truth là `G_u`, hit `h_u = |R_u^K ∩ G_u|`:

| Metric | Công thức |
|---|---|
| Precision@K | (1/\|U\|) Σ h_u / K |
| Recall@K | (1/\|U\|) Σ h_u / \|G_u\| |
| Hit Rate@K | (1/\|U\|) Σ 1[h_u > 0] |
| NDCG@K | DCG@K / IDCG@K; DCG = Σ rel_i / log₂(i+1) |
| MRR@K | (1/\|U\|) Σ 1/rank_u |
| CatalogCoverage@K | \|∪ R_u^K\| / \|C\| |

Temporal split tránh data leakage [4]. Cohort cold/sparse/warm báo riêng.

## 2.3 Retrieval-Augmented Generation (RAG)

RAG kết hợp mô hình sinh với bộ nhớ ngoài [5]. BookVerse dùng RAG để truy xuất tri thức nghiệp vụ, metadata, chunk đọc theo entitlement và dữ liệu tài khoản có ownership. Không nguồn hợp lệ → fallback hoặc từ chối claim.

## 2.4 System Usability Scale (SUS)

Thang 0–100 từ 10 câu Likert 1–5 [6]. Điểm ≥70: Acceptable; ≥85: Excellent. Đo khả dụng, không đo hiệu quả recommendation.

## 2.5 Bảng thuật ngữ

| Thuật ngữ | Định nghĩa |
|---|---|
| Strong-positive | Purchase hợp lệ, reading ≥300s hoặc ≥50%, bookmark, favorite, review ≥4★ |
| Temporal split | Chia dữ liệu theo thời gian, không ngẫu nhiên |
| Cutoff | Mốc phân tách train/test |
| Candidate catalog | Sách hợp lệ tại cutoff |
| Evidence | Lý do cụ thể tại sao gợi ý sách này |
| Provenance | Nguồn gốc và điều kiện tạo ra dữ liệu, evidence |
| CTR | Click-Through Rate = click / impression |
| SYNTHETIC_DATA | Dữ liệu sinh programmatically, không phải hành vi thật |
| REAL_USER_DATA | Dữ liệu từ người dùng thật có consent |

---

# Chương 3. Phân tích yêu cầu

## 3.1 Tác nhân

- **Khách (Guest):** Xem catalog, tìm kiếm, đọc thử.
- **Độc giả (Reader):** Mua/đọc, bookmark, highlight, tiến độ, trợ lý.
- **Người bán (Seller):** Listing, đơn hàng, doanh thu.
- **Quản trị (Admin):** Kiểm duyệt, analytics, audit.
- **AI Service (FastAPI):** Xếp hạng recommendation theo dữ liệu được phép.
- **Provider LLM (tùy chọn):** Sinh câu trả lời từ context đã xác minh.

## 3.2 Yêu cầu chức năng

| Mã | Yêu cầu | Tiêu chí |
|---|---|---|
| FR-01 | Tìm kiếm sách | Tiếng Việt không dấu, ISBN, typo nhẹ |
| FR-02 | Recommendation | Top-K, evidence, version, request tracking |
| FR-03 | Reader | Server cấp nội dung theo entitlement |
| FR-04 | Membership | Sandbox idempotent, cấp quyền sau PAID_DEMO |
| FR-05 | Marketplace | Chặn self-purchase, oversell, checkout trùng |
| FR-06 | Assistant/RAG | Câu trả lời có nguồn, bảo vệ ownership |
| FR-07 | Admin | Phân quyền server-side, audit trail |
| FR-08 | Community | Review, bookmark, highlight, comment |
| FR-09 | Telemetry | Impression, click, conversion với attribution |

## 3.3 Yêu cầu phi chức năng

| Mã | Yêu cầu | Tiêu chí |
|---|---|---|
| NFR-01 | Bảo mật | Password hash, no secret in UI, rate limit |
| NFR-02 | Nhất quán | Transaction + unique constraint payment |
| NFR-03 | Khả dụng | Responsive 375–1440px, WCAG 2 A/AA |
| NFR-04 | Hiệu năng | p95 < 3s, error rate < 2% |
| NFR-05 | Tái lập | Migration, seed deterministic, versioned evaluation |
| NFR-06 | Minh bạch | Demo data, cover rights, AI status labeled |
| NFR-07 | An toàn dữ liệu | Guard database name, no overwrite source |

---

# Chương 4. Thiết kế hệ thống

## 4.1 Kiến trúc tổng thể

```
Browser (Desktop 1280×720 / Mobile 375×812)
       │ HTTPS
Next.js 15 App Router
  ├── Server Components (session, business logic)
  ├── Route Handlers (REST API)
  └── Server Actions (form, mutation)
       │ Prisma ORM
PostgreSQL 16 + pgvector
  ├── bookverse_ai (demo)
  ├── bookverse_ai_test (evaluation)
  └── bookverse_e2e_test (E2E isolated)
       │ READ ONLY snapshot
FastAPI (AI Microservice)
  ├── Recommendation Engine
  └── Temporal Evaluator (fail-closed, read-only)
       │ (optional)
Provider LLM (OpenAI / Gemini) → Local fallback
```

## 4.2 Entity Relationship Diagram (ERD)

```
User ─1:N─► ReadingSession (userId, bookId, timeSpent, progressPct)
User ─1:N─► Bookmark       (userId, bookId, pageNumber)
User ─1:N─► Order          (userId, status, totalAmount)
             └─1:N─► OrderItem (orderId, bookId, quantity, priceSnapshot)
User ─1:N─► InteractionEvent
             (userId, bookId, eventType[canonical], timestamp,
              collectionContext, pilotId, consentVersion)
User ─1:N─► RecommendationRequest
             (requestId, userId, timestamp, algorithmVersion,
              taxonomyVersion, surface)
             └─1:N─► RecommendationRequestItem
                      (requestId, bookId, position, score)
                      └─1:N─► RecommendationEvidence
                               (sourceType, reason, sourceBookId,
                                taxonomyVersion, provenance)
User ─1:N─► ChatSession ─1:N─► ChatMessage
             (sessionId, role, content, bookContext, sources)

Book ─N:1─► Category (id, name, parentId)  [hierarchy 2 cấp]
Book ─1:1─► BookSourceMetadata
             (sourceProvider=OPEN_LIBRARY, sourceRecordKey,
              sourceWorkKey, coverRightsStatus=NOT_VERIFIED)
Book ─1:N─► BookEdition ─1:N─► DigitalAsset
Book ─1:N─► ReadingEntitlement (userId, bookId, type, expiresAt)
Book ─1:N─► BookChunk (content, embedding[pgvector], contentLabel)
```

## 4.3 Deployment Diagram (Docker Compose)

```
┌─── Docker Compose Host ────────────────────────────────────────┐
│                                                                │
│  [db] pgvector/pgvector:pg16                                  │
│       Port 5432 (internal) / 5433 (host, test)               │
│       Volume: pgdata                                          │
│       DB: bookverse_ai | bookverse_ai_test                    │
│                │ TCP 5432                                     │
│  [web] Next.js 15 — Port 3000                                 │
│        Env: DATABASE_URL, NEXTAUTH_SECRET, ...               │
│        depends_on: db (service_started)                       │
│                │ HTTP 8000                                    │
│  [ai_service] FastAPI + Uvicorn — Port 8000                  │
│               Env: DATABASE_URL (read-only snapshot)          │
│               depends_on: db (service_started)                │
│                                                               │
│  Demo Bootstrap (isolated, port 55432):                      │
│  PostgreSQL isolated │ Next.js dev │ AI Service :8800         │
└───────────────────────────────────────────────────────────────┘
                │ (optional external)
         Provider LLM (OpenAI / Gemini)
```

**Lưu ý:** `depends_on: service_started` chưa có healthcheck; FastAPI public port 8000 cần thêm auth trước production.

## 4.4 Luồng recommendation

```
[1] Lấy catalog hợp lệ (Book.ACTIVE, createdAt < cutoff, không có BookSourceMetadata)
[2] Build preference từ event train: affinity category/author, co-occurrence, purchase
[3] Score = w_cat×category + w_auth×author + w_purchase×purchase + w_pop×popularity
    (w: reading_category=12, reading_author=6, purchase=8, popularity=3)
[4] Xếp hạng deterministic, loại item đã xem trong train
[5] Diversity policy (phân bố category)
[6] Lưu RecommendationRequest + Item + Evidence
```

---

# Chương 5. Thu thập và xử lý dữ liệu

## 5.1 Kiến trúc dữ liệu hai lớp

| Lớp | Dataset | Nguồn | Nhãn | Quy mô | Mục đích |
|---|---|---|---|---|---|
| 1 | Ultra Synthetic | Script Python | `SYNTHETIC_DATA` | 2.200 sách + 18.000 events | Test pipeline, temporal eval |
| 2 | Real Curated (G2) | Open Library API | `SOURCE_METADATA_VERIFIED` | 3.046 bản ghi | Pipeline provenance, demo UI |

## 5.2 Kênh 1 — Google Books API

### Quy trình thu thập

```
Bước 1: 12 từ khóa tiếng Việt
        "tiểu thuyết VN", "kinh doanh", "tâm lý học",
        "lịch sử VN", "kỹ năng sống", "khoa học",
        "giáo dục", "văn học VN", "thiếu nhi",
        "khởi nghiệp", "quản trị", "công nghệ"
            │
Bước 2: API call
        GET https://www.googleapis.com/books/v1/volumes
        Params: q=<keyword>, maxResults=40, startIndex=<page>,
                langRestrict=vi, printType=books
        3 trang/từ khóa × 40 = tối đa 120 sách/từ khóa
        Rate limit: delay 0,3s; timeout 20s
            │
Bước 3: Lọc và chuẩn hóa
        • Bỏ thiếu title hoặc ảnh bìa
        • Deduplicate: (title.lower, author.lower)
        • Strip HTML từ description
        • Chuẩn hóa URL: http → https
        • ID tuần tự B021, B022, ...
        • Giá random 50.000–300.000 VNĐ [SYNTHETIC_DEMO_PRICE]
        • categoryId random C01–C12 [DEMO_CATEGORY]
            │
Bước 4: Ghi data/demo/books.csv (UTF-8 no BOM)
        Backup data/demo/books.csv.bak nếu chưa có
```

**Nhãn bắt buộc:** `SYNTHETIC_DEMO_PRICE`, `DEMO_CATEGORY`, `RIGHTS_NOT_VERIFIED`.  
**Kết luận:** Chỉ dùng cho demo giao diện, không làm benchmark.

## 5.3 Kênh 2 — Open Library API

### Quy trình thu thập

```
Bước 1: Định nghĩa phạm vi (catalog_scope.py)
        Subject queries: fiction, science, history, technology,
                         psychology, business, education
        Ưu tiên: language=Vietnamese (259 records)
            │
Bước 2: Thu metadata
        API: openlibrary.org/search.json
             openlibrary.org/works/{key}.json
        Fields: work key, title, authors, subjects,
                first_publish_year, isbn, covers, description, languages
        Rate limit: delay 0,5s; retry 3× exponential backoff
            │
Bước 3: Chuẩn hóa + validation
        • Normalize work key: /works/OL...W
        • Validate ISBN (format + checksum)
        • Phân loại: WORK (3.044) | EDITION_ONLY (2)
        • Thiếu language: NOT_AVAILABLE (34 records)
        • Canonical category: 39 subjects → 27 root
        • Giá: SYNTHETIC_DEMO_PRICE
            │
Bước 4: Audit cover URL (strict policy v4)
        Chỉ chấp nhận: https://covers.openlibrary.org
        Concurrency: 2; delay: 250ms; retry: 2
        Kết quả: 687 HTTP_VERIFIED,
                 2.335 INVALID_CONTENT (redirect ngoài allowlist),
                 24 INVALID_DIMENSION
        Quyền ảnh: NOT_VERIFIED
            │
Bước 5: 3 chế độ pipeline
        validate-only → dry-run → execute
        Output: data/real-catalog/bookverse_real_catalog.json
        SHA-256 catalog: 79aed37578a638757216af19e80634b9b6ad925...
        ZIP SHA-256: 986824e5a06c8b7125376a4af8ff6c5cce482e9d...
```

### Thống kê catalog thật (G2)

| Chỉ số | Giá trị |
|---|---|
| Tổng bản ghi | 3.046 |
| Open Library work | 3.044 |
| Edition-only | 2 |
| Tác giả duy nhất | 3.260 |
| Category nguồn | 39 → 27 canonical |
| ISBN duy nhất | 2.343 |
| Ấn bản tiếng Việt | 259 |
| Thiếu language | 34 (NOT_AVAILABLE) |
| Orphan Book–Author/Category | 0/0 |

### Import idempotency

| Lượt | Insert | Update | Unchanged | Reject |
|---|---:|---:|---:|---:|
| Dry-run | 3.046 dự kiến | 0 | 0 | 0 |
| Execute 1 | 3.046 | 0 | 0 | 0 |
| Execute 2 | 0 | 0 | 3.046 | 0 |

## 5.4 Dataset tổng hợp — thống kê và hạn chế

### Thành phần

| Thành phần | Số lượng |
|---|---:|
| Book | 2.200 |
| Category gốc (43) + con (2.157) | 2.200 |
| InteractionEvent (synthetic) | 18.000 |
| ReadingSession | 6.200 |
| Bookmark | 2.799 |
| Favorite | 48 |
| Review | 3.600 |
| OrderItem | 4.714 |
| Positive sau policy | 14.799 |
| Positive train (< cutoff) | 12.206 |
| Positive test (≥ cutoff) | 2.593 |

**SHA-256 dataset:** `e1e7b7d29f659fa9ea9272ce5ab1ca28095e289b0cc170d8f93e43221acf0047`

### Hạn chế quan trọng

| Vấn đề | Tác động |
|---|---|
| Description trùng (2.200 cùng nội dung) | Không dùng semantic embedding |
| Timestamp synthetic (nhiều trùng) | Temporal split kém ổn định |
| Interaction type không thống nhất | Taxonomy alias normalization bắt buộc |
| 1.587 PURCHASE thiếu orderId | Loại khỏi strong-positive |
| 4.191/4.200 recommendation không có positive | Không dùng làm ground truth |

## 5.5 Policy positive label

```
STRONG POSITIVE (ground truth):
  ✓ Purchase: OrderItem + Order ∈ {PAID, PAID_DEMO, SHIPPED, COMPLETED} + qty > 0
  ✓ ReadingSession: timeSpent ≥ 300s HOẶC progressPercent ≥ 50%
  ✓ Bookmark, Favorite: tất cả
  ✓ Review: rating ≥ 4★

LOẠI BỎ:
  ✗ VIEW, SEARCH, CART_ADD, COMMENT, REACTION, HIGHLIGHT, CHATBOT_QUERY
  ✗ InteractionEvent.PURCHASE (thiếu orderId)
  ✗ Order ∈ {PENDING, CANCELLED, REFUNDED}
```

## 5.6 Safety guard và provenance

```
Safety guard (bắt buộc):
  1. Parse DATABASE_URL → lấy database name
  2. Chỉ chấp nhận: ALLOWED_DESTRUCTIVE_DATABASES=bookverse_ai_test
  3. Fail-closed mặc định, không log password
  4. Evaluator: transaction READ ONLY

Provenance claim (đủ 8 trường):
  REAL_USER_DATA + Interaction ID + Owner user + Event type (canonical)
  + Source book/category/author + Timestamp + Taxonomy version + Algorithm version
  → Thiếu 1 trường: UI nhãn trung tính (không claim cá nhân hóa)

Trạng thái hiện tại:
  8.400 evidence = 0 REAL_USER_DATA, 8.400 MISSING_PROVENANCE
  → UI trung tính toàn bộ
```

---

# Chương 6. Thiết kế thuật toán recommendation

## 6.1 Phương pháp 1 — Popularity-based

**Công thức:**
```
popularity(b) = Σ interaction_score(b)
              + 2 × sessions(b) + 3 × bookmarks(b) + 4 × purchases(b)
```
**Độ phức tạp:** O(|events|) build; O(|catalog|) query.  
**Cold-start:** Tốt (không cần lịch sử cá nhân). **Cá nhân hóa:** Không.

## 6.2 Phương pháp 2 — Content-based

**Công thức:**
```
affinity_cat(u, c) = Σ_{e∈train(u)} w_e × 1[book(e).cat = c]
affinity_auth(u, a) = Σ_{e∈train(u)} w_e × 1[book(e).author = a]

content_score(u, b) = affinity_cat(u, b.cat) + affinity_auth(u, b.author)

Trọng số w_e: reading_category=12, reading_author=6, bookmark=4, purchase=8
```
**Độ phức tạp:** O(|train|) build profile; O(|catalog|) query.

## 6.3 Phương pháp 3 — Behavior-based (Item-Item CF)

**Công thức:**
```
cooccur(i, j) = |users_positive(i) ∩ users_positive(j)|

sim(i, j) = cooccur(i, j) / (√|users(i)| × √|users(j)|)   [cosine]

behavior_score(u, b) = Σ_{item∈positive_train(u)} sim(item, b)
```
**Độ phức tạp:** O(|users|×|items|²) build; O(|positive_train|×|catalog|) query.

## 6.4 Phương pháp 4 — Hybrid production

**Công thức:**
```
score = 12 × Σ cat_affinity + 6 × Σ auth_affinity
      + 8 × Σ purchase_cat_affinity + 3 × popularity_score

Bonus: reading_time = min(timeSpent/300, 8)
       bookmark × 4; READ/BOOKMARK/VIEW × 3/4/1
```
**Vấn đề xác định:** Thiếu item-item co-occurrence; Content–Behavior Jaccard = 0,004, Spearman = −0,641.

## 6.5 So sánh tổng hợp

| Đặc điểm | Popularity | Content | Behavior | Hybrid |
|---|:---:|:---:|:---:|:---:|
| Cold-start | ✅ | ❌ | ❌ | ❌ |
| Cá nhân hóa | ❌ | ✅ | ✅ | ✅ |
| Diversity | ❌ | ⚠️ | ✅ | ⚠️ |
| Giải thích được | ⚠️ | ✅ | ⚠️ | ✅ |
| Độ phức tạp | Thấp | Trung bình | Cao | Cao |

---

# Chương 7. Thực nghiệm và đánh giá

## 7.1 Thiết kế thực nghiệm

**Temporal split:**
```
cutoff = 2026-06-01T00:00:00 UTC
train  = timestamp < cutoff  → 12.206 positive, 1.100 users
test   = timestamp ≥ cutoff  → 2.593 positive, 952 users đủ điều kiện
```

**Ba cửa sổ (F1):**

| Window | Khoảng | Positive | Users | Books |
|---|---|---:|---:|---:|
| Train | < 06/2026 | 12.206 | 1.100 | 2.189 |
| Validation | 06/01 – 06/20 | 1.405 | 759 | 1.032 |
| Final test | ≥ 06/20 | 1.188 | 687 | 883 |

**Cohort:**

| Cohort | Users | Định nghĩa |
|---|---:|---|
| cold_0 | 12 | 0 item trong train |
| sparse_1_2 | 1 | 1–2 item |
| warm_3_plus | 939 | ≥3 item |
| Tổng đủ điều kiện | 952 | |

**Assertion chống leakage (tất cả PASS):** max(train_ts) < min(test_ts), event ID trùng = 0, future event = 0, cancelled purchase = 0, held-out trong train = 0, future popularity = 0.

## 7.2 Kết quả benchmark chính (K=10, all cohort)

| Phương pháp | Precision | Recall | Hit Rate | NDCG | MRR | Coverage |
|---|---:|---:|---:|---:|---:|---:|
| Popularity | 0,001366 | 0,006197 | 0,013655 | 0,003516 | 0,004230 | 0,0065 |
| Content | 0,002416 | **0,010812** | 0,019958 | **0,006419** | **0,006625** | 0,2065 |
| Behavior | **0,002521** | 0,010530 | **0,021008** | 0,005374 | 0,005089 | **0,9665** |
| Hybrid production | 0,000840 | 0,002451 | 0,008403 | 0,001496 | 0,002188 | 0,1995 |
| Random seeded | 0,001050 | 0,005252 | 0,010504 | 0,002367 | 0,002683 | 0,9900 |

**Tóm tắt:** Behavior tốt nhất Hit Rate và Coverage; Content tốt nhất Recall/NDCG/MRR; Hybrid thua tất cả baseline riêng lẻ.

## 7.3 Research evaluation — Final (30/07/2026)

| Phương pháp | NDCG@10 | Recall@10 | Hit Rate@10 | Coverage@10 |
|---|---:|---:|---:|---:|
| Validation selected (no_reading_category) | 0,002512 | 0,004902 | 0,005602 | 0,222 |
| Final selected | 0,002361 | 0,003234 | 0,005970 | 0,210 |
| Final production | 0,003954 | 0,006070 | 0,010448 | 0,184 |
| Final content | **0,006719** | 0,012662 | 0,020896 | 0,189 |
| Final behavior | 0,006450 | **0,013358** | **0,020896** | **0,925** |

**Nhận xét:** Profile thắng validation không tổng quát hóa sang final → `NO_PROMOTION`. Bằng chứng pipeline ngăn overfitting đi vào production.

## 7.4 Rolling temporal backtest (5 cửa sổ, mean±std NDCG@10)

| Phương pháp | NDCG@10 |
|---|---|
| Behavior | 0,003560±0,001365 |
| Hybrid production | 0,003521±0,001852 |
| RRF Behavior-focused (ứng viên) | 0,003551±0,001376 |
| Random sanity (25 obs.) | 0,003607±0,002136 |

**Phân tích thất bại Hybrid:** Jaccard top-10 = 0,003620; Spearman = −0,641479; coverage reading score = 35,34% trung bình. Quyết định: `REJECT_CANDIDATE`, `RETAIN_CURRENT_PENDING_NEW_UNSEEN_DATA`.

## 7.5 Runtime latency

| Phương pháp | Avg (ms/user) | p95 (ms/user) |
|---|---:|---:|
| Random | 0,708 | 1,159 |
| Behavior | 2,385 | 4,054 |
| Popularity | 2,796 | 4,387 |
| Content | 6,025 | 9,674 |
| Hybrid | 9,449 | 14,550 |

## 7.6 Load test (production build local)

| Route | p95 (ms) | Error |
|---|---:|---:|
| Trang chủ | 344,31 | 0% |
| Catalog | 94,58 | 0% |
| API Marketplace | 30,89 | 0% |

Ngưỡng: p95 ≤ 3.000ms, error ≤ 2%. **Tất cả đạt.**

## 7.7 Minh chứng tính tái lập

Hai lượt chạy độc lập → cùng checksum: `ef61b3fc02a4d18735fa3d446815d910bbadb989fdfd7d6286dca6b4fc8c568e`

Manifest F1: `545b12103c6f3c058363cc4249c6c7e419b4ed848a29e456d6c572e5f3e39df8`

## 7.8 Giới hạn và threats to validity

| # | Giới hạn | Tác động |
|---|---|---|
| 1 | Dataset synthetic, không phải log thật | Metric chưa đại diện production |
| 2 | Không có snapshot lịch sử Book/Category | Dùng trạng thái ACTIVE hiện tại |
| 3 | CTR = NOT_AVAILABLE | Chưa có impression log thật |
| 4 | Cold cohort 12 user, sparse 1 user | Kết luận cold-start yếu |
| 5 | Final test đã được quan sát | Không còn truly unseen |

**Quyết định hiện hành: `BLOCKED_BY_DATA`** — cần ≥30 user consented và ≥500 impression thật.

---

# Chương 8. Kiểm thử

## 8.1 Unit test TypeScript — 226/226 PASS

Bao phủ: contract trợ lý, ownership, entitlement, checkout, stock, category, catalog, cover, telemetry, temporal split, migration policy, security. Lint 0 warning; typecheck strict.

## 8.2 Python test — 44/44 PASS

43 unit (không cần DB) + 1 integration (cần `bookverse_ai_test` + `RUN_EVALUATION_INTEGRATION=1`).

## 8.3 E2E test — 46/46 PASS (Playwright)

| Suite | Desktop | Mobile |
|---|:---:|:---:|
| Smoke (14) | ✅ 14/14 | ✅ 14/14 |
| Telemetry (14) | ✅ 14/14 | ✅ 14/14 |
| Accessibility WCAG 2 A/AA (18) | ✅ 9/9 | ✅ 9/9 |

Môi trường: Chrome 1280×720 + Pixel 5 375×812. Database `bookverse_e2e_test` cô lập (tạo/xóa trong finally).

## 8.4 UAT/SUS

| Kế hoạch | Trạng thái |
|---|---|
| 6 task, 10 câu SUS, analyzer CI 95% | Đã thiết kế |
| Kết quả thật | **NOT_AVAILABLE** — chờ UAT người dùng thật |

---

# Chương 9. Triển khai và tái lập

## 9.1 Công nghệ

| Lớp | Công nghệ | Phiên bản |
|---|---|---|
| Frontend | Next.js, React, TypeScript | 15.5.20, 19, 5.9.3 |
| Auth | Auth.js/NextAuth | 5 beta.31 |
| ORM | Prisma | 6.19.3 |
| Database | PostgreSQL + pgvector | 16 |
| AI service | FastAPI, Uvicorn | latest |
| Container | Docker Compose | latest |
| Testing | Playwright, Node test runner, pytest | latest |

## 9.2 Bootstrap demo

```powershell
npm ci
npm run demo:bootstrap   # DB :55432, migrate, seed, content, membership
                          # Kết quả: 10 PASS, 0 WARN, 0 FAIL
npm run demo:start        # AI service :8800
```

## 9.3 Release gate (tất cả phải PASS)

```
lint → typecheck → 226 unit TypeScript → 44 Python → build → 46 E2E → demo:defense
```

## 9.4 Phương án dự phòng khi bảo vệ

- Video offline demo + ảnh chụp dashboard + log test
- Provider LLM lỗi → local fallback (degraded=true)
- Thanh toán: Sandbox (không cần internet)
- Database demo có dump phục hồi

---

# Chương 10. Kết luận và hướng phát triển

## 10.1 Kết luận

BookVerse AI chứng minh khả năng xây dựng full-stack platform kết hợp nghiệp vụ sâu, kiểm soát quyền và tích hợp AI có thể kiểm tra:

1. **Quy trình thu thập dữ liệu có kiểm soát:** 2 kênh, pipeline validation, provenance labeling, safety guard.
2. **Đánh giá recommendation đúng phương pháp:** temporal split, 3 cửa sổ, 7 metric, 3 cohort, leakage assertions, tái lập.
3. **Báo cáo trung thực:** Hybrid thua baseline (Hit Rate@10 = 0,84% vs Behavior = 2,1%). Công bố thất bại định hướng phát triển đúng.
4. **Kiểm soát provenance:** 0 REAL_USER_DATA → UI trung tính toàn bộ.
5. **Kiểm thử toàn diện:** 226 + 44 + 46 test đều PASS.

## 10.2 Hướng phát triển

| Ưu tiên | Hành động |
|---|---|
| P1 | Thu interaction thật có consent (≥30 user, ≥28 ngày) |
| P1 | Hoàn thành UAT/SUS với người dùng thật |
| P1 | Đưa behavior score vào Hybrid (RRF Behavior-focused) |
| P2 | Matrix Factorization (BPR/ALS) khi đủ dữ liệu |
| P2 | Đánh giá online với impression/click thật |
| P3 | Healthcheck Docker, service auth FastAPI, secret injection |

---

# Tài liệu tham khảo

[1] P. Resnick et al., "GroupLens: An Open Architecture for Collaborative Filtering of Netnews," *Proc. ACM CSCW*, 1994, pp. 175–186. https://doi.org/10.1145/192844.192905

[2] R. Burke, "Hybrid Recommender Systems: Survey and Experiments," *User Modeling and User-Adapted Interaction*, vol. 12, no. 4, pp. 331–370, 2002. https://doi.org/10.1023/A:1021240730564

[3] Y. Koren, R. Bell, C. Volinsky, "Matrix Factorization Techniques for Recommender Systems," *Computer*, vol. 42, no. 8, pp. 30–37, 2009. https://doi.org/10.1109/MC.2009.263

[4] Y.-M. Tamm, R. Damdinov, A. Vasilev, "Quality Metrics in Recommender Systems: Do We Calculate Metrics Consistently?", 2022. https://arxiv.org/abs/2206.12858

[5] P. Lewis et al., "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks," *NeurIPS*, 2020. https://arxiv.org/abs/2005.11401

[6] J. Brooke, "SUS: A Quick and Dirty Usability Scale," in *Usability Evaluation in Industry*, Taylor & Francis, 1996, pp. 189–194.

[7] F. M. Harper, J. A. Konstan, "The MovieLens Datasets: History and Context," *ACM TiiS*, vol. 5, no. 4, 2015. https://doi.org/10.1145/2827872

[8] S. Rendle et al., "BPR: Bayesian Personalized Ranking from Implicit Feedback," *UAI*, 2009. https://arxiv.org/abs/1205.2618

[9] Open Library, Internet Archive. https://openlibrary.org/developers/api (truy cập 2026)

[10] Google Books API. https://developers.google.com/books/docs/v1/using (truy cập 2026)

[11] Vercel, "Next.js App Router Documentation," https://nextjs.org/docs/app (2026)

[12] FastAPI Documentation. https://fastapi.tiangolo.com/ (2026)

[13] Prisma ORM Documentation. https://www.prisma.io/docs/ (2026)

[14] pgvector: Open-source vector similarity search for PostgreSQL. https://github.com/pgvector/pgvector (2026)

---

# Phụ lục A — Danh sách từ viết tắt

| Viết tắt | Đầy đủ |
|---|---|
| API | Application Programming Interface |
| CF | Collaborative Filtering |
| CTR | Click-Through Rate |
| DCG | Discounted Cumulative Gain |
| E2E | End-to-End |
| ERD | Entity Relationship Diagram |
| LLM | Large Language Model |
| MRR | Mean Reciprocal Rank |
| NDCG | Normalized Discounted Cumulative Gain |
| ORM | Object-Relational Mapping |
| RAG | Retrieval-Augmented Generation |
| RRF | Reciprocal Rank Fusion |
| SUS | System Usability Scale |
| UAT | User Acceptance Testing |
| WCAG | Web Content Accessibility Guidelines |

---

# Phụ lục B — Câu hỏi bảo vệ và gợi ý trả lời

**Q1: Dữ liệu của bạn có đại diện người dùng thật không?**  
→ Hai lớp: (1) 2.200 sách synthetic dùng test pipeline, (2) 3.046 bản ghi Open Library là metadata thư mục thật. Interaction synthetic → gắn nhãn SYNTHETIC_DATA, không tuyên bố đại diện production. CTR = NOT_AVAILABLE vì chưa có impression thật.

**Q2: Quy trình thu thập dữ liệu như thế nào?**  
→ Kênh 1 — Google Books API: 12 từ khóa tiếng Việt, 3 trang/từ khóa, filter langRestrict=vi, deduplicate, strip HTML → CSV demo. Kênh 2 — Open Library: subject queries, validate work key, audit cover URL strict policy, 3 chế độ (validate-only/dry-run/execute), ghi BookSourceMetadata → catalog 3.046 bản ghi.

**Q3: Tại sao Hybrid thua baseline riêng lẻ?**  
→ Ba nguyên nhân xác định: (1) Hybrid không có item-item co-occurrence; (2) Content–Behavior Jaccard = 0,004, Spearman = −0,641 — gần như ranking ngược chiều; (3) Category/author score thô tạo tie và xung đột. Không sửa trọng số vì cần validation window riêng.

**Q4: Tại sao không tính CTR?**  
→ CTR cần impression log thật (card thấy ≥50% viewport liên tục ≥1 giây). 18.000 event là synthetic, không có impression. Infrastructure đã xây sẵn (RECOMMENDATION_IMPRESSION event), cần data pilot có consent.

**Q5: Temporal split là gì và tại sao dùng?**  
→ Chia dữ liệu theo thời gian (cutoff 01/06/2026) thay vì ngẫu nhiên. Tránh đưa event tương lai vào feature train (data leakage). 7 assertion kiểm tra chống leakage, tất cả PASS.

**Q6: Làm thế nào biết kết quả tái lập?**  
→ Hai lượt chạy độc lập cùng input/config/seed cho cùng checksum chuẩn hóa. Runtime/output path/timing không tham gia checksum. Output lưu trong folder timestamped riêng, không ghi đè.

**Q7: Tại sao Random seeded đôi khi thắng Hybrid?**  
→ Dữ liệu synthetic có tín hiệu dự đoán yếu. Variance temporal cao → recommender ngẫu nhiên tình cờ match ground truth. Paired Random–Behavior: mean +0,000047, std 0,002014 — không có ý nghĩa thống kê mạnh.

**Q8: FastAPI và Next.js tách nhau có lợi gì?**  
→ (1) Scale độc lập; (2) Python ecosystem ML tốt hơn; (3) Evaluator và service cùng runtime; (4) Fail-closed: FastAPI lỗi → Next.js fallback về sách mới nhất.

**Q9: pgvector dùng để làm gì?**  
→ Lưu book embedding (vector từ OpenAI/Gemini) và tìm kiếm cosine similarity cho RAG. Khi user hỏi trợ lý, vector search tìm chunk sách liên quan thay vì full-text.

**Q10: Hướng phát triển tiếp theo là gì?**  
→ Ưu tiên: (1) Thu interaction thật có consent (≥30 user); (2) UAT/SUS người dùng thật; (3) Đưa behavior vào Hybrid (RRF Behavior-focused); (4) Matrix Factorization khi đủ dữ liệu; (5) Đánh giá online có impression/click thật.

---

# Phụ lục C — Checklist hoàn thiện theo góp ý hội đồng

| Góp ý hội đồng | Hành động bổ sung | Trạng thái |
|---|---|---|
| Bổ sung phân tích thuật toán | Chương 6: Công thức đầy đủ, complexity, so sánh ưu/nhược 4 phương pháp | ✅ |
| Dữ liệu thực nghiệm và benchmark | Chương 7: 7 metric, 5 phương pháp, cohort 3 nhóm, rolling backtest | ✅ |
| Bổ sung ERD | Mục 4.2: ERD đầy đủ 12 bảng chính | ✅ |
| Bổ sung Deployment Diagram | Mục 4.3: Docker Compose 3 service + demo bootstrap | ✅ |
| Minh chứng chỉ số đánh giá | Bảng đầy đủ + checksum tái lập + 7 leakage assertions | ✅ |
| Chuẩn hóa thuật ngữ | Mục 2.5 + Phụ lục A (15 viết tắt) | ✅ |
| Tài liệu tham khảo chuẩn IEEE | 14 tài liệu theo chuẩn IEEE | ✅ |
| Quy trình thu thập dataset | Chương 5: Diagram chi tiết 2 kênh, policy, safety guard | ✅ |
| Câu hỏi bảo vệ | Phụ lục B: 10 câu hỏi + gợi ý trả lời | ✅ |
