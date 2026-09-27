import Link from "next/link";
import { MessageCircle, Store } from "lucide-react";
import { getMarketplaceConversations } from "@/actions/marketplace-chat.actions";
import { BookCover } from "@/components/shared/BookCover";

export const dynamic = "force-dynamic";

export default async function MarketplaceMessagesPage() {
  const { user, conversations } = await getMarketplaceConversations();

  if (!user) {
    return (
      <main className="bv-page mx-auto w-full max-w-3xl px-4 py-16 text-center">
        <MessageCircle className="mx-auto h-12 w-12 text-bv-focus" />
        <h1 className="mt-4 text-3xl font-black text-bv-heading">Tin nhắn chợ sách</h1>
        <p className="mt-2 text-bv-text-muted">Đăng nhập để hỏi người bán và theo dõi trao đổi của bạn.</p>
        <Link className="mt-6 inline-flex rounded-lg bg-bv-focus px-5 py-3 font-black text-white" href="/login?callbackUrl=/marketplace/messages">Đăng nhập</Link>
      </main>
    );
  }

  return (
    <main className="bv-page min-h-screen">
      <section className="bv-hero">
        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
          <p className="text-sm font-black uppercase tracking-[0.16em] text-bv-gold">Chợ sách BookVerse</p>
          <h1 className="mt-2 text-4xl font-black">Tin nhắn mua bán</h1>
          <p className="mt-2 text-bv-mint-soft">Trao đổi tình trạng sách, cách giao hàng và giá bán ngay trên BookVerse.</p>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-4 px-4 py-8 sm:px-6">
        <Link className="w-fit font-black text-bv-focus hover:underline" href="/marketplace">← Quay lại chợ sách</Link>
        {conversations.length === 0 ? (
          <div className="bv-card rounded-xl p-10 text-center">
            <Store className="mx-auto h-10 w-10 text-bv-focus" />
            <h2 className="mt-3 text-xl font-black text-bv-heading">Chưa có cuộc trò chuyện</h2>
            <p className="mt-2 text-bv-text-muted">Mở một tin bán và chọn “Nhắn người bán” để bắt đầu.</p>
          </div>
        ) : conversations.map((conversation) => {
          const partner = conversation.buyerId === user.id ? conversation.seller : conversation.buyer;
          const lastMessage = conversation.messages.at(-1);
          return (
            <Link className="bv-card flex gap-4 rounded-xl p-4 transition hover:-translate-y-0.5 hover:border-bv-focus/40" href={`/marketplace/messages/${conversation.id}`} key={conversation.id}>
              <div className="h-24 w-16 shrink-0 overflow-hidden rounded-lg bg-bv-muted">
                <BookCover className="h-full w-full object-cover" src={conversation.listing.coverImage} title={conversation.listing.title} bookId={conversation.listing.id} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-black text-bv-heading">{partner.name}</p>
                    <h2 className="mt-1 line-clamp-1 font-bold text-bv-focus">{conversation.listing.title}</h2>
                  </div>
                  <time className="shrink-0 text-xs text-bv-text-muted">{conversation.updatedAt.toLocaleDateString("vi-VN")}</time>
                </div>
                <p className="mt-3 line-clamp-2 text-sm text-bv-text-muted">{lastMessage?.content ?? "Chưa có tin nhắn."}</p>
              </div>
            </Link>
          );
        })}
      </section>
    </main>
  );
}
