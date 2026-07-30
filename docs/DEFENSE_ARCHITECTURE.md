# Kiến trúc và luồng nghiệp vụ BookVerse AI

Tài liệu này là bản rút gọn để đưa vào báo cáo và slide bảo vệ. Các sơ đồ dùng
Mermaid, có thể hiển thị trực tiếp trên GitHub hoặc xuất thành ảnh bằng Mermaid
Live Editor.

## 1. Sơ đồ ngữ cảnh hệ thống

```mermaid
flowchart LR
    Reader["Độc giả"] --> Web["BookVerse Web"]
    Seller["Người bán"] --> Web
    Moderator["Kiểm duyệt viên"] --> Web
    Admin["Quản trị viên"] --> Web

    Web --> Database[("PostgreSQL")]
    Web --> AIService["FastAPI Recommendation"]
    Web --> LLM["OpenAI / Gemini tùy chọn"]
    Web --> Google["Google OAuth tùy chọn"]
    Web --> Mail["Webhook email tùy chọn"]

    Database --> Web
    AIService --> Web
    LLM --> Web
```

BookVerse vẫn hoạt động ở chế độ demo khi các tích hợp bên ngoài chưa có
credential: đăng nhập email, local grounded RAG, catalog, trình đọc và Sandbox
được giữ nguyên.

## 2. Kiến trúc container

```mermaid
flowchart TB
    Browser["Trình duyệt"]

    subgraph Next["Next.js 15"]
        UI["React Server/Client Components"]
        Actions["Server Actions"]
        Routes["Route Handlers"]
        Auth["Auth.js"]
        RAG["Assistant Service + Local RAG"]
        Policy["Permission & Domain Policies"]
    end

    subgraph Python["FastAPI"]
        Rec["Recommendation API"]
        Hybrid["Popularity + Content + Behavior"]
    end

    DB[("PostgreSQL + pgvector")]
    Files["Ebook/cover assets"]

    Browser --> UI
    UI --> Actions
    UI --> Routes
    Actions --> Auth
    Routes --> Auth
    Actions --> Policy
    Routes --> Policy
    RAG --> Policy
    Actions --> DB
    Routes --> DB
    RAG --> DB
    Routes --> Rec
    Rec --> Hybrid
    Hybrid --> DB
    Routes --> Files
```

## 3. ERD nghiệp vụ cốt lõi

Đây là ERD rút gọn. Prisma schema vẫn là nguồn chính xác cho toàn bộ field và
constraint.

```mermaid
erDiagram
    USER ||--o{ ORDER : creates
    USER ||--o{ LISTING : sells
    USER ||--o{ SUBSCRIPTION : owns
    USER ||--o{ MEMBERSHIP_PAYMENT : pays
    USER ||--o{ READING_PROGRESS : tracks
    USER ||--o{ CHATBOT_SESSION : owns

    CATEGORY ||--o{ BOOK : groups
    BOOK ||--o{ BOOK_EDITION : has
    BOOK ||--o{ READING_PROGRESS : receives
    BOOK ||--o{ LISTING : offered_as

    ORDER ||--|{ ORDER_ITEM : contains
    LISTING ||--o{ ORDER_ITEM : purchased_as

    MEMBERSHIP_PLAN ||--o{ SUBSCRIPTION : defines
    MEMBERSHIP_PLAN ||--o{ MEMBERSHIP_PAYMENT : prices
    SUBSCRIPTION o|--o{ MEMBERSHIP_PAYMENT : activated_by

    CHATBOT_SESSION ||--|{ CHATBOT_MESSAGE : contains
    CHATBOT_MESSAGE ||--o{ CHATBOT_FEEDBACK : receives

    USER {
        string id PK
        string email UK
        enum role
        boolean isLocked
    }
    BOOK {
        string id PK
        string title
        enum status
        boolean isEbook
    }
    SUBSCRIPTION {
        string id PK
        datetime startsAt
        datetime endsAt
        enum status
    }
    MEMBERSHIP_PAYMENT {
        string id PK
        string transactionRef UK
        decimal amount
        enum status
    }
    CHATBOT_SESSION {
        string id PK
        string userId FK
        string title
    }
```

## 4. Use Case theo vai trò

```mermaid
flowchart LR
    Reader["Độc giả"]
    Seller["Người bán"]
    Moderator["Moderator"]
    Admin["Admin"]

    Reader --> Browse["Tìm và xem sách"]
    Reader --> Preview["Đọc thử tối đa 10%"]
    Reader --> Membership["Mua gói hội viên Sandbox"]
    Reader --> FullRead["Đọc toàn bộ khi có quyền"]
    Reader --> Assistant["Hỏi trợ lý và quản lý lịch sử"]
    Reader --> Community["Tham gia cộng đồng"]

    Seller --> Listing["Tạo và quản lý tin bán"]
    Seller --> Fulfillment["Xử lý đơn thuộc gian hàng"]

    Moderator --> Moderation["Kiểm duyệt sách, tin bán, nội dung"]
    Admin --> Moderation
    Admin --> Users["Quản lý user và phân quyền"]
    Admin --> Analytics["Xem analytics và audit"]
    Admin --> Integrations["Kiểm tra tích hợp production"]
    Admin --> Refund["Hoàn tiền Sandbox"]
```

## 5. Sequence đăng nhập và phân quyền

```mermaid
sequenceDiagram
    actor User as Người dùng
    participant UI as Trang đăng nhập
    participant Auth as Auth.js
    participant DB as PostgreSQL
    participant MW as Middleware

    User->>UI: Nhập email và mật khẩu
    UI->>Auth: signIn credentials
    Auth->>DB: Tìm user theo email
    DB-->>Auth: password hash, role, isLocked
    Auth->>Auth: bcrypt.compare
    alt Hợp lệ và không bị khóa
        Auth-->>UI: JWT chứa id và role
        User->>MW: Mở route bảo vệ
        MW->>MW: Kiểm tra token và role
        MW-->>User: Cho phép hoặc redirect
    else Không hợp lệ
        Auth-->>UI: Thông báo chung, không lộ nguyên nhân nội bộ
    end
```

## 6. Sequence thanh toán hội viên Sandbox

```mermaid
sequenceDiagram
    actor Reader as Độc giả
    participant UI as Checkout
    participant Action as Membership Action
    participant DB as PostgreSQL

    Reader->>UI: Chọn gói và đồng ý điều khoản
    UI->>Action: Tạo payment intent + UUID
    Action->>DB: INSERT MembershipPayment PENDING
    DB-->>Action: paymentId + transactionRef
    Action-->>UI: Mở cổng Sandbox

    alt Mô phỏng thành công
        UI->>Action: complete SUCCESS
        Action->>DB: PENDING -> PAID_DEMO
        Action->>DB: Tạo Subscription ACTIVE
        Action->>DB: Notification + AuditLog
        Action-->>UI: Quyền đọc đã được cấp
    else Mô phỏng thất bại
        UI->>Action: complete FAILURE
        Action->>DB: PENDING -> FAILED
        Action->>DB: AuditLog
        Action-->>UI: Không cấp quyền đọc
    end
```

## 7. Sequence kiểm tra quyền đọc Ebook

```mermaid
sequenceDiagram
    actor Reader as Người đọc
    participant UI as Ebook Reader
    participant Server as Reader Action/API
    participant DB as PostgreSQL

    Reader->>UI: Mở sách
    UI->>Server: Yêu cầu nội dung theo bookId
    Server->>DB: Kiểm tra purchase entitlement
    Server->>DB: Kiểm tra subscription ACTIVE và thời hạn
    alt Có quyền mua hoặc hội viên
        Server-->>UI: Toàn bộ nội dung
    else Chưa có quyền
        Server-->>UI: Tối đa 10% và metadata phần bị khóa
    end
```

## 8. Sequence chatbot grounded RAG

```mermaid
sequenceDiagram
    actor User as Người dùng
    participant UI as Assistant UI
    participant API as /api/chat
    participant Policy as Session/Intent Policy
    participant DB as PostgreSQL
    participant KB as Knowledge + Catalog
    participant LLM as OpenAI/Gemini

    User->>UI: Gửi câu hỏi
    UI->>API: message + sessionId tùy chọn
    API->>Policy: Xác minh ownership và phân loại ý định
    Policy->>DB: Lấy dữ liệu đúng tài khoản khi cần
    Policy->>KB: Truy xuất tri thức và sách đã xác minh
    alt Provider ngoài sẵn sàng
        API->>LLM: Prompt có grounded context
        LLM-->>API: Câu trả lời
    else Thiếu key hoặc timeout
        API->>API: Local grounded fallback
    end
    API->>DB: Lưu session/message
    API-->>UI: answer + source + validatedBooks
```

## 9. Ma trận phân quyền rút gọn

| Chức năng | Khách | Độc giả | Seller | Moderator | Admin |
|---|---:|---:|---:|---:|---:|
| Xem catalog/hội viên | Có | Có | Có | Có | Có |
| Đọc thử | Sau đăng nhập | Có | Có | Có | Có |
| Đọc toàn bộ | Không | Khi có quyền | Khi có quyền | Khi có quyền | Khi có quyền |
| Xem dữ liệu cá nhân | Không | Chính mình | Chính mình | Chính mình | Chính mình |
| Quản lý tin bán | Không | Không | Tin của mình | Kiểm duyệt | Toàn quyền |
| Admin Center | Không | Không | Không | Có giới hạn | Có |
| Đổi role/khóa user | Không | Không | Không | Không | Có |
| Hoàn payment Sandbox | Không | Không | Không | Không | Có |

Server Action và Route Handler tiếp tục kiểm tra quyền dù middleware đã chặn
điều hướng. Middleware chỉ là lớp bảo vệ sớm, không phải lớp bảo mật duy nhất.

## 10. Điểm cần trình bày trung thực

- Payment là Sandbox, không chuyển tiền thật.
- Catalog và hành vi hiện chủ yếu là dữ liệu demo/synthetic có ghi nhãn.
- Local RAG là fallback đã xác minh, không được gọi là OpenAI/Gemini khi chưa có
  API key.
- Recommendation offline hiện chưa chứng minh hiệu quả thương mại; CTR
  production vẫn `NOT_AVAILABLE`.
- Google OAuth, email và provider ngoài chỉ được xem là production-ready khi
  `/admin/integrations` báo đủ cấu hình.
