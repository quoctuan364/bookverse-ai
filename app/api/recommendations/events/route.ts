import { NextResponse } from "next/server";
import { RecommendationDeviceClass } from "@prisma/client";

import { getCurrentUser } from "@/lib/permissions";
import {
  RecommendationTelemetryError,
  recordRecommendationTelemetry,
} from "@/lib/recommendation-telemetry";
import {
  RECOMMENDATION_EVENT_BODY_LIMIT_BYTES,
  TelemetryRateLimiter,
  classifyRecommendationDevice,
  parseTelemetryPayload,
} from "@/lib/recommendation-telemetry-policy";

const rateLimiter = new TelemetryRateLimiter();

function errorResponse(error: string, status: number): NextResponse {
  return NextResponse.json({ success: false, error }, { status });
}

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return errorResponse("Bạn cần đăng nhập để ghi telemetry.", 401);
    if (currentUser.isLocked) return errorResponse("Tài khoản đã bị khóa.", 403);
    if (!rateLimiter.allow(currentUser.id)) {
      return errorResponse("Bạn gửi telemetry quá nhanh. Vui lòng thử lại sau.", 429);
    }

    const contentLength = Number(request.headers.get("content-length") ?? "0");
    if (Number.isFinite(contentLength) && contentLength > RECOMMENDATION_EVENT_BODY_LIMIT_BYTES) {
      return errorResponse("Payload telemetry quá lớn.", 413);
    }
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > RECOMMENDATION_EVENT_BODY_LIMIT_BYTES) {
      return errorResponse("Payload telemetry quá lớn.", 413);
    }

    let body: unknown;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return errorResponse("JSON telemetry không hợp lệ.", 400);
    }
    const payload = parseTelemetryPayload(body);
    const deviceClass = classifyRecommendationDevice(
      request.headers.get("user-agent"),
    ) as RecommendationDeviceClass;
    const result = await recordRecommendationTelemetry({
      currentUserId: currentUser.id,
      deviceClass,
      ...payload,
    });
    return NextResponse.json(
      {
        success: true,
        duplicate: result.duplicate,
        occurredAt: result.occurredAt.toISOString(),
      },
      { status: result.duplicate ? 200 : 201 },
    );
  } catch (error: unknown) {
    if (error instanceof RecommendationTelemetryError) {
      if (error.code === "REQUEST_FORBIDDEN" || error.code === "ACCOUNT_NOT_ALLOWED") {
        return errorResponse("Bạn không được ghi telemetry cho request này.", 403);
      }
      return errorResponse("Không tìm thấy request hoặc Book tương ứng.", 404);
    }
    if (error instanceof Error && error.message.includes("không hợp lệ")) {
      return errorResponse("Payload telemetry không hợp lệ.", 400);
    }
    console.error("[recommendation.telemetry] Không thể ghi telemetry.");
    return errorResponse("Telemetry tạm thời không khả dụng.", 503);
  }
}
