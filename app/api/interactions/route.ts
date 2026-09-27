/**
 * POST /api/interactions — Ghi tương tác người dùng thật vào user_interaction_logs
 *
 * Yêu cầu:
 * - Người dùng PHẢI đăng nhập (không hỗ trợ anonymous — đơn giản, dễ bảo vệ, đủ cho đồ án)
 * - Người dùng PHẢI đã consent (userResearchConsent.consented = true và revokedAt IS NULL)
 * - eventType hợp lệ trong enum UserInteractionEventType
 * - bookId hợp lệ nếu eventType != SEARCH
 * - Timestamp do server ghi (không tin client)
 * - Idempotency key để chống ghi trùng từ retry
 *
 * Rate limit: dùng LoginRateLimiter adapter (in-memory, không dùng setInterval).
 * Giới hạn: 60 req/phút/user. Khi chạy nhiều instance, mỗi instance có
 * counter riêng — đủ để ngăn lỗi client nhưng không ngăn được multi-instance bypass.
 * Đây là acceptable trade-off cho phạm vi pilot đồ án.
 */
import { LoginRateLimiter } from "@/lib/auth-rate-limit";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/permissions";
import { recordResearchInteraction } from "@/lib/research-interactions-service";

// Rate limiter: 60 req/phút, block 1 phút, stale sau 2 phút, max 5000 entry
// Không dùng setInterval — LoginRateLimiter prune on-demand tại mỗi request
const rateLimiter = new LoginRateLimiter({
  maxAttempts: 60,
  blockDurationMs: 60_000,
  staleEntryMs: 2 * 60_000,
  maxEntries: 5_000,
});

export async function POST(request: Request) {
  try {
    // 1. Xác thực — chỉ cho phép user đã đăng nhập
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.isLocked) {
      return NextResponse.json(
        { error: "Bạn cần đăng nhập để ghi tương tác nghiên cứu." },
        { status: 401 },
      );
    }

    // 2. Rate limit theo userId (không dùng IP để tránh lưu PII)
    const rateLimitKey = `interaction:${currentUser.id}`;
    if (!rateLimiter.allow(rateLimitKey)) {
      return NextResponse.json(
        { error: "Quá nhiều yêu cầu. Vui lòng thử lại sau." },
        { status: 429 },
      );
    }

    // 3. Parse body
    const body: unknown = await request.json();
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Body không hợp lệ." }, { status: 400 });
    }

    // 4. Ủy quyền toàn bộ kiểm tra & ghi DB cho service tập trung
    const result = await recordResearchInteraction({
      authenticatedUserId: currentUser.id,
      payload: body as Record<string, unknown>,
    });

    if (result.status === "CREATED") {
      return NextResponse.json(
        {
          success: true,
          id: result.id,
          eventType: result.eventType,
        },
        { status: 201 },
      );
    }

    if (result.status === "DEDUPLICATED") {
      return NextResponse.json(
        {
          success: true,
          deduplicated: true,
          id: result.id,
          eventType: result.eventType,
        },
        { status: 200 },
      );
    }

    if (result.status === "CONSENT_REQUIRED") {
      rateLimiter.recordFailure(rateLimitKey);
      return NextResponse.json(
        {
          error: result.reason,
          code: "CONSENT_REQUIRED",
        },
        { status: 403 },
      );
    }

    if (result.status === "AUTH_REQUIRED") {
      return NextResponse.json(
        { error: result.reason },
        { status: 401 },
      );
    }

    return NextResponse.json(
      { error: result.reason },
      { status: 400 },
    );
  } catch {
    console.error("[api/interactions] POST failed");
    return NextResponse.json(
      { error: "Không thể ghi tương tác. Vui lòng thử lại." },
      { status: 500 },
    );
  }
}