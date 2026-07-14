# Báo cáo kiểm thử Checkpoint D — Assistant Service Boundary

Ngày kiểm tra: 14/07/2026

Nhánh: `checkpoint-d-assistant-boundary`

Phạm vi: phương án 1 — giữ RAG chatbot tại Next.js, không chuyển chat sang FastAPI.

## 1. Kết luận

Checkpoint D **PASS** trong phạm vi đã duyệt. `/assistant` và FloatingChatbot đã dùng chung contract `d1`, cùng chính sách session/feedback, safe error, provider timeout, degraded fallback và production mock guard. Không sửa Prisma schema, không thêm/sửa migration, không regenerate embedding, không thay đổi FastAPI và không ghi database demo `bookverse_ai`.

Các bằng chứng chính:

- Unit test: 63/63 PASS.
- Integration service trên `bookverse_ai_test`: PASS và cleanup trả toàn bộ count chat về 0.
- Production API smoke: PASS; cờ mock cố tình bật vẫn trả `provider=local`, `mocked=false`.
- Production UI smoke: PASS cho `/assistant`, FloatingChatbot, degraded state, validated book link và anonymous feedback.
- Database unavailable: PASS với HTTP 503 an toàn, không lộ connection string/credential/raw detail.
- Prisma validate/generate, TypeScript, Next.js build, Python compile và Docker Compose config: PASS.

## 2. Quyết định kiến trúc

FastAPI hiện có recommendation endpoint nhưng chưa có chat endpoint. Checkpoint D không thêm network hop mới khi chưa có benchmark; luồng chatbot được gom vào `lib/assistant-service.ts` ở Next.js:

```text
/assistant ───────────┐
                     ├─ assistant-client ── /api/chat ── assistant-service
FloatingChatbot ──────┘                               ├─ pgvector/keyword
                                                     ├─ OpenAI/Gemini + timeout
                                                     └─ local catalog fallback
```

Feedback đi qua `/api/chat/feedback`, bắt buộc user đăng nhập và chỉ cho phép assistant message thuộc session của chính user.

## 3. Contract `d1`

Phản hồi thành công chuẩn hóa các field:

- `success`, `contractVersion`, `answer`.
- `validatedBooks`: `id`, `title`, `author`, `description`, `score`, `href`.
- `provider`, `model`, `source`, `mocked`, `degraded`, `errorCode`.
- `sessionId`, `assistantMessageId`.

`href` chỉ hợp lệ khi đúng `/book/{id}` và Book phải được truy vấn lại từ database với trạng thái `ACTIVE`. Phản hồi lỗi chỉ gồm contract an toàn: `success=false`, `contractVersion`, `errorCode`, `message`, `retryable`; không có raw `detail`.

## 4. Chính sách bảo vệ

- User bị khóa bị chặn trước khi tạo/tiếp tục session.
- User đăng nhập chỉ tiếp tục session thuộc chính mình; session không tồn tại trả 404, session người khác trả 403.
- Anonymous không được tin `sessionId` do client gửi và luôn được tách sang session anonymous mới.
- Feedback yêu cầu đăng nhập, đúng owner, đúng session và message role `ASSISTANT`.
- Message tối đa 1.000 ký tự; feedback note tối đa 500 ký tự; payload sai bị từ chối.
- Timeout provider được clamp trong 1–30 giây, mặc định 8 giây.
- Mock chỉ bật khi môi trường không phải production và `BOOKVERSE_CHAT_MOCK_ENABLED=true`; development mock luôn có nhãn `[DEV MOCK]`.
- Khi provider/embedding/vector không sẵn sàng, local/keyword fallback chỉ dùng Book đã xác minh và ghi rõ không phải phản hồi AI giả.

## 5. File triển khai

### Contract, policy và service

- `lib/assistant-contract.ts`: type, parser, validator và safe error contract.
- `lib/assistant-policy.ts`: session/feedback ownership, production mock guard và timeout.
- `lib/assistant-runtime.ts`: local fallback, development mock, log sanitizer và fallback runner.
- `lib/assistant-service.ts`: retrieval, provider adapter, session/message persistence và response `d1`.
- `lib/assistant-client.ts`: client adapter dùng chung cho hai UI.

### API và UI

- `app/api/chat/route.ts`: JSON/SSE response theo contract chung và safe 503.
- `app/api/chat/feedback/route.ts`: validation, auth/ownership và feedback persistence.
- `components/assistant/AssistantPageClient.tsx`: giao diện `/assistant` mới.
- `app/assistant/page.tsx`: chọn UI mới mặc định, giữ legacy UI sau feature flag.
- `components/FloatingChatbot.tsx`: dùng chung client/contract, hiển thị degraded/mock minh bạch.
- `actions/assistant.actions.ts`: giữ adapter cũ chỉ để rollback một release.

### Kiểm thử và tài liệu

- `tests/assistant-contract.test.ts`.
- `scripts/verify_assistant_integration.ts`.
- `scripts/smoke_assistant_api.ts`.
- `.env.example`, `package.json`, `README.md`, `docs/DEMO_GUIDE.md`, `docs/IMPLEMENTATION_PLAN_V2.md` và báo cáo này.

Không có file nào trong `prisma/migrations`, `prisma/schema.prisma`, `data/` hoặc `ai_service/` bị sửa trong Checkpoint D.

## 6. Bằng chứng an toàn database

Mốc demo được đọc từ `bookverse_ai`, không có lệnh write:

| Bảng | Count trước D | Count sau D |
|---|---:|---:|
| User | 300 | 300 |
| Category | 24 | 24 |
| Book | 1.200 | 1.200 |
| Listing | 1.200 | 1.200 |
| Order | 1.500 | 1.500 |
| OrderItem | 2.570 | 2.570 |
| chatbot_sessions | 9 | 9 |
| chatbot_messages | 18 | 18 |
| chatbot_feedback | 1 | 1 |
| Migration thành công | 5 | 5 |

Integration chỉ được chạy khi database guard xác nhận đúng `bookverse_ai_test`. Kết quả đo:

| Thời điểm | Session | Message | Feedback |
|---|---:|---:|---:|
| Trước test | 0 | 0 | 0 |
| Trong test | 2 | 6 | 0 |
| Sau cleanup | 0 | 0 | 0 |

UI/API smoke cũng được cleanup theo session ID hoặc marker cụ thể; count cuối trên database test là 0/0/0.

## 7. Ma trận kiểm thử

| Lệnh/tình huống | Kết quả | Bằng chứng chính |
|---|---|---|
| `npx prisma validate` | PASS | Prisma schema hợp lệ |
| `npx prisma generate` | PASS | Prisma Client 6.19.3 sinh thành công |
| `npm run typecheck` | PASS | TypeScript strict không lỗi |
| `npm test` | PASS | 63 test, 0 fail |
| `npm run test:assistant-integration` | PASS | owner/non-owner/locked/anonymous, cleanup về 0 |
| `npm run build` | PASS | Next.js 15.5.20 build `/assistant` và hai API route |
| `docker compose config` | PASS | Compose parse được, image nguồn pin pgvector 0.8.5-pg16 |
| `python -m compileall -q ai_service` | PASS | Không có regression cú pháp Python |
| `npm run test:assistant-api` trên production build | PASS | HTTP 200, `d1`, local/keyword, 5 Book, invalid 400, anonymous feedback 401 |
| Production với mock flag bật | PASS | `mocked=false`, tự hạ về local catalog |
| Database URL trỏ cổng không tồn tại | PASS | HTTP 503, `SERVICE_UNAVAILABLE`, không lộ secret/detail |
| Browser `/assistant` | PASS | submit, degraded status, 5 validated link, feedback 401 rõ ràng |
| Browser FloatingChatbot | PASS | submit, degraded status, 3 validated link, không còn nhãn mock giả |

## 8. Lỗi phát hiện trong lúc kiểm thử và cách sửa

Browser smoke phát hiện lần gửi đầu từ hai UI truyền `sessionId: null`; parser đúng thiết kế chỉ nhận field bị lược bỏ hoặc chuỗi, nên UI báo `sessionId không hợp lệ`. Client adapter đã được sửa để lược bỏ field khi chưa có session và thêm unit test hồi quy `client lược bỏ sessionId khi bắt đầu hội thoại mới`.

API smoke ban đầu dùng field feedback cũ `isHelpful`; script được sửa sang contract mới `value=HELPFUL`. Route không nới validation và vẫn trả 401 đúng cho anonymous.

## 9. Rủi ro còn lại

- Chưa gọi OpenAI/Gemini thật trong kiểm thử tự động vì repository không chứa API key. Timeout và provider exception đã có unit test; production local fallback đã chạy thật.
- Vector retrieval trên database demo chưa chạy vì demo runtime vẫn là PostgreSQL image cũ theo trạng thái A.2; keyword fallback bảo đảm demo không giả AI. Việc nâng demo sang pgvector vẫn phải theo `docs/DEPLOYMENT.md` và phê duyệt riêng.
- Next.js route đang giữ retrieval và provider orchestration. Chỉ mở checkpoint chuyển sang FastAPI sau khi có benchmark latency, vận hành và service-auth.
- Prisma 6.19.3 cảnh báo `package.json#prisma` sẽ deprecated ở Prisma 7. Đây không phải lỗi Checkpoint D và không nâng major ngoài phạm vi.
- Browser ghi nhận prefetch RSC của `/dashboard` và `/cart` có lúc fallback sang browser navigation; `/assistant` vẫn render và tương tác đúng. Đây là tín hiệu cần theo dõi ở checkpoint UI/route riêng, không thuộc contract chatbot.

## 10. Rollback

Checkpoint D không có migration nên không rollback database.

1. Đặt `BOOKVERSE_ASSISTANT_LEGACY_UI=true` để quay `/assistant` về UI adapter cũ trong một release.
2. Revert commit Checkpoint D nếu cần quay toàn bộ API/client contract.
3. Không xóa ChatbotSession/Message/Feedback; dữ liệu cũ được giữ nguyên.
4. Không dùng down migration, restore database hoặc regenerate embedding cho rollback này.

## 11. Definition of Done

- [x] Một contract cho `/assistant` và FloatingChatbot.
- [x] Production mock bị khóa; degraded state minh bạch.
- [x] Book ID/link được xác minh từ database.
- [x] Auth, locked, session owner/non-owner và feedback ownership có test.
- [x] Provider timeout và database unavailable có fallback/safe error.
- [x] UI production được thao tác thật bằng browser.
- [x] Không đổi schema/migration/FastAPI/dataset gốc/database demo.
- [x] Lệnh bắt buộc và build đều PASS.
- [x] README, demo guide, implementation plan và rollback được cập nhật.
