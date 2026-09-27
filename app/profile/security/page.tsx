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
    <main className="bv-page">
      <section className="bv-hero">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-10 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8">
          <div>
            <p className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.16em] text-bv-gold">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              Bảo mật tài khoản
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">Đổi mật khẩu</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-bv-mint-soft">
              Email: {data.email ?? "Chưa cập nhật"}.
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

      <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
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

          {!data.hasPassword ? (
            <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
              Tài khoản này chưa có mật khẩu cục bộ. Nếu bạn đăng nhập bằng OAuth, hãy tiếp tục dùng nhà cung cấp đó.
            </div>
          ) : null}

          <form action={changePasswordAction} className="grid gap-5">
            <div className="space-y-2">
              <label className="inline-flex items-center gap-2 text-sm font-bold text-bv-heading" htmlFor="currentPassword">
                <KeyRound className="h-4 w-4 text-bv-primary" aria-hidden="true" />
                Mật khẩu hiện tại
              </label>
              <Input
                autoComplete="current-password"
                className="h-11 rounded-xl border-bv-border bg-white text-bv-ink placeholder:text-bv-text-muted focus-visible:ring-bv-primary"
                disabled={!data.hasPassword}
                id="currentPassword"
                name="currentPassword"
                required={data.hasPassword}
                type="password"
              />
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-bold text-bv-heading" htmlFor="newPassword">
                  Mật khẩu mới
                </label>
                <Input
                  autoComplete="new-password"
                  className="h-11 rounded-xl border-bv-border bg-white text-bv-ink placeholder:text-bv-text-muted focus-visible:ring-bv-primary"
                  disabled={!data.hasPassword}
                  id="newPassword"
                  minLength={8}
                  name="newPassword"
                  required={data.hasPassword}
                  type="password"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-bv-heading" htmlFor="confirmPassword">
                  Xác nhận mật khẩu mới
                </label>
                <Input
                  autoComplete="new-password"
                  className="h-11 rounded-xl border-bv-border bg-white text-bv-ink placeholder:text-bv-text-muted focus-visible:ring-bv-primary"
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
                className="inline-flex h-11 items-center justify-center rounded-xl border border-bv-ink/10 bg-white px-5 text-sm font-bold text-bv-ink transition hover:bg-bv-surface"
                href="/profile"
              >
                Hủy
              </Link>
              <SubmitButton
                className="h-11 gap-2 rounded-xl bg-bv-primary px-5 text-white hover:bg-bv-primary-dark"
                disabled={!data.hasPassword}
                pendingLabel="Đang đổi..."
              >
                <Save className="h-4 w-4" aria-hidden="true" />
                Đổi mật khẩu
              </SubmitButton>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}
