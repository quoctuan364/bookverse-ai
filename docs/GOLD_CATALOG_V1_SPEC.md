# Đặc tả Gold Catalog V1

## Phạm vi

Gold Catalog là lớp metadata có nguồn để làm mặt tiền BookVerse. Nó tách khỏi `Book`, listing, price, stock, seller, order, review, interaction và telemetry. Bảng test tương ứng là `gold_catalog_records`; không có cột thương mại.

## Provenance tối thiểu

Mỗi record giữ `catalogId`, loại WORK/EDITION, metadata sách, nguồn/provider ID, URL nguồn, thời điểm lấy, checksum raw/normalized và audit cover kỹ thuật. Field thiếu giữ `null`, không điền giá trị đoán.

Nguồn pilot hiện tại là Open Library. Google Books không được gọi vì không có credential/quota được cấp: `BLOCKED_MISSING_CREDENTIAL`. Cover remote giữ `coverRightsStatus=RIGHTS_NOT_VERIFIED`; audit kỹ thuật không phải chứng nhận quyền tái phân phối.

## Quality gate

Điểm deterministic 100 điểm: title 10, author 10, provider ID 10, ISBN tối đa 10, description 15, publisher 5, date/year 5, language 5, page count 5, canonical category 10, cover kỹ thuật 10, provenance 5. Hard reject gồm metadata rỗng/synthetic, thiếu provider/source URL, ISBN sai checksum hoặc cover kỹ thuật invalid.

- `FEATURED`: từ 90 điểm và cover kỹ thuật hợp lệ.
- `GOLD`: từ 80 điểm.
- `REVIEW`: 60–79.
- `REJECTED`: dưới 60 hoặc hard reject.

## Tái lập

```powershell
npm run gold:pilot:build
npm run gold:pilot:validate
```

Raw cache Open Library nằm trong `data/gold-catalog-v1/raw/` và bị loại khỏi Git. Artifact normalized, manifest và report được checksum; phải chạy build hai lần và so `artifactChecksum`.
