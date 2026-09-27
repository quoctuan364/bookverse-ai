import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getMarketplaceConversation, sendMarketplaceMessage } from "@/actions/marketplace-chat.actions";

interface PageProps { params: Promise<{ id: string }>; searchParams?: Promise<{ error?: string }> }

export default async function MarketplaceConversationPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const query = await searchParams;
  const { user, conversation } = await getMarketplaceConversation(id);
  if (!user) redirect(`/login?callbackUrl=/marketplace/messages/${id}`);
  if (!conversation) notFound();
  const partner = conversation.buyerId === user.id ? conversation.seller : conversation.buyer;

  async function send(formData: FormData) {
    "use server";
    const result = await sendMarketplaceMessage(id, String(formData.get("content") ?? ""));
    if (!result.success) redirect(`/marketplace/messages/${id}?error=${encodeURIComponent(result.message)}`);
    redirect(`/marketplace/messages/${id}`);
  }

  return (
    <main className="bv-page min-h-screen px-4 py-8">
      <section className="bv-card mx-auto flex min-h-[70vh] max-w-4xl flex-col overflow-hidden rounded-xl">
        <header className="border-b border-black/10 p-5">
          <Link className="text-sm font-black text-bv-focus hover:underline" href="/marketplace/messages">← Tất cả tin nhắn</Link>
          <h1 className="mt-3 text-xl font-black text-bv-heading">{partner.name}</h1>
          <p className="text-sm text-bv-text-muted">Đang trao đổi về: <span className="font-bold">{conversation.listing.title}</span></p>
        </header>
        <div className="flex-1 space-y-3 bg-[#F7F4ED] p-4 sm:p-6">
          {conversation.messages.map((message) => {
            const mine = message.senderId === user.id;
            return <div className={`flex ${mine ? "justify-end" : "justify-start"}`} key={message.id}><div className={`max-w-[82%] rounded-2xl px-4 py-3 ${mine ? "rounded-br-sm bg-bv-focus text-white" : "rounded-bl-sm bg-white text-bv-heading shadow-sm"}`}><p className="text-xs font-black opacity-70">{mine ? "Bạn" : message.sender.name}</p><p className="mt-1 whitespace-pre-wrap text-sm leading-6">{message.content}</p><time className="mt-1 block text-[11px] opacity-65">{message.createdAt.toLocaleString("vi-VN")}</time></div></div>;
          })}
        </div>
        <form action={send} className="border-t border-black/10 bg-white p-4">
          {query?.error ? <p className="mb-2 text-sm text-red-700">{query.error}</p> : null}
          <div className="flex gap-2">
            <textarea aria-label="Nhập tin nhắn" className="min-h-12 flex-1 resize-none rounded-xl border border-black/15 px-4 py-3 outline-none focus:border-bv-focus" maxLength={1000} name="content" placeholder="Nhập tin nhắn..." required />
            <button className="self-end rounded-xl bg-bv-focus px-5 py-3 font-black text-white" type="submit">Gửi</button>
          </div>
        </form>
      </section>
    </main>
  );
}
