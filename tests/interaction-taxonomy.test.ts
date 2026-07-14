import assert from "node:assert/strict";
import test from "node:test";

import {
  INTERACTION_TAXONOMY,
  TAXONOMY_VERSION,
  getTaxonomyEvent,
  mapLegacyInteractionEvent,
  taxonomyManifest,
  validateCanonicalEventFields,
} from "@/lib/interaction-taxonomy";

test("taxonomy version và canonical event không trùng", () => {
  assert.equal(TAXONOMY_VERSION, "interaction-taxonomy.v1");
  const names = INTERACTION_TAXONOMY.events.map((event) => event.name);
  assert.equal(new Set(names).size, names.length);
  assert.ok(names.includes("RECOMMENDATION_IMPRESSION"));
  assert.ok(names.includes("RECOMMENDATION_CONVERSION"));
});

test("legacy alias ánh xạ deterministic và assistant tách khỏi recommendation", () => {
  assert.equal(mapLegacyInteractionEvent("VIEW"), "BOOK_VIEW");
  assert.equal(mapLegacyInteractionEvent("read-page"), "READING_PROGRESS");
  assert.equal(mapLegacyInteractionEvent("ADD_TO_CART"), "CART_ADD");
  assert.equal(mapLegacyInteractionEvent("CHATBOT_QUERY"), "ASSISTANT_QUERY");
  assert.notEqual(mapLegacyInteractionEvent("CHATBOT_QUERY"), "RECOMMENDATION_CLICK");
  assert.equal(mapLegacyInteractionEvent("UNKNOWN_EVENT"), null);
});

test("required field validation từ chối field thiếu", () => {
  const missing = validateCanonicalEventFields("RECOMMENDATION_IMPRESSION", {
    requestId: "REQ-1",
    userId: "U1",
    timestamp: "2026-07-15T00:00:00Z",
  });
  assert.equal(missing.valid, false);
  assert.deepEqual(missing.missingFields, ["bookId"]);

  const valid = validateCanonicalEventFields("RECOMMENDATION_IMPRESSION", {
    requestId: "REQ-1",
    userId: "U1",
    bookId: "B1",
    timestamp: "2026-07-15T00:00:00Z",
  });
  assert.equal(valid.valid, true);
});

test("unknown canonical event bị từ chối", () => {
  assert.equal(getTaxonomyEvent("NOT_REAL"), null);
  assert.throws(
    () => validateCanonicalEventFields("NOT_REAL", {}),
    /Unknown interaction event/,
  );
});

test("taxonomy manifest ổn định", () => {
  const first = taxonomyManifest();
  const second = taxonomyManifest();
  assert.deepEqual(first, second);
  assert.match(first.checksum, /^[a-f0-9]{64}$/);
});
