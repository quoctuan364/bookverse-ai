import assert from "node:assert/strict";
import test from "node:test";

import { buildIntegrationReadiness } from "@/lib/integration-readiness";

test("readiness không trả giá trị secret ra kết quả", () => {
  const secret = "secret-value-must-not-leak";
  const result = buildIntegrationReadiness(
    {
      DATABASE_URL: `postgresql://user:${secret}@localhost/bookverse`,
      AUTH_GOOGLE_ID: "client-id",
      AUTH_GOOGLE_SECRET: secret,
      NEXT_PUBLIC_APP_URL: "https://books.example.com",
    },
    true,
  );

  assert.equal(JSON.stringify(result).includes(secret), false);
});

test("Google và email chỉ READY khi đủ cặp cấu hình", () => {
  const partial = buildIntegrationReadiness(
    {
      AUTH_GOOGLE_ID: "client-id",
      BOOKVERSE_PASSWORD_RESET_WEBHOOK_URL: "https://mail.example.com/reset",
    },
    true,
  );

  assert.equal(partial.find((item) => item.id === "google")?.status, "PARTIAL");
  assert.equal(partial.find((item) => item.id === "email")?.status, "PARTIAL");
});

test("local RAG được ghi PARTIAL khi chưa có provider ngoài", () => {
  const result = buildIntegrationReadiness(
    {
      BOOKVERSE_LLM_PROVIDER: "local",
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    },
    true,
  );

  assert.equal(result.find((item) => item.id === "llm")?.status, "PARTIAL");
  assert.equal(result.find((item) => item.id === "app-origin")?.status, "PARTIAL");
});

test("provider được chọn nhưng thiếu key phải MISSING", () => {
  const result = buildIntegrationReadiness(
    { BOOKVERSE_LLM_PROVIDER: "openai" },
    false,
  );

  assert.equal(result.find((item) => item.id === "llm")?.status, "MISSING");
  assert.equal(result.find((item) => item.id === "database")?.status, "MISSING");
});
