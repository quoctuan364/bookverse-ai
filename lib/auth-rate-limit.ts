import { createHash } from "node:crypto";

interface AttemptState {
  attempts: number;
  blockedUntil: number;
  lastSeenAt: number;
}

interface LoginRateLimiterOptions {
  maxAttempts?: number;
  blockDurationMs?: number;
  staleEntryMs?: number;
  maxEntries?: number;
}

/**
 * Rate limiter đăng nhập theo từng tiến trình.
 * Lớp này không lưu email/IP thô và có giới hạn kích thước để tránh tăng bộ nhớ vô hạn.
 * Khi triển khai nhiều replica, cần thay storage bằng Redis nhưng giữ nguyên contract này.
 */
export class LoginRateLimiter {
  private readonly attempts = new Map<string, AttemptState>();
  private readonly maxAttempts: number;
  private readonly blockDurationMs: number;
  private readonly staleEntryMs: number;
  private readonly maxEntries: number;

  constructor(options: LoginRateLimiterOptions = {}) {
    this.maxAttempts = options.maxAttempts ?? 5;
    this.blockDurationMs = options.blockDurationMs ?? 15 * 60_000;
    this.staleEntryMs = options.staleEntryMs ?? 24 * 60 * 60_000;
    this.maxEntries = options.maxEntries ?? 10_000;
  }

  allow(key: string, now = Date.now()): boolean {
    const state = this.attempts.get(key);
    if (!state) return true;

    if (state.blockedUntil > now) return false;
    if (state.blockedUntil > 0 || now - state.lastSeenAt > this.staleEntryMs) {
      this.attempts.delete(key);
    }
    return true;
  }

  recordFailure(key: string, now = Date.now()): void {
    this.prune(now);
    const previous = this.attempts.get(key);
    const attempts = (previous?.attempts ?? 0) + 1;
    this.attempts.set(key, {
      attempts,
      blockedUntil: attempts >= this.maxAttempts ? now + this.blockDurationMs : 0,
      lastSeenAt: now,
    });
  }

  recordSuccess(key: string): void {
    this.attempts.delete(key);
  }

  private prune(now: number): void {
    for (const [key, state] of this.attempts) {
      if (now - state.lastSeenAt > this.staleEntryMs) this.attempts.delete(key);
    }

    while (this.attempts.size >= this.maxEntries) {
      const oldestKey = this.attempts.keys().next().value as string | undefined;
      if (!oldestKey) break;
      this.attempts.delete(oldestKey);
    }
  }
}

export function createLoginRateLimitKey(email: string, clientIp: string): string {
  return createHash("sha256")
    .update(`${email.trim().toLowerCase()}\u0000${clientIp.trim() || "unknown"}`)
    .digest("hex");
}

export function readLoginClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip")?.trim() || "unknown";
}

export const authLoginRateLimiter = new LoginRateLimiter();
