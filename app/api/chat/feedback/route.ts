import { FeedbackValue } from "@prisma/client";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/permissions";
import prisma from "@/lib/prisma";

interface ChatFeedbackBody {
  sessionId?: string;
  messageId?: string;
  value?: string;
  note?: string;
}

function parseValue(value?: string): FeedbackValue | null {
  switch (value) {
    case "HELPFUL":
    case "helpful":
      return FeedbackValue.HELPFUL;
    case "NOT_HELPFUL":
    case "not_helpful":
      return FeedbackValue.NOT_HELPFUL;
    case "IRRELEVANT":
    case "irrelevant":
      return FeedbackValue.IRRELEVANT;
    default:
      return null;
  }
}

function isFeedbackBody(value: unknown): value is ChatFeedbackBody {
  return Boolean(value && typeof value === "object");
}

export async function POST(request: Request) {
  try {
    const payload: unknown = await request.json().catch(() => null);

    if (!isFeedbackBody(payload)) {
      return NextResponse.json({ success: false, error: "Payload không hợp lệ." }, { status: 400 });
    }

    const sessionId = payload.sessionId?.trim();
    const messageId = payload.messageId?.trim() || null;
    const feedbackValue = parseValue(payload.value);

    if (!sessionId || !feedbackValue) {
      return NextResponse.json({ success: false, error: "Thiếu sessionId hoặc giá trị feedback." }, { status: 400 });
    }

    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: "Bạn cần đăng nhập để đánh giá chatbot." },
        { status: 401 },
      );
    }

    if (currentUser.isLocked) {
      return NextResponse.json(
        { success: false, error: "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên." },
        { status: 403 },
      );
    }

    const chatSession = await prisma.chatbotSession.findFirst({
      where: {
        id: sessionId,
        userId: currentUser.id,
      },
      select: {
        id: true,
      },
    });

    if (!chatSession) {
      return NextResponse.json({ success: false, error: "Không tìm thấy phiên chat." }, { status: 404 });
    }

    if (messageId) {
      const message = await prisma.chatbotMessage.findFirst({
        where: {
          id: messageId,
          sessionId,
        },
        select: {
          id: true,
        },
      });

      if (!message) {
        return NextResponse.json({ success: false, error: "Không tìm thấy tin nhắn chatbot." }, { status: 404 });
      }
    }

    await prisma.chatbotFeedback.create({
      data: {
        userId: currentUser.id,
        sessionId,
        messageId,
        value: feedbackValue,
        note: payload.note?.trim() || null,
        metadata: {
          source: "floating_chatbot",
        },
      },
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Lỗi không xác định.";
    console.error(`[api/chat/feedback] ${message}`);

    return NextResponse.json({ success: false, error: "Không thể lưu feedback chatbot." }, { status: 500 });
  }
}
