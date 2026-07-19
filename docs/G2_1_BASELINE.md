# Baseline Checkpoint G2.1

Cập nhật: 18/07/2026. Tài liệu này ghi trạng thái trước khi sửa source trong lượt G2.1.

## 1. Git

- Branch: `checkpoint-g2-real-catalog`.
- HEAD: `d1c736271e2ae683f1c2c299c2c32ce1dfd9ed8d`.
- Remote: `NOT_AVAILABLE` (`git remote -v` không có output).
- `git diff --check`: exit 0; có cảnh báo chuyển LF sang CRLF, không có whitespace error.
- Worktree đã bẩn từ G1 và G2; không reset, checkout, clean hoặc stash.

## 2. Inventory trước G2.1

Phân loại dưới đây dựa trên baseline G1 đã biết, nội dung diff hiện tại và file G2 đã tạo. File `G1_G2_OVERLAP` không thể tách chính xác thành hai commit chỉ bằng Git vì không có commit mốc giữa G1 và G2.

### G1_PREEXISTING

`.dockerignore`, `.env.example`, `Dockerfile`, `actions/community.actions.ts`, `app.py`, `app/admin/page.tsx`, `app/cart/page.tsx`, `app/library/page.tsx`, `app/marketplace/page.tsx`, `app/profile/page.tsx`, `components/Navbar.tsx`, `docs/AI_EVALUATION.md`, `docs/BASELINE_REPORT.md`, `docs/CATEGORY_REPORT.md`, `docs/CHECKPOINT_D_TEST_REPORT.md`, `docs/COVER_V2_REPORT.md`, `docs/DEPLOYMENT.md`, `docs/DEPLOYMENT_R1_1_REPORT.md`, `docs/DEPLOYMENT_R1_REPORT.md`, `scripts/verify_category_integration.ts`, `src/seller_ai.py`, `SECURITY.md`, `config/curated-demo-cover-sources.json`, `data/derived/demo-books-with-local-covers.csv`, `docker-compose.local.yml`, `docker-compose.production.yml`, `docker-compose.test.yml`, `docs/CHECKPOINT_G1_REPORT.md`, `docs/CURATED_REAL_COVERS_REPORT.md`, `docs/DEFENSE_TALK_TRACK.md`, `public/covers/curated-real/`, `scripts/audit_production_mock_policy.mjs`, `scripts/download_curated_demo_covers.ts`, `scripts/test_production_env.mjs`, `scripts/validate-production-env.mjs`, `tests/curated-cover-assets.test.ts`.

### G2

`actions/catalog.actions.ts`, `actions/recommendation.actions.ts`, `ai_service/evaluation/database.py`, `ai_service/main.py`, `app/api/recommendations/route.ts`, `app/catalog/page.tsx`, `ai_service/catalog_scope.py`, `ai_service/tests/test_catalog_scope.py`, `config/real-catalog-category-mapping.json`, `data/real-catalog/`, `docs/REAL_CATALOG_CATEGORY_MAPPING.md`, `docs/REAL_CATALOG_REPORT.md`, `lib/real-catalog-import.ts`, `lib/real-catalog.ts`, `prisma/migrations/20260716235000_add_book_source_metadata/`, `scripts/audit_real_catalog_ui.cjs`, `scripts/import_real_catalog.ts`, `scripts/validate_real_catalog.ts`, `scripts/verify_real_catalog_integration.ts`, `tests/real-catalog-import.test.ts`, `tests/real-catalog.test.ts`.

### G1_G2_OVERLAP

`README.md`, `actions/book-detail.actions.ts`, `actions/book.actions.ts`, `app/book/[id]/page.tsx`, `app/page.tsx`, `components/shared/BookCard.tsx`, `components/shared/BookCover.tsx`, `docs/COVER_SYSTEM.md`, `docs/CURRENT_STATUS.md`, `docs/DATASET_REPORT.md`, `docs/DEMO_GUIDE.md`, `docs/IMPLEMENTATION_PLAN_V2.md`, `docs/TEST_PLAN.md`, `docs/TEST_REPORT.md`, `lib/book-cover.ts`, `package.json`, `package-lock.json`, `prisma/schema.prisma`, `scripts/audit_cover_ui.cjs`, `tests/book-cover.test.ts`.

### UNRELATED và NOT_VERIFIED

- `UNRELATED`: `NOT_AVAILABLE`; chưa phát hiện file ngoài phạm vi dự án.
- `NOT_VERIFIED`: nguồn gốc từng hunk trong các file `G1_G2_OVERLAP`; không được giả vờ tách riêng G1/G2.

## 3. Checksum

| Artifact | SHA-256 | Trạng thái |
|---|---|---|
| `BookVerse_Real_Catalog_3046.zip` | `986824e5a06c8b7125376a4af8ff6c5cce482e9d568ca458dbf6613c3d3255f4` | VERIFIED |
| `bookverse_real_catalog.json` | `79aed37578a638757216af19e80634b9b6ad925ca77fa47f3a55ccfe203bd3a3` | VERIFIED |
| Mapping trước G2.1 | `6bb736fc2280cfab65c8dab3b7f886d070da35d5d6921d31995a8a265e836dbf` | VERIFIED |

## 4. Database read-only

Mọi truy vấn thành công đều chạy bên trong `BEGIN READ ONLY`; `transaction_read_only=on`.

| Count | `bookverse_ai_test` | `bookverse_ai` demo |
|---|---:|---:|
| Book | 5.246 | 1.200 |
| Category | 2.200 | 24 |
| Listing | 2.204 | 1.200 |
| Order | 2.606 | 1.500 |
| Review | 3.600 | 3.500 |
| Interaction | 11.344 | 17.744 |
| InteractionEvent | 18.002 | 18.008 |
| Recommendation | 4.200 | 3.000 |
| DailyRecommendation | 0 | 0 |
| RecommendationRequestItem | 0 | 0 |
| Prisma migration | 13 | 12 |
| `book_source_metadata` | Có | NOT_AVAILABLE |

Test metadata: 3.046 record = 3.044 `WORK` + 2 `EDITION_ONLY`; 34 record thiếu language; 3.044 work key duy nhất; 0 sai `coverRightsStatus`; 0 sai `priceStatus`.

## 5. Phát hiện baseline cần xử lý

Test taxonomy có canonical target trực tiếp cho `fantasy`, `science-fiction`, `mystery`, `biography`, `arts`, `law` và `environment`. Mapping G2 cũ đang dùng target rộng hơn cho các nhóm này, nên kết luận “không có target phù hợp hơn” không còn đúng với source/database hiện tại.

## 6. Command thất bại trong baseline

- `rg` với glob `docker-compose*.yml` trên PowerShell: exit 1 do cú pháp wildcard phía Windows; không tác động file.
- `psql` trực tiếp: exit 1 vì binary không nằm trong `PATH`; không kết nối hoặc ghi database.
- Truy vấn count đầu qua container: exit 1 vì dùng tên Prisma `InteractionEvent` thay vì tên bảng map `interaction_events`; transaction bị rollback. Lượt sửa lại exit 0.
