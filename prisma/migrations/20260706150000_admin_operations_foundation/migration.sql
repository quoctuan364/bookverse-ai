DO $$
BEGIN
  CREATE TYPE "BookStatus" AS ENUM ('ACTIVE', 'DRAFT', 'HIDDEN', 'ARCHIVED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "PaymentMethod" AS ENUM ('COD', 'BANK_TRANSFER_DEMO', 'WALLET_DEMO');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "NotificationType" AS ENUM ('SYSTEM', 'MARKETPLACE', 'ORDER', 'COMMUNITY', 'AI', 'SECURITY');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "FeedbackValue" AS ENUM ('HELPFUL', 'NOT_HELPFUL', 'IRRELEVANT', 'DISMISSED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TYPE "ListingStatus" ADD VALUE IF NOT EXISTS 'HIDDEN';

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isLocked" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lockedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lockReason" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastActiveAt" TIMESTAMP(3);

ALTER TABLE "Book" ADD COLUMN IF NOT EXISTS "status" "BookStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "Book" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT;
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "moderationNote" TEXT;
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "reviewedAt" TIMESTAMP(3);
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "hiddenAt" TIMESTAMP(3);
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "reportCount" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "paymentMethod" "PaymentMethod";
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "shippingSnapshot" JSONB;

ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "moderationReason" TEXT;
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "moderatedAt" TIMESTAMP(3);

ALTER TABLE "Comment" ADD COLUMN IF NOT EXISTS "moderationReason" TEXT;
ALTER TABLE "Comment" ADD COLUMN IF NOT EXISTS "moderatedAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "order_timeline_events" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "actorId" TEXT,
  "status" "OrderStatus" NOT NULL,
  "note" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "order_timeline_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "notifications" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "type" "NotificationType" NOT NULL DEFAULT 'SYSTEM',
  "href" TEXT,
  "readAt" TIMESTAMP(3),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id" TEXT NOT NULL,
  "actorId" TEXT,
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "recommendation_feedback" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "recommendationId" TEXT,
  "dailyRecommendationId" TEXT,
  "bookId" TEXT,
  "value" "FeedbackValue" NOT NULL,
  "note" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "recommendation_feedback_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "chatbot_feedback" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "sessionId" TEXT NOT NULL,
  "messageId" TEXT,
  "value" "FeedbackValue" NOT NULL,
  "note" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "chatbot_feedback_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  ALTER TABLE "order_timeline_events"
  ADD CONSTRAINT "order_timeline_events_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "order_timeline_events"
  ADD CONSTRAINT "order_timeline_events_actorId_fkey"
  FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "notifications"
  ADD CONSTRAINT "notifications_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "audit_logs"
  ADD CONSTRAINT "audit_logs_actorId_fkey"
  FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "recommendation_feedback"
  ADD CONSTRAINT "recommendation_feedback_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "recommendation_feedback"
  ADD CONSTRAINT "recommendation_feedback_recommendationId_fkey"
  FOREIGN KEY ("recommendationId") REFERENCES "Recommendation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "recommendation_feedback"
  ADD CONSTRAINT "recommendation_feedback_dailyRecommendationId_fkey"
  FOREIGN KEY ("dailyRecommendationId") REFERENCES "daily_recommendations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "recommendation_feedback"
  ADD CONSTRAINT "recommendation_feedback_bookId_fkey"
  FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "chatbot_feedback"
  ADD CONSTRAINT "chatbot_feedback_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "chatbot_feedback"
  ADD CONSTRAINT "chatbot_feedback_sessionId_fkey"
  FOREIGN KEY ("sessionId") REFERENCES "chatbot_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "chatbot_feedback"
  ADD CONSTRAINT "chatbot_feedback_messageId_fkey"
  FOREIGN KEY ("messageId") REFERENCES "chatbot_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "User_isLocked_idx" ON "User"("isLocked");
CREATE INDEX IF NOT EXISTS "User_lastActiveAt_idx" ON "User"("lastActiveAt");
CREATE INDEX IF NOT EXISTS "Book_status_idx" ON "Book"("status");
CREATE INDEX IF NOT EXISTS "Listing_reportCount_idx" ON "Listing"("reportCount");
CREATE INDEX IF NOT EXISTS "order_timeline_events_orderId_createdAt_idx" ON "order_timeline_events"("orderId", "createdAt");
CREATE INDEX IF NOT EXISTS "order_timeline_events_actorId_idx" ON "order_timeline_events"("actorId");
CREATE INDEX IF NOT EXISTS "notifications_userId_readAt_createdAt_idx" ON "notifications"("userId", "readAt", "createdAt");
CREATE INDEX IF NOT EXISTS "notifications_type_idx" ON "notifications"("type");
CREATE INDEX IF NOT EXISTS "audit_logs_actorId_createdAt_idx" ON "audit_logs"("actorId", "createdAt");
CREATE INDEX IF NOT EXISTS "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");
CREATE INDEX IF NOT EXISTS "audit_logs_action_idx" ON "audit_logs"("action");
CREATE INDEX IF NOT EXISTS "recommendation_feedback_userId_createdAt_idx" ON "recommendation_feedback"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "recommendation_feedback_recommendationId_idx" ON "recommendation_feedback"("recommendationId");
CREATE INDEX IF NOT EXISTS "recommendation_feedback_dailyRecommendationId_idx" ON "recommendation_feedback"("dailyRecommendationId");
CREATE INDEX IF NOT EXISTS "recommendation_feedback_bookId_idx" ON "recommendation_feedback"("bookId");
CREATE INDEX IF NOT EXISTS "chatbot_feedback_userId_createdAt_idx" ON "chatbot_feedback"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "chatbot_feedback_sessionId_idx" ON "chatbot_feedback"("sessionId");
CREATE INDEX IF NOT EXISTS "chatbot_feedback_messageId_idx" ON "chatbot_feedback"("messageId");
