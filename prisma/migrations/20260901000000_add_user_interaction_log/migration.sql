-- Migration: 20260901000000_add_user_interaction_log
-- Muc dich: Them bang thu thap tuong tac nguoi dung that voi consent
-- Chinh sach: ADDITIVE ONLY -- khong xoa, khong sua bang cu
-- Tac gia: Luong Nguyen Quoc Tuan -- Do an tot nghiep BookVerse AI

-- Tao enum cho cac loai event theo spec
CREATE TYPE "user_interaction_event_type" AS ENUM (
  'IMPRESSION',
  'VIEW',
  'RECOMMENDATION_CLICK',
  'SEARCH',
  'FAVORITE',
  'BOOKMARK',
  'ADD_TO_CART',
  'PURCHASE',
  'RATING'
);

-- Bang luu trang thai dong y/tu choi tham gia nghien cuu
CREATE TABLE "user_research_consents" (
  "id"             TEXT NOT NULL,
  "userId"         TEXT NOT NULL,
  "consentVersion" TEXT NOT NULL,
  "consented"      BOOLEAN NOT NULL,
  "consentedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt"      TIMESTAMP(3),
  "metadata"       JSONB,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL,
  CONSTRAINT "user_research_consents_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_research_consents_userId_consentVersion_key"
  ON "user_research_consents"("userId", "consentVersion");

CREATE INDEX "user_research_consents_userId_consented_idx"
  ON "user_research_consents"("userId", "consented");

CREATE INDEX "user_research_consents_consentVersion_consented_idx"
  ON "user_research_consents"("consentVersion", "consented");

ALTER TABLE "user_research_consents"
  ADD CONSTRAINT "user_research_consents_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Bang ghi tuong tac nghien cuu -- CHI ghi khi user da dong y
CREATE TABLE "user_interaction_logs" (
  "id"                      TEXT NOT NULL,
  "userId"                  TEXT,
  "anonymousId"             TEXT,
  "bookId"                  TEXT,
  "eventType"               "user_interaction_event_type" NOT NULL,
  "eventValue"              DOUBLE PRECISION,
  "sourcePage"              TEXT,
  "recommendationRequestId" TEXT,
  "recommendationModel"     TEXT,
  "position"                INTEGER,
  "consentVersion"          TEXT NOT NULL,
  "idempotencyKey"          TEXT,
  "metadata"                JSONB,
  "createdAt"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_interaction_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_interaction_logs_idempotencyKey_key"
  ON "user_interaction_logs"("idempotencyKey")
  WHERE "idempotencyKey" IS NOT NULL;

CREATE INDEX "user_interaction_logs_userId_createdAt_idx"
  ON "user_interaction_logs"("userId", "createdAt");

CREATE INDEX "user_interaction_logs_anonymousId_createdAt_idx"
  ON "user_interaction_logs"("anonymousId", "createdAt");

CREATE INDEX "user_interaction_logs_bookId_eventType_idx"
  ON "user_interaction_logs"("bookId", "eventType");

CREATE INDEX "user_interaction_logs_eventType_createdAt_idx"
  ON "user_interaction_logs"("eventType", "createdAt");

CREATE INDEX "user_interaction_logs_recommendationRequestId_idx"
  ON "user_interaction_logs"("recommendationRequestId");

CREATE INDEX "user_interaction_logs_consentVersion_eventType_idx"
  ON "user_interaction_logs"("consentVersion", "eventType");

ALTER TABLE "user_interaction_logs"
  ADD CONSTRAINT "user_interaction_logs_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
