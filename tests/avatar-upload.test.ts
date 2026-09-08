import assert from "node:assert/strict";
import test from "node:test";
import { prepareAvatarUpload } from "@/lib/avatar-upload";
import { MAX_AVATAR_SIZE_BYTES } from "@/lib/avatar-upload-policy";

test("chấp nhận ảnh PNG có chữ ký tệp hợp lệ", async () => {
  const pngSignature = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const file = new File([pngSignature], "avatar.png", { type: "image/png" });

  const result = await prepareAvatarUpload(file);

  assert.equal(result.extension, "png");
  assert.deepEqual(result.bytes, pngSignature);
});

test("từ chối định dạng không nằm trong danh sách ảnh an toàn", async () => {
  const file = new File(["<svg></svg>"], "avatar.svg", { type: "image/svg+xml" });

  await assert.rejects(() => prepareAvatarUpload(file), /JPG, PNG hoặc WebP/);
});

test("từ chối ảnh vượt quá 2 MB", async () => {
  const file = new File(
    [new Uint8Array(MAX_AVATAR_SIZE_BYTES + 1)],
    "avatar.png",
    { type: "image/png" },
  );

  await assert.rejects(() => prepareAvatarUpload(file), /lớn hơn 2 MB/);
});

test("từ chối tệp giả mạo phần mở rộng ảnh", async () => {
  const file = new File(["not-a-real-image"], "avatar.png", { type: "image/png" });

  await assert.rejects(() => prepareAvatarUpload(file), /không khớp định dạng ảnh/);
});
