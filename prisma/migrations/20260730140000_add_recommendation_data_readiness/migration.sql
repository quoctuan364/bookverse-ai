-- Data-readiness additive fields. Không backfill event, click, consent hoặc provenance giả.

CREATE TYPE "RecommendationCollectionContext" AS ENUM (
    'STANDARD_APP',
    'PILOT_CONSENTED',
    'BLINDED_RELEVANCE'
);

CREATE TYPE "RecommendationDeviceClass" AS ENUM (
    'DESKTOP',
    'MOBILE',
    'TABLET',
    'UNKNOWN'
);

ALTER TABLE "recommendation_requests"
    ADD COLUMN "collectionContext" "RecommendationCollectionContext"
        NOT NULL DEFAULT 'STANDARD_APP',
    ADD COLUMN "pilotId" TEXT,
    ADD COLUMN "consentVersion" TEXT,
    ADD COLUMN "experimentGroup" TEXT;

ALTER TABLE "recommendation_request_items"
    ADD COLUMN "sourceComponent" TEXT;

ALTER TABLE "recommendation_telemetry_events"
    ADD COLUMN "deviceClass" "RecommendationDeviceClass"
        NOT NULL DEFAULT 'UNKNOWN';

ALTER TABLE "recommendation_requests"
    ADD CONSTRAINT "recommendation_requests_pilot_consent_check"
    CHECK (
        "collectionContext" <> 'PILOT_CONSENTED'
        OR (
            "pilotId" IS NOT NULL
            AND LENGTH(BTRIM("pilotId")) BETWEEN 3 AND 80
            AND "consentVersion" IS NOT NULL
            AND LENGTH(BTRIM("consentVersion")) BETWEEN 1 AND 40
        )
    );

CREATE INDEX "recommendation_requests_context_pilot_generatedAt_idx"
    ON "recommendation_requests"(
        "collectionContext",
        "pilotId",
        "generatedAt"
    );
