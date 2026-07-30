import assert from "node:assert/strict";
import test from "node:test";
import { parseVerifiedGoogleIdentity } from "@/lib/google-auth";

test("chỉ chấp nhận hồ sơ Google có email đã xác minh", () => {
  assert.equal(
    parseVerifiedGoogleIdentity({
      email: "reader@example.com",
      email_verified: false,
      name: "Reader",
    }),
    null,
  );

  assert.equal(
    parseVerifiedGoogleIdentity({
      email_verified: true,
      name: "Reader",
    }),
    null,
  );
});

test("chuẩn hóa email và giữ avatar của hồ sơ Google hợp lệ", () => {
  assert.deepEqual(
    parseVerifiedGoogleIdentity({
      email: "  Reader@Example.COM ",
      email_verified: true,
      name: "  Nguyễn An  ",
      picture: " https://example.com/avatar.png ",
    }),
    {
      email: "reader@example.com",
      name: "Nguyễn An",
      picture: "https://example.com/avatar.png",
    },
  );
});
