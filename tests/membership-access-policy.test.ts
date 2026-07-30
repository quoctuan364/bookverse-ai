import assert from "node:assert/strict";
import test from "node:test";
import { decideMembershipAccess } from "../lib/membership-policy";

test("quyền mua riêng luôn mở toàn bộ sách", () => {
  assert.equal(
    decideMembershipAccess({
      hasPurchasedEntitlement: true,
      subscriptionStatus: null,
      subscriptionStartsAt: null,
      subscriptionEndsAt: null,
      planIsActive: false,
      bookIsIncluded: false,
      now: new Date("2026-07-24T00:00:00Z"),
    }),
    "PURCHASE",
  );
});

test("hội viên còn hạn được mở toàn bộ kho, không phụ thuộc danh sách sách cũ", () => {
  const base = {
    hasPurchasedEntitlement: false,
    subscriptionStatus: "ACTIVE",
    subscriptionStartsAt: new Date("2026-07-01T00:00:00Z"),
    subscriptionEndsAt: new Date("2026-08-01T00:00:00Z"),
    planIsActive: true,
    now: new Date("2026-07-24T00:00:00Z"),
  } as const;
  assert.equal(decideMembershipAccess({ ...base, bookIsIncluded: true }), "MEMBERSHIP");
  assert.equal(decideMembershipAccess({ ...base, bookIsIncluded: false }), "MEMBERSHIP");
});

test("gói hết hạn không mở sách", () => {
  const now = new Date("2026-07-24T00:00:00Z");
  assert.equal(decideMembershipAccess({
    hasPurchasedEntitlement: false,
    subscriptionStatus: "ACTIVE",
    subscriptionStartsAt: new Date("2026-06-01T00:00:00Z"),
    subscriptionEndsAt: new Date("2026-07-01T00:00:00Z"),
    planIsActive: true,
    bookIsIncluded: true,
    now,
  }), "NONE");
});

test("ngừng mở bán gói không tước quyền của hội viên đã thanh toán", () => {
  assert.equal(decideMembershipAccess({
    hasPurchasedEntitlement: false,
    subscriptionStatus: "ACTIVE",
    subscriptionStartsAt: new Date("2026-07-01T00:00:00Z"),
    subscriptionEndsAt: new Date("2026-08-01T00:00:00Z"),
    planIsActive: false,
    bookIsIncluded: true,
    now: new Date("2026-07-24T00:00:00Z"),
  }), "MEMBERSHIP");
});
