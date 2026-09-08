export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_RESET_WINDOW_MS = 15 * 60 * 1_000;
export const PASSWORD_RESET_MAX_REQUESTS = 5;

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

/**
 * Giới hạn best-effort theo từng tiến trình web. Khi triển khai nhiều replica,
 * cần thay bằng Redis hoặc rate limiter dùng chung giữa các instance.
 */
export class PasswordResetRateLimiter {
  private readonly entries = new Map<string, RateLimitEntry>();

  allow(key: string, now = Date.now()): boolean {
    const normalizedKey = key.trim().toLowerCase();
    if (!normalizedKey) return false;

    const current = this.entries.get(normalizedKey);
    if (!current || current.resetAt <= now) {
      this.entries.set(normalizedKey, {
        count: 1,
        resetAt: now + PASSWORD_RESET_WINDOW_MS,
      });
      return true;
    }

    if (current.count >= PASSWORD_RESET_MAX_REQUESTS) return false;
    current.count += 1;
    return true;
  }
}

export function shouldExposePasswordResetLink(nodeEnv: string | undefined): boolean {
  return nodeEnv !== "production";
}

export function resolvePasswordResetOrigin(
  configuredOrigin: string | undefined,
  nodeEnv: string | undefined,
): string {
  const value = configuredOrigin?.trim();

  if (!value) {
    if (nodeEnv === "production") {
      throw new Error("NEXT_PUBLIC_APP_URL là bắt buộc cho password reset production.");
    }
    return "http://localhost:3000";
  }

  const parsed = new URL(value);
  if (!["http:", "https:"].includes(parsed.protocol) || parsed.username || parsed.password) {
    throw new Error("NEXT_PUBLIC_APP_URL không hợp lệ.");
  }
  if (nodeEnv === "production" && parsed.protocol !== "https:") {
    throw new Error("NEXT_PUBLIC_APP_URL phải dùng HTTPS ở production.");
  }

  return parsed.origin;
}

