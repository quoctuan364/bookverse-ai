import assert from "node:assert/strict";
import test from "node:test";
import {
  PASSWORD_RESET_MAX_REQUESTS,
  PASSWORD_RESET_WINDOW_MS,
  PasswordResetRateLimiter,
  resolvePasswordResetOrigin,
  shouldExposePasswordResetLink,
} from "../lib/password-reset-policy";

test("production không bao giờ trả reset link về giao diện", () => {
  assert.equal(shouldExposePasswordResetLink("production"), false);
  assert.equal(shouldExposePasswordResetLink("development"), true);
});

test("production chỉ nhận app origin HTTPS đã cấu hình", () => {
  assert.equal(resolvePasswordResetOrigin("https://bookverse.example/path", "production"), "https://bookverse.example");
  assert.throws(() => resolvePasswordResetOrigin(undefined, "production"));
  assert.throws(() => resolvePasswordResetOrigin("http://bookverse.example", "production"));
  assert.throws(() => resolvePasswordResetOrigin("https://user:pass@bookverse.example", "production"));
});

test("development có origin local an toàn khi chưa cấu hình", () => {
  assert.equal(resolvePasswordResetOrigin(undefined, "development"), "http://localhost:3000");
});

test("rate limiter chặn sau giới hạn và mở lại ở window mới", () => {
  const limiter = new PasswordResetRateLimiter();
  const startedAt = 1_000;

  for (let index = 0; index < PASSWORD_RESET_MAX_REQUESTS; index += 1) {
    assert.equal(limiter.allow("User@Example.com", startedAt), true);
  }
  assert.equal(limiter.allow("user@example.com", startedAt), false);
  assert.equal(limiter.allow("user@example.com", startedAt + PASSWORD_RESET_WINDOW_MS), true);
});

