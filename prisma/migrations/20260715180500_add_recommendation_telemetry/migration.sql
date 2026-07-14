-- Checkpoint F1: additive recommendation request/impression/click/conversion telemetry.
-- Không backfill hoặc thay đổi Recommendation/InteractionEvent lịch sử.

CREATE TYPE "RecommendationSurface" AS ENUM ('HOME', 'RECOMMENDATION_API', 'DASHBOARD');
CREATE TYPE "RecommendationTelemetryType" AS ENUM ('IMPRESSION', 'CLICK', 'CONVERSION');

CREATE TABLE "recommendation_requests" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "algorithmVersion" TEXT NOT NULL,
    "taxonomyVersion" TEXT NOT NULL,
    "surface" "RecommendationSurface" NOT NULL,
    "candidateProfile" TEXT NOT NULL,
    "filterProfile" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recommendation_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "recommendation_request_items" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "evidence" TEXT,

    CONSTRAINT "recommendation_request_items_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "recommendation_request_items_position_check" CHECK ("position" > 0)
);

CREATE TABLE "recommendation_telemetry_events" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "requestItemId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "RecommendationTelemetryType" NOT NULL,
    "canonicalEvent" TEXT NOT NULL,
    "deduplicationKey" TEXT NOT NULL,
    "sourceType" TEXT,
    "sourceId" TEXT,
    "attributionAnchor" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recommendation_telemetry_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "recommendation_requests_userId_generatedAt_idx"
    ON "recommendation_requests"("userId", "generatedAt");
CREATE INDEX "recommendation_requests_surface_generatedAt_idx"
    ON "recommendation_requests"("surface", "generatedAt");
CREATE INDEX "recommendation_requests_algorithmVersion_generatedAt_idx"
    ON "recommendation_requests"("algorithmVersion", "generatedAt");

CREATE UNIQUE INDEX "recommendation_request_items_requestId_bookId_key"
    ON "recommendation_request_items"("requestId", "bookId");
CREATE UNIQUE INDEX "recommendation_request_items_requestId_position_key"
    ON "recommendation_request_items"("requestId", "position");
CREATE INDEX "recommendation_request_items_bookId_idx"
    ON "recommendation_request_items"("bookId");

CREATE UNIQUE INDEX "recommendation_telemetry_events_deduplicationKey_key"
    ON "recommendation_telemetry_events"("deduplicationKey");
CREATE INDEX "recommendation_telemetry_events_requestId_type_occurredAt_idx"
    ON "recommendation_telemetry_events"("requestId", "type", "occurredAt");
CREATE INDEX "recommendation_telemetry_events_requestItemId_type_idx"
    ON "recommendation_telemetry_events"("requestItemId", "type");
CREATE INDEX "recommendation_telemetry_events_userId_type_occurredAt_idx"
    ON "recommendation_telemetry_events"("userId", "type", "occurredAt");
CREATE INDEX "recommendation_telemetry_events_sourceType_sourceId_idx"
    ON "recommendation_telemetry_events"("sourceType", "sourceId");

ALTER TABLE "recommendation_requests"
    ADD CONSTRAINT "recommendation_requests_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "recommendation_request_items"
    ADD CONSTRAINT "recommendation_request_items_requestId_fkey"
    FOREIGN KEY ("requestId") REFERENCES "recommendation_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "recommendation_request_items"
    ADD CONSTRAINT "recommendation_request_items_bookId_fkey"
    FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "recommendation_telemetry_events"
    ADD CONSTRAINT "recommendation_telemetry_events_requestId_fkey"
    FOREIGN KEY ("requestId") REFERENCES "recommendation_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "recommendation_telemetry_events"
    ADD CONSTRAINT "recommendation_telemetry_events_requestItemId_fkey"
    FOREIGN KEY ("requestItemId") REFERENCES "recommendation_request_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "recommendation_telemetry_events"
    ADD CONSTRAINT "recommendation_telemetry_events_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
