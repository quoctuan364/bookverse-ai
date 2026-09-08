"use server";

import { ChatbotMessageRole } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { normalizeAssistantSessionTitle } from "@/lib/assistant-history-policy";
import { getCurrentUser } from "@/lib/permissions";
import prisma from "@/lib/prisma";

export interface AssistantHistorySession {
  id: string;
  title: string;
  updatedAt: string;
  messages: Array<{
    id: string;
    role: "user" | "assistant";
    content: string;
  }>;
}

export async function getMyAssistantHistory(
  limit = 8,
): Promise<AssistantHistorySession[]> {
  const user = await getCurrentUser();
  if (!user || user.isLocked) return [];

  const safeLimit = Math.min(12, Math.max(1, Math.floor(limit)));
  const sessions = await prisma.chatbotSession.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    take: safeLimit,
    select: {
      id: true,
      title: true,
      updatedAt: true,
      messages: {
        where: {
          role: {
            in: [ChatbotMessageRole.USER, ChatbotMessageRole.ASSISTANT],
          },
        },
        orderBy: { createdAt: "desc" },
        take: 12,
        select: {
          id: true,
          role: true,
          content: true,
        },
      },
    },
  });

  return sessions.map((session) => ({
    id: session.id,
    title: session.title?.trim() || "Cuộc trò chuyện chưa đặt tên",
    updatedAt: session.updatedAt.toISOString(),
    messages: session.messages.reverse().map((message) => ({
      id: message.id,
      role:
        message.role === ChatbotMessageRole.ASSISTANT ? "assistant" : "user",
      content: message.content,
    })),
  }));
}

export async function renameMyAssistantSession(
  sessionIdValue: string,
  titleValue: string,
) {
  const user = await getCurrentUser();
  if (!user || user.isLocked) {
    return { success: false, message: "Bạn cần đăng nhập để đổi tên hội thoại." };
  }

  const sessionId = sessionIdValue.trim();
  const title = normalizeAssistantSessionTitle(titleValue);
  if (!sessionId || !title) {
    return {
      success: false,
      message: "Tên cuộc trò chuyện phải có từ 3 đến 80 ký tự.",
    };
  }

  const updated = await prisma.chatbotSession.updateMany({
    where: { id: sessionId, userId: user.id },
    data: { title },
  });
  if (updated.count !== 1) {
    return { success: false, message: "Không tìm thấy cuộc trò chuyện của bạn." };
  }

  revalidatePath("/assistant");
  return { success: true, message: "Đã đổi tên cuộc trò chuyện.", title };
}

export async function deleteMyAssistantSession(sessionIdValue: string) {
  const user = await getCurrentUser();
  if (!user || user.isLocked) {
    return { success: false, message: "Bạn cần đăng nhập để xóa hội thoại." };
  }

  const sessionId = sessionIdValue.trim();
  if (!sessionId) {
    return { success: false, message: "Mã cuộc trò chuyện không hợp lệ." };
  }

  // deleteMany kèm userId giúp chống xóa chéo tài khoản và tránh lỗi race condition.
  const deleted = await prisma.chatbotSession.deleteMany({
    where: { id: sessionId, userId: user.id },
  });
  if (deleted.count !== 1) {
    return { success: false, message: "Không tìm thấy cuộc trò chuyện của bạn." };
  }

  revalidatePath("/assistant");
  return { success: true, message: "Đã xóa cuộc trò chuyện." };
}
