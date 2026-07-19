# Inventory thay đổi Checkpoint G2.2 — historical snapshot

Cập nhật: 19/07/2026. Inventory này ghi snapshot trước regression cuối và không thay thế lịch sử Git. Worktree đã dirty trước lượt G2.2 nên không reset hoặc clean; inventory source-current cuối lượt xem phần baseline của báo cáo bàn giao.

## Baseline worktree

- Branch: `checkpoint-g2-real-catalog`.
- HEAD trước lượt: `d1c736271e2ae683f1c2c299c2c32ce1dfd9ed8d`.
- Trước lượt: 47 tracked file modified, 62 untracked; phân loại `G1_PREEXISTING`/`G2_PREEXISTING` và giữ nguyên.
- Không có remote Git.

## File tạo mới thuộc G2.2

- Policy/runtime: `config/cover-policy.json`, `lib/cover-policy.ts`, `lib/recommendation-evidence-policy.ts`.
- Cover audit/review: `scripts/audit_real_catalog_covers.ts`, `scripts/review_real_catalog_cover_dimensions.ts`, `tests/cover-policy.test.ts`.
- Category review: `scripts/review_real_catalog_category_low.ts`, `tests/real-catalog-category-semantic.test.ts`.
- Recommendation provenance: `scripts/audit_recommendation_evidence_provenance.ts`, `tests/recommendation-evidence-policy.test.ts`.
- Tài liệu: `docs/G2_2_CURRENT_REPORT.md`, `docs/G2_2_CHANGE_INVENTORY.md`.

## File sửa giao nhau (đã có thay đổi G1/G2)

Các file này có thay đổi trước đó và được chỉnh tiếp trong G2.2; không tính toàn bộ diff của chúng là công việc mới:

- `actions/recommendation.actions.ts`, `actions/profile.actions.ts`, `app/api/recommendations/route.ts`, `app/page.tsx`, `app/profile/page.tsx`.
- `components/shared/BookCard.tsx`, `components/shared/BookCover.tsx`, `lib/book-card-presentation.ts`, `lib/book-cover.ts`, `actions/book.actions.ts`.
- `README.md`, `package.json`, `docs/CURRENT_STATUS.md`, `docs/REAL_CATALOG_REPORT.md`, `docs/COVER_SYSTEM.md`, `docs/TEST_REPORT.md`, `docs/AI_EVALUATION.md`.

## File không thuộc phạm vi G2.2

- Các thay đổi còn lại trong `git status` được giữ nguyên theo worktree người dùng (`G1_PREEXISTING`/`G2_PREEXISTING` hoặc artefact test trước đó). Không xóa, không ghi đè và không gộp chúng vào kết luận “đã sửa trong lượt này”.
- Các thư mục `outputs/` là bằng chứng sinh ra từ command; không dùng để suy ra dữ liệu người dùng thật.

## Bằng chứng phân loại

- `git status --short` và `git diff --stat` được chạy sau lượt; không có thao tác reset/clean.
- `git diff --check` exit 0.
- Không tạo commit vì Critical cover rights/redirect, REAL_USER provenance và deployment vẫn `PARTIAL`/`NOT_VERIFIED`/`BLOCKED`.
