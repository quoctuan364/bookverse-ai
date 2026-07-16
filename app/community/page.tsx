import Link from "next/link";
import { Flag, MessageCircle, PenLine, ThumbsUp, UserCircle } from "lucide-react";
import { getAllPosts } from "@/actions/community.actions";
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

export default async function CommunityPage() {
  const posts = await getAllPosts();

  return (
    <main className="bv-page">
      <section className="bv-hero">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-10 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.16em] text-[#F2C14E]">BookVerse Community</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">Forum đọc sách</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#EAF5F1]">
              Nơi độc giả chia sẻ cảm nhận, đặt câu hỏi và thảo luận về sách đang đọc.
            </p>
          </div>

          <Link
            className="inline-flex h-11 w-fit items-center justify-center gap-2 rounded-lg bg-[#FFFDF8] px-4 py-2 text-sm font-bold text-[#0F3F3C] shadow-[0_12px_30px_rgba(0,0,0,0.14)] transition hover:bg-[#F2C14E]/95"
            href="/community/new"
          >
            <PenLine className="h-4 w-4" aria-hidden="true" />
            Viết bài mới
          </Link>
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {posts.length === 0 ? (
          <div className="bv-card rounded-lg p-8 text-center text-sm text-[#66706B]">
            Chưa có bài viết nào trong cộng đồng.
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <Link
                aria-label={`Mở bài viết ${post.title}`}
                className="block rounded-lg border border-[#17191F]/10 bg-[#FFFDF8] p-5 shadow-[0_12px_34px_rgba(39,44,51,0.08)] transition hover:-translate-y-1 hover:border-[#0F766E]/30 hover:shadow-[0_22px_46px_rgba(39,44,51,0.12)]"
                href={`/community/${post.id}`}
                key={post.id}
              >
                <div className="flex gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#0F766E] text-sm font-black text-[#FFFDF8] shadow-[0_10px_24px_rgba(15,118,110,0.22)]">
                    {post.author.name ? getInitial(post.author.name) : <UserCircle className="h-5 w-5" />}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <p className="font-black text-[#17202A]">{post.author.name}</p>
                      <time className="text-sm text-[#66706B]" dateTime={post.createdAt.toISOString()}>
                        {formatDate(post.createdAt)}
                      </time>
                    </div>

                    <h2 className="mt-3 text-xl font-black leading-snug text-[#17202A]">
                      {post.title}
                    </h2>
                    <p className="mt-2 line-clamp-3 leading-7 text-[#42524D]">{post.content}</p>

                    {post.book ? (
                      <div className="mt-4 flex max-w-md gap-3 rounded-xl bg-[#F7F4ED] p-3">
                        <BookCover
                          alt={`Bìa sách ${post.book.title}`}
                          author={post.book.author}
                          bookId={post.book.id}
                          category={post.book.category}
                          className="h-20 w-[54px] shrink-0 rounded-md"
                          src={post.book.coverImage}
                          title={post.book.title}
                        />
                        <span className="min-w-0 self-center">
                          <span className="block text-xs font-bold uppercase tracking-wide text-[#66706B]">Sách đang thảo luận</span>
                          <span className="mt-1 line-clamp-2 block text-sm font-black text-[#17202A]">{post.book.title}</span>
                        </span>
                      </div>
                    ) : null}

                    <div className="mt-4 flex items-center gap-5 text-sm text-gray-500">
                      <span className="inline-flex items-center gap-2">
                        <ThumbsUp className="h-4 w-4 text-[#0F766E]" aria-hidden="true" />
                        {post.reactionCount} Like
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <MessageCircle className="h-4 w-4 text-[#0F766E]" aria-hidden="true" />
                        {post.commentCount} Comment
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <Flag className="h-4 w-4 text-[#C9784A]" aria-hidden="true" />
                        {post.reportCount} Report
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
