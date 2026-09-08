# Điều tra source identity Open Library G2.1

Thời điểm kiểm tra: `18/07/2026 14:47 UTC`. Nguồn kiểm tra là endpoint chính thức của Open Library. Artifact ZIP/JSON gốc không bị sửa.

## Kết luận

Acceptance criterion được xác nhận theo dữ liệu thực tế:

> **3.046 source record = 3.044 WORK + 2 EDITION_ONLY**

Không có quan hệ trực tiếp đủ bằng chứng để đổi `RB00583` hoặc `RB00822` thành `WORK`. Hai record tiếp tục giữ `sourceRecordType=EDITION_ONLY`, `sourceWorkKey=null` và raw key gốc.

## Bằng chứng

| Book | Edition/record key | ISBN | Endpoint chính | HTTP/final | Trường `works` | Kết luận |
|---|---|---|---|---|---|---|
| RB00583 | `/books/OL8461625M` | `9781417934621` | `https://openlibrary.org/books/OL8461625M.json` | 200, giữ edition endpoint | NOT_AVAILABLE | EDITION_ONLY |
| RB00583 | `/books/OL8461625M` | `9781417934621` | `https://openlibrary.org/isbn/9781417934621.json` | 200, final `/books/OL8461625M.json` | NOT_AVAILABLE | EDITION_ONLY |
| RB00583 | raw `/works/OL8461625M` | `9781417934621` | `https://openlibrary.org/works/OL8461625M.json` | 200, bị chuyển về `/books/OL8461625M.json` | NOT_AVAILABLE | Không phải work key dạng W |
| RB00822 | `/books/OL9211695M` | `9780004343488` | `https://openlibrary.org/books/OL9211695M.json` | 200, giữ edition endpoint | NOT_AVAILABLE | EDITION_ONLY |
| RB00822 | `/books/OL9211695M` | `9780004343488` | `https://openlibrary.org/isbn/9780004343488.json` | 200, final `/books/OL7256979M.json` | NOT_AVAILABLE | ISBN trỏ edition khác, không chứng minh work cho OL9211695M |
| RB00822 | raw `/works/OL9211695M` | `9780004343488` | `https://openlibrary.org/works/OL9211695M.json` | 200, bị chuyển về `/books/OL9211695M.json` | NOT_AVAILABLE | Không phải work key dạng W |

Search ISBN `9780004343488` có trả `/works/OL26212049W`, nhưng kết quả đó gắn với edition `OL19783050M` và tiêu đề “Collins reference dictionary”. Đây không phải quan hệ trực tiếp từ edition `OL9211695M`, nên không được dùng để làm đẹp số WORK.

Runtime evidence không commit nằm tại `outputs/real-catalog-source-identity-audit/`; script tái lập là `scripts/audit_real_catalog_source_identity.ts`.
