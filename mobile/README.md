# 📱 BookVerse AI Mobile App

Ứng dụng di động **BookVerse AI Mobile** phát triển bằng **React Native (Expo SDK 52) + TypeScript**. Bản hiện tại đã typecheck và xuất bundle Android thành công; các API công khai cho catalog, chi tiết sách, đọc thử phía server, RAG và danh sách gói được cung cấp từ backend Next.js.

> Phạm vi demo: đăng nhập và xác nhận thanh toán trên Mobile vẫn là mô phỏng Sandbox. Không ghi dữ liệu này thành giao dịch thương mại hoặc hành vi người dùng thật.

---

## 🌟 Tính Năng Chính Trên Mobile

1. **🏠 Khám phá & Gợi ý AI (Home)**:
   - Hiển thị danh mục sách đề xuất từ thuật toán Hybrid Recommendation V2.
   - Nhãn giải thích nguyên nhân gợi ý (*Explainable AI Badge*).
   - Banner trạng thái gói hội viên và các sách thịnh hành.

2. **📚 Kho sách & Tìm kiếm thông minh (Catalog)**:
   - Thanh tìm kiếm debounce theo tiêu đề và tác giả.
   - Bộ lọc thể loại trực quan (Kỹ năng sống, Văn học, Tâm lý học, Kinh tế, Công nghệ).
   - Xem chi tiết thông tin, xếp hạng sao, đánh giá và giá Ebook.

3. **📖 Trình đọc Ebook di động (Mobile Reader)**:
   - Cơ chế bảo vệ giới hạn **10% đọc thử (Server-side Slicing)** đối với người chưa có quyền.
   - Khóa các chương sau bằng Paywall Alert nhắc nâng cấp gói hội viên.
   - Tùy chỉnh chế độ đọc: **Sepia (bảo vệ mắt), Dark Mode, Light Mode**.
   - Tùy chỉnh kích thước font chữ và đánh dấu trang (Bookmark).

4. **🤖 Trợ lý AI Đọc sách (Reader RAG Modal)**:
   - Hỏi đáp trực tiếp về nội dung chương sách đang đọc.
   - Trích dẫn chính xác vị trí trong sách theo định dạng `[Chương X, Trang Y]`.
   - Cơ chế Fallback an toàn bảo đảm luôn phản hồi mượt mà.

5. **👑 Gói hội viên Sandbox & Cá nhân hóa (Membership & Profile)**:
   - Quản lý gói hội viên và mô phỏng kích hoạt thuê bao Sandbox.
   - Hiển thị VietQR Sacombank phục vụ kịch bản demo và nút xác nhận rõ nhãn Sandbox.
   - Theo dõi tiến độ đọc, chuỗi ngày đọc liên tục (Streak) và mục tiêu đọc hàng ngày.

---

## 🚀 Hướng Dẫn Cài Đặt & Chạy Ứng Dụng

### 1. Cài đặt Dependencies
Mở terminal tại thư mục `mobile`:
```bash
cd mobile
npm install
```

### 2. Cấu hình biến môi trường kết nối API Backend
Tạo file `mobile/.env` (tùy chọn) hoặc cấu hình trong `src/config/constants.ts`:
```bash
# Cho Android Emulator
EXPO_PUBLIC_API_URL=http://10.0.2.2:3000

# Cho iOS Simulator
EXPO_PUBLIC_API_URL=http://localhost:3000

# Cho thiết bị thật (quét mã qua Expo Go cùng mạng WiFi)
EXPO_PUBLIC_API_URL=http://<IP_MAY_TINH_CUA_BAN>:3000
```

### 3. Khởi động ứng dụng với Expo
```bash
# Khởi động Metro Bundler
npx expo start

# Hoặc chạy trực tiếp trên Android Emulator
npx expo start --android

# Hoặc chạy trên iOS Simulator
npx expo start --ios

# Hoặc chạy thử nghiệm trên Web
npx expo start --web

# Kiểm tra TypeScript
npm run typecheck

# Xuất bundle Android để kiểm tra khả năng đóng gói
npm run export:android
```

## Trạng thái xác minh

- `npm run typecheck`: đạt.
- `npm run export:android`: đạt, artifact được tạo trong `mobile/dist`.
- Next.js production build: đạt và nhận đủ các route `/api/mobile/*`.
- Chưa phát hành APK/AAB ký số lên cửa hàng; cần EAS Build hoặc Android Studio cho bước phát hành.

---

## 📁 Cấu Trúc Thư Mục

```
mobile/
├── App.tsx                    # Root App Component (SafeArea + NavigationContainer)
├── index.ts                   # Expo Root Entrypoint
├── app.json                   # Cấu hình Expo Metadata & Icons
├── package.json               # Dependencies & Scripts
├── tsconfig.json              # TypeScript Configuration
└── src/
    ├── config/
    │   └── constants.ts       # Color Tokens, Reader Themes & API Base URL
    ├── types/
    │   └── index.ts           # Type definitions (Book, User, Navigation, Reader)
    ├── store/
    │   ├── authStore.ts       # Quản lý phiên đăng nhập & gói hội viên
    │   └── readerStore.ts     # Quản lý theme đọc, cỡ chữ & bookmark
    ├── services/
    │   └── api.ts             # API Client kết nối Next.js Backend & RAG
    ├── navigation/
    │   └── RootNavigator.tsx  # React Navigation (Bottom Tabs + Native Stack)
    ├── components/
    │   ├── BookCard.tsx       # Component hiển thị sách (Horizontal & Grid)
    │   ├── Header.tsx         # Header ứng dụng với AI Badge
    │   └── AiReaderModal.tsx  # Modal Trợ lý AI đọc sách RAG
    └── screens/
        ├── HomeScreen.tsx     # Màn hình Khám phá & Gợi ý AI
        ├── CatalogScreen.tsx  # Màn hình Kho sách & Tìm kiếm
        ├── BookDetailScreen.tsx # Màn hình Chi tiết sách
        ├── ReaderScreen.tsx   # Màn hình Trình đọc Ebook
        ├── MembershipScreen.tsx # Màn hình Gói hội viên & Sandbox
        ├── ProfileScreen.tsx  # Màn hình Hồ sơ & Thống kê đọc
        └── LoginScreen.tsx    # Màn hình Đăng nhập
```
