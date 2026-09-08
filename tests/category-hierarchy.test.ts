import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCategoryCanonicalMapping,
  calculateCategoryDepth,
  detectCategoryCycles,
  resolveCanonicalCategory,
  validateParentAssignments,
  type CategoryNode,
} from "@/lib/category-hierarchy";

const validNodes: CategoryNode[] = [
  { id: "C001", name: "Công nghệ thông tin", parentId: null, level: 1 },
  { id: "C044", name: "Công nghệ — Nhập môn #0044", parentId: "C001", level: 2 },
  { id: "C045", name: "Công nghệ — Nâng cao #0045", parentId: "C044", level: 3 },
];

test("parent và level mapping hợp lệ", () => {
  const result = validateParentAssignments(validNodes);
  assert.deepEqual(result.orphans, []);
  assert.deepEqual(result.selfParents, []);
  assert.deepEqual(result.cycles, []);
  assert.deepEqual(result.levelMismatches, []);
});

test("canonical mapping của child kế thừa root", () => {
  const mapped = resolveCanonicalCategory(validNodes[1], validNodes);
  assert.equal(mapped.canonicalKey, "technology");
  assert.equal(mapped.canonicalName, "Công nghệ");
  assert.equal(mapped.mappingRule, "parent-category");
  assert.equal(mapped.confidence, "HIGH");
});

test("category không có root rule được đánh dấu UNMAPPED", () => {
  const nodes: CategoryNode[] = [
    { id: "C999", name: "Chưa biết", parentId: null, level: 1 },
  ];
  const mapped = resolveCanonicalCategory(nodes[0], nodes);
  assert.equal(mapped.canonicalKey, "unmapped");
  assert.equal(mapped.confidence, "UNMAPPED");
  assert.equal(mapped.mappingRule, "unmapped");
});

test("phát hiện self-parent", () => {
  const nodes: CategoryNode[] = [
    { id: "A", name: "A", parentId: "A", level: 1 },
  ];
  const result = validateParentAssignments(nodes);
  assert.deepEqual(result.selfParents, ["A"]);
  assert.equal(result.cycles.length, 1);
});

test("phát hiện cycle hai node", () => {
  const nodes: CategoryNode[] = [
    { id: "A", name: "A", parentId: "B", level: 2 },
    { id: "B", name: "B", parentId: "A", level: 1 },
  ];
  assert.equal(detectCategoryCycles(nodes).length, 1);
});

test("phát hiện cycle nhiều node", () => {
  const nodes: CategoryNode[] = [
    { id: "A", name: "A", parentId: "B", level: 3 },
    { id: "B", name: "B", parentId: "C", level: 2 },
    { id: "C", name: "C", parentId: "A", level: 1 },
  ];
  assert.equal(detectCategoryCycles(nodes).length, 1);
});

test("phát hiện orphan parent", () => {
  const nodes: CategoryNode[] = [
    { id: "A", name: "A", parentId: "MISSING", level: 2 },
  ];
  assert.deepEqual(validateParentAssignments(nodes).orphans, ["A"]);
});

test("tính depth từ root", () => {
  assert.equal(calculateCategoryDepth("C001", validNodes), 0);
  assert.equal(calculateCategoryDepth("C044", validNodes), 1);
  assert.equal(calculateCategoryDepth("C045", validNodes), 2);
  assert.equal(calculateCategoryDepth("MISSING", validNodes), null);
});

test("mapping idempotent và deterministic", () => {
  const first = buildCategoryCanonicalMapping(validNodes);
  const second = buildCategoryCanonicalMapping([...validNodes].reverse());
  assert.deepEqual(second, first);
  assert.equal(JSON.stringify(first), JSON.stringify(second));
});
