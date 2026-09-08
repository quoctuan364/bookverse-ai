CREATE TABLE "marketplace_conversations" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "marketplace_conversations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "marketplace_messages" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "marketplace_messages_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "marketplace_conversations_listingId_buyerId_key" ON "marketplace_conversations"("listingId", "buyerId");
CREATE INDEX "marketplace_conversations_buyerId_updatedAt_idx" ON "marketplace_conversations"("buyerId", "updatedAt");
CREATE INDEX "marketplace_conversations_sellerId_updatedAt_idx" ON "marketplace_conversations"("sellerId", "updatedAt");
CREATE INDEX "marketplace_messages_conversationId_createdAt_idx" ON "marketplace_messages"("conversationId", "createdAt");
CREATE INDEX "marketplace_messages_senderId_idx" ON "marketplace_messages"("senderId");

ALTER TABLE "marketplace_conversations" ADD CONSTRAINT "marketplace_conversations_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "marketplace_conversations" ADD CONSTRAINT "marketplace_conversations_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "marketplace_conversations" ADD CONSTRAINT "marketplace_conversations_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "marketplace_messages" ADD CONSTRAINT "marketplace_messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "marketplace_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "marketplace_messages" ADD CONSTRAINT "marketplace_messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
