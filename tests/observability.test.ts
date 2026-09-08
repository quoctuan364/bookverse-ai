import assert from "node:assert/strict";
import test from "node:test";

import { errorMessageForLog, sanitizeLogFields } from "../lib/observability";

test("log loại bỏ trường nhạy cảm và ký tự xuống dòng", () => {
  assert.deepEqual(
    sanitizeLogFields({
      requestId: "req-12345678\nforged",
      email: "student@example.com",
      authorization: "Bearer secret",
      status: 500,
    }),
    { requestId: "req-12345678 forged", status: 500 },
  );
});

test("thông báo lỗi được rút gọn an toàn", () => {
  assert.equal(errorMessageForLog(new Error("DB failed\nnext line")), "DB failed next line");
  assert.equal(errorMessageForLog("unknown\terror"), "unknown error");
});
