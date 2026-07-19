# Audit category G2.1

> Bảng này là artifact audit trước đó. Khi số count trong bảng khác runtime source, dùng report mới nhất trong `outputs/real-catalog-category-audit/` và command `npm run catalog:real:audit-categories`; không dùng bảng cũ để gọi source hiện tại PASS.

Trạng thái: **PARTIAL**. Database: `bookverse_ai_test` (read-only). Mapping checksum: `17d3f2ef5917900510117266dd43841ae3d6fc7f69d7ceb0672685ab813274cd`.

| Source | Count | Target | Canonical | Confidence | Mode | Status | Rationale | Ambiguity |
|---|---:|---|---|---|---|---|---|---|
| RCAT001/fiction | 286 | C011/Văn học nước ngoài | literature | MEDIUM | PRIMARY | PARTIAL | Fiction thuộc nhóm văn học; ưu tiên văn học nước ngoài khi không có taxonomy fiction riêng. | Không phân biệt được văn học Việt Nam và nước ngoài chỉ từ category nguồn. |
| RCAT002/classics | 77 | C011/Văn học nước ngoài | literature | MEDIUM | PRIMARY | PARTIAL | Classics là nhóm văn học nhưng taxonomy đích chưa có nhánh kinh điển. | Có thể chứa cả tác phẩm Việt Nam và nước ngoài. |
| RCAT003/fantasy | 85 | C013/Kỳ ảo | fantasy | HIGH | PRIMARY | VERIFIED | Canonical target Kỳ ảo tồn tại và trùng trực tiếp ngữ nghĩa. | Không đáng kể ở taxonomy hiện tại. |
| RCAT004/science-fiction | 82 | C014/Khoa học viễn tưởng | science-fiction | HIGH | PRIMARY | VERIFIED | Canonical target Khoa học viễn tưởng tồn tại và trùng trực tiếp ngữ nghĩa. | Không đáng kể ở taxonomy hiện tại. |
| RCAT005/mystery | 79 | C012/Trinh thám | mystery | HIGH | PRIMARY | VERIFIED | Canonical target Trinh thám tồn tại và trùng trực tiếp ngữ nghĩa. | Không đáng kể ở taxonomy hiện tại. |
| RCAT006/thriller | 97 | C011/Văn học nước ngoài | literature | MEDIUM | PRIMARY | PARTIAL | Giật gân là thể loại văn học nhưng taxonomy chưa có target riêng. | Có thể giao với Trinh thám hoặc Kinh dị. |
| RCAT007/horror | 90 | C011/Văn học nước ngoài | literature | MEDIUM | PRIMARY | PARTIAL | Kinh dị thuộc văn học; taxonomy chưa có target riêng. | Có thể giao với Kỳ ảo hoặc Giật gân. |
| RCAT008/romance | 79 | C011/Văn học nước ngoài | literature | MEDIUM | PRIMARY | PARTIAL | Lãng mạn thuộc văn học; taxonomy chưa có target riêng. | Không phân biệt nguồn gốc tác phẩm. |
| RCAT009/poetry | 84 | C011/Văn học nước ngoài | literature | MEDIUM | PRIMARY | PARTIAL | Thơ thuộc văn học; taxonomy chưa có target thơ riêng. | Không phân biệt thơ Việt Nam và nước ngoài. |
| RCAT010/children | 94 | C019/Thiếu nhi | children | HIGH | PRIMARY | VERIFIED | Target Thiếu nhi trùng trực tiếp ngữ nghĩa. | Không đáng kể. |
| RCAT011/young-adult | 87 | C019/Thiếu nhi | children | MEDIUM | PRIMARY | PARTIAL | Đây là target theo độ tuổi gần nhất trong taxonomy hiện có. | Thanh thiếu niên không đồng nhất hoàn toàn với thiếu nhi. |
| RCAT012/history | 89 | C015/Lịch sử | history | HIGH | PRIMARY | VERIFIED | Target Lịch sử trùng trực tiếp ngữ nghĩa. | Không đáng kể. |
| RCAT013/biography | 83 | C041/Tự truyện | biography | HIGH | PRIMARY | VERIFIED | Canonical target Tiểu sử và tự truyện tồn tại và gần như trùng trực tiếp. | Target dùng tên tự truyện thay vì hồi ký. |
| RCAT014/psychology | 82 | C009/Tâm lý học | psychology | HIGH | PRIMARY | VERIFIED | Target Tâm lý học trùng trực tiếp ngữ nghĩa. | Không đáng kể. |
| RCAT015/philosophy | 91 | C016/Triết học | philosophy | HIGH | PRIMARY | VERIFIED | Target Triết học trùng trực tiếp ngữ nghĩa. | Không đáng kể. |
| RCAT016/science | 167 | C017/Giáo dục | education | LOW | PRIMARY | PARTIAL | Taxonomy không có canonical Khoa học tổng quát; Giáo dục/Khoa học phổ thông là nhóm rộng gần nhất. | Có thể thuộc Toán, Kỹ thuật, Môi trường hoặc khoa học tự nhiên khác. |
| RCAT017/technology | 82 | C001/Công nghệ thông tin | technology | HIGH | PRIMARY | VERIFIED | Canonical Công nghệ phù hợp trực tiếp; ưu tiên target tổng quát. | Có nhiều nhánh công nghệ nhưng source không đủ chi tiết. |
| RCAT018/programming | 75 | C003/Lập trình | technology | HIGH | PRIMARY | VERIFIED | Lập trình là target ưu tiên trong canonical Công nghệ. | Source không nêu ngôn ngữ hoặc nền tảng cụ thể. |
| RCAT019/artificial-intelligence | 78 | C002/Trí tuệ nhân tạo | artificial-intelligence | HIGH | PRIMARY | VERIFIED | Canonical target trùng trực tiếp ngữ nghĩa. | Có thể giao với Machine Learning/Deep Learning. |
| RCAT020/data-science | 12 | C004/Khoa học dữ liệu | data-science | HIGH | PRIMARY | VERIFIED | Query nguồn là data science và target tồn tại trực tiếp. | Tên hiển thị nguồn ngắn hơn query. |
| RCAT021/business | 87 | C005/Kinh doanh | business | HIGH | PRIMARY | VERIFIED | Target Kinh doanh phù hợp trực tiếp. | Có thể giao với quản trị hoặc khởi nghiệp. |
| RCAT022/economics | 96 | C005/Kinh doanh | business | LOW | PRIMARY | PARTIAL | Taxonomy chưa có Kinh tế học; Kinh doanh là nhóm gần nhất. | Kinh tế học không đồng nhất với sách kinh doanh. |
| RCAT023/finance | 90 | C007/Tài chính cá nhân | personal-finance | MEDIUM | PRIMARY | PARTIAL | Taxonomy chỉ có Tài chính cá nhân làm target tài chính gần nhất. | Source có thể gồm tài chính doanh nghiệp hoặc thị trường vốn. |
| RCAT024/marketing | 81 | C006/Marketing | marketing | HIGH | PRIMARY | VERIFIED | Target Marketing trùng trực tiếp ngữ nghĩa. | Có thể gồm marketing truyền thống và số. |
| RCAT025/management | 109 | C029/Quản trị | business | HIGH | PRIMARY | VERIFIED | Target Quản trị ưu tiên trong canonical Kinh doanh. | Source không nêu chuyên ngành quản trị. |
| RCAT026/education | 90 | C017/Giáo dục | education | HIGH | PRIMARY | VERIFIED | Target Giáo dục trùng trực tiếp ngữ nghĩa. | Có thể gồm lý luận giáo dục và tài liệu học tập. |
| RCAT027/medicine | 79 | C020/Sức khỏe | health | MEDIUM | PRIMARY | PARTIAL | Y học nằm trong canonical Sức khỏe; taxonomy hiện tại không tách riêng. | Sức khỏe rộng hơn y học chuyên môn. |
| RCAT028/health | 85 | C020/Sức khỏe | health | HIGH | PRIMARY | VERIFIED | Target Sức khỏe trùng trực tiếp ngữ nghĩa. | Không đáng kể. |
| RCAT029/art | 87 | C021/Nghệ thuật | arts | HIGH | PRIMARY | VERIFIED | Canonical Nghệ thuật tồn tại và phù hợp hơn Thiết kế. | Canonical gộp thêm nhiếp ảnh. |
| RCAT030/design | 84 | C022/Thiết kế | design | HIGH | PRIMARY | VERIFIED | Target Thiết kế trùng trực tiếp ngữ nghĩa. | Canonical gộp thêm UX/UI. |
| RCAT031/architecture | 82 | C022/Thiết kế | design | LOW | PRIMARY | PARTIAL | Taxonomy chưa có Kiến trúc; Thiết kế là nhóm gần nhất. | Kiến trúc không đồng nhất với UX/UI hoặc thiết kế đồ họa. |
| RCAT032/sociology | 83 | C016/Triết học | philosophy | LOW | PRIMARY | PARTIAL | Taxonomy chưa có Xã hội học; Triết học là nhóm khoa học xã hội gần nhất hiện có. | Xã hội học là ngành độc lập, mapping chỉ mang tính broad fallback. |
| RCAT033/politics | 85 | C015/Lịch sử | history | LOW | PRIMARY | PARTIAL | Taxonomy chưa có Chính trị học; Lịch sử là nhóm gần nhất. | Chính trị học không đồng nhất với lịch sử. |
| RCAT034/law | 80 | C025/Luật | law | HIGH | PRIMARY | VERIFIED | Canonical target Luật tồn tại và trùng trực tiếp ngữ nghĩa. | Không đáng kể. |
| RCAT035/environment | 76 | C027/Môi trường | environment | HIGH | PRIMARY | VERIFIED | Canonical target Môi trường tồn tại và trùng trực tiếp ngữ nghĩa. | Không đáng kể. |
| RCAT036/travel | 85 | C024/Du lịch | travel | HIGH | PRIMARY | VERIFIED | Target Du lịch trùng trực tiếp ngữ nghĩa. | Không đáng kể. |
| RCAT037/cooking | 80 | C024/Du lịch | travel | LOW | PRIMARY | PARTIAL | Taxonomy không có Ẩm thực; Đời sống và Du lịch là nhóm rộng gần nhất. | Ẩm thực không đồng nhất với du lịch. |
| RCAT038/religion | 80 | C016/Triết học | philosophy | LOW | PRIMARY | PARTIAL | Taxonomy chưa có Tôn giáo; Triết học là nhóm gần nhất. | Tôn giáo và triết học là hai miền nội dung khác nhau. |
| RCAT999/vietnamese-books | 18 | C010/Văn học Việt Nam | literature | LOW | PRIMARY | PARTIAL | Đây là nhóm theo ngôn ngữ, không phải thể loại; Văn học Việt Nam chỉ dùng làm broad target demo. | Sách tiếng Việt có thể thuộc mọi thể loại và không chứng minh tác giả Việt Nam. |

## Tương thích taxonomy

- Trên ultra-2200 hiện tại: 39/39 dùng target primary, 0 orphan.
- Trên legacy-24: Fantasy, Khoa học viễn tưởng, Trinh thám, Tiểu sử, Nghệ thuật, Luật và Môi trường dùng fallback rộng đã khai báo; unit test bắt buộc resolutionMode=FALLBACK.
- Mapping Science → Education, Cooking → Travel, Sociology → Philosophy, Politics → History, Religion → Philosophy và Vietnamese books → Literature vẫn PARTIAL/LOW; không được trình bày là phân loại học thuật chính xác.
- Source category luôn được giữ nguyên trong BookSourceMetadata; lượt này không tạo Category hoặc migration taxonomy.
