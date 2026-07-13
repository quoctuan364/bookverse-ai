DO $$
BEGIN
  CREATE TYPE "ChatbotMessageRole" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "seller_ai_scores" (
  "id" TEXT NOT NULL,
  "sellerId" TEXT NOT NULL,
  "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "completedOrders" INTEGER NOT NULL DEFAULT 0,
  "responseRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "trusted" BOOLEAN NOT NULL DEFAULT false,
  "explanation" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "seller_ai_scores_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "seller_ai_scores_sellerId_key" ON "seller_ai_scores"("sellerId");
CREATE INDEX IF NOT EXISTS "seller_ai_scores_score_idx" ON "seller_ai_scores"("score");

DO $$
BEGIN
  ALTER TABLE "seller_ai_scores"
  ADD CONSTRAINT "seller_ai_scores_sellerId_fkey"
  FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "daily_recommendations" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "bookId" TEXT NOT NULL,
  "rank" INTEGER NOT NULL,
  "score" DOUBLE PRECISION NOT NULL,
  "reason" TEXT,
  "algorithm" TEXT NOT NULL DEFAULT 'daily_hybrid_v1',
  "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3),
  CONSTRAINT "daily_recommendations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "daily_recommendations_userId_bookId_algorithm_key"
  ON "daily_recommendations"("userId", "bookId", "algorithm");
CREATE INDEX IF NOT EXISTS "daily_recommendations_userId_rank_idx" ON "daily_recommendations"("userId", "rank");
CREATE INDEX IF NOT EXISTS "daily_recommendations_bookId_idx" ON "daily_recommendations"("bookId");

DO $$
BEGIN
  ALTER TABLE "daily_recommendations"
  ADD CONSTRAINT "daily_recommendations_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "daily_recommendations"
  ADD CONSTRAINT "daily_recommendations_bookId_fkey"
  FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "RecommendationEvidence"
  ALTER COLUMN "recommendationId" DROP NOT NULL;

ALTER TABLE "RecommendationEvidence"
  ADD COLUMN IF NOT EXISTS "dailyRecommendationId" TEXT;

CREATE INDEX IF NOT EXISTS "RecommendationEvidence_dailyRecommendationId_idx"
  ON "RecommendationEvidence"("dailyRecommendationId");

DO $$
BEGIN
  ALTER TABLE "RecommendationEvidence"
  ADD CONSTRAINT "RecommendationEvidence_dailyRecommendationId_fkey"
  FOREIGN KEY ("dailyRecommendationId") REFERENCES "daily_recommendations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "chatbot_sessions" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "title" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "chatbot_sessions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "chatbot_sessions_userId_updatedAt_idx"
  ON "chatbot_sessions"("userId", "updatedAt");

DO $$
BEGIN
  ALTER TABLE "chatbot_sessions"
  ADD CONSTRAINT "chatbot_sessions_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "chatbot_messages" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "role" "ChatbotMessageRole" NOT NULL,
  "content" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "chatbot_messages_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "chatbot_messages_sessionId_createdAt_idx"
  ON "chatbot_messages"("sessionId", "createdAt");

DO $$
BEGIN
  ALTER TABLE "chatbot_messages"
  ADD CONSTRAINT "chatbot_messages_sessionId_fkey"
  FOREIGN KEY ("sessionId") REFERENCES "chatbot_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
