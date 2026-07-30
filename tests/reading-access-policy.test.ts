import assert from "node:assert/strict";
import test from "node:test";

import { decideReadingAccess } from "../lib/reading-access-policy";
import { shouldGrantEbookEntitlements } from "../lib/ebook-entitlement";
import { OrderStatus } from "@prisma/client";

test("người đã mua được đọc toàn bộ sách", () => {
  assert.deepEqual(
    decideReadingAccess({ totalPages: 120, samplePages: 10, hasEntitlement: true }),
    { access: "FULL", visiblePages: 120, totalPages: 120 },
  );
});

test("người chưa mua chỉ nhận tối đa 10% và không vượt samplePages", () => {
  assert.deepEqual(
    decideReadingAccess({ totalPages: 120, samplePages: 10, hasEntitlement: false }),
    { access: "PREVIEW", visiblePages: 10, totalPages: 120 },
  );
  assert.deepEqual(
    decideReadingAccess({ totalPages: 200, samplePages: 6, hasEntitlement: false }),
    { access: "PREVIEW", visiblePages: 6, totalPages: 200 },
  );
});

test("sách ngắn vẫn cho đọc thử ít nhất một trang", () => {
  assert.deepEqual(
    decideReadingAccess({ totalPages: 3, samplePages: 10, hasEntitlement: false }),
    { access: "PREVIEW", visiblePages: 1, totalPages: 3 },
  );
});

test("số phần lẻ luôn làm tròn xuống để không vượt quá 10%", () => {
  assert.deepEqual(
    decideReadingAccess({ totalPages: 16, samplePages: 10, hasEntitlement: false }),
    { access: "PREVIEW", visiblePages: 1, totalPages: 16 },
  );
  assert.deepEqual(
    decideReadingAccess({ totalPages: 29, samplePages: 10, hasEntitlement: false }),
    { access: "PREVIEW", visiblePages: 2, totalPages: 29 },
  );
});

test("chỉ trạng thái đã thanh toán hoặc hoàn tất mới cấp quyền Ebook", () => {
  assert.equal(shouldGrantEbookEntitlements(OrderStatus.PAID), true);
  assert.equal(shouldGrantEbookEntitlements(OrderStatus.PAID_DEMO), true);
  assert.equal(shouldGrantEbookEntitlements(OrderStatus.COMPLETED), true);
  assert.equal(shouldGrantEbookEntitlements(OrderStatus.PENDING), false);
  assert.equal(shouldGrantEbookEntitlements(OrderStatus.CANCELLED), false);
});
