import Link from "next/link";
import { redirect } from "next/navigation";
import { Save, SlidersHorizontal, Target, UserRound } from "lucide-react";
import {
  getProfileSettingsData,
  updateProfileSettings,
} from "@/actions/profile.actions";
import { SubmitButton } from "@/components/shared/SubmitButton";
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
    avatarUrl: String(formData.get("avatarUrl") ?? ""),
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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(15,118,110,0.18),transparent_34%),linear-gradient(180deg,#020617_0%,#111827_52%,#18181b_100%)] px-4 py-8 text-zinc-100 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-4xl rounded-2xl border border-white/10 bg-slate-950/72 p-5 shadow-[0_24px_90px_rgba(0,0,0,0.34)] backdrop-blur-2xl sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.16em] text-[#F2C14E]">
              <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
              Hồ sơ cá nhân hóa
            </p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-white">Cấu hình sở thích đọc</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
              Dữ liệu này giúp Recommendation và Chatbot hiểu rõ mục tiêu đọc, ngân sách và thể loại bạn quan tâm.
            </p>
          </div>
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.07] px-4 text-sm font-bold text-zinc-100 transition hover:bg-white/[0.12]"
            href="/profile"
          >
            Về hồ sơ
          </Link>
        </div>

        {params?.error ? (
          <div className="mt-5 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {params.error}
          </div>
        ) : null}

        {params?.message ? (
          <div className="mt-5 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            {params.message}
          </div>
        ) : null}

        <form action={updateProfileSettingsAction} className="mt-6 grid gap-6">
          <section className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <label className="inline-flex items-center gap-2 text-sm font-bold text-zinc-200" htmlFor="displayName">
                <UserRound className="h-4 w-4 text-[#F2C14E]" aria-hidden="true" />
                Tên hiển thị
              </label>
              <Input
                className="h-11 border-white/10 bg-white/[0.07] text-zinc-100 placeholder:text-zinc-500"
                defaultValue={data.user.name}
                id="displayName"
                maxLength={120}
                name="displayName"
                required
                type="text"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-zinc-200" htmlFor="avatarUrl">
                Avatar URL
              </label>
              <Input
                className="h-11 border-white/10 bg-white/[0.07] text-zinc-100 placeholder:text-zinc-500"
                defaultValue={data.user.avatarUrl ?? ""}
                id="avatarUrl"
                maxLength={500}
                name="avatarUrl"
                placeholder="https://... hoặc /avatar.png"
                type="text"
              />
            </div>
          </section>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-bold text-zinc-200" htmlFor="persona">
                Persona đọc sách
              </label>
              <select
                className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.07] px-3 text-sm text-zinc-100 outline-none transition focus-visible:ring-2 focus-visible:ring-[#D6A84F]/35"
                defaultValue={data.user.persona ?? personaOptions[0]}
                id="persona"
                name="persona"
              >
                {personaOptions.map((option) => (
                  <option className="bg-slate-950 text-zinc-100" key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-zinc-200" htmlFor="budget">
                Ngân sách mua sách mỗi tháng
              </label>
              <Input
                className="h-11 border-white/10 bg-white/[0.07] text-zinc-100 placeholder:text-zinc-500"
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
              <label className="inline-flex items-center gap-2 text-sm font-bold text-zinc-200" htmlFor="dailyReadingGoalMinutes">
                <Target className="h-4 w-4 text-[#F2C14E]" aria-hidden="true" />
                Mục tiêu phút đọc mỗi ngày
              </label>
              <Input
                className="h-11 border-white/10 bg-white/[0.07] text-zinc-100 placeholder:text-zinc-500"
                defaultValue={data.user.dailyReadingGoalMinutes ?? ""}
                id="dailyReadingGoalMinutes"
                min={0}
                name="dailyReadingGoalMinutes"
                placeholder="Ví dụ: 30"
                type="number"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-zinc-200" htmlFor="dailyReadingGoalPages">
                Mục tiêu trang đọc mỗi ngày
              </label>
              <Input
                className="h-11 border-white/10 bg-white/[0.07] text-zinc-100 placeholder:text-zinc-500"
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
            <label className="text-sm font-bold text-zinc-200" htmlFor="bio">
              Mô tả mục tiêu đọc
            </label>
            <textarea
              className="min-h-28 w-full resize-y rounded-xl border border-white/10 bg-white/[0.07] px-3 py-3 text-sm leading-6 text-zinc-100 outline-none transition placeholder:text-zinc-500 focus-visible:ring-2 focus-visible:ring-[#D6A84F]/35"
              defaultValue={data.user.bio ?? ""}
              id="bio"
              maxLength={500}
              name="bio"
              placeholder="Ví dụ: Tôi muốn học AI ứng dụng, web backend và kỹ năng thuyết trình đồ án."
            />
          </div>

          <fieldset className="space-y-3">
            <legend className="text-sm font-bold text-zinc-200">Thể loại yêu thích</legend>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {genreOptions.map((genre) => (
                <label
                  className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-sm font-semibold text-zinc-200 transition hover:bg-white/[0.09]"
                  key={genre}
                >
                  <input
                    className="h-4 w-4 accent-[#D6A84F]"
                    defaultChecked={data.user.preferredGenres.includes(genre)}
                    name="preferredGenres"
                    type="checkbox"
                    value={genre}
                  />
                  <span>{genre}</span>
                </label>
              ))}
            </div>
            <p className="text-xs leading-5 text-zinc-500">
              Chọn tối đa 8 thể loại. Hệ thống sẽ dùng dữ liệu này làm tín hiệu cho gợi ý cá nhân hóa.
            </p>
          </fieldset>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Link
              className="inline-flex h-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.07] px-5 text-sm font-bold text-zinc-100 transition hover:bg-white/[0.12]"
              href="/profile"
            >
              Hủy
            </Link>
            <SubmitButton className="h-11 gap-2 bg-[#D6A84F] px-5 text-slate-950 hover:bg-[#F2C14E]" pendingLabel="Đang lưu...">
              <Save className="h-4 w-4" aria-hidden="true" />
              Lưu cấu hình
            </SubmitButton>
          </div>
        </form>
      </section>
    </main>
  );
}
