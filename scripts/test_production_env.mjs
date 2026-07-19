import assert from "node:assert/strict";

import { validateProductionEnvironment } from "./validate-production-env.mjs";

const validEnvironment = {
  NODE_ENV: "production",
  AUTH_SECRET: "G1-Strong-Auth-Secret-2026-Unique-Value!",
  DATABASE_URL: "postgresql://bookverse_app:StrongDatabasePass2026!@db:5432/bookverse_ai",
  BOOKVERSE_CHAT_MOCK_ENABLED: "false",
};

assert.deepEqual(validateProductionEnvironment({ NODE_ENV: "development" }), { skipped: true });
assert.deepEqual(validateProductionEnvironment(validEnvironment), { skipped: false });

for (const [name, environment] of [
  ["missing AUTH_SECRET", { ...validEnvironment, AUTH_SECRET: "" }],
  ["short AUTH_SECRET", { ...validEnvironment, AUTH_SECRET: "too-short" }],
  ["placeholder AUTH_SECRET", { ...validEnvironment, AUTH_SECRET: "replace-me-with-at-least-32-characters" }],
  ["missing DATABASE_URL", { ...validEnvironment, DATABASE_URL: "" }],
  ["short database password", { ...validEnvironment, DATABASE_URL: "postgresql://user:short@db:5432/bookverse_ai" }],
  ["placeholder database password", { ...validEnvironment, DATABASE_URL: "postgresql://user:REPLACE_ME_DATABASE_PASSWORD@db:5432/bookverse_ai" }],
  ["production mock", { ...validEnvironment, BOOKVERSE_CHAT_MOCK_ENABLED: "true" }],
]) {
  assert.throws(
    () => validateProductionEnvironment(environment),
    undefined,
    `Policy phải từ chối trường hợp ${name}.`,
  );
}

console.log("VERIFIED: production env policy chấp nhận cấu hình mạnh và từ chối 7 cấu hình không an toàn.");
