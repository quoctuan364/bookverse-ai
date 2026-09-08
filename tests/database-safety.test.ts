import assert from "node:assert/strict";
import test from "node:test";

import { assertSafeDatabase } from "@/lib/database-safety";

const demoUrl = "postgresql://private-user:private-password@localhost:5432/bookverse_ai?schema=public";
const testUrl = "postgresql://private-user:private-password@localhost:5432/bookverse_ai_test?schema=public";

test("cho phép read-only trên database demo", () => {
  const result = assertSafeDatabase({
    operation: "read-only",
    databaseUrl: demoUrl,
  });

  assert.equal(result.databaseName, "bookverse_ai");
  assert.equal(result.maskedUrl, "postgresql://***:***@***:***/bookverse_ai");
  assert.doesNotMatch(result.maskedUrl, /private-user|private-password|localhost/);
});

test("từ chối destructive trên database demo", () => {
  assert.throws(
    () =>
      assertSafeDatabase({
        operation: "destructive",
        databaseUrl: demoUrl,
        allowedDatabases: "bookverse_ai_test",
      }),
    /Refusing destructive operation on database "bookverse_ai"/,
  );
});

test("cho phép destructive trên database test có allowlist", () => {
  const result = assertSafeDatabase({
    operation: "destructive",
    databaseUrl: testUrl,
    allowedDatabases: "bookverse_ai_test",
  });

  assert.equal(result.databaseName, "bookverse_ai_test");
});

test("từ chối destructive khi allowlist không tồn tại", () => {
  assert.throws(
    () =>
      assertSafeDatabase({
        operation: "destructive",
        databaseUrl: testUrl,
        allowedDatabases: "",
      }),
    /Allowed databases: \(none\)/,
  );
});

test("lỗi guard không làm lộ thông tin kết nối", () => {
  let message = "";
  try {
    assertSafeDatabase({
      operation: "destructive",
      databaseUrl: demoUrl,
      allowedDatabases: "bookverse_ai_test",
    });
  } catch (error) {
    message = error instanceof Error ? error.message : String(error);
  }

  assert.doesNotMatch(message, /private-user|private-password|localhost|postgresql:\/\//);
});

