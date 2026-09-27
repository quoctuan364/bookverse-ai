import { redirect } from "next/navigation";
import { BookHeart, ShieldCheck, Sparkles } from "lucide-react";
import {
  getReadingPreferenceOnboardingData,
  saveReadingPreferences,
} from "@/actions/profile.actions";
import { GenrePreferenceForm } from "@/components/onboarding/GenrePreferenceForm";

export const dynamic = "force-dynamic";

interface ReadingPreferencesPageProps {
  searchParams?: Promise<{
    error?: string;
  }>;
}

async function savePreferencesAction(formData: FormData) {
  "use server";

  const result = await saveReadingPreferences(
    formData.getAll("preferredGenres").map(String),
  );

  if (!result.success) {
    redirect(`/onboarding/preferences?error=${encodeURIComponent(result.message)}`);
  }

  redirect("/");
}

export default async function ReadingPreferencesPage({
  searchParams,
}: ReadingPreferencesPageProps) {
  const [params, data] = await Promise.all([
    searchParams,
    getReadingPreferenceOnboardingData(),
  ]);

  if (!data) {
    redirect("/login?callbackUrl=/onboarding/preferences");
  }

  const validCategoryNames = new Set(data.categories.map((category) => category.name));
  const initialSelectedGenres = data.preferredGenres.filter((genre) =>
    validCategoryNames.has(genre),
  );

  return (
    <main className="bv-page min-h-screen px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <section className="mx-auto w-full max-w-5xl overflow-hidden rounded-[1.75rem] border border-bv-ink/10 bg-white shadow-[0_28px_80px_rgba(29,36,51,0.14)]">
        <div className="border-b border-bv-ink/10 bg-[radial-gradient(circle_at_top_right,rgba(242,193,78,0.28),transparent_18rem),linear-gradient(125deg,#073B37_0%,#176B62_100%)] px-5 py-8 text-white sm:px-8 lg:px-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] text-[#F5D98B]">
                <BookHeart className="h-4 w-4" aria-hidden="true" />
                Bước cuối để bắt đầu
              </span>
              <h1 className="bv-editorial mt-4 text-3xl font-black leading-tight sm:text-5xl">
                Chào {data.userName}, bạn thích đọc gì?
              </h1>
              <p className="mt-3 max-w-2xl leading-7 text-[#D9EEEA]">
                Chọn ít nhất một chủ đề bạn thích. Bạn có thể thay đổi lựa chọn này bất cứ lúc nào.
              </p>
            </div>
            <div className="grid shrink-0 gap-2 text-sm font-bold text-bv-mint-soft">
              <span className="inline-flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-bv-gold" aria-hidden="true" />
                Gợi ý có lý do
              </span>
              <span className="inline-flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-bv-gold" aria-hidden="true" />
                Có thể thay đổi bất cứ lúc nào
              </span>
            </div>
          </div>
        </div>

        <div className="p-5 sm:p-8 lg:p-10">
          {params?.error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700" role="alert">
              {params.error}
            </div>
          ) : null}

          <GenrePreferenceForm
            action={savePreferencesAction}
            categories={data.categories}
            initialSelected={initialSelectedGenres}
          />
        </div>
      </section>
    </main>
  );
}
