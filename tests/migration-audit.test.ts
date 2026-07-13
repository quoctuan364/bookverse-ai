import assert from "node:assert/strict";
import test from "node:test";

import {
  classifyMigration,
  expectedTypeMatches,
  extractExpectedSchemaObjects,
} from "@/lib/migration-audit";

test("parser thu thập extension, enum, table, column, constraint và index", () => {
  const objects = extractExpectedSchemaObjects(`
    CREATE EXTENSION IF NOT EXISTS vector;
    CREATE TYPE "State" AS ENUM ('A', 'B');
    CREATE TABLE "Thing" (
      "id" TEXT NOT NULL,
      "embedding" vector NOT NULL,
      CONSTRAINT "Thing_pkey" PRIMARY KEY ("id")
    );
    CREATE UNIQUE INDEX "Thing_id_key" ON "Thing"("id");
  `);
  assert.ok(objects.some((object) => object.kind === "extension" && object.name === "vector"));
  assert.ok(objects.some((object) => object.kind === "enum-value" && object.name === "B"));
  assert.ok(objects.some((object) => object.kind === "column" && object.name === "embedding"));
  assert.ok(objects.some((object) => object.kind === "constraint" && object.name === "Thing_pkey"));
  assert.ok(objects.some((object) => object.kind === "index" && object.name === "Thing_id_key"));
});

test("parser thu thập ALTER COLUMN và ADD CONSTRAINT", () => {
  const objects = extractExpectedSchemaObjects(`
    ALTER TABLE "Listing"
      ADD COLUMN IF NOT EXISTS "stock" INTEGER,
      ADD CONSTRAINT "stock_non_negative" CHECK ("stock" >= 0),
      ALTER COLUMN "stock" SET DEFAULT 1,
      ALTER COLUMN "stock" SET NOT NULL;
  `);
  assert.ok(objects.some((object) => object.kind === "column" && object.name === "stock"));
  assert.ok(objects.some((object) => object.kind === "column-default" && object.name === "stock"));
  assert.ok(objects.some((object) => object.kind === "column-nullability" && object.detail === "NOT NULL"));
  assert.ok(objects.some((object) => object.kind === "constraint" && object.name === "stock_non_negative"));
});

test("classification phân biệt đủ bảy trạng thái", () => {
  assert.equal(classifyMigration({ expectedObjectCount: 2, validObjectCount: 2, hasSuccessfulHistory: true, hasActiveFailure: false, checksumMatches: true }), "APPLIED_VALID");
  assert.equal(classifyMigration({ expectedObjectCount: 2, validObjectCount: 2, hasSuccessfulHistory: false, hasActiveFailure: false, checksumMatches: true }), "APPLIED_HISTORY_MISSING");
  assert.equal(classifyMigration({ expectedObjectCount: 2, validObjectCount: 1, hasSuccessfulHistory: false, hasActiveFailure: false, checksumMatches: true }), "APPLIED_SCHEMA_INCOMPLETE");
  assert.equal(classifyMigration({ expectedObjectCount: 2, validObjectCount: 0, hasSuccessfulHistory: false, hasActiveFailure: false, checksumMatches: true }), "PENDING");
  assert.equal(classifyMigration({ expectedObjectCount: 2, validObjectCount: 0, hasSuccessfulHistory: false, hasActiveFailure: true, checksumMatches: true }), "FAILED");
  assert.equal(classifyMigration({ expectedObjectCount: 2, validObjectCount: 2, hasSuccessfulHistory: true, hasActiveFailure: false, checksumMatches: false }), "CHECKSUM_MISMATCH");
  assert.equal(classifyMigration({ expectedObjectCount: 0, validObjectCount: 0, hasSuccessfulHistory: false, hasActiveFailure: false, checksumMatches: true }), "UNKNOWN");
});

test("so khớp type PostgreSQL thường dùng trong migration", () => {
  assert.equal(expectedTypeMatches("TEXT", "text"), true);
  assert.equal(expectedTypeMatches("TIMESTAMP(3)", "timestamp(3) without time zone"), true);
  assert.equal(expectedTypeMatches("DECIMAL(12,2)", "numeric(12,2)"), true);
  assert.equal(expectedTypeMatches('"OrderStatus"', '"OrderStatus"'), true);
  assert.equal(expectedTypeMatches("vector", "vector"), true);
});
