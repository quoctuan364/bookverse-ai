import Link from "next/link";
import { redirect } from "next/navigation";
import { Save, SlidersHorizontal, Target, UserRound } from "lucide-react";
import {
  getProfileSettingsData,
  updateProfileSettings,
} from "@/actions/profile.actions";
import { SubmitButton } from "@/components/shared/SubmitButton";
import { AvatarUploadField } from "@/components/profile/AvatarUploadField";
import { Input } from "@/components/ui/input";

export const dynamic = "force-dynamic";

interface ProfileSettingsPageProps {
  searchParams?: Promise<{
    error?: string;
    message?: string;
  }>;
}

const personaOptions = [
  "Sinh viên cần tài liệu học",
  "Độc giả yêu sách kỹ năng",
  "Người học công nghệ",
  "Người bán sách cũ",
  "Người đọc giải trí",
];

async function updateProfileSettingsAction(formData: FormData) {
  "use server";

  const result = await updateProfileSettings({
    displayName: String(formData.get("displayName") ?? ""),
    avatarFile: formData.get("avatarFile") instanceof File ? formData.get("avatarFile") as File : null,
    removeAvatar: formData.get("removeAvatar") === "true",
    persona: String(formData.get("persona") ?? ""),
    bio: String(formData.get("bio") ?? ""),
    preferredGenres: formData.getAll("preferredGenres").map(String),
    budget: String(formData.get("budget") ?? ""),
    dailyReadingGoalMinutes: String(formData.get("dailyReadingGoalMinutes") ?? ""),
    dailyReadingGoalPages: String(formData.get("dailyReadingGoalPages") ?? ""),
  });

  if (!result.success) {
    redirect(`/profile/settings?error=${encodeURIComponent(result.message)}`);
  }

  redirect(`/profile/settings?message=${encodeURIComponent(result.message)}`);
}

export default async function ProfileSettingsPage({ searchParams }: ProfileSettingsPageProps) {
  const [params, data] = await Promise.all([searchParams, getProfileSettingsData()]);

  if (!data) {
    redirect("/login?callbackUrl=/profile/settings");
  }

  const genreOptions = Array.from(new Set([...data.user.preferredGenres, ...data.categories])).slice(0, 24);

  return (
    <main className="bv-page">
      <section className="bv-hero">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 px-4 py-10 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8">
          <div>
            <p className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.16em] text-bv-gold">
              <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
              Sở thích đọc
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">Cấu hình sở thích đọc</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-bv-mint-soft">
              Dữ liệu này giúp Recommendation và Chatbot hiểu rõ mục tiêu đọc, ngân sách và thể loại bạn quan tâm.
            </p>
          </div>
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/20 px-4 text-sm font-bold text-white transition hover:bg-white/10"
            href="/profile"
          >
            Về hồ sơ
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-bv-ink/10 bg-white p-6 shadow-sm sm:p-8">
          {params?.error ? (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {params.error}
            </div>
          ) : null}

          {params?.message ? (
            <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              {params.message}
            </div>
          ) : null}

          <form action={updateProfileSettingsAction} className="grid gap-6">
            <section className="grid gap-5">
              <div className="space-y-2">
                <label className="inline-flex items-center gap-2 text-sm font-bold text-bv-heading" htmlFor="displayName">
                  <UserRound className="h-4 w-4 text-bv-primary" aria-hidden="true" />
                  Tên hiển thị
                </label>
                <Input
                  className="h-11 rounded-xl border-bv-border bg-white text-bv-ink placeholder:text-bv-text-muted focus-visible:ring-bv-primary"
                  defaultValue={data.user.name}
                  id="displayName"
                  maxLength={120}
                  name="displayName"
                  required
                  type="text"
                />
              </div>
            </section>

            <AvatarUploadField currentAvatarUrl={data.user.avatarUrl} displayName={data.user.name} />

            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-bold text-bv-heading" htmlFor="persona">
                  Persona đọc sách
                </label>
                <select
                  className="h-11 w-full rounded-xl border border-bv-border bg-white px-3 text-sm font-medium text-bv-heading outline-none transition focus-visible:ring-2 focus-visible:ring-bv-primary"
                  defaultValue={data.user.persona ?? personaOptions[0]}
                  id="persona"
                  name="persona"
                >
                  {personaOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-bv-heading" htmlFor="budget">
                  Ngân sách mua sách mỗi tháng
                </label>
                <Input
                  className="h-11 rounded-xl border-bv-border bg-white text-bv-ink placeholder:text-bv-text-muted focus-visible:ring-bv-primary"
                  defaultValue={data.user.budget ?? ""}
                  id="budget"
                  min={0}
                  name="budget"
                  placeholder="Ví dụ: 300000"
                  type="number"
                />
              </div>
            </div>

            <section className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <label className="inline-flex items-center gap-2 text-sm font-bold text-bv-heading" htmlFor="dailyReadingGoalMinutes">
                  <Target className="h-4 w-4 text-bv-primary" aria-hidden="true" />
                  Mục tiêu phút đọc mỗi ngày
                </label>
                <Input
                  className="h-11 rounded-xl border-bv-border bg-white text-bv-ink placeholder:text-bv-text-muted focus-visible:ring-bv-primary"
                  defaultValue={data.user.dailyReadingGoalMinutes ?? ""}
                  id="dailyReadingGoalMinutes"
                  min={0}
                  name="dailyReadingGoalMinutes"
                  placeholder="Ví dụ: 30"
                  type="number"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-bv-heading" htmlFor="dailyReadingGoalPages">
                  Mục tiêu trang đọc mỗi ngày
                </label>
                <Input
                  className="h-11 rounded-xl border-bv-border bg-white text-bv-ink placeholder:text-bv-text-muted focus-visible:ring-bv-primary"
                  defaultValue={data.user.dailyReadingGoalPages ?? ""}
                  id="dailyReadingGoalPages"
                  min={0}
                  name="dailyReadingGoalPages"
                  placeholder="Ví dụ: 20"
                  type="number"
                />
              </div>
            </section>

            <div className="space-y-2">
              <label className="text-sm font-bold text-bv-heading" htmlFor="bio">
                Mô tả mục tiêu đọc
              </label>
              <textarea
                className="min-h-28 w-full resize-y rounded-xl border border-bv-border bg-white px-3 py-3 text-sm leading-6 text-bv-ink outline-none transition placeholder:text-bv-text-muted focus-visible:ring-2 focus-visible:ring-bv-primary"
                defaultValue={data.user.bio ?? ""}
                id="bio"
                maxLength={500}
                name="bio"
                placeholder="Ví dụ: Tôi thích sách công nghệ, kỹ năng thuyết trình và truyện trinh thám."
              />
            </div>

            <fieldset className="space-y-3">
              <legend className="text-sm font-bold text-bv-heading">Thể loại yêu thích</legend>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {genreOptions.map((genre) => (
                  <label
                    className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-bv-ink/10 bg-bv-surface px-3 py-2 text-sm font-semibold text-bv-heading transition hover:bg-bv-muted"
                    key={genre}
                  >
                    <input
                      className="h-4 w-4 accent-bv-primary"
                      defaultChecked={data.user.preferredGenres.includes(genre)}
                      name="preferredGenres"
                      type="checkbox"
                      value={genre}
                    />
                    <span>{genre}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs leading-5 text-bv-text-muted">
                Chọn tối đa 8 thể loại để BookVerse gợi ý sách gần với sở thích của bạn hơn.
              </p>
            </fieldset>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Link
                className="inline-flex h-11 items-center justify-center rounded-xl border border-bv-ink/10 bg-white px-5 text-sm font-bold text-bv-ink transition hover:bg-bv-surface"
                href="/profile"
              >
                Hủy
              </Link>
              <SubmitButton className="h-11 gap-2 rounded-xl bg-bv-primary px-5 text-white hover:bg-bv-primary-dark" pendingLabel="Đang lưu...">
                <Save className="h-4 w-4" aria-hidden="true" />
                Lưu cấu hình
              </SubmitButton>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}
