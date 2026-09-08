"use server";

import { NotificationType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { createNotification } from "@/lib/notifications";
import { getCurrentUser, requireAuthenticatedUser } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { getVietnameseBookTitle } from "@/lib/book-display-title";
import { normalizeBookCoverUrl } from "@/lib/book-cover";

export interface MarketplaceChatResult {
  success: boolean;
  message: string;
  conversationId?: string;
  reason?: "AUTH_REQUIRED" | "FORBIDDEN" | "VALIDATION_ERROR" | "NOT_FOUND" | "DATABASE_ERROR";
}

function cleanMessage(value: string): string {
  return value.replace(/\s+/g, " ").trim().slice(0, 1_000);
}

function mapConversation(conversation: {
  id: string;
  buyerId: string;
  sellerId: string;
  updatedAt: Date;
  buyer: { id: string; name: string };
  seller: { id: string; name: string };
  listing: {
    id: string;
    title: string;
    book: { id: string; title: string; coverPath: string | null } | null;
    images: Array<{ url: string }>;
  };
  messages: Array<{
    id: string;
    senderId: string;
    content: string;
    createdAt: Date;
    sender: { name: string };
  }>;
}) {
  return {
    id: conversation.id,
    buyerId: conversation.buyerId,
    sellerId: conversation.sellerId,
    buyer: conversation.buyer,
    seller: conversation.seller,
    updatedAt: conversation.updatedAt,
    listing: {
      id: conversation.listing.id,
      title: conversation.listing.book
        ? getVietnameseBookTitle(conversation.listing.book.id, conversation.listing.book.title)
        : conversation.listing.title,
      coverImage: normalizeBookCoverUrl(
        conversation.listing.images[0]?.url ?? conversation.listing.book?.coverPath ?? null,
      ),
    },
    messages: conversation.messages,
  };
}

const conversationInclude = {
  buyer: { select: { id: true, name: true } },
  seller: { select: { id: true, name: true } },
  listing: {
    select: {
      id: true,
      title: true,
      book: { select: { id: true, title: true, coverPath: true } },
      images: { orderBy: { sortOrder: "asc" as const }, take: 1, select: { url: true } },
    },
  },
  messages: {
    orderBy: { createdAt: "asc" as const },
    select: {
      id: true,
      senderId: true,
      content: true,
      createdAt: true,
      sender: { select: { name: true } },
    },
  },
};

export async function getMarketplaceConversations() {
  const user = await getCurrentUser();
  if (!user || user.isLocked) return { user: null, conversations: [] };

  const conversations = await prisma.marketplaceConversation.findMany({
    where: { OR: [{ buyerId: user.id }, { sellerId: user.id }] },
    orderBy: { updatedAt: "desc" },
    include: conversationInclude,
  });

  return { user, conversations: conversations.map(mapConversation) };
}

export async function getMarketplaceConversation(conversationId: string) {
  const user = await getCurrentUser();
  if (!user || user.isLocked) return { user: null, conversation: null };

  const conversation = await prisma.marketplaceConversation.findFirst({
    where: {
      id: conversationId,
      OR: [{ buyerId: user.id }, { sellerId: user.id }],
    },
    include: conversationInclude,
  });

  return { user, conversation: conversation ? mapConversation(conversation) : null };
}

export async function getMarketplaceChatListing(listingId: string) {
  return prisma.listing.findFirst({
    where: { id: listingId, status: "APPROVED", stock: { gt: 0 } },
    select: {
      id: true,
      sellerId: true,
      title: true,
      seller: { select: { name: true } },
      book: { select: { id: true, title: true } },
    },
  });
}

export async function startMarketplaceConversation(
  listingId: string,
  rawContent: string,
): Promise<MarketplaceChatResult> {
  try {
    const buyer = await requireAuthenticatedUser();
    const content = cleanMessage(rawContent);
    if (!content) return { success: false, message: "Bạn chưa nhập tin nhắn.", reason: "VALIDATION_ERROR" };

    const listing = await prisma.listing.findFirst({
      where: { id: listingId, status: "APPROVED", stock: { gt: 0 } },
      select: { id: true, title: true, sellerId: true },
    });
    if (!listing) return { success: false, message: "Tin bán không còn khả dụng.", reason: "NOT_FOUND" };
    if (listing.sellerId === buyer.id) {
      return { success: false, message: "Bạn không thể tự nhắn cho gian hàng của mình.", reason: "FORBIDDEN" };
    }

    const conversation = await prisma.$transaction(async (tx) => {
      const row = await tx.marketplaceConversation.upsert({
        where: { listingId_buyerId: { listingId: listing.id, buyerId: buyer.id } },
        create: { listingId: listing.id, buyerId: buyer.id, sellerId: listing.sellerId },
        update: { updatedAt: new Date() },
      });
      await tx.marketplaceMessage.create({
        data: { conversationId: row.id, senderId: buyer.id, content },
      });
      await createNotification(
        {
          userId: listing.sellerId,
          title: "Khách hỏi về sách",
          message: `${buyer.name ?? "Một độc giả"}: ${content.slice(0, 120)}`,
          type: NotificationType.MARKETPLACE,
          href: `/marketplace/messages/${row.id}`,
        },
        tx,
      );
      return row;
    });

    revalidatePath("/marketplace/messages");
    return { success: true, message: "Đã gửi tin nhắn.", conversationId: conversation.id };
  } catch (error) {
    if (error instanceof Error && error.name === "PermissionError") {
      return { success: false, message: error.message, reason: "AUTH_REQUIRED" };
    }
    console.error("[marketplace-chat]", error);
    return { success: false, message: "Không thể gửi tin nhắn lúc này.", reason: "DATABASE_ERROR" };
  }
}

export async function sendMarketplaceMessage(
  conversationId: string,
  rawContent: string,
): Promise<MarketplaceChatResult> {
  try {
    const sender = await requireAuthenticatedUser();
    const content = cleanMessage(rawContent);
    if (!content) return { success: false, message: "Bạn chưa nhập tin nhắn.", reason: "VALIDATION_ERROR" };

    const conversation = await prisma.marketplaceConversation.findFirst({
      where: { id: conversationId, OR: [{ buyerId: sender.id }, { sellerId: sender.id }] },
      select: { id: true, buyerId: true, sellerId: true },
    });
    if (!conversation) return { success: false, message: "Không tìm thấy cuộc trò chuyện.", reason: "NOT_FOUND" };

    const receiverId = conversation.buyerId === sender.id ? conversation.sellerId : conversation.buyerId;
    await prisma.$transaction(async (tx) => {
      await tx.marketplaceMessage.create({
        data: { conversationId, senderId: sender.id, content },
      });
      await tx.marketplaceConversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });
      await createNotification(
        {
          userId: receiverId,
          title: "Tin nhắn chợ sách mới",
          message: `${sender.name ?? "BookVerse"}: ${content.slice(0, 120)}`,
          type: NotificationType.MARKETPLACE,
          href: `/marketplace/messages/${conversationId}`,
        },
        tx,
      );
    });

    revalidatePath(`/marketplace/messages/${conversationId}`);
    revalidatePath("/marketplace/messages");
    return { success: true, message: "Đã gửi." };
  } catch (error) {
    if (error instanceof Error && error.name === "PermissionError") {
      return { success: false, message: error.message, reason: "AUTH_REQUIRED" };
    }
    console.error("[marketplace-chat]", error);
    return { success: false, message: "Không thể gửi tin nhắn lúc này.", reason: "DATABASE_ERROR" };
  }
}
