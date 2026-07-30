import Link from "next/link";
import { redirect } from "next/navigation";
import { KeyRound, Save, ShieldCheck } from "lucide-react";
import { changePassword, getProfileSecurityData } from "@/actions/profile.actions";
import { SubmitButton } from "@/components/shared/SubmitButton";
import { Input } from "@/components/ui/input";

export const dynamic = "force-dynamic";

interface ProfileSecurityPageProps {
  searchParams?: Promise<{
    error?: string;
    message?: string;
  }>;
}

async function changePasswordAction(formData: FormData) {
  "use server";

  const result = await changePassword({
    currentPassword: String(formData.get("currentPassword") ?? ""),
    newPassword: String(formData.get("newPassword") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
  });

  if (!result.success) {
    redirect(`/profile/security?error=${encodeURIComponent(result.message)}`);
  }

  redirect(`/profile/security?message=${encodeURIComponent(result.message)}`);
}

export default async function ProfileSecurityPage({ searchParams }: ProfileSecurityPageProps) {
  const [params, data] = await Promise.all([searchParams, getProfileSecurityData()]);

  if (!data) {
    redirect("/login?callbackUrl=/profile/security");
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(15,118,110,0.18),transparent_34%),linear-gradient(180deg,#020617_0%,#111827_52%,#18181b_100%)] px-4 py-8 text-zinc-100 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-3xl rounded-2xl border border-white/10 bg-slate-950/72 p-5 shadow-[0_24px_90px_rgba(0,0,0,0.34)] backdrop-blur-2xl sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.16em] text-[#F2C14E]">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              Bảo mật tài khoản
            </p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-white">Đổi mật khẩu</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
              Email: {data.email ?? "Chưa cập nhật"}.
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

        {!data.hasPassword ? (
          <div className="mt-6 rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm leading-6 text-amber-100">
            Tài khoản này chưa có mật khẩu cục bộ. Nếu bạn đăng nhập bằng OAuth, hãy tiếp tục dùng nhà cung cấp đó.
          </div>
        ) : null}

        <form action={changePasswordAction} className="mt-6 grid gap-5">
          <div className="space-y-2">
            <label className="inline-flex items-center gap-2 text-sm font-bold text-zinc-200" htmlFor="currentPassword">
              <KeyRound className="h-4 w-4 text-[#F2C14E]" aria-hidden="true" />
              Mật khẩu hiện tại
            </label>
            <Input
              autoComplete="current-password"
              className="h-11 border-white/10 bg-white/[0.07] text-zinc-100 placeholder:text-zinc-500"
              disabled={!data.hasPassword}
              id="currentPassword"
              name="currentPassword"
              required={data.hasPassword}
              type="password"
            />
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-bold text-zinc-200" htmlFor="newPassword">
                Mật khẩu mới
              </label>
              <Input
                autoComplete="new-password"
                className="h-11 border-white/10 bg-white/[0.07] text-zinc-100 placeholder:text-zinc-500"
                disabled={!data.hasPassword}
                id="newPassword"
                minLength={8}
                name="newPassword"
                required={data.hasPassword}
                type="password"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-zinc-200" htmlFor="confirmPassword">
                Xác nhận mật khẩu mới
              </label>
              <Input
                autoComplete="new-password"
                className="h-11 border-white/10 bg-white/[0.07] text-zinc-100 placeholder:text-zinc-500"
                disabled={!data.hasPassword}
                id="confirmPassword"
                minLength={8}
                name="confirmPassword"
                required={data.hasPassword}
                type="password"
              />
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Link
              className="inline-flex h-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.07] px-5 text-sm font-bold text-zinc-100 transition hover:bg-white/[0.12]"
              href="/profile"
            >
              Hủy
            </Link>
            <SubmitButton
              className="h-11 gap-2 bg-[#D6A84F] px-5 text-slate-950 hover:bg-[#F2C14E]"
              disabled={!data.hasPassword}
              pendingLabel="Đang đổi..."
            >
              <Save className="h-4 w-4" aria-hidden="true" />
              Đổi mật khẩu
            </SubmitButton>
          </div>
        </form>
      </section>
    </main>
  );
}
