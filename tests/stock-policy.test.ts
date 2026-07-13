import assert from "node:assert/strict";
import test from "node:test";

import { OrderStatus } from "@prisma/client";

import { CheckoutDomainError, normalizeCheckoutKey } from "@/lib/checkout-service";
import { checkOrderTransition, getAllowedOrderNextStatuses } from "@/lib/order-workflow";
import { filterSellerOwnedItems, sellerCanAccessOrder } from "@/lib/order-ownership";
import {
  inventoryStateAfterReservation,
  inventoryStateAfterRestock,
  planInventoryBackfill,
  validateRequestedQuantity,
} from "@/lib/stock-policy";

test("quantity phải là số nguyên dương và không vượt stock", () => {
  assert.match(validateRequestedQuantity(0, 3) ?? "", /lớn hơn hoặc bằng 1/);
  assert.match(validateRequestedQuantity(4, 3) ?? "", /chỉ còn 3/);
  assert.equal(validateRequestedQuantity(3, 3), null);
});

test("giữ đơn vị cuối chuyển listing sang SOLD và gắn soldAt", () => {
  const reservedAt = new Date("2026-07-13T10:00:00.000Z");
  assert.deepEqual(inventoryStateAfterReservation(2, 2, reservedAt), {
    stock: 0,
    status: "SOLD",
    soldAt: reservedAt,
  });
  assert.deepEqual(inventoryStateAfterReservation(3, 2, reservedAt), {
    stock: 1,
    status: "APPROVED",
    soldAt: null,
  });
});

test("hoàn kho chỉ mở lại SOLD, không làm mất trạng thái kiểm duyệt", () => {
  assert.deepEqual(inventoryStateAfterRestock(0, 2, "SOLD"), {
    stock: 2,
    status: "APPROVED",
    soldAt: null,
  });
  assert.deepEqual(inventoryStateAfterRestock(0, 2, "HIDDEN"), {
    stock: 2,
    status: "HIDDEN",
    soldAt: null,
  });
});

test("backfill dùng stock nguồn, không suy từ purchases", () => {
  const updatedAt = new Date("2026-07-01T00:00:00.000Z");
  const decision = planInventoryBackfill({
    id: "L00001",
    status: "APPROVED",
    stock: 1,
    soldAt: null,
    updatedAt,
    sourceStock: 41,
  });
  assert.equal(decision.stock, 41);
  assert.equal(decision.source, "DATASET");
  assert.equal(decision.needsReview, false);
});

test("backfill legacy không khớp nguồn được đánh dấu review", () => {
  const updatedAt = new Date("2026-07-01T00:00:00.000Z");
  const decision = planInventoryBackfill({
    id: "LEGACY",
    status: "APPROVED",
    stock: 1,
    soldAt: null,
    updatedAt,
  });
  assert.equal(decision.stock, 1);
  assert.equal(decision.source, "LEGACY_DEFAULT");
  assert.equal(decision.needsReview, true);
});

test("legacy có order chưa hủy được đánh dấu hết stock và soldAt", () => {
  const updatedAt = new Date("2026-07-01T00:00:00.000Z");
  const latestReservedAt = new Date("2026-07-02T00:00:00.000Z");
  const decision = planInventoryBackfill({
    id: "LEGACY-SOLD",
    status: "APPROVED",
    stock: 1,
    soldAt: null,
    updatedAt,
    latestReservedAt,
    activeReservedQuantity: 2,
  });
  assert.equal(decision.stock, 0);
  assert.equal(decision.status, "SOLD");
  assert.equal(decision.soldAt, latestReservedAt);
  assert.equal(decision.needsReview, true);
});

test("idempotency key chỉ nhận định dạng ổn định và an toàn", () => {
  assert.equal(normalizeCheckoutKey(" checkout-CART-123 "), "checkout-CART-123");
  assert.throws(
    () => normalizeCheckoutKey("x"),
    (error: unknown) => error instanceof CheckoutDomainError && error.code === "INVALID_INPUT",
  );
});

test("state machine giới hạn đúng quyền buyer, seller và admin", () => {
  assert.deepEqual(getAllowedOrderNextStatuses(OrderStatus.PENDING, "BUYER"), [OrderStatus.CANCELLED]);
  assert.deepEqual(getAllowedOrderNextStatuses(OrderStatus.PAID_DEMO, "SELLER"), [OrderStatus.SHIPPED]);
  assert.equal(checkOrderTransition(OrderStatus.SHIPPED, OrderStatus.CANCELLED, "ADMIN").allowed, true);
  assert.equal(checkOrderTransition(OrderStatus.COMPLETED, OrderStatus.CANCELLED, "ADMIN").allowed, false);
  assert.equal(checkOrderTransition(OrderStatus.PAID_DEMO, OrderStatus.CANCELLED, "SELLER").allowed, false);
});

test("seller chỉ nhận item thuộc listing của chính mình", () => {
  const items = [
    { id: "A", listing: { sellerId: "SELLER-A" } },
    { id: "B", listing: { sellerId: "SELLER-B" } },
    { id: "ORPHAN", listing: null },
  ];
  assert.deepEqual(filterSellerOwnedItems(items, "SELLER-A").map((item) => item.id), ["A"]);
  assert.equal(sellerCanAccessOrder(items, "SELLER-A"), true);
  assert.equal(sellerCanAccessOrder(items, "SELLER-C"), false);
});
