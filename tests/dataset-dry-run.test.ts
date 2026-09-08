import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { buildReadOnlyDryRunPlan } from "@/lib/dataset-dry-run";
import { writeImportReport, type ImportReport } from "@/lib/dataset-import-report";

test("dry-run chỉ dùng read repository và count trước/sau không đổi", async () => {
  let readCalls = 0;
  let writeCalls = 0;
  const repository = {
    async getCounts() {
      readCalls += 1;
      return { books: 10, users: 5 };
    },
    async getExistingBookIds() {
      readCalls += 1;
      return new Set(["B0001"]);
    },
    async create() {
      writeCalls += 1;
    },
    async update() {
      writeCalls += 1;
    },
    async deleteMany() {
      writeCalls += 1;
    },
  };

  const plan = await buildReadOnlyDryRunPlan(repository, ["B0001", "B0002"]);
  assert.equal(plan.willCreate, 1);
  assert.equal(plan.willUpdate, 1);
  assert.equal(readCalls, 3);
  assert.equal(writeCalls, 0);
  assert.deepEqual(plan.countsBefore, plan.countsAfter);
});

test("dry-run fail nếu count thay đổi", async () => {
  let call = 0;
  const repository = {
    async getCounts() {
      call += 1;
      return { books: call === 1 ? 10 : 11 };
    },
    async getExistingBookIds() {
      return new Set<string>();
    },
  };

  await assert.rejects(
    () => buildReadOnlyDryRunPlan(repository, ["B0001"]),
    /database counts changed/,
  );
});

test("report được tạo mới và không chứa secret", async () => {
  const outputDirectory = await mkdtemp(path.join(os.tmpdir(), "bookverse-import-report-"));
  const report: ImportReport = {
    mode: "dry-run",
    sourceFile: "data/json/test.json",
    sourceChecksum: "abc",
    categoryMappingChecksum: null,
    databaseName: "bookverse_ai_test",
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    durationMs: 1,
    total: 1,
    valid: 1,
    warnings: 0,
    invalid: 0,
    inserted: 0,
    updated: 0,
    skipped: 0,
    duplicates: 0,
    failedRelations: 0,
    planned: {
      create: 1,
      update: 0,
      skip: 0,
      authors: 1,
      categories: 1,
      tags: 1,
      ebooks: 1,
      bookFiles: 1,
      categoryParents: 0,
      canonicalMappings: 0,
      unmappedCategories: 0,
    },
    tableCountsBefore: { books: 0 },
    tableCountsAfter: { books: 0 },
    replaceExisting: false,
    recordResults: [],
    errors: [],
  };

  try {
    const files = await writeImportReport(report, outputDirectory);
    const content = await readFile(files.reportPath, "utf-8");
    assert.match(content, /bookverse_ai_test/);
    assert.doesNotMatch(content, /private-password|postgresql:\/\//);
  } finally {
    await rm(outputDirectory, { recursive: true, force: true });
  }
});
