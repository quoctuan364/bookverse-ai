# BOOKVERSE AI

## Nền tảng đọc và giao dịch sách tích hợp hệ gợi ý có giải thích và trợ lý RAG kiểm soát nguồn

**Loại tài liệu:** Dự thảo báo cáo đồ án tốt nghiệp  
**Sinh viên:** `[ĐIỀN HỌ TÊN - MSSV]`  
**Giảng viên hướng dẫn:** `[ĐIỀN HỌ TÊN]`  
**Khoa/Trường:** `[ĐIỀN THÔNG TIN]`  
**Năm học:** 2025–2026

> Đóng góp chính của đồ án là xây dựng và đánh giá một nền tảng đọc, giao dịch
> sách tích hợp hệ gợi ý có giải thích và trợ lý RAG kiểm soát nguồn; các phân hệ
> marketplace, hội viên, cộng đồng, seller và admin cung cấp dữ liệu và ngữ cảnh
> nghiệp vụ cho đóng góp này.

## Tóm tắt

BookVerse AI giải quyết tình trạng trải nghiệm sách bị phân mảnh giữa tìm kiếm,
mua bán, đọc trực tuyến, quản lý tiến độ và hỗ trợ người dùng. Hệ thống được xây
dựng theo kiến trúc web và AI microservice, gồm Next.js, PostgreSQL, Prisma và
FastAPI. Ngoài các luồng nghiệp vụ, đồ án triển khai recommendation kết hợp tín
hiệu nội dung, hành vi, mua hàng và độ phổ biến; kết quả được gắn evidence và
kiểm soát provenance trước khi hiển thị như cá nhân hóa. Trợ lý RAG truy xuất
tri thức nghiệp vụ và dữ liệu tài khoản thuộc đúng người dùng, có local fallback
khi provider ngoài không sẵn sàng.

Đánh giá recommendation sử dụng temporal split, candidate filtering, cohort
cold/sparse/warm và các metric Precision, Recall, Hit Rate, NDCG, MRR, Coverage.
Kết quả snapshot hiện tại cho thấy hybrid production chưa vượt baseline; do đó
đồ án không tuyên bố mô hình đã tối ưu. Một pipeline nghiên cứu bổ sung lựa chọn
profile trên validation, ablation từng thành phần, nhiều seed cho random sanity
và chỉ đọc final-test sau khi khóa cấu hình. Hệ thống có unit test, integration
guard, E2E desktop/mobile và bootstrap demo cô lập. UAT/SUS được thiết kế nhưng
chỉ công bố sau khi có phản hồi người dùng thật.

**Từ khóa:** hệ gợi ý, RAG, sách điện tử, temporal evaluation, explainability,
provenance, Next.js, FastAPI.

# Chương 1. Giới thiệu

## 1.1 Bối cảnh

Nền tảng sách số thường tách riêng catalog, thương mại, trình đọc và hỗ trợ.
Điều này khiến hành vi đọc không quay trở lại quá trình khám phá, còn gợi ý dễ
trở thành danh sách phổ biến không có giải thích. Với một đồ án hướng AI, thách
thức không chỉ là tạo API recommendation mà còn phải chứng minh dữ liệu nào tạo
ra gợi ý, tránh leakage và báo cáo trung thực khi metric thấp.

## 1.2 Bài toán

Đồ án đặt ra ba câu hỏi:

1. Làm thế nào xây dựng một nền tảng sách đủ nghiệp vụ để tạo ngữ cảnh cho AI?
2. Làm thế nào gợi ý sách có evidence, phân biệt dữ liệu thật với demo/synthetic?
3. Làm thế nào trợ lý trả lời nghiệp vụ và dữ liệu tài khoản mà hạn chế bịa đặt?

## 1.3 Mục tiêu

- Xây dựng các luồng catalog, marketplace, order, membership và Reader.
- Thu thập tín hiệu theo taxonomy có version và ownership.
- Triển khai recommendation có baseline, diversity và evidence.
- Triển khai trợ lý RAG có nguồn và fallback minh bạch.
- Đánh giá theo thời gian, cohort và nhiều metric.
- Tạo quy trình clean-clone có thể tái lập trước bảo vệ.

## 1.4 Phạm vi

Thanh toán chỉ là Sandbox, không kết nối tiền thật. Nội dung đọc gắn nhãn demo
không phải nguyên tác. Dữ liệu benchmark chủ yếu synthetic nên không dùng để
tuyên bố hiệu quả production. Cover rights chưa có hồ sơ được giữ
`NOT_VERIFIED`. UAT không được suy diễn trước khi thu phản hồi thật.

## 1.5 Đóng góp

- Kiến trúc full-stack và AI service có thể chạy độc lập.
- Policy kiểm soát evidence/provenance trước khi gắn nhãn cá nhân hóa.
- Temporal evaluator fail-closed trên database test và transaction read-only.
- Pipeline validation–ablation–final không tự sửa trọng số production.
- RAG nghiệp vụ kết hợp tri thức tĩnh, dữ liệu database và ownership.
- Bootstrap demo không phụ thuộc bộ Ebook lớn nằm ngoài Git.

# Chương 2. Cơ sở lý thuyết

## 2.1 Hệ gợi ý

Collaborative filtering khai thác sự tương đồng hành vi giữa người dùng hoặc
item. GroupLens là một trong các hệ thống sớm minh họa dự đoán dựa trên đánh giá
của cộng đồng [1]. Content-based sử dụng thuộc tính item và hồ sơ sở thích.
Hybrid kết hợp nhiều nguồn nhằm giảm hạn chế của từng phương pháp, nhưng việc
kết hợp không đảm bảo tự động vượt baseline.

Matrix factorization biểu diễn user và item trong không gian latent, là nền tảng
quan trọng của hệ gợi ý hiện đại [2]. BookVerse hiện ưu tiên mô hình dễ giải
thích theo category/author/purchase/popularity và behavior co-occurrence; matrix
factorization là hướng phát triển khi có dữ liệu người dùng thật đủ dày.

## 2.2 Đánh giá top-K

Precision@K đo tỷ lệ item liên quan trong K kết quả. Recall@K đo phần ground
truth được thu hồi. Hit Rate cho biết tỷ lệ user có ít nhất một hit. NDCG ưu
tiên hit ở vị trí cao; MRR dùng nghịch đảo vị trí hit đầu tiên. Coverage đo phần
catalog xuất hiện trong recommendation. Định nghĩa metric phải được công bố cụ
thể vì các thư viện có thể diễn giải khác nhau [3].

Temporal split được dùng thay random split để tránh đưa event tương lai vào
feature. Candidate đã xem phải được lọc theo policy. Cohort cold, sparse và warm
được báo riêng để không che lấp thất bại cold-start.

## 2.3 Retrieval-Augmented Generation

RAG kết hợp mô hình sinh với bộ nhớ ngoài được truy xuất [4]. Trong BookVerse,
RAG không nhằm tái tạo nội dung sách. Nó truy xuất tri thức nghiệp vụ, metadata,
chunk đọc được phép và dữ liệu tài khoản đã kiểm tra ownership. Câu trả lời
không có nguồn hợp lệ phải chuyển sang fallback hoặc từ chối claim.

## 2.4 System Usability Scale

SUS gồm 10 câu theo thang 1–5 và tạo điểm tổng hợp 0–100 [5]. Câu lẻ trừ 1, câu
chẵn lấy 5 trừ điểm, sau đó nhân tổng với 2,5. SUS đo cảm nhận khả dụng, không
đo hiệu quả recommendation hay độ đúng của chatbot.

# Chương 3. Phân tích yêu cầu

## 3.1 Tác nhân

- Khách: xem catalog, tìm kiếm, đọc thử và xem chính sách.
- Độc giả: mua/đọc, bookmark, highlight, theo dõi tiến độ, dùng trợ lý.
- Người bán: tạo listing, xử lý item đơn và xem doanh thu.
- Quản trị: kiểm duyệt, quản lý hội viên, analytics, audit và integrations.
- AI service: xếp hạng recommendation theo dữ liệu được phép.
- Provider LLM tùy chọn: sinh câu trả lời từ context đã xác minh.

## 3.2 Yêu cầu chức năng trọng tâm

| Mã | Yêu cầu | Tiêu chí chấp nhận |
|---|---|---|
| FR-01 | Tìm kiếm sách | Hỗ trợ tiếng Việt không dấu, ISBN và lỗi gõ nhẹ |
| FR-02 | Recommendation | Trả top-K, evidence, version và request tracking |
| FR-03 | Reader | Server chỉ trả sample hoặc toàn bộ theo entitlement |
| FR-04 | Membership | Sandbox idempotent, chỉ cấp quyền sau `PAID_DEMO` |
| FR-05 | Marketplace | Chặn self-purchase, oversell và checkout trùng |
| FR-06 | Assistant | Câu trả lời dùng nguồn hợp lệ, bảo vệ ownership |
| FR-07 | Admin | Phân quyền server-side và lưu audit |

## 3.3 Yêu cầu phi chức năng

- Bảo mật: mật khẩu hash, secret không trả UI, rate limit best-effort.
- Nhất quán: transaction và unique constraint cho payment/checkout.
- Khả dụng: responsive 375px–1440px, keyboard focus, thông báo lỗi.
- Tái lập: migration, seed deterministic, bootstrap và versioned evaluation.
- Minh bạch: dữ liệu demo, quyền cover và trạng thái AI được gắn nhãn.
- An toàn dữ liệu: không ghi đè dataset gốc; script ghi phải có confirmation.

# Chương 4. Thiết kế hệ thống

## 4.1 Kiến trúc

Trình duyệt gọi Next.js App Router. Server Component, Route Handler và Server
Action xử lý session, validation và nghiệp vụ. Prisma truy cập PostgreSQL.
FastAPI đọc snapshot dữ liệu để xếp hạng. Provider LLM là thành phần tùy chọn;
fallback local vẫn trả tri thức đã xác minh và ghi trạng thái degraded.

## 4.2 Mô hình dữ liệu

Schema tách đầu sách (`Book`), phiên bản (`BookEdition`), tài sản số
(`DigitalAsset`) và quyền đọc (`ReadingEntitlement`). Order lưu snapshot giá và
edition. Recommendation có request, item, evidence và telemetry. Chatbot có
session/message/feedback. Reading có progress, session, bookmark và highlight.

## 4.3 Luồng quyền đọc

1. Xác thực session.
2. Kiểm tra entitlement mua riêng hoặc subscription còn hạn.
3. Nếu có quyền, server trả toàn bộ chunk hợp lệ.
4. Nếu không, server giới hạn theo `samplePages` và tối đa 10%.
5. File/tài sản không được public trực tiếp nếu cần entitlement.

<!-- PAGE_BREAK -->

## 4.4 Luồng recommendation

1. Lấy catalog thuộc phạm vi được phép.
2. Xây preference từ event trước thời điểm đánh giá.
3. Tạo điểm category, author, purchase và popularity.
4. Xếp hạng deterministic, loại item đã xem.
5. Áp dụng diversity policy.
6. Lưu request/item/evidence; client chỉ gửi request ID, book ID và event type.

## 4.5 Luồng trợ lý RAG

Intent classifier chọn nhóm nghiệp vụ. Retriever ưu tiên tri thức nội bộ; chỉ
truy xuất catalog khi câu hỏi cần sách. Dữ liệu cá nhân được lấy sau session và
ownership check. Provider nhận context đã đóng khung. Hậu kiểm chỉ giữ book ID,
route và citation có trong dữ liệu server.

# Chương 5. Dữ liệu và đạo đức

## 5.1 Các lớp dữ liệu

Demo CSV và ultra catalog là synthetic. Real catalog chứa metadata Open Library
đã chuẩn hóa nhưng quyền cover không tự động được xác minh. Nội dung Reader do
BookVerse sinh để demo được gắn `NỘI_DUNG_DEMO_BOOKVERSE`. Interaction benchmark
không được gọi là hành vi production.

## 5.2 Nguyên tắc provenance

Raw data không bị sửa. Mỗi pipeline tạo normalized, rejected và report riêng.
Claim cá nhân hóa yêu cầu nguồn `REAL_USER_DATA`, user owner, interaction ID,
event type, timestamp, taxonomy và algorithm version. Thiếu một thành phần thì
UI dùng nhãn trung tính.

## 5.3 Bản quyền

Đồ án không phát hành toàn văn khi chưa có quyền. Artwork BookVerse được dùng
làm fallback và ghi nhãn minh họa. Bìa ngoài có trạng thái kỹ thuật và trạng
thái quyền tách biệt. Giá synthetic không được trình bày như giá thị trường.

# Chương 6. Cài đặt

## 6.1 Công nghệ

- Next.js 15, React 19, TypeScript strict.
- Auth.js/NextAuth, Prisma 6, PostgreSQL 16 và pgvector.
- FastAPI, Pandas, Scikit-learn và SQLAlchemy.
- Docker Compose, Playwright và Node test runner.

## 6.2 Nội dung đọc demo

Clean clone sinh 8 chương × 4 trang cho mỗi sách từ metadata. Bộ sinh chọn hồ
sơ công nghệ, kinh doanh, văn học, lịch sử, khoa học, sức khỏe, ngôn ngữ hoặc du
lịch. Kết quả deterministic theo book/chapter/page để hash không thay đổi khi
seed lại. Nội dung luôn chứa disclaimer và không mô phỏng tác phẩm gốc.

## 6.3 Bảo mật và an toàn nghiệp vụ

Server Action không tin role hoặc price từ client. Checkout khóa tồn kho trong
transaction, dùng idempotency key và state machine. Password reset production
không trả token. AI service fail-closed nếu thiếu token/CORS trong production.
Query evaluation chỉ nhận đúng `bookverse_ai_test` và transaction read-only.

# Chương 7. Thực nghiệm AI

## 7.1 Thiết kế snapshot hiện tại

Train trước 01/06/2026; test từ 01/06/2026. Ground truth gồm purchase hợp lệ,
reading đủ ngưỡng, bookmark, favorite và review từ 4 sao. Cancelled/refunded bị
loại. K=5 và K=10. Có 952 user đủ điều kiện và 2.000 candidate trong snapshot
đã báo cáo.

## 7.2 Kết quả baseline

| Phương pháp | Precision@10 | Recall@10 | Hit Rate@10 | NDCG@10 | MRR@10 | Coverage@10 |
|---|---:|---:|---:|---:|---:|---:|
| Popularity | 0,001366 | 0,006197 | 0,013655 | 0,003516 | 0,004230 | 0,0065 |
| Content | 0,002416 | 0,010812 | 0,019958 | 0,006419 | 0,006625 | 0,2065 |
| Behavior | 0,002521 | 0,010530 | 0,021008 | 0,005374 | 0,005089 | 0,9665 |
| Hybrid production | 0,000840 | 0,002451 | 0,008403 | 0,001496 | 0,002188 | 0,1995 |
| Random seeded | 0,001050 | 0,005252 | 0,010504 | 0,002367 | 0,002683 | 0,9900 |

## 7.3 Phân tích

Behavior có Hit Rate và coverage cao nhất; content có Recall, NDCG và MRR cao
nhất. Hybrid production thua baseline, cho thấy trọng số hiện tại chưa được dữ
liệu ủng hộ. Nguyên nhân có thể gồm taxonomy event lệch, tín hiệu synthetic,
weight scale, candidate lớn và thiếu mô hình behavior trong công thức hybrid.
Kết quả này không được dùng để quảng cáo AI vượt trội.

## 7.4 Thực nghiệm bổ sung

Pipeline `evaluation:research` thực hiện:

1. Ẩn toàn bộ final event khi chạy validation.
2. So sánh production, bốn ablation và năm profile định trước.
3. Chọn bằng NDCG@10; tie-break Recall, Hit Rate và Coverage.
4. Chạy random sanity với năm seed và báo mean/std.
5. Khóa profile rồi mới đọc final-test.
6. So với production và baseline trên final.
7. Không tự cập nhật constant production.

Lượt chạy ngày 30/07/2026 chọn `no_reading_category` trên validation
(NDCG@10 `0,002512`) nhưng profile này không tổng quát hóa sang final:
NDCG@10 `0,002361`, thấp hơn production `0,003954`, content `0,006719` và
behavior `0,006450`. Artifact lịch sử gọi quyết định này là `KEEP_PRODUCTION`;
theo taxonomy mới, ý nghĩa đúng là `NO_PROMOTION`, không phải Hybrid tốt nhất.
Không quay lại tune theo final. Kết quả âm này bác bỏ giả thuyết rằng profile
thắng validation chắc chắn tốt hơn và là bằng chứng pipeline có cổng từ chối
triển khai.

## 7.5 Giới hạn

Không có user production, CTR thật hoặc snapshot lịch sử đầy đủ của rating.
Cold cohort nhỏ. Synthetic pattern có thể làm Book ID tie-break trùng ground
truth. Vì vậy đóng góp nằm ở quy trình đánh giá và phân tích trung thực, chưa
phải ở chất lượng mô hình vượt trội.

## 7.6 Chẩn đoán hybrid bằng rolling temporal backtest

### Giả thuyết

Hybrid thua Behavior vì công thức production chỉ cộng affinity theo category,
author, purchase-category và popularity, không có item-item co-occurrence. Các
score content thô có thể tạo nhiều tie và xung đột với Behavior ranking.

### Protocol

Final từ 20/06 đã được quan sát nên không tiếp tục được gọi là unseen. Thực
nghiệm mới khóa NDCG@10 làm primary metric và dùng năm rolling window từ
01/02 đến trước 20/06. Bốn ứng viên được định trước: RRF cân bằng, RRF ưu tiên
Behavior, weighted percentile-rank và gated theo lịch sử. Tất cả baseline và
ứng viên dùng cùng user, candidate pool và ground truth trong từng window.
Random sanity dùng năm seed khóa trước `20260714`–`20260718`, tổng cộng 25
quan sát seed×window; không chọn seed sau khi xem metric.

### Kết quả

Behavior đạt NDCG@10 `0,003560±0,001365`; production hybrid
`0,003521±0,001852`; ứng viên tốt nhất RRF Behavior-focused
`0,003551±0,001376`. Ứng viên hơn production `0,000030` nhưng thấp hơn Behavior
`0,000009` và chỉ thắng baseline mạnh nhất 1/5 window. Random sanity đạt
`0,003607±0,002136` sau khi lấy mean năm seed trong từng window. Paired
Random−Behavior có mean `+0,000047`, std `0,002014` và Random cao hơn 2/5
window. Vì vậy chỉ có thể nói không quan sát được ưu thế ổn định; kết quả gần
baseline cho thấy dữ liệu synthetic có tín hiệu dự đoán yếu, không chứng minh
Random là một recommender phù hợp.

### Phân tích thất bại

Content–Behavior top-10 Jaccard chỉ `0,003620`, Spearman `-0,641479`.
Reading score chỉ phủ trung bình 35,34% candidate, trong khi nhiều item cùng
category/author nhận score giống nhau. Năm case study cho thấy Behavior hit
positive mà Hybrid miss. Giả thuyết thiếu backfill bị bác bỏ vì W5 hybrid luôn
trả đủ 10 item.

### Decision và threats to validity

Gate yêu cầu vượt baseline mạnh nhất, giữ Hit Rate, thắng ít nhất 4/5 window và
có final_v2 unseen. Không tiêu chí chính nào đủ để promote nên candidate
decision là `REJECT_CANDIDATE`, deployment decision là
`RETAIN_CURRENT_PENDING_NEW_UNSEEN_DATA`, nhãn tổng quát `NO_PROMOTION`. Việc
giữ cấu hình hiện tại không khẳng định Hybrid tốt hơn Behavior. Dữ liệu
synthetic, thiếu final_v2, W5 gần như toàn warm user, không có rating snapshot
và fusion chỉ dùng top-10 là các đe dọa hiệu lực chính.

## 7.7 Data readiness cho nghiên cứu tiếp theo

Audit schema và database bằng transaction read-only xác nhận hệ thống đã có
request/item snapshot, impression theo viewport, click và conversion
attribution. Extension mới lưu thêm collection context, pilot/consent version,
experiment group, source component và device do server suy ra.

Tuy nhiên, số liệu đủ provenance `PILOT_CONSENTED` hiện là 0 user, 0 exposure,
0 impression, 0 click và 0 conversion. 18.002 event lịch sử là synthetic.
Do đó decision là `BLOCKED_BY_DATA`; chưa tạo final_v2 và không tiếp tục tune
thuật toán. Đây là kiểm soát phương pháp, không phải lỗi runtime.

Hai hướng thu thập được chuẩn bị nhưng chưa có kết quả: pilot interaction thật
có consent và pilot blinded human-relevance 10–20 người. Blinded study đo
perceived relevance, không được gọi là CTR hoặc hiệu quả production.

# Chương 8. Kiểm thử và UAT

## 8.1 Kiểm thử tự động

Các nhóm test bao phủ contract trợ lý, ownership, entitlement, checkout, stock,
category, catalog, cover, telemetry, temporal split, migration policy và
security. Trạng thái source sau lượt nâng cấp đạt 215/215 unit test TypeScript.
Lượt tái kiểm chứng ngày 30/07/2026 bật
`RUN_EVALUATION_INTEGRATION=1` trên `bookverse_ai_test` tại
`127.0.0.1:55432` và đạt **44/44 Python test**, không còn test skip. Artifact
ghi commit nền `1081e2046b8b603ccdecc6d2e0721d6598b907c2`, trạng thái working
tree và SHA-256 manifest source; không lưu credential. Production build đồng
thời kiểm tra route compilation và type.

## 8.2 E2E

Playwright chạy Chrome desktop 1280×720 và Pixel 5 375×812 trên database
`bookverse_e2e_test` cô lập. Runner apply đủ migration, seed tối thiểu có nhãn
`TEST_FIXTURE`, chạy test rồi xóa database trong `finally`; không kết nối
database demo. Smoke suite đạt 14/14. Suite telemetry bổ sung kiểm tra dưới 50%,
dưới một giây, deduplicate impression, rời viewport, ẩn tab, liên kết click và
consent fail-closed; đạt 14/14 trên hai thiết bị. Tổng kết quả là 28/28.

## 8.3 UAT/SUS

Kế hoạch gồm sáu task: tìm kiếm, Reader, bookmark/highlight, thanh toán Sandbox,
Assistant và seller listing. Mỗi dòng dữ liệu lưu mã Pxx, đồng thuận, thiết bị,
task success, thời gian, lỗi, số lần trợ giúp, 10 câu SUS và nhận xét. Analyzer
phát hiện task thiếu/trùng, SUS hoặc thiết bị không nhất quán; báo CI 95%, mức
hoàn thành protocol và so sánh thăm dò desktop/mobile. Script chỉ phân tích CSV
thật; file rỗng trả lỗi thay vì tạo metric giả. Kết quả hiện giữ
`NOT_AVAILABLE` cho đến khi tổ chức UAT với người dùng thật.

# Chương 9. Triển khai và tái lập

## 9.1 Bootstrap

`npm run demo:bootstrap` tạo `.env.demo` không commit, khởi động PostgreSQL
cô lập ở cổng 55432, migrate, seed, sinh nội dung, tạo membership và chạy
readiness. Lượt chạy cuối đạt 10 PASS, 0 WARN, 0 FAIL. `npm run demo:start`
khởi động AI service riêng ở cổng 8800; health check trả `status=ok`. Script
không ghi đè `.env` hoặc dataset nguồn.

## 9.2 Cổng release

Release phải có commit sạch, lint, typecheck, unit, Python, build, E2E và
`demo:defense` cùng đạt. Bằng chứng lưu commit SHA, version môi trường, checksum
dataset và output evaluation. Clean clone rehearsal phải thực hiện trên thư mục
hoặc máy khác.

## 9.3 Phương án dự phòng

Video offline, ảnh chụp dashboard và log test được chuẩn bị. Nếu provider LLM
lỗi, local grounded fallback vẫn demo được. Thanh toán dùng Sandbox. Database
demo có dump phục hồi và không seed/import trong lúc bảo vệ.

# Chương 10. Kết luận và hướng phát triển

BookVerse chứng minh khả năng xây dựng hệ thống phần mềm có nghiệp vụ sâu, kiểm
soát quyền và tích hợp AI theo cách có thể kiểm tra. Kết quả thực nghiệm hiện
không chứng minh hybrid vượt baseline; việc công bố thất bại này giúp xác định
hướng phát triển đúng hơn.

Ưu tiên tiếp theo là thu interaction thật có đồng thuận, hoàn thành UAT, đưa
behavior score vào hybrid ứng viên, thử matrix factorization khi dữ liệu đủ dày,
đánh giá online có impression/click hợp lệ và hoàn thiện hồ sơ quyền nội dung.

# Tài liệu tham khảo

[1] P. Resnick, N. Iacovou, M. Suchak, P. Bergstrom, J. Riedl, “GroupLens:
An Open Architecture for Collaborative Filtering of Netnews,” CSCW, 1994,
pp. 175–186. https://doi.org/10.1145/192844.192905

[2] Y. Koren, R. Bell, C. Volinsky, “Matrix Factorization Techniques for
Recommender Systems,” Computer, vol. 42, no. 8, pp. 30–37, 2009.
https://doi.org/10.1109/MC.2009.263

[3] Y.-M. Tamm, R. Damdinov, A. Vasilev, “Quality Metrics in Recommender
Systems: Do We Calculate Metrics Consistently?”, 2022.
https://arxiv.org/abs/2206.12858

[4] P. Lewis et al., “Retrieval-Augmented Generation for Knowledge-Intensive
NLP Tasks,” NeurIPS, 2020. https://arxiv.org/abs/2005.11401

[5] J. Brooke, “SUS: A Quick and Dirty Usability Scale,” in Usability
Evaluation in Industry, Taylor & Francis, 1996, pp. 189–194.

[6] F. M. Harper, J. A. Konstan, “The MovieLens Datasets: History and
Context,” ACM TiiS, vol. 5, no. 4, 2015. https://doi.org/10.1145/2827872
