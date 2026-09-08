import assert from "node:assert/strict";
import test from "node:test";

import {
  createLoginRateLimitKey,
  LoginRateLimiter,
  readLoginClientIp,
} from "../lib/auth-rate-limit";

test("chặn đăng nhập sau ngưỡng và tự mở lại sau thời gian khóa", () => {
  const limiter = new LoginRateLimiter({
    maxAttempts: 3,
    blockDurationMs: 1_000,
  });
  const key = "test-key";

  limiter.recordFailure(key, 0);
  limiter.recordFailure(key, 1);
  assert.equal(limiter.allow(key, 2), true);
  limiter.recordFailure(key, 2);
  assert.equal(limiter.allow(key, 500), false);
  assert.equal(limiter.allow(key, 1_003), true);
});

test("đăng nhập thành công xóa lịch sử thất bại", () => {
  const limiter = new LoginRateLimiter({ maxAttempts: 2 });
  limiter.recordFailure("reader", 0);
  limiter.recordSuccess("reader");
  assert.equal(limiter.allow("reader", 1), true);
});

test("khóa rate limit không chứa email hoặc IP thô", () => {
  const key = createLoginRateLimitKey(" Reader@Example.com ", "127.0.0.1");
  assert.match(key, /^[a-f0-9]{64}$/u);
  assert.equal(key.includes("reader"), false);
  assert.equal(key.includes("127.0.0.1"), false);
  assert.equal(
    key,
    createLoginRateLimitKey("reader@example.com", "127.0.0.1"),
  );
});

test("đọc IP đầu tiên từ proxy header và có fallback an toàn", () => {
  assert.equal(
    readLoginClientIp(new Headers({ "x-forwarded-for": "203.0.113.1, 10.0.0.1" })),
    "203.0.113.1",
  );
  assert.equal(readLoginClientIp(new Headers()), "unknown");
});
