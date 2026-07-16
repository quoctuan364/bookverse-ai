import { notFound, redirect } from "next/navigation";
import { Flag, MessageCircle, ThumbsUp, UserCircle } from "lucide-react";
import { ReactionType } from "@prisma/client";
import { createComment, getPostById, reactToPost } from "@/actions/community.actions";
import { BookCover } from "@/components/shared/BookCover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface CommunityPostDetailPageProps {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    message?: string;
    error?: string;
  }>;
}

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

async function submitComment(formData: FormData) {
  "use server";

  const postId = String(formData.get("postId") ?? "");
  const result = await createComment({
    postId,
    content: String(formData.get("content") ?? ""),
  });

  if (!result.success) {
    if (result.reason === "AUTH_REQUIRED") {
      redirect(`/login?callbackUrl=/community/${encodeURIComponent(postId)}`);
    }

    redirect(`/community/${encodeURIComponent(postId)}?error=${encodeURIComponent(result.message)}`);
  }

  redirect(`/community/${encodeURIComponent(postId)}?message=${encodeURIComponent(result.message)}`);
}

async function submitReaction(formData: FormData) {
  "use server";

  const postId = String(formData.get("postId") ?? "");
  const reaction = String(formData.get("reaction") ?? "LIKE");
  const type = reaction === "REPORT" ? ReactionType.REPORT : ReactionType.LIKE;
  const result = await reactToPost(postId, type);

  if (!result.success) {
    if (result.reason === "AUTH_REQUIRED") {
      redirect(`/login?callbackUrl=/community/${encodeURIComponent(postId)}`);
    }

    redirect(`/community/${encodeURIComponent(postId)}?error=${encodeURIComponent(result.message)}`);
  }

  redirect(`/community/${encodeURIComponent(postId)}?message=${encodeURIComponent(result.message)}`);
}

export default async function CommunityPostDetailPage({
  params,
  searchParams,
}: CommunityPostDetailPageProps) {
  const { id } = await params;
  const query = await searchParams;
  const post = await getPostById(id);

  if (!post) {
    notFound();
  }

  return (
    <main className="bv-page">
      <section className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {query?.message ? (
          <div className="mb-5 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {query.message}
          </div>
        ) : null}

        {query?.error ? (
          <div className="mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {query.error}
          </div>
        ) : null}

        <article className="bv-card rounded-lg p-5 sm:p-7">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#0F766E] text-sm font-black text-[#FFFDF8] shadow-[0_10px_24px_rgba(15,118,110,0.22)]">
              {post.author.name ? getInitial(post.author.name) : <UserCircle className="h-5 w-5" />}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <p className="font-black text-[#17202A]">{post.author.name}</p>
                <time className="text-sm text-[#66706B]" dateTime={post.createdAt.toISOString()}>
                  {formatDate(post.createdAt)}
                </time>
              </div>

              {post.book ? (
                <a
                  className="mt-4 flex max-w-md gap-3 rounded-xl border border-[#17191F]/10 bg-[#F7F4ED] p-3 transition hover:border-[#0F766E]/35"
                  href={`/book/${post.book.id}`}
                >
                  <BookCover
                    alt={`Bìa sách ${post.book.title}`}
                    author={post.book.author}
                    bookId={post.book.id}
                    category={post.book.category}
                    className="h-24 w-16 shrink-0 rounded-md"
                    src={post.book.coverImage}
                    title={post.book.title}
                  />
                  <span className="min-w-0 self-center">
                    <span className="block text-xs font-bold uppercase tracking-wide text-[#66706B]">Gắn với sách</span>
                    <span className="mt-1 line-clamp-2 block font-black text-[#17202A]">{post.book.title}</span>
                    <span className="mt-1 block truncate text-sm text-[#66706B]">{post.book.author}</span>
                  </span>
                </a>
              ) : null}

              <h1 className="mt-4 text-2xl font-black leading-tight text-[#17202A] sm:text-3xl">
                {post.title}
              </h1>
              <p className="mt-4 whitespace-pre-line text-base leading-8 text-[#42524D]">
                {post.content}
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-[#17191F]/10 pt-5">
            <form action={submitReaction}>
              <input name="postId" type="hidden" value={post.id} />
              <input name="reaction" type="hidden" value="LIKE" />
              <Button className="gap-2" type="submit" variant="outline">
                <ThumbsUp className="h-4 w-4" aria-hidden="true" />
                Like ({post.reactionCount})
              </Button>
            </form>

            <form action={submitReaction}>
              <input name="postId" type="hidden" value={post.id} />
              <input name="reaction" type="hidden" value="REPORT" />
              <Button className="gap-2 border-[#C9784A] text-[#8A4B2D]" type="submit" variant="outline">
                <Flag className="h-4 w-4" aria-hidden="true" />
                Report ({post.reportCount})
              </Button>
            </form>
          </div>
        </article>

        <section className="bv-card mt-6 rounded-lg p-5 sm:p-6">
          <div className="mb-5 flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-[#0F766E]" aria-hidden="true" />
            <h2 className="text-xl font-black text-[#17202A]">
              Bình luận ({post.comments.length})
            </h2>
          </div>

          <form action={submitComment} className="mb-6">
            <input name="postId" type="hidden" value={post.id} />
            <textarea
              className={cn(
                "min-h-28 w-full resize-y rounded-lg border border-[#D8D0C2] bg-[#FFFDF8] px-3 py-3 text-sm leading-6 text-[#17202A] outline-none transition placeholder:text-[#7C8581] focus-visible:ring-2 focus-visible:ring-[#0F766E]/30",
              )}
              name="content"
              placeholder="Viết bình luận của bạn..."
              required
            />
            <div className="mt-3 flex justify-end">
              <Button type="submit">
                Gửi bình luận
              </Button>
            </div>
          </form>

          {post.comments.length === 0 ? (
            <p className="rounded-lg bg-[#F7F4ED] px-4 py-3 text-sm text-[#66706B]">
              Chưa có bình luận nào.
            </p>
          ) : (
            <div className="space-y-4">
              {post.comments.map((comment) => (
                <div className="border-t border-[#17191F]/10 pt-4" key={comment.id}>
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0F766E] text-xs font-black text-[#FFFDF8]">
                      {getInitial(comment.author.name)}
                    </div>
                    <div>
                      <p className="font-black text-[#17202A]">{comment.author.name}</p>
                      <time className="text-xs text-gray-500" dateTime={comment.createdAt.toISOString()}>
                        {formatDate(comment.createdAt)}
                      </time>
                    </div>
                  </div>
                  <p className="mt-3 whitespace-pre-line text-sm leading-7 text-[#334B4F]">
                    {comment.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
