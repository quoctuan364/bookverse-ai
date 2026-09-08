import Link from "next/link";
import { Bookmark, Flag, MessageCircle, PenLine, Search, Star, ThumbsUp, UserCircle } from "lucide-react";
import { getAllPosts, getCommunityBookOptions, type CommunityPostType } from "@/actions/community.actions";
import { BookCover } from "@/components/shared/BookCover";

export const dynamic = "force-dynamic";

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

function getInitial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "U";
}

interface CommunityPageProps {
  searchParams?: Promise<{ q?: string; type?: string; category?: string; spoiler?: string }>;
}

const postTypeLabels: Record<CommunityPostType, string> = {
  DISCUSSION: "Thảo luận",
  QUESTION: "Hỏi đáp",
  REVIEW: "Đánh giá",
};

export default async function CommunityPage({ searchParams }: CommunityPageProps) {
  const params = await searchParams;
  const type = params?.type === "QUESTION" || params?.type === "REVIEW" || params?.type === "DISCUSSION" ? params.type : "ALL";
  const [posts, bookOptions] = await Promise.all([
    getAllPosts({ query: params?.q, type, categoryId: params?.category, spoiler: params?.spoiler === "1" }),
    getCommunityBookOptions(),
  ]);
  const categories = [...new Map(bookOptions.map((book) => [book.categoryId, book.category])).entries()].sort((a, b) => a[1].localeCompare(b[1], "vi"));

  return (
    <main className="bv-page">
      <section className="bv-hero">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-10 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.16em] text-bv-gold">BookVerse Community</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">Forum đọc sách</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-bv-mint-soft">
              Nơi độc giả chia sẻ cảm nhận, đặt câu hỏi và thảo luận về sách đang đọc.
            </p>
          </div>

          <Link
            className="inline-flex h-11 w-fit items-center justify-center gap-2 rounded-lg bg-bv-ivory px-4 py-2 text-sm font-bold text-[#0F3F3C] shadow-[0_12px_30px_rgba(0,0,0,0.14)] transition hover:bg-bv-gold/95"
            href="/community/new"
          >
            <PenLine className="h-4 w-4" aria-hidden="true" />
            Viết bài mới
          </Link>
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <form action="/community" className="mb-6 rounded-2xl border border-bv-primary/15 bg-white p-4 shadow-[0_12px_30px_rgba(37,49,56,0.08)] sm:p-5">
          <div className="grid gap-3 md:grid-cols-[1fr_180px_220px_auto]">
            <label className="relative"><span className="sr-only">Tìm bài cộng đồng</span><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-bv-primary" aria-hidden="true" /><input className="h-11 w-full rounded-xl border border-bv-border bg-white pl-10 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-bv-primary" defaultValue={params?.q ?? ""} name="q" placeholder="Tìm bài viết hoặc tên sách..." /></label>
            <select aria-label="Lọc theo loại bài viết" className="h-11 rounded-xl border border-bv-border bg-white px-3 text-sm font-bold" defaultValue={type} name="type"><option value="ALL">Mọi loại bài</option><option value="DISCUSSION">Thảo luận</option><option value="QUESTION">Hỏi đáp</option><option value="REVIEW">Đánh giá sách</option></select>
            <select aria-label="Lọc theo thể loại sách" className="h-11 rounded-xl border border-bv-border bg-white px-3 text-sm font-bold" defaultValue={params?.category ?? ""} name="category"><option value="">Mọi thể loại</option>{categories.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select>
            <button className="min-h-11 rounded-xl bg-bv-primary px-5 text-sm font-black text-white hover:bg-bv-primary-dark" type="submit">Lọc bài</button>
          </div>
          <label className="mt-3 inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm font-bold text-bv-text-muted"><input className="h-5 w-5 accent-bv-primary" defaultChecked={params?.spoiler === "1"} name="spoiler" type="checkbox" value="1" /> Chỉ bài có cảnh báo spoiler</label>
        </form>
        {posts.length === 0 ? (
          <div className="bv-card rounded-lg p-8 text-center text-sm text-bv-text-muted">
            Chưa có bài viết nào trong cộng đồng.
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <Link
                aria-label={`Mở bài viết ${post.title}`}
                className="block rounded-lg border border-[#17191F]/10 bg-bv-ivory p-5 shadow-[0_12px_34px_rgba(39,44,51,0.08)] transition hover:-translate-y-1 hover:border-bv-focus/30 hover:shadow-[0_22px_46px_rgba(39,44,51,0.12)]"
                href={`/community/${post.id}`}
                key={post.id}
              >
                <div className="flex gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-bv-focus text-sm font-black text-bv-ivory shadow-[0_10px_24px_rgba(15,118,110,0.22)]">
                    {post.author.name ? getInitial(post.author.name) : <UserCircle className="h-5 w-5" />}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <p className="font-black text-bv-heading">{post.author.name}</p>
                      <time className="text-sm text-bv-text-muted" dateTime={post.createdAt.toISOString()}>
                        {formatDate(post.createdAt)}
                      </time>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-bv-mint px-3 py-1 text-xs font-black text-bv-primary">{postTypeLabels[post.type]}</span>
                      {post.hasSpoiler ? <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-800">Có spoiler</span> : null}
                      {post.rating ? <span className="inline-flex items-center gap-1 rounded-full bg-[#FFF4D6] px-3 py-1 text-xs font-black text-[#8A5C00]"><Star className="h-3.5 w-3.5 fill-bv-gold text-bv-gold" aria-hidden="true" />{post.rating}/5</span> : null}
                    </div>

                    <h2 className="mt-3 text-xl font-black leading-snug text-bv-heading">
                      {post.title}
                    </h2>
                    <p className="mt-2 line-clamp-3 leading-7 text-[#42524D]">{post.content}</p>

                    {post.book ? (
                      <div className="mt-4 flex max-w-xl gap-4 rounded-xl border border-[#17191F]/8 bg-bv-surface p-3.5">
                        <BookCover
                          alt={`Bìa sách ${post.book.title}`}
                          author={post.book.author}
                          bookId={post.book.id}
                          category={post.book.category}
                          className="h-28 w-[76px] shrink-0 rounded-lg shadow-[0_8px_18px_rgba(23,25,31,0.14)]"
                          src={post.book.coverImage}
                          title={post.book.title}
                        />
                        <span className="min-w-0 self-center">
                          <span className="block text-xs font-bold uppercase tracking-wide text-bv-text-muted">Sách đang thảo luận</span>
                          <span className="mt-1 line-clamp-2 block font-black leading-snug text-bv-heading">{post.book.title}</span>
                          <span className="mt-1.5 line-clamp-1 block text-sm text-bv-text-muted">{post.book.author}</span>
                        </span>
                      </div>
                    ) : null}

                    <div className="mt-4 flex items-center gap-5 text-sm text-[#3B4944]">
                      <span className="inline-flex items-center gap-2">
                        <ThumbsUp className="h-4 w-4 text-bv-focus" aria-hidden="true" />
                        {post.reactionCount} Like
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <MessageCircle className="h-4 w-4 text-bv-focus" aria-hidden="true" />
                        {post.commentCount} Comment
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <Flag className="h-4 w-4 text-[#C9784A]" aria-hidden="true" />
                        {post.reportCount} Report
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <Bookmark className="h-4 w-4 text-bv-focus" aria-hidden="true" />
                        {post.saveCount} Lưu
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
