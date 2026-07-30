-- CreateEnum
CREATE TYPE "MembershipBillingPeriod" AS ENUM ('MONTHLY', 'YEARLY');
CREATE TYPE "SubscriptionStatus" AS ENUM ('PENDING', 'ACTIVE', 'EXPIRED', 'CANCELLED');
CREATE TYPE "MembershipPaymentStatus" AS ENUM ('PENDING', 'PAID_DEMO', 'FAILED', 'REFUNDED');

-- CreateTable
CREATE TABLE "membership_plans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(12,2) NOT NULL,
    "durationDays" INTEGER NOT NULL,
    "billingPeriod" "MembershipBillingPeriod" NOT NULL DEFAULT 'MONTHLY',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "features" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "membership_plans_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'PENDING',
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "membership_payments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "status" "MembershipPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paymentMethod" "PaymentMethod" NOT NULL,
    "transactionRef" TEXT NOT NULL,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "membership_payments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "_MembershipPlanBooks" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

CREATE UNIQUE INDEX "membership_plans_slug_key" ON "membership_plans"("slug");
CREATE INDEX "membership_plans_isActive_price_idx" ON "membership_plans"("isActive", "price");
CREATE INDEX "subscriptions_userId_status_endsAt_idx" ON "subscriptions"("userId", "status", "endsAt");
CREATE INDEX "subscriptions_planId_status_idx" ON "subscriptions"("planId", "status");
CREATE UNIQUE INDEX "membership_payments_transactionRef_key" ON "membership_payments"("transactionRef");
CREATE INDEX "membership_payments_userId_status_idx" ON "membership_payments"("userId", "status");
CREATE INDEX "membership_payments_planId_status_idx" ON "membership_payments"("planId", "status");
CREATE INDEX "membership_payments_subscriptionId_idx" ON "membership_payments"("subscriptionId");
CREATE UNIQUE INDEX "_MembershipPlanBooks_AB_unique" ON "_MembershipPlanBooks"("A", "B");
CREATE INDEX "_MembershipPlanBooks_B_index" ON "_MembershipPlanBooks"("B");

ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "membership_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "membership_payments" ADD CONSTRAINT "membership_payments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "membership_payments" ADD CONSTRAINT "membership_payments_planId_fkey" FOREIGN KEY ("planId") REFERENCES "membership_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "membership_payments" ADD CONSTRAINT "membership_payments_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "_MembershipPlanBooks" ADD CONSTRAINT "_MembershipPlanBooks_A_fkey" FOREIGN KEY ("A") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_MembershipPlanBooks" ADD CONSTRAINT "_MembershipPlanBooks_B_fkey" FOREIGN KEY ("B") REFERENCES "membership_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
