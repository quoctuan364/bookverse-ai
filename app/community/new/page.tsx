import { redirect } from "next/navigation";
import { createPost, getCommunityBookOptions, type CommunityPostType } from "@/actions/community.actions";
import { CommunityPostEditor } from "@/components/community/CommunityPostEditor";

async function submitPost(formData: FormData) {
  "use server";

  const result = await createPost({
    title: String(formData.get("title") ?? ""),
    content: String(formData.get("content") ?? ""),
    bookId: String(formData.get("bookId") ?? ""),
    type: String(formData.get("type") ?? "DISCUSSION") as CommunityPostType,
    hasSpoiler: String(formData.get("hasSpoiler") ?? "") === "1",
    rating: Number(formData.get("rating") ?? 0) || null,
  });

  if (!result.success) {
    if (result.reason === "AUTH_REQUIRED") {
      redirect("/login");
    }

    redirect(`/community/new?error=${encodeURIComponent(result.message)}`);
  }

  redirect("/community");
}

interface NewCommunityPostPageProps {
  searchParams?: Promise<{
    error?: string;
  }>;
}

export default async function NewCommunityPostPage({ searchParams }: NewCommunityPostPageProps) {
  const params = await searchParams;
  const errorMessage = params?.error;
  const books = await getCommunityBookOptions();

  return (
    <main className="bv-page">
      <section className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8">
          <p className="text-sm font-black uppercase tracking-[0.16em] text-bv-accent">BookVerse Community</p>
          <h1 className="mt-2 text-3xl font-black text-bv-heading">Viết bài mới</h1>
          <p className="mt-3 text-sm leading-6 text-bv-text-muted">
            Chia sẻ cảm nhận, câu hỏi hoặc ghi chú đọc sách với cộng đồng.
          </p>
        </div>

        <CommunityPostEditor action={submitPost} books={books} errorMessage={errorMessage} />
      </section>
    </main>
  );
}
