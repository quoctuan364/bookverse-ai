import assert from "node:assert/strict";
import test from "node:test";

import {
  ListingStatus,
  OrderStatus,
  PaymentMethod,
  UserRole,
} from "@prisma/client";

import { getMarketplacePageData } from "@/actions/marketplace.actions";
import {
  checkoutOrder,
  CheckoutDomainError,
  type CheckoutReceipt,
} from "@/lib/checkout-service";
import { assertSafeDatabase } from "@/lib/database-safety";
import {
  cancelOrderWithRestock,
  OrderCancellationError,
} from "@/lib/order-cancellation-service";
import prisma from "@/lib/prisma";

const runId = `${Date.now()}-${process.pid}`;
const prefix = `IT-STOCK-${runId}`;
const expectedDatabaseName = process.env.STOCK_INTEGRATION_DATABASE || "bookverse_ai_test";
let sequence = 0;

function nextId(kind: string, suffix: string): string {
  sequence += 1;
  return `${prefix}-${kind}-${suffix}-${sequence}`;
}

async function createUser(suffix: string, options: { role?: UserRole; locked?: boolean } = {}) {
  const id = nextId("USER", suffix);
  const user = await prisma.user.create({
    data: {
      id,
      name: `Integration ${suffix}`,
      role: options.role ?? UserRole.BUYER,
      isLocked: options.locked ?? false,
      lockedAt: options.locked ? new Date() : null,
      lockReason: options.locked ? "Fixture kiểm thử authorization" : null,
    },
  });
  const address = await prisma.shippingAddress.create({
    data: {
      userId: id,
      fullName: user.name,
      phone: "0900000000",
      province: "TP Hồ Chí Minh",
      district: "Quận 1",
      ward: "Bến Nghé",
      addressLine: "1 Đường kiểm thử",
      isDefault: true,
    },
  });
  return { ...user, addressId: address.id };
}

async function createListing(
  suffix: string,
  sellerId: string,
  bookId: string,
  stock: number,
  status: ListingStatus = ListingStatus.APPROVED,
) {
  return prisma.listing.create({
    data: {
      id: nextId("LISTING", suffix),
      sellerId,
      bookId,
      title: `Listing integration ${suffix}`,
      description: "Fixture dành riêng cho kiểm thử stock.",
      price: 50_000,
      condition: "GOOD",
      status,
      stock,
      soldAt: status === ListingStatus.SOLD ? new Date() : null,
    },
  });
}

async function createCart(
  suffix: string,
  buyerId: string,
  lines: Array<{ listingId: string; bookId: string; quantity: number; price?: number }>,
) {
  const orderId = nextId("ORDER", suffix);
  await prisma.order.create({
    data: {
      id: orderId,
      buyerId,
      status: OrderStatus.PENDING,
      totalAmount: lines.reduce((total, line) => total + (line.price ?? 50_000) * line.quantity, 0),
      items: {
        create: lines.map((line) => ({
          listingId: line.listingId,
          bookId: line.bookId,
          quantity: line.quantity,
          unitPrice: line.price ?? 50_000,
          totalPrice: (line.price ?? 50_000) * line.quantity,
        })),
      },
    },
  });
  return orderId;
}

async function cleanupFixtures(): Promise<void> {
  const target = assertSafeDatabase({
    operation: "destructive",
    databaseUrl: process.env.DATABASE_URL,
  });
  assert.ok(
    [
      "bookverse_ai_test",
      "bookverse_ai_deploy_rehearsal",
      "bookverse_ai_full_deploy_rehearsal",
    ].includes(expectedDatabaseName),
    "Tên database integration không nằm trong allowlist cứng.",
  );
  assert.equal(target.databaseName, expectedDatabaseName);

  const users = await prisma.user.findMany({
    where: { id: { startsWith: prefix } },
    select: { id: true },
  });
  const userIds = users.map((user) => user.id);
  const orders = await prisma.order.findMany({
    where: { id: { startsWith: prefix } },
    select: { id: true },
  });
  const orderIds = orders.map((order) => order.id);

  await prisma.$transaction([
    prisma.auditLog.deleteMany({
      where: {
        OR: [
          { entityId: { startsWith: prefix } },
          ...(userIds.length > 0 ? [{ actorId: { in: userIds } }] : []),
        ],
      },
    }),
    prisma.notification.deleteMany({ where: { userId: { in: userIds } } }),
    prisma.interactionEvent.deleteMany({ where: { userId: { in: userIds } } }),
    prisma.interaction.deleteMany({ where: { userId: { in: userIds } } }),
    prisma.orderTimelineEvent.deleteMany({ where: { orderId: { in: orderIds } } }),
    prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } }),
  ]);
  await prisma.order.deleteMany({ where: { id: { startsWith: prefix } } });
  await prisma.listing.deleteMany({ where: { id: { startsWith: prefix } } });
  await prisma.shippingAddress.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.book.deleteMany({ where: { id: { startsWith: prefix } } });
  await prisma.user.deleteMany({ where: { id: { startsWith: prefix } } });
  await prisma.category.deleteMany({ where: { id: { startsWith: prefix } } });
}

function checkoutErrorCode(result: PromiseSettledResult<CheckoutReceipt>): string | null {
  if (result.status === "fulfilled") return null;
  return result.reason instanceof CheckoutDomainError ? result.reason.code : "UNKNOWN";
}

test("Checkpoint A chạy thật trên PostgreSQL", async (t) => {
  const target = assertSafeDatabase({
    operation: "read-only",
    databaseUrl: process.env.DATABASE_URL,
  });
  assert.ok(
    [
      "bookverse_ai_test",
      "bookverse_ai_deploy_rehearsal",
      "bookverse_ai_full_deploy_rehearsal",
    ].includes(expectedDatabaseName),
    "Tên database integration không nằm trong allowlist cứng.",
  );
  assert.equal(target.databaseName, expectedDatabaseName, "Integration test đang trỏ sai database an toàn.");

  await cleanupFixtures();
  const category = await prisma.category.create({
    data: {
      id: nextId("CATEGORY", "ROOT"),
      name: `Category integration ${runId}`,
      slug: `category-integration-${runId}`,
      level: 0,
      canonicalKey: `integration-${runId}`,
      canonicalName: "Integration",
    },
  });
  const book = await prisma.book.create({
    data: {
      id: nextId("BOOK", "MAIN"),
      title: `Book integration ${runId}`,
      slug: `book-integration-${runId}`,
      authorName: "BookVerse Test",
      price: 50_000,
      categoryId: category.id,
    },
  });
  const seller = await createUser("SELLER", { role: UserRole.SELLER });
  const admin = await createUser("ADMIN", { role: UserRole.ADMIN });

  try {
    await t.test("database constraint từ chối stock âm", async () => {
      const listing = await createListing("NEGATIVE-CONSTRAINT", seller.id, book.id, 1);
      await assert.rejects(
        prisma.listing.update({ where: { id: listing.id }, data: { stock: -1 } }),
      );
      assert.equal((await prisma.listing.findUniqueOrThrow({ where: { id: listing.id } })).stock, 1);
    });

    await t.test("marketplace public chỉ trả listing APPROVED còn stock", async () => {
      const query = `PUBLIC-${runId}`;
      const approved = await createListing(query, seller.id, book.id, 1);
      const hidden = await createListing(`${query}-HIDDEN`, seller.id, book.id, 1, ListingStatus.HIDDEN);
      const empty = await createListing(`${query}-EMPTY`, seller.id, book.id, 0);
      const data = await getMarketplacePageData({ query });
      const ids = new Set(data.listings.map((listing) => listing.id));
      assert.equal(ids.has(approved.id), true);
      assert.equal(ids.has(hidden.id), false);
      assert.equal(ids.has(empty.id), false);
    });

    await t.test("hai buyer tranh stock 1: đúng một checkout thành công", async () => {
      const listing = await createListing("OVERSELL", seller.id, book.id, 1);
      const buyerA = await createUser("OVERSELL-A");
      const buyerB = await createUser("OVERSELL-B");
      const orderA = await createCart("OVERSELL-A", buyerA.id, [
        { listingId: listing.id, bookId: book.id, quantity: 1 },
      ]);
      const orderB = await createCart("OVERSELL-B", buyerB.id, [
        { listingId: listing.id, bookId: book.id, quantity: 1 },
      ]);

      const results = await Promise.allSettled([
        checkoutOrder({
          buyerId: buyerA.id,
          shippingAddressId: buyerA.addressId,
          paymentMethod: PaymentMethod.COD,
          checkoutKey: `oversell-a-${runId}`,
        }),
        checkoutOrder({
          buyerId: buyerB.id,
          shippingAddressId: buyerB.addressId,
          paymentMethod: PaymentMethod.COD,
          checkoutKey: `oversell-b-${runId}`,
        }),
      ]);

      assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
      assert.deepEqual(
        results.map(checkoutErrorCode).filter(Boolean),
        ["OUT_OF_STOCK"],
      );
      const after = await prisma.listing.findUniqueOrThrow({ where: { id: listing.id } });
      assert.equal(after.stock, 0);
      assert.equal(after.status, ListingStatus.SOLD);
      assert.ok(after.soldAt);
      assert.equal(
        await prisma.order.count({
          where: { id: { in: [orderA, orderB] }, paymentMethod: { not: null } },
        }),
        1,
      );
      assert.equal(
        await prisma.interactionEvent.count({
          where: {
            userId: { in: [buyerA.id, buyerB.id] },
            bookId: book.id,
            actionType: "PURCHASE",
          },
        }),
        1,
      );
    });

    await t.test("hai request cùng idempotency key chỉ tạo một bộ side effect", async () => {
      const listing = await createListing("IDEMPOTENCY", seller.id, book.id, 3);
      const buyer = await createUser("IDEMPOTENCY");
      const orderId = await createCart("IDEMPOTENCY", buyer.id, [
        { listingId: listing.id, bookId: book.id, quantity: 1 },
      ]);
      const command = {
        buyerId: buyer.id,
        shippingAddressId: buyer.addressId,
        paymentMethod: PaymentMethod.COD,
        checkoutKey: `idempotency-${runId}`,
      };

      const [first, second] = await Promise.all([checkoutOrder(command), checkoutOrder(command)]);
      assert.equal(first.orderId, orderId);
      assert.equal(second.orderId, orderId);
      assert.equal([first.replayed, second.replayed].filter(Boolean).length, 1);
      assert.equal((await prisma.listing.findUniqueOrThrow({ where: { id: listing.id } })).stock, 2);
      assert.equal(await prisma.order.count({ where: { buyerId: buyer.id, checkoutKey: command.checkoutKey } }), 1);
      assert.equal(await prisma.orderTimelineEvent.count({ where: { orderId } }), 1);
      assert.equal(
        await prisma.auditLog.count({
          where: { entityId: orderId, action: "BUYER_CHECKOUT_ORDER_CREATE" },
        }),
        1,
      );
      assert.equal(
        await prisma.interactionEvent.count({
          where: { userId: buyer.id, bookId: book.id, actionType: "PURCHASE" },
        }),
        1,
      );
    });

    await t.test("checkout quantity lớn hơn 1 giảm đúng stock", async () => {
      const listing = await createListing("QUANTITY", seller.id, book.id, 5);
      const buyer = await createUser("QUANTITY");
      await createCart("QUANTITY", buyer.id, [
        { listingId: listing.id, bookId: book.id, quantity: 3 },
      ]);
      await checkoutOrder({
        buyerId: buyer.id,
        shippingAddressId: buyer.addressId,
        paymentMethod: PaymentMethod.BANK_TRANSFER_DEMO,
        checkoutKey: `quantity-${runId}`,
      });
      const after = await prisma.listing.findUniqueOrThrow({ where: { id: listing.id } });
      assert.equal(after.stock, 2);
      assert.equal(after.status, ListingStatus.APPROVED);
      assert.equal(after.soldAt, null);
    });

    await t.test("multi-item có một item lỗi thì toàn bộ đơn và stock không đổi", async () => {
      const available = await createListing("ROLLBACK-A", seller.id, book.id, 2);
      const unavailable = await createListing("ROLLBACK-B", seller.id, book.id, 1, ListingStatus.HIDDEN);
      const buyer = await createUser("ROLLBACK");
      const orderId = await createCart("ROLLBACK", buyer.id, [
        { listingId: available.id, bookId: book.id, quantity: 1 },
        { listingId: unavailable.id, bookId: book.id, quantity: 1 },
      ]);

      await assert.rejects(
        checkoutOrder({
          buyerId: buyer.id,
          shippingAddressId: buyer.addressId,
          paymentMethod: PaymentMethod.COD,
          checkoutKey: `rollback-${runId}`,
        }),
        (error: unknown) => error instanceof CheckoutDomainError && error.code === "LISTING_UNAVAILABLE",
      );
      assert.equal((await prisma.listing.findUniqueOrThrow({ where: { id: available.id } })).stock, 2);
      const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
      assert.equal(order.paymentMethod, null);
      assert.equal(order.checkoutKey, null);
      assert.equal(await prisma.orderTimelineEvent.count({ where: { orderId } }), 0);
    });

    await t.test("self-purchase và listing không khả dụng đều bị chặn", async () => {
      const ownListing = await createListing("SELF", seller.id, book.id, 1);
      await createCart("SELF", seller.id, [
        { listingId: ownListing.id, bookId: book.id, quantity: 1 },
      ]);
      await assert.rejects(
        checkoutOrder({
          buyerId: seller.id,
          shippingAddressId: seller.addressId,
          paymentMethod: PaymentMethod.COD,
          checkoutKey: `self-purchase-${runId}`,
        }),
        (error: unknown) => error instanceof CheckoutDomainError && error.code === "SELF_PURCHASE",
      );
      assert.equal((await prisma.listing.findUniqueOrThrow({ where: { id: ownListing.id } })).stock, 1);

      for (const status of [ListingStatus.HIDDEN, ListingStatus.REJECTED, ListingStatus.SOLD]) {
        const listing = await createListing(
          `UNAVAILABLE-${status}`,
          seller.id,
          book.id,
          status === ListingStatus.SOLD ? 0 : 1,
          status,
        );
        const buyer = await createUser(`UNAVAILABLE-${status}`);
        await createCart(`UNAVAILABLE-${status}`, buyer.id, [
          { listingId: listing.id, bookId: book.id, quantity: 1 },
        ]);
        await assert.rejects(
          checkoutOrder({
            buyerId: buyer.id,
            shippingAddressId: buyer.addressId,
            paymentMethod: PaymentMethod.COD,
            checkoutKey: `unavailable-${status}-${runId}`,
          }),
          (error: unknown) =>
            error instanceof CheckoutDomainError &&
            (status === ListingStatus.SOLD
              ? error.code === "OUT_OF_STOCK"
              : error.code === "LISTING_UNAVAILABLE"),
        );
        assert.equal(
          (await prisma.listing.findUniqueOrThrow({ where: { id: listing.id } })).stock,
          status === ListingStatus.SOLD ? 0 : 1,
        );
      }
    });

    await t.test("account bị khóa và buyer khác không thể thao tác đơn", async () => {
      const listing = await createListing("AUTH-LOCKED", seller.id, book.id, 2);
      const lockedBuyer = await createUser("LOCKED", { locked: true });
      await createCart("LOCKED", lockedBuyer.id, [
        { listingId: listing.id, bookId: book.id, quantity: 1 },
      ]);
      await assert.rejects(
        checkoutOrder({
          buyerId: lockedBuyer.id,
          shippingAddressId: lockedBuyer.addressId,
          paymentMethod: PaymentMethod.COD,
          checkoutKey: `locked-${runId}`,
        }),
        (error: unknown) => error instanceof CheckoutDomainError && error.code === "ACCOUNT_LOCKED",
      );

      const owner = await createUser("AUTH-OWNER");
      const stranger = await createUser("AUTH-STRANGER");
      const orderId = await createCart("AUTH-OWNER", owner.id, [
        { listingId: listing.id, bookId: book.id, quantity: 1 },
      ]);
      await checkoutOrder({
        buyerId: owner.id,
        shippingAddressId: owner.addressId,
        paymentMethod: PaymentMethod.COD,
        checkoutKey: `auth-owner-${runId}`,
      });
      await assert.rejects(
        cancelOrderWithRestock({
          orderId,
          actorId: stranger.id,
          actor: "BUYER",
          source: "buyer_order_detail",
        }),
        (error: unknown) => error instanceof OrderCancellationError && error.code === "FORBIDDEN",
      );
      assert.equal((await prisma.listing.findUniqueOrThrow({ where: { id: listing.id } })).stock, 1);
      await cancelOrderWithRestock({
        orderId,
        actorId: admin.id,
        actor: "ADMIN",
        source: "admin",
      });

      const cancellable = await createListing("AUTH-CANCEL-LOCKED", seller.id, book.id, 1);
      const cancelBuyer = await createUser("AUTH-CANCEL-LOCKED");
      const cancelOrderId = await createCart("AUTH-CANCEL-LOCKED", cancelBuyer.id, [
        { listingId: cancellable.id, bookId: book.id, quantity: 1 },
      ]);
      await checkoutOrder({
        buyerId: cancelBuyer.id,
        shippingAddressId: cancelBuyer.addressId,
        paymentMethod: PaymentMethod.COD,
        checkoutKey: `auth-cancel-locked-${runId}`,
      });
      await prisma.user.update({
        where: { id: cancelBuyer.id },
        data: { isLocked: true, lockedAt: new Date(), lockReason: "Fixture cancel locked" },
      });
      await assert.rejects(
        cancelOrderWithRestock({
          orderId: cancelOrderId,
          actorId: cancelBuyer.id,
          actor: "BUYER",
          source: "buyer_order_detail",
        }),
        (error: unknown) => error instanceof OrderCancellationError && error.code === "ACCOUNT_LOCKED",
      );
      assert.equal((await prisma.listing.findUniqueOrThrow({ where: { id: cancellable.id } })).stock, 0);
      await cancelOrderWithRestock({
        orderId: cancelOrderId,
        actorId: admin.id,
        actor: "ADMIN",
        source: "admin",
      });
    });

    await t.test("hủy một lần hoàn đủ kho; hủy lần hai không hoàn lặp", async () => {
      const listing = await createListing("CANCEL-TWICE", seller.id, book.id, 2);
      const buyer = await createUser("CANCEL-TWICE");
      const orderId = await createCart("CANCEL-TWICE", buyer.id, [
        { listingId: listing.id, bookId: book.id, quantity: 2 },
      ]);
      await checkoutOrder({
        buyerId: buyer.id,
        shippingAddressId: buyer.addressId,
        paymentMethod: PaymentMethod.COD,
        checkoutKey: `cancel-twice-${runId}`,
      });
      assert.equal((await prisma.listing.findUniqueOrThrow({ where: { id: listing.id } })).stock, 0);
      const notificationsBeforeCancel = await prisma.notification.count({
        where: { href: { in: [`/orders/${orderId}`, `/seller/orders/${orderId}`] } },
      });

      const receipt = await cancelOrderWithRestock({
        orderId,
        actorId: buyer.id,
        actor: "BUYER",
        source: "buyer_order_detail",
      });
      assert.equal(receipt.restoredQuantity, 2);
      const restored = await prisma.listing.findUniqueOrThrow({ where: { id: listing.id } });
      assert.equal(restored.stock, 2);
      assert.equal(restored.status, ListingStatus.APPROVED);
      assert.equal(restored.soldAt, null);
      const notificationsAfterFirstCancel = await prisma.notification.count({
        where: { href: { in: [`/orders/${orderId}`, `/seller/orders/${orderId}`] } },
      });
      assert.equal(notificationsAfterFirstCancel, notificationsBeforeCancel + 2);

      await assert.rejects(
        cancelOrderWithRestock({
          orderId,
          actorId: buyer.id,
          actor: "BUYER",
          source: "buyer_order_detail",
        }),
        (error: unknown) => error instanceof OrderCancellationError && error.code === "INVALID_TRANSITION",
      );
      assert.equal((await prisma.listing.findUniqueOrThrow({ where: { id: listing.id } })).stock, 2);
      assert.equal(
        await prisma.notification.count({
          where: { href: { in: [`/orders/${orderId}`, `/seller/orders/${orderId}`] } },
        }),
        notificationsAfterFirstCancel,
      );
      assert.equal(
        await prisma.auditLog.count({ where: { entityId: orderId, action: "BUYER_ORDER_CANCEL" } }),
        1,
      );
    });

    await t.test("hai request hủy đồng thời chỉ một request hoàn kho", async () => {
      const listing = await createListing("CANCEL-CONCURRENT", seller.id, book.id, 1);
      const buyer = await createUser("CANCEL-CONCURRENT");
      const orderId = await createCart("CANCEL-CONCURRENT", buyer.id, [
        { listingId: listing.id, bookId: book.id, quantity: 1 },
      ]);
      await checkoutOrder({
        buyerId: buyer.id,
        shippingAddressId: buyer.addressId,
        paymentMethod: PaymentMethod.COD,
        checkoutKey: `cancel-concurrent-${runId}`,
      });
      const command = {
        orderId,
        actorId: buyer.id,
        actor: "BUYER" as const,
        source: "buyer_order_detail" as const,
      };
      const results = await Promise.allSettled([
        cancelOrderWithRestock(command),
        cancelOrderWithRestock(command),
      ]);
      assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
      assert.equal((await prisma.listing.findUniqueOrThrow({ where: { id: listing.id } })).stock, 1);
      assert.equal(
        await prisma.orderTimelineEvent.count({
          where: { orderId, status: OrderStatus.CANCELLED },
        }),
        1,
      );
      assert.equal(
        await prisma.auditLog.count({ where: { entityId: orderId, action: "BUYER_ORDER_CANCEL" } }),
        1,
      );
    });
  } finally {
    await cleanupFixtures();
    await prisma.$disconnect();
  }
});
