# Local hóa bìa catalog 3.046 sách

## Phạm vi và quyền ảnh

Artifact được kiểm tra theo SHA-256 bắt buộc:

`73dcb9bcf0a89c7d8969f135e26025da75e9f5fe654c826cae6f05d26d52a6bf`

Nguồn URL là Open Library. Quyền tái phân phối chưa được xác minh, vì vậy trạng thái bắt buộc là `NOT_VERIFIED`; tài liệu này không tuyên bố bìa được nhà xuất bản cấp phép.

## Kết quả lượt tải hiện tại

- Manifest: 3.046 record, URL ban đầu đều thuộc `covers.openlibrary.org`.
- File local đã tải/được resume: 3.043.
- 3 record còn thiếu: `RB00583`, `RB01287`, `RB02062`; URL trả HTTP 503 sau redirect archive.org.
- Giải mã pixel thành công: 3.043.
- Đạt policy portrait và được publish vào `public/covers/real-catalog-local`: 2.940.
- 103 ảnh giải mã được nhưng non-portrait nên không publish vào thư mục production local.
- 3 record thiếu sẽ đi qua remote URL rồi fallback nếu remote tiếp tục lỗi.

Các con số trên là kết quả của source hiện tại, không phải dữ liệu người dùng thật và không phải giấy phép ảnh.

## Thứ tự hiển thị

`BookCover` dùng chung trên các màn hình sẽ thử:

1. `/covers/real-catalog-local/{bookId}.jpg` cho ID `RBxxxxx`;
2. `coverPath`/remote URL trong dữ liệu hiện tại nếu local thiếu hoặc load lỗi;
3. fallback BookVerse deterministic, không chứa giá, edition hoặc mã synthetic.

Local image lỗi chỉ chuyển sang remote một lần; không infinite retry. Tỷ lệ khung giữ `2 / 3`, và ảnh non-portrait/không giải mã được không được coi là `LOCAL_VALID`.

## Tái lập

Artifact được giải nén vào `.runtime/real-cover-localization` (đã ignore, không commit). Các lệnh chính:

```powershell
Get-FileHash -Algorithm SHA256 C:\Users\LilTuan\Downloads\BookVerse_Real_Covers_3046_Local_Partial.zip
pwsh -File .\.runtime\real-cover-localization\BookVerse_Real_Covers_3046_Local\download_remaining_covers.ps1 -ThrottleLimit 2 -Retries 4
npm run covers:validate-local-pack
```

Không có lệnh nào trong lượt này ghi `bookverse_ai`, sửa dataset gốc, migrate, seed, backfill, deploy hoặc push remote.
