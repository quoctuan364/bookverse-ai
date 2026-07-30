"use server";

import {
  MembershipBillingPeriod,
  MembershipPaymentStatus,
  NotificationType,
  PaymentMethod,
  Prisma,
  SubscriptionStatus,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { recordAuditLog } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import {
  isMembershipSandboxRequestId,
  normalizeMembershipRefundReason,
  parseMembershipSandboxMethod,
  parseMembershipSandboxOutcome,
} from "@/lib/membership-payment-sandbox";
import { requireAdminUser, requireAuthenticatedUser } from "@/lib/permissions";

const readableBookWhere: Prisma.BookWhereInput = {
  status: "ACTIVE",
  deletedAt: null,
};

export async function getMembershipPlans() {
  const [plans, readableBookCount] = await Promise.all([
    prisma.membershipPlan.findMany({
      where: { isActive: true },
      orderBy: [{ price: "asc" }, { durationDays: "asc" }],
      include: { _count: { select: { books: true, subscriptions: true } } },
    }),
    prisma.book.count({ where: readableBookWhere }),
  ]);

  return plans.map((plan) => ({
    ...plan,
    _count: { ...plan._count, books: readableBookCount },
  }));
}

export async function getMembershipCheckoutPlan(planId: string) {
  await requireAuthenticatedUser();
  const [plan, readableBookCount] = await Promise.all([
    prisma.membershipPlan.findFirst({
      where: { id: planId.trim(), isActive: true },
      include: { _count: { select: { books: true } } },
    }),
    prisma.book.count({ where: readableBookWhere }),
  ]);

  return plan
    ? { ...plan, _count: { ...plan._count, books: readableBookCount } }
    : null;
}

export async function getMyMembership() {
  const user = await requireAuthenticatedUser();
  const now = new Date();

  await prisma.subscription.updateMany({
    where: { userId: user.id, status: SubscriptionStatus.ACTIVE, endsAt: { lte: now } },
    data: { status: SubscriptionStatus.EXPIRED },
  });

  const [currentSubscription, payments] = await Promise.all([
    prisma.subscription.findFirst({
      where: {
        userId: user.id,
        status: SubscriptionStatus.ACTIVE,
        startsAt: { lte: now },
        endsAt: { gt: now },
      },
      orderBy: { endsAt: "desc" },
      include: { plan: { include: { _count: { select: { books: true } } } } },
    }),
    prisma.membershipPayment.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { plan: { select: { name: true } } },
    }),
  ]);

  const subscription =
    currentSubscription ??
    (await prisma.subscription.findFirst({
      where: { userId: user.id },
      orderBy: { endsAt: "desc" },
      include: { plan: { include: { _count: { select: { books: true } } } } },
    }));

  const readableBookCount = await prisma.book.count({ where: readableBookWhere });
  const subscriptionWithUniversalLibrary = subscription
    ? {
        ...subscription,
        plan: {
          ...subscription.plan,
          _count: { ...subscription.plan._count, books: readableBookCount },
        },
      }
    : null;

  return { subscription: subscriptionWithUniversalLibrary, payments };
}

export async function getMyMembershipPayments(page = 1) {
  const user = await requireAuthenticatedUser();
  const safePage = Math.max(1, Math.floor(page));
  const pageSize = 12;
  const [payments, total] = await Promise.all([
    prisma.membershipPayment.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      skip: (safePage - 1) * pageSize,
      take: pageSize,
      include: {
        plan: { select: { name: true, durationDays: true } },
        subscription: { select: { startsAt: true, endsAt: true } },
      },
    }),
    prisma.membershipPayment.count({ where: { userId: user.id } }),
  ]);
  return { payments, total, page: safePage, pageSize };
}

export async function createMembershipPaymentIntent(
  planId: string,
  paymentMethodValue: string,
  requestId: string,
) {
  const user = await requireAuthenticatedUser();
  const paymentMethod = parseMembershipSandboxMethod(paymentMethodValue);
  const cleanRequestId = requestId.trim();

  if (!paymentMethod || !isMembershipSandboxRequestId(cleanRequestId)) {
    return {
      success: false,
      message: "Thông tin thanh toán sandbox không hợp lệ. Vui lòng tải lại trang.",
    };
  }

  const plan = await prisma.membershipPlan.findFirst({
    where: { id: planId.trim(), isActive: true },
  });
  if (!plan || plan.durationDays < 1 || Number(plan.price) <= 0) {
    return { success: false, message: "Gói hội viên không còn khả dụng." };
  }

  const transactionRef = `MEM-SANDBOX-${user.id}-${cleanRequestId}`;
  const existing = await prisma.membershipPayment.findUnique({
    where: { transactionRef },
    select: { id: true, status: true },
  });
  if (existing) {
    return {
      success: true,
      message: "Yêu cầu thanh toán này đã được tạo trước đó.",
      paymentId: existing.id,
      status: existing.status,
    };
  }

  const payment = await prisma.$transaction(async (tx) => {
    const created = await tx.membershipPayment.create({
      data: {
        userId: user.id,
        planId: plan.id,
        amount: plan.price,
        status: MembershipPaymentStatus.PENDING,
        paymentMethod: paymentMethod as PaymentMethod,
        transactionRef,
      },
      select: { id: true, status: true },
    });

    await recordAuditLog(
      {
        actorId: user.id,
        action: "MEMBERSHIP_PAYMENT_STARTED",
        entityType: "MembershipPayment",
        entityId: created.id,
        metadata: { planId: plan.id, paymentMethod, transactionRef },
      },
      tx,
    );
    return created;
  });

  return {
    success: true,
    message: "Đã tạo giao dịch sandbox.",
    paymentId: payment.id,
    status: payment.status,
  };
}

export async function getMembershipSandboxPayment(paymentId: string) {
  const user = await requireAuthenticatedUser();
  return prisma.membershipPayment.findFirst({
    where: { id: paymentId.trim(), userId: user.id },
    select: {
      id: true,
      amount: true,
      status: true,
      paymentMethod: true,
      transactionRef: true,
      createdAt: true,
      subscriptionId: true,
      plan: {
        select: {
          id: true,
          name: true,
          durationDays: true,
          features: true,
        },
      },
    },
  });
}

export async function completeMembershipSandboxPayment(
  paymentId: string,
  outcomeValue: string,
) {
  const user = await requireAuthenticatedUser();
  const outcome = parseMembershipSandboxOutcome(outcomeValue);
  if (!outcome) {
    return { success: false, message: "Kết quả giao dịch không hợp lệ." };
  }

  const payment = await prisma.membershipPayment.findFirst({
    where: { id: paymentId.trim(), userId: user.id },
    include: { plan: true },
  });
  if (!payment) {
    return { success: false, message: "Không tìm thấy giao dịch sandbox." };
  }
  if (
    payment.status === MembershipPaymentStatus.PAID_DEMO &&
    payment.subscriptionId
  ) {
    return {
      success: true,
      message: "Giao dịch đã được xử lý trước đó.",
      subscriptionId: payment.subscriptionId,
    };
  }
  if (payment.status !== MembershipPaymentStatus.PENDING) {
    return {
      success: false,
      message: "Giao dịch không còn ở trạng thái chờ thanh toán.",
    };
  }

  if (outcome === "failure") {
    await prisma.$transaction(async (tx) => {
      await tx.membershipPayment.updateMany({
        where: {
          id: payment.id,
          userId: user.id,
          status: MembershipPaymentStatus.PENDING,
        },
        data: { status: MembershipPaymentStatus.FAILED },
      });
      await recordAuditLog(
        {
          actorId: user.id,
          action: "MEMBERSHIP_PAYMENT_FAILED",
          entityType: "MembershipPayment",
          entityId: payment.id,
          metadata: { transactionRef: payment.transactionRef },
        },
        tx,
      );
    });
    revalidatePath("/profile/membership/payments");
    return {
      success: false,
      message: "Thanh toán sandbox đã thất bại theo kịch bản thử nghiệm.",
    };
  }

  const now = new Date();
  try {
    const result = await prisma.$transaction(
      async (tx) => {
        const claimed = await tx.membershipPayment.updateMany({
          where: {
            id: payment.id,
            userId: user.id,
            status: MembershipPaymentStatus.PENDING,
          },
          data: {
            status: MembershipPaymentStatus.PAID_DEMO,
            paidAt: now,
          },
        });
        if (claimed.count !== 1) {
          throw new Error("PAYMENT_ALREADY_PROCESSED");
        }

        const latestActive = await tx.subscription.findFirst({
          where: {
            userId: user.id,
            status: SubscriptionStatus.ACTIVE,
            endsAt: { gt: now },
          },
          orderBy: { endsAt: "desc" },
          select: { endsAt: true },
        });
        const startsAt = latestActive?.endsAt ?? now;
        const endsAt = new Date(startsAt);
        endsAt.setUTCDate(endsAt.getUTCDate() + payment.plan.durationDays);

        const subscription = await tx.subscription.create({
          data: {
            userId: user.id,
            planId: payment.plan.id,
            status: SubscriptionStatus.ACTIVE,
            startsAt,
            endsAt,
          },
        });
        await tx.membershipPayment.update({
          where: { id: payment.id },
          data: { subscriptionId: subscription.id },
        });
        await createNotification(
          {
            userId: user.id,
            type: NotificationType.SYSTEM,
            title: "Thanh toán hội viên thành công",
            message: `Gói ${payment.plan.name} có hiệu lực đến ${endsAt.toLocaleDateString("vi-VN")}.`,
            href: "/profile/membership",
          },
          tx,
        );
        await recordAuditLog(
          {
            actorId: user.id,
            action: "MEMBERSHIP_PAYMENT_COMPLETED",
            entityType: "MembershipPayment",
            entityId: payment.id,
            metadata: {
              planId: payment.plan.id,
              subscriptionId: subscription.id,
              transactionRef: payment.transactionRef,
            },
          },
          tx,
        );
        return subscription;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    revalidatePath("/membership");
    revalidatePath("/membership/books");
    revalidatePath("/profile/membership");
    revalidatePath("/profile/membership/payments");
    return {
      success: true,
      message: "Thanh toán sandbox thành công.",
      subscriptionId: result.id,
    };
  } catch (error) {
    const completed = await prisma.membershipPayment.findFirst({
      where: {
        id: payment.id,
        userId: user.id,
        status: MembershipPaymentStatus.PAID_DEMO,
        subscriptionId: { not: null },
      },
      select: { subscriptionId: true },
    });
    if (completed?.subscriptionId) {
      return {
        success: true,
        message: "Giao dịch đã được xử lý trước đó.",
        subscriptionId: completed.subscriptionId,
      };
    }
    throw error;
  }
}

export async function subscribeMembership(
  planId: string,
  paymentMethod: PaymentMethod,
  requestId: string,
) {
  const user = await requireAuthenticatedUser();
  if (paymentMethod === PaymentMethod.COD) {
    return { success: false, message: "Gói số không hỗ trợ thanh toán khi nhận hàng." };
  }
  const cleanRequestId = requestId.trim();
  if (!/^[0-9a-f-]{36}$/i.test(cleanRequestId)) {
    return { success: false, message: "Yêu cầu đăng ký không hợp lệ. Vui lòng tải lại trang." };
  }
  const transactionRef = `MEM-DEMO-${user.id}-${cleanRequestId}`;

  const plan = await prisma.membershipPlan.findFirst({
    where: { id: planId.trim(), isActive: true },
  });
  if (!plan || plan.durationDays < 1 || Number(plan.price) <= 0) {
    return { success: false, message: "Gói hội viên không còn khả dụng." };
  }

  const existingPayment = await prisma.membershipPayment.findUnique({
    where: { transactionRef },
    select: { subscriptionId: true },
  });
  if (existingPayment?.subscriptionId) {
    return {
      success: true,
      message: "Yêu cầu này đã được xử lý trước đó.",
      subscriptionId: existingPayment.subscriptionId,
    };
  }

  const now = new Date();
  let result: { id: string };
  try {
    result = await prisma.$transaction(async (tx) => {
      const latestActive = await tx.subscription.findFirst({
        where: {
          userId: user.id,
          status: SubscriptionStatus.ACTIVE,
          endsAt: { gt: now },
        },
        orderBy: { endsAt: "desc" },
        select: { endsAt: true },
      });
      const startsAt = latestActive?.endsAt ?? now;
      const endsAt = new Date(startsAt);
      endsAt.setUTCDate(endsAt.getUTCDate() + plan.durationDays);

      const subscription = await tx.subscription.create({
        data: {
          userId: user.id,
          planId: plan.id,
          status: SubscriptionStatus.ACTIVE,
          startsAt,
          endsAt,
        },
      });
      await tx.membershipPayment.create({
        data: {
          userId: user.id,
          planId: plan.id,
          subscriptionId: subscription.id,
          amount: plan.price,
          status: MembershipPaymentStatus.PAID_DEMO,
          paymentMethod,
          transactionRef,
          paidAt: now,
        },
      });
      await createNotification({
        userId: user.id,
        type: NotificationType.SYSTEM,
        title: "Đăng ký hội viên thành công",
        message: `Gói ${plan.name} có hiệu lực từ ${startsAt.toLocaleDateString("vi-VN")} đến ${endsAt.toLocaleDateString("vi-VN")}.`,
        href: "/profile/membership",
      }, tx);
      await recordAuditLog({
        actorId: user.id,
        action: "MEMBERSHIP_SUBSCRIBED",
        entityType: "Subscription",
        entityId: subscription.id,
        metadata: { planId: plan.id, transactionRef, startsAt, endsAt },
      }, tx);
      return subscription;
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const duplicated = await prisma.membershipPayment.findUnique({
        where: { transactionRef },
        select: { subscriptionId: true },
      });
      if (duplicated?.subscriptionId) {
        return {
          success: true,
          message: "Yêu cầu này đã được xử lý trước đó.",
          subscriptionId: duplicated.subscriptionId,
        };
      }
    }
    throw error;
  }

  revalidatePath("/membership");
  revalidatePath("/membership/books");
  revalidatePath("/profile/membership");
  return { success: true, message: "Đăng ký hội viên demo thành công.", subscriptionId: result.id };
}

export async function cancelMyMembership() {
  const user = await requireAuthenticatedUser();
  const now = new Date();
  const current = await prisma.subscription.findFirst({
    where: {
      userId: user.id,
      status: SubscriptionStatus.ACTIVE,
      startsAt: { lte: now },
      endsAt: { gt: now },
      cancelledAt: null,
    },
    orderBy: { endsAt: "desc" },
    select: { id: true },
  });
  if (!current) {
    return { success: false, message: "Không có gói đang hoạt động." };
  }
  await prisma.$transaction(async (tx) => {
    await tx.subscription.update({
      where: { id: current.id },
      // Hủy gia hạn nhưng vẫn giữ quyền đến cuối kỳ; không hủy các kỳ đã mua trước.
      data: { cancelledAt: now },
    });
    await recordAuditLog({
      actorId: user.id,
      action: "MEMBERSHIP_RENEWAL_CANCELLED",
      entityType: "Subscription",
      entityId: current.id,
    }, tx);
  });
  revalidatePath("/profile/membership");
  return {
    success: true,
    message: "Đã hủy gia hạn. Quyền đọc vẫn còn đến cuối kỳ.",
  };
}

export async function getMembershipBooks(page = 1) {
  const safePage = Math.max(1, Math.floor(page));
  const pageSize = 24;
  const where = readableBookWhere;
  const [books, total] = await Promise.all([
    prisma.book.findMany({
      where,
      orderBy: [{ rating: "desc" }, { title: "asc" }],
      skip: (safePage - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        title: true,
        authorName: true,
        coverPath: true,
        rating: true,
        category: { select: { name: true } },
      },
    }),
    prisma.book.count({ where }),
  ]);
  return { books, total, page: safePage, pageSize };
}

export interface ReadingLibraryQuery {
  query?: string;
  category?: string;
  page?: number;
}

/** Kho đọc chung: mọi đầu sách đang hoạt động đều có thể mở trang đọc thử. */
export async function getReadingLibrary(input: ReadingLibraryQuery = {}) {
  const query = input.query?.trim() ?? "";
  const category = input.category?.trim() ?? "";
  const page = Math.max(1, Math.floor(input.page ?? 1));
  const pageSize = 24;
  const where: Prisma.BookWhereInput = {
    ...readableBookWhere,
    ...(query
      ? {
          OR: [
            { title: { contains: query, mode: "insensitive" } },
            { authorName: { contains: query, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(category ? { category: { slug: category } } : {}),
  };

  const [books, total, categories] = await Promise.all([
    prisma.book.findMany({
      where,
      orderBy: [{ rating: "desc" }, { title: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        title: true,
        authorName: true,
        coverPath: true,
        rating: true,
        pages: true,
        category: { select: { name: true, slug: true } },
      },
    }),
    prisma.book.count({ where }),
    prisma.category.findMany({
      where: { books: { some: readableBookWhere } },
      orderBy: { name: "asc" },
      select: { name: true, slug: true },
    }),
  ]);

  return { books, total, categories, page, pageSize, query, category };
}

export async function createMembershipPlan(formData: FormData) {
  await requireAdminUser();
  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  const price = Number(formData.get("price"));
  const durationDays = Number(formData.get("durationDays"));
  const billingPeriod = String(formData.get("billingPeriod")) as MembershipBillingPeriod;
  if (!name || !/^[a-z0-9-]{3,50}$/.test(slug) || price <= 0 || durationDays < 1) {
    return { success: false, message: "Thông tin gói không hợp lệ." };
  }
  await prisma.membershipPlan.create({
    data: {
      name,
      slug,
      price,
      durationDays: Math.floor(durationDays),
      billingPeriod:
        billingPeriod === MembershipBillingPeriod.YEARLY
          ? MembershipBillingPeriod.YEARLY
          : MembershipBillingPeriod.MONTHLY,
      description: String(formData.get("description") ?? "").trim() || null,
      features: String(formData.get("features") ?? "")
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean),
    },
  });
  revalidatePath("/membership");
  revalidatePath("/admin/membership-plans");
  return { success: true, message: "Đã tạo gói hội viên." };
}

export async function updateMembershipPlan(formData: FormData) {
  await requireAdminUser();
  const planId = String(formData.get("planId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const price = Number(formData.get("price"));
  const durationDays = Math.floor(Number(formData.get("durationDays")));
  if (!planId || !name || price <= 0 || durationDays < 1) {
    return { success: false, message: "Thông tin cập nhật không hợp lệ." };
  }
  await prisma.membershipPlan.update({
    where: { id: planId },
    data: {
      name,
      price,
      durationDays,
      description: String(formData.get("description") ?? "").trim() || null,
      features: String(formData.get("features") ?? "")
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean),
    },
  });
  revalidatePath("/membership");
  revalidatePath("/admin/membership-plans");
  return { success: true, message: "Đã cập nhật gói hội viên." };
}

export async function toggleMembershipPlanActive(planId: string) {
  await requireAdminUser();
  const plan = await prisma.membershipPlan.findUnique({
    where: { id: planId.trim() },
    select: { isActive: true },
  });
  if (!plan) return { success: false, message: "Không tìm thấy gói." };
  await prisma.membershipPlan.update({
    where: { id: planId.trim() },
    data: { isActive: !plan.isActive },
  });
  revalidatePath("/membership");
  revalidatePath("/admin/membership-plans");
  return { success: true, message: plan.isActive ? "Đã tạm ngừng gói." : "Đã mở bán lại gói." };
}

export async function getAdminSubscriptions(query = "", page = 1) {
  await requireAdminUser();
  const safePage = Math.max(1, Math.floor(page));
  const pageSize = 20;
  const cleanQuery = query.trim();
  const where: Prisma.SubscriptionWhereInput = cleanQuery
    ? {
        OR: [
          { user: { name: { contains: cleanQuery, mode: "insensitive" } } },
          { user: { email: { contains: cleanQuery, mode: "insensitive" } } },
          { plan: { name: { contains: cleanQuery, mode: "insensitive" } } },
        ],
      }
    : {};
  const [subscriptions, total, revenue, activeCount] = await Promise.all([
    prisma.subscription.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (safePage - 1) * pageSize,
      take: pageSize,
      include: {
        user: { select: { name: true, email: true } },
        plan: { select: { name: true } },
        payments: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { id: true, amount: true, status: true },
        },
      },
    }),
    prisma.subscription.count({ where }),
    prisma.membershipPayment.aggregate({
      where: { status: MembershipPaymentStatus.PAID_DEMO },
      _sum: { amount: true },
    }),
    prisma.subscription.count({
      where: { status: SubscriptionStatus.ACTIVE, startsAt: { lte: new Date() }, endsAt: { gt: new Date() } },
    }),
  ]);
  return {
    subscriptions,
    total,
    page: safePage,
    pageSize,
    activeCount,
    revenue: Number(revenue._sum.amount ?? 0),
  };
}

export async function updateSubscriptionStatus(subscriptionId: string, status: SubscriptionStatus) {
  await requireAdminUser();
  if (
    status !== SubscriptionStatus.ACTIVE &&
    status !== SubscriptionStatus.CANCELLED &&
    status !== SubscriptionStatus.EXPIRED
  ) {
    return { success: false, message: "Trạng thái không hợp lệ." };
  }
  const subscription = await prisma.subscription.findUnique({
    where: { id: subscriptionId.trim() },
    select: { id: true, endsAt: true },
  });
  if (!subscription) return { success: false, message: "Không tìm thấy thuê bao." };
  if (status === SubscriptionStatus.ACTIVE && subscription.endsAt <= new Date()) {
    return { success: false, message: "Không thể kích hoạt kỳ đã hết hạn. Hãy tạo kỳ gia hạn mới." };
  }
  await prisma.subscription.update({
    where: { id: subscriptionId.trim() },
    data: {
      status,
      cancelledAt: status === SubscriptionStatus.CANCELLED ? new Date() : status === SubscriptionStatus.ACTIVE ? null : undefined,
    },
  });
  revalidatePath("/admin/subscriptions");
  return { success: true, message: "Đã cập nhật thuê bao." };
}

export async function refundMembershipSandboxPayment(
  paymentId: string,
  reasonValue: string,
) {
  const admin = await requireAdminUser();
  const reason = normalizeMembershipRefundReason(reasonValue);
  if (!reason) {
    return {
      success: false,
      message: "Lý do hoàn tiền phải có từ 5 đến 300 ký tự.",
    };
  }

  const payment = await prisma.membershipPayment.findUnique({
    where: { id: paymentId.trim() },
    select: {
      id: true,
      userId: true,
      subscriptionId: true,
      status: true,
      transactionRef: true,
      plan: { select: { name: true } },
    },
  });
  if (!payment) {
    return { success: false, message: "Không tìm thấy giao dịch hội viên." };
  }
  if (payment.status === MembershipPaymentStatus.REFUNDED) {
    return { success: true, message: "Giao dịch đã được hoàn tiền trước đó." };
  }
  if (payment.status !== MembershipPaymentStatus.PAID_DEMO) {
    return {
      success: false,
      message: "Chỉ giao dịch PAID_DEMO mới có thể hoàn tiền.",
    };
  }

  const now = new Date();
  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.membershipPayment.updateMany({
      where: {
        id: payment.id,
        status: MembershipPaymentStatus.PAID_DEMO,
      },
      data: { status: MembershipPaymentStatus.REFUNDED },
    });
    if (updated.count !== 1) return false;

    if (payment.subscriptionId) {
      await tx.subscription.updateMany({
        where: {
          id: payment.subscriptionId,
          status: {
            in: [SubscriptionStatus.PENDING, SubscriptionStatus.ACTIVE],
          },
        },
        data: {
          status: SubscriptionStatus.CANCELLED,
          cancelledAt: now,
        },
      });
    }
    await createNotification(
      {
        userId: payment.userId,
        type: NotificationType.SYSTEM,
        title: "Giao dịch hội viên đã được hoàn tiền",
        message: `Gói ${payment.plan.name} đã được hoàn tiền Sandbox. Lý do: ${reason}`,
        href: "/profile/membership/payments",
      },
      tx,
    );
    await recordAuditLog(
      {
        actorId: admin.id,
        action: "MEMBERSHIP_PAYMENT_REFUNDED",
        entityType: "MembershipPayment",
        entityId: payment.id,
        metadata: {
          transactionRef: payment.transactionRef,
          subscriptionId: payment.subscriptionId,
          reason,
        },
      },
      tx,
    );
    return true;
  });

  revalidatePath("/admin/subscriptions");
  revalidatePath("/admin/analytics");
  revalidatePath("/profile/membership");
  revalidatePath("/profile/membership/payments");
  return result
    ? { success: true, message: "Đã hoàn tiền Sandbox và hủy kỳ liên quan." }
    : { success: false, message: "Giao dịch đã được xử lý bởi yêu cầu khác." };
}

/**
 * Tạo thông báo nội bộ cho các gói hết hạn trong 3 ngày. Kiểm tra href và tiêu
 * đề giúp chạy lại tác vụ mà không gửi trùng trong cùng ngày.
 */
export async function generateMembershipExpiryNotifications() {
  await requireAdminUser();
  const now = new Date();
  const until = new Date(now);
  until.setUTCDate(until.getUTCDate() + 3);
  const expiring = await prisma.subscription.findMany({
    where: {
      status: SubscriptionStatus.ACTIVE,
      startsAt: { lte: now },
      endsAt: { gt: now, lte: until },
    },
    include: { plan: { select: { name: true } } },
  });
  let created = 0;
  for (const item of expiring) {
    const title = "Gói hội viên sắp hết hạn";
    const existing = await prisma.notification.findFirst({
      where: {
        userId: item.userId,
        title,
        href: "/profile/membership",
        createdAt: { gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) },
      },
      select: { id: true },
    });
    if (existing) continue;
    await prisma.notification.create({
      data: {
        userId: item.userId,
        type: NotificationType.SYSTEM,
        title,
        message: `${item.plan.name} sẽ hết hạn vào ${item.endsAt.toLocaleDateString("vi-VN")}.`,
        href: "/profile/membership",
      },
    });
    created += 1;
  }
  revalidatePath("/notifications");
  return { success: true, message: `Đã tạo ${created} thông báo sắp hết hạn.` };
}
