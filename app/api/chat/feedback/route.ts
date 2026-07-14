import { FeedbackValue } from "@prisma/client";
import { NextResponse } from "next/server";

import {
  createAssistantError,
  parseAssistantFeedbackPayload,
  type AssistantFailureCode,
} from "@/lib/assistant-contract";
import { evaluateFeedbackAccess } from "@/lib/assistant-policy";
import { sanitizeAssistantLog } from "@/lib/assistant-runtime";
import { getCurrentUser } from "@/lib/permissions";
import prisma from "@/lib/prisma";

function failureDetails(code: AssistantFailureCode) {
  switch (code) {
    case "FEEDBACK_UNAUTHORIZED":
      return { status: 401, message: "Bạn cần đăng nhập để đánh giá chatbot." };
    case "ACCOUNT_LOCKED":
      return {
        status: 403,
        message: "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.",
      };
    case "FEEDBACK_FORBIDDEN":
      return { status: 403, message: "Bạn không có quyền đánh giá phiên chat này." };
    case "SESSION_NOT_FOUND":
      return { status: 404, message: "Không tìm thấy phiên chat." };
    case "MESSAGE_NOT_FOUND":
      return { status: 404, message: "Không tìm thấy phản hồi của trợ lý trong phiên chat." };
    default:
      return { status: 400, message: "Feedback không hợp lệ." };
  }
}

function toFeedbackValue(value: "HELPFUL" | "NOT_HELPFUL" | "IRRELEVANT"): FeedbackValue {
  if (value === "HELPFUL") return FeedbackValue.HELPFUL;
  if (value === "NOT_HELPFUL") return FeedbackValue.NOT_HELPFUL;
  return FeedbackValue.IRRELEVANT;
}

export async function POST(request: Request) {
  try {
    const rawPayload: unknown = await request.json().catch(() => null);
    const parsed = parseAssistantFeedbackPayload(rawPayload);
    if (!parsed.ok) return NextResponse.json(parsed.error, { status: 400 });

    const currentUser = await getCurrentUser();
    if (!currentUser) {
      const details = failureDetails("FEEDBACK_UNAUTHORIZED");
      return NextResponse.json(
        createAssistantError("FEEDBACK_UNAUTHORIZED", details.message),
        { status: details.status },
      );
    }
    if (currentUser.isLocked) {
      const details = failureDetails("ACCOUNT_LOCKED");
      return NextResponse.json(createAssistantError("ACCOUNT_LOCKED", details.message), {
        status: details.status,
      });
    }

    const [session, message] = await Promise.all([
      prisma.chatbotSession.findUnique({
        where: { id: parsed.value.sessionId },
        select: { id: true, userId: true },
      }),
      prisma.chatbotMessage.findUnique({
        where: { id: parsed.value.messageId },
        select: { id: true, sessionId: true, role: true },
      }),
    ]);
    const accessCode = evaluateFeedbackAccess({
      currentUserId: currentUser.id,
      currentUserLocked: false,
      sessionExists: Boolean(session),
      sessionUserId: session?.userId ?? null,
      messageExists: Boolean(message),
      messageSessionId: message?.sessionId ?? null,
      requestedSessionId: parsed.value.sessionId,
      messageRole: message?.role ?? null,
    });
    if (accessCode) {
      const details = failureDetails(accessCode);
      return NextResponse.json(createAssistantError(accessCode, details.message), {
        status: details.status,
      });
    }

    await prisma.chatbotFeedback.create({
      data: {
        userId: currentUser!.id,
        sessionId: parsed.value.sessionId,
        messageId: parsed.value.messageId,
        value: toFeedbackValue(parsed.value.value),
        note: parsed.value.note,
        metadata: { source: "assistant_contract", contractVersion: "d1" },
      },
    });
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error: unknown) {
    console.error(`[api/chat/feedback] ${sanitizeAssistantLog(error)}`);
    return NextResponse.json(
      createAssistantError(
        "SERVICE_UNAVAILABLE",
        "Chưa thể lưu feedback chatbot lúc này. Vui lòng thử lại sau.",
        true,
      ),
      { status: 503 },
    );
  }
}
