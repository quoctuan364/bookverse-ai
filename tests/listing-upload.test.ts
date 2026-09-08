import assert from "node:assert/strict";
import test from "node:test";
import { prepareListingUpload } from "@/lib/listing-upload";
import { MAX_LISTING_IMAGE_SIZE_BYTES } from "@/lib/listing-upload-policy";

test("chấp nhận ảnh PNG có chữ ký tệp hợp lệ cho listing", async () => {
  const pngSignature = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const file = new File([pngSignature], "book-cover.png", { type: "image/png" });

  const result = await prepareListingUpload(file);

  assert.equal(result.extension, "png");
  assert.deepEqual(result.bytes, pngSignature);
});

test("chấp nhận ảnh JPEG có chữ ký tệp hợp lệ cho listing", async () => {
  const jpegSignature = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
  const file = new File([jpegSignature], "book-cover.jpg", { type: "image/jpeg" });

  const result = await prepareListingUpload(file);

  assert.equal(result.extension, "jpg");
  assert.deepEqual(result.bytes, jpegSignature);
});

test("từ chối định dạng không nằm trong danh sách ảnh an toàn cho listing", async () => {
  const file = new File(["<svg></svg>"], "book.svg", { type: "image/svg+xml" });

  await assert.rejects(() => prepareListingUpload(file), /JPG, PNG hoặc WebP/);
});

test("từ chối ảnh sách vượt quá 5 MB", async () => {
  const file = new File(
    [new Uint8Array(MAX_LISTING_IMAGE_SIZE_BYTES + 1)],
    "large-book.png",
    { type: "image/png" },
  );

  await assert.rejects(() => prepareListingUpload(file), /lớn hơn 5 MB/);
});

test("từ chối tệp giả mạo phần mở rộng ảnh sách", async () => {
  const file = new File(["not-a-real-image-payload"], "fake-book.png", { type: "image/png" });

  await assert.rejects(() => prepareListingUpload(file), /không khớp định dạng ảnh/);
});
