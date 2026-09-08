import assert from "node:assert/strict";
import test from "node:test";

import { isAdminPath, isProtectedPath } from "@/lib/route-access-policy";

test("cho phép khách mở trang đọc thử", () => {
  assert.equal(isProtectedPath("/read"), false);
  assert.equal(isProtectedPath("/read/B001"), false);
});

test("vẫn bảo vệ thư viện và các trang thống kê đọc cá nhân", () => {
  assert.equal(isProtectedPath("/library"), true);
  assert.equal(isProtectedPath("/reading"), true);
  assert.equal(isProtectedPath("/reading/insights"), true);
});

test("chỉ nhận diện đúng khu vực quản trị", () => {
  assert.equal(isAdminPath("/admin/data-quality"), true);
  assert.equal(isAdminPath("/catalog"), false);
});
