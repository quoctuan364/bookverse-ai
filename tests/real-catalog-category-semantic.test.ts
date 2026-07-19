import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const mapping = JSON.parse(fs.readFileSync(path.join(process.cwd(), "config", "real-catalog-category-mapping.json"), "utf8")) as {
  entries: Array<{ sourceSlug: string; confidence: string; targetCanonicalKey: string; rationale: string; ambiguity: string }>;
};

const expectedLowTargets: Record<string, string> = {
  science: "education",
  economics: "business",
  architecture: "design",
  sociology: "philosophy",
  politics: "history",
  cooking: "travel",
  religion: "philosophy",
  "vietnamese-books": "literature",
};

test("8 mapping LOW có rationale, ambiguity và quyết định deterministic", () => {
  const low = mapping.entries.filter((entry) => entry.confidence === "LOW");
  assert.equal(low.length, 8);
  for (const [sourceSlug, target] of Object.entries(expectedLowTargets)) {
    const entry = low.find((item) => item.sourceSlug === sourceSlug);
    assert.ok(entry, `Thiếu mapping LOW ${sourceSlug}`);
    assert.equal(entry.targetCanonicalKey, target);
    assert.ok(entry.rationale.trim().length > 0);
    assert.ok(entry.ambiguity.trim().length > 0);
  }
});
