import Link from "next/link";
import { redirect } from "next/navigation";
import { getMarketplaceChatListing, startMarketplaceConversation } from "@/actions/marketplace-chat.actions";

interface PageProps { searchParams?: Promise<{ listingId?: string; error?: string }> }

export default async function NewMarketplaceMessagePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const listingId = params?.listingId ?? "";
  const listing = listingId ? await getMarketplaceChatListing(listingId) : null;

  async function send(formData: FormData) {
    "use server";
    const result = await startMarketplaceConversation(String(formData.get("listingId") ?? ""), String(formData.get("content") ?? ""));
    if (result.reason === "AUTH_REQUIRED") redirect(`/login?callbackUrl=${encodeURIComponent(`/marketplace/messages/new?listingId=${listingId}`)}`);
    if (!result.success || !result.conversationId) redirect(`/marketplace/messages/new?listingId=${listingId}&error=${encodeURIComponent(result.message)}`);
    redirect(`/marketplace/messages/${result.conversationId}`);
  }

  if (!listing) return <main className="bv-page mx-auto max-w-2xl px-4 py-16"><h1 className="text-2xl font-black text-bv-heading">Tin bán không còn khả dụng</h1><Link className="mt-5 inline-block font-black text-bv-focus" href="/marketplace">Quay lại chợ sách</Link></main>;

  const title = listing.book ? listing.book.title : listing.title;
  return (
    <main className="bv-page min-h-screen px-4 py-12">
      <form action={send} className="bv-card mx-auto max-w-2xl rounded-xl p-6 sm:p-8">
        <input name="listingId" type="hidden" value={listing.id} />
        <p className="text-sm font-black uppercase tracking-[0.14em] text-bv-focus">Nhắn {listing.seller.name}</p>
        <h1 className="mt-2 text-2xl font-black text-bv-heading">Hỏi về “{title}”</h1>
        <p className="mt-2 text-sm text-bv-text-muted">Bạn có thể hỏi tình trạng thực tế, phí giao hàng hoặc đề nghị mức giá phù hợp.</p>
        {params?.error ? <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{params.error}</p> : null}
        <label className="mt-6 block text-sm font-black text-bv-heading" htmlFor="content">Tin nhắn</label>
        <textarea className="mt-2 min-h-36 w-full rounded-xl border border-black/15 bg-white p-4 outline-none transition focus:border-bv-focus focus:ring-4 focus:ring-bv-focus/10" defaultValue="Chào bạn, sách này còn không? Bạn cho mình hỏi thêm về tình trạng thực tế nhé." id="content" maxLength={1000} name="content" required />
        <div className="mt-5 flex flex-wrap justify-end gap-3">
          <Link className="rounded-lg border border-black/15 px-4 py-2.5 font-bold text-bv-heading" href="/marketplace">Hủy</Link>
          <button className="rounded-lg bg-bv-focus px-5 py-2.5 font-black text-white" type="submit">Gửi tin nhắn</button>
        </div>
      </form>
    </main>
  );
}
