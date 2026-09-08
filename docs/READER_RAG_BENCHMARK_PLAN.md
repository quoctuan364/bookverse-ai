# Kế hoạch benchmark Trợ lý AI Đọc Sách

## Mục tiêu

Đánh giá khả năng truy xuất và trích dẫn của Reader RAG bằng 50–100 câu hỏi do
người thật gán nhãn. Không dùng câu hỏi, nhãn hoặc kết quả tự tạo để điền vào báo
cáo.

## Bộ dữ liệu tối thiểu

Mỗi câu hỏi cần các trường:

| Trường | Ý nghĩa |
|---|---|
| `question_id` | Mã ẩn danh ổn định |
| `book_id` | Sách được phép đánh giá |
| `question` | Câu hỏi nguyên văn |
| `scope` | `IN_SCOPE` hoặc `OUT_OF_SCOPE` |
| `relevant_chunk_ids` | Chunk đúng do người gán nhãn xác nhận |
| `expected_citations` | Chương/trang đúng |
| `annotator_id` | Mã người gán nhãn, không lưu họ tên/email |
| `notes` | Lý do hoặc trường hợp mơ hồ |

Nên có câu hỏi trực tiếp, diễn đạt lại, nhiều ý, lỗi gõ, câu theo chương hiện
tại và câu ngoài phạm vi. Snapshot corpus phải được khóa trước khi gán nhãn.

Sao chép `data/benchmark/reader_rag_questions.template.json` sang một file làm
việc mới; không điền dữ liệu giả vào template. Kiểm tra cấu trúc bằng:

```powershell
npm run benchmark:reader:validate -- --file=<duong-dan-json>
```

## Phương pháp so sánh

Chạy cùng một tập câu hỏi và cùng giới hạn top-k cho:

1. Keyword/lexical hiện tại.
2. BM25.
3. Vector search ở cấp chunk.
4. Hybrid PostgreSQL full-text + pgvector.
5. Hybrid + reranker.

Không thay đổi tập test sau khi xem kết quả. Nếu tune tham số, phải có tập
development riêng.

## Metric bắt buộc

- MRR và Recall@5 cho retrieval.
- Citation accuracy theo citation đã gán nhãn.
- Tỷ lệ từ chối đúng với câu `OUT_OF_SCOPE`.
- Latency p50, p95 và tỷ lệ lỗi.
- Số câu hợp lệ, số câu bị loại và lý do loại.

## Evidence mỗi lần chạy

Mỗi run tạo thư mục mới, không ghi đè:

```text
outputs/reader_rag_benchmark/<UTC_TIMESTAMP>_<RUN_ID>/
├── manifest.json
├── config.json
├── per_question.csv
├── metrics.json
├── errors.jsonl
└── README.txt
```

Manifest phải ghi commit hash, checksum corpus/câu hỏi, model embedding,
reranker, top-k, seed và thời gian chạy. Báo cáo chỉ trích số liệu từ một run đã
được khóa và review.

## Điều kiện công bố

- Chưa đủ 50 câu hợp lệ: ghi `NOT_AVAILABLE`.
- Không có relevant chunk do người thật xác nhận: không tính MRR/Recall.
- Không có người tham gia thật: không gọi kết quả là UAT, SUS hoặc CTR.
- Nếu chỉ có một annotator, ghi rõ đây là giới hạn nghiên cứu.
