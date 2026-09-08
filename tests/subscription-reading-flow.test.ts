import assert from "node:assert/strict";
import test from "node:test";
import { decideReadingAccess } from "../lib/reading-access-policy";
import { decideMembershipAccess } from "../lib/membership-policy";
import {
  isMembershipSandboxRequestId,
  parseMembershipSandboxMethod,
  parseMembershipSandboxOutcome,
} from "../lib/membership-payment-sandbox";
import { PaymentMethod, SubscriptionStatus } from "@prisma/client";

test("Kiểm thử 1: Khách chưa đăng nhập chỉ nhận tối đa 10% nội dung sách", () => {
  // Sách 50 chương/trang -> chỉ nhận tối đa 5 trang (10%)
  const decision50 = decideReadingAccess({
    totalPages: 50,
    samplePages: 10,
    hasEntitlement: false,
  });
  assert.equal(decision50.access, "PREVIEW");
  assert.equal(decision50.visiblePages, 5);
  assert.equal(decision50.totalPages, 50);

  // Sách 100 chương/trang -> chỉ nhận tối đa 10 trang
  const decision100 = decideReadingAccess({
    totalPages: 100,
    samplePages: 20,
    hasEntitlement: false,
  });
  assert.equal(decision100.access, "PREVIEW");
  assert.equal(decision100.visiblePages, 10);
});

test("Kiểm thử 2: Người dùng chưa mua gói chỉ nhận được 10%", () => {
  const membershipAccess = decideMembershipAccess({
    hasPurchasedEntitlement: false,
    subscriptionStatus: null,
    subscriptionStartsAt: null,
    subscriptionEndsAt: null,
    planIsActive: true,
    bookIsIncluded: true,
    now: new Date("2026-09-01T12:00:00Z"),
  });
  assert.equal(membershipAccess, "NONE");

  const readingAccess = decideReadingAccess({
    totalPages: 30,
    hasEntitlement: membershipAccess !== "NONE",
  });
  assert.equal(readingAccess.access, "PREVIEW");
  assert.equal(readingAccess.visiblePages, 3);
});

test("Kiểm thử 3: Người dùng có gói active và chưa hết hạn được đọc toàn bộ 100%", () => {
  const now = new Date("2026-09-01T12:00:00Z");
  const membershipAccess = decideMembershipAccess({
    hasPurchasedEntitlement: false,
    subscriptionStatus: SubscriptionStatus.ACTIVE,
    subscriptionStartsAt: new Date("2026-08-01T00:00:00Z"),
    subscriptionEndsAt: new Date("2026-10-01T00:00:00Z"),
    planIsActive: true,
    bookIsIncluded: true,
    now,
  });
  assert.equal(membershipAccess, "MEMBERSHIP");

  const readingAccess = decideReadingAccess({
    totalPages: 45,
    hasEntitlement: membershipAccess === "MEMBERSHIP",
  });
  assert.equal(readingAccess.access, "FULL");
  assert.equal(readingAccess.visiblePages, 45);
  assert.equal(readingAccess.totalPages, 45);
});

test("Kiểm thử 4: Người dùng có gói expired chỉ nhận được tối đa 10%", () => {
  const now = new Date("2026-09-01T12:00:00Z");
  const membershipAccess = decideMembershipAccess({
    hasPurchasedEntitlement: false,
    subscriptionStatus: SubscriptionStatus.EXPIRED,
    subscriptionStartsAt: new Date("2026-07-01T00:00:00Z"),
    subscriptionEndsAt: new Date("2026-08-01T00:00:00Z"), // Đã qua hạn
    planIsActive: true,
    bookIsIncluded: true,
    now,
  });
  assert.equal(membershipAccess, "NONE");

  const readingAccess = decideReadingAccess({
    totalPages: 80,
    hasEntitlement: membershipAccess !== "NONE",
  });
  assert.equal(readingAccess.access, "PREVIEW");
  assert.equal(readingAccess.visiblePages, 8);
});

test("Kiểm thử 5: Giao dịch thất bại hoặc bị hủy không kích hoạt gói", () => {
  const outcomeFailure = parseMembershipSandboxOutcome("failure");
  assert.equal(outcomeFailure, "failure");

  const outcomeInvalid = parseMembershipSandboxOutcome("tampered_outcome");
  assert.equal(outcomeInvalid, null);

  // Gói có trạng thái PENDING hoặc CANCELLED không cấp quyền đọc
  const pendingAccess = decideMembershipAccess({
    hasPurchasedEntitlement: false,
    subscriptionStatus: SubscriptionStatus.PENDING,
    subscriptionStartsAt: new Date("2026-09-01T00:00:00Z"),
    subscriptionEndsAt: new Date("2026-10-01T00:00:00Z"),
    planIsActive: true,
    bookIsIncluded: true,
    now: new Date("2026-09-01T12:00:00Z"),
  });
  assert.equal(pendingAccess, "NONE");

  const cancelledAccess = decideMembershipAccess({
    hasPurchasedEntitlement: false,
    subscriptionStatus: SubscriptionStatus.CANCELLED,
    subscriptionStartsAt: new Date("2026-09-01T00:00:00Z"),
    subscriptionEndsAt: new Date("2026-10-01T00:00:00Z"),
    planIsActive: true,
    bookIsIncluded: true,
    now: new Date("2026-09-01T12:00:00Z"),
  });
  assert.equal(cancelledAccess, "NONE");
});

test("Kiểm thử 6: Backend xác thực nghiêm ngặt phương thức và request ID sandbox", () => {
  assert.equal(parseMembershipSandboxMethod("BANK_TRANSFER_DEMO"), PaymentMethod.BANK_TRANSFER_DEMO);
  assert.equal(parseMembershipSandboxMethod("WALLET_DEMO"), PaymentMethod.WALLET_DEMO);
  assert.equal(parseMembershipSandboxMethod("INVALID_METHOD"), null);
  assert.equal(parseMembershipSandboxMethod("COD"), null); // COD không hỗ trợ gói số

  assert.equal(isMembershipSandboxRequestId("550e8400-e29b-41d4-a716-446655440000"), true);
  assert.equal(isMembershipSandboxRequestId("invalid-uuid-format"), false);
  assert.equal(isMembershipSandboxRequestId(""), false);
});

test("Kiểm thử 7: Sách rất ngắn (dưới 10 trang) vẫn cho đọc 1 trang xem thử nhưng không vượt quá", () => {
  const shortBook = decideReadingAccess({
    totalPages: 4,
    samplePages: 10,
    hasEntitlement: false,
  });
  assert.equal(shortBook.access, "PREVIEW");
  assert.equal(shortBook.visiblePages, 1);
  assert.equal(shortBook.totalPages, 4);

  const onePageBook = decideReadingAccess({
    totalPages: 1,
    samplePages: 10,
    hasEntitlement: false,
  });
  assert.equal(onePageBook.access, "PREVIEW");
  assert.equal(onePageBook.visiblePages, 1);
});

test("Kiểm thử 8: Số phần lẻ luôn làm tròn xuống an toàn (không bao giờ quá 10%)", () => {
  const oddPages19 = decideReadingAccess({
    totalPages: 19,
    hasEntitlement: false,
  });
  assert.equal(oddPages19.visiblePages, 1); // floor(1.9) = 1

  const oddPages29 = decideReadingAccess({
    totalPages: 29,
    hasEntitlement: false,
  });
  assert.equal(oddPages29.visiblePages, 2); // floor(2.9) = 2
});
