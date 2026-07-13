import { redirect } from "next/navigation";
import { createPost } from "@/actions/community.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

async function submitPost(formData: FormData) {
  "use server";

  const result = await createPost({
    title: String(formData.get("title") ?? ""),
    content: String(formData.get("content") ?? ""),
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

  return (
    <main className="bv-page">
      <section className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8">
          <p className="text-sm font-black uppercase tracking-[0.16em] text-[#E76F51]">BookVerse Community</p>
          <h1 className="mt-2 text-3xl font-black text-[#17202A]">Viết bài mới</h1>
          <p className="mt-3 text-sm leading-6 text-[#66706B]">
            Chia sẻ cảm nhận, câu hỏi hoặc ghi chú đọc sách với cộng đồng.
          </p>
        </div>

        <form
          action={submitPost}
          className="bv-card rounded-lg p-5 sm:p-6"
        >
          {errorMessage ? (
            <div className="mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </div>
          ) : null}

          <div className="space-y-2">
            <label className="text-sm font-bold text-[#17202A]" htmlFor="title">
              Tiêu đề
            </label>
            <Input
              id="title"
              maxLength={160}
              name="title"
              placeholder="Ví dụ: Mình học được gì từ cuốn sách này?"
              required
            />
          </div>

          <div className="mt-5 space-y-2">
            <label className="text-sm font-bold text-[#17202A]" htmlFor="content">
              Nội dung
            </label>
            <textarea
              className={cn(
                "min-h-56 w-full resize-y rounded-lg border border-[#D8D0C2] bg-[#FFFDF8] px-3 py-3 text-sm leading-6 text-[#17202A] outline-none transition placeholder:text-[#7C8581] focus-visible:ring-2 focus-visible:ring-[#0F766E]/30",
              )}
              id="content"
              name="content"
              placeholder="Viết nội dung thảo luận của bạn..."
              required
            />
          </div>

          <div className="mt-6 flex justify-end">
            <Button className="px-6" type="submit">
              Đăng bài
            </Button>
          </div>
        </form>
      </section>
    </main>
  );
}
