import Link from "next/link";
import { redirect } from "next/navigation";
import { LockKeyhole } from "lucide-react";
import { resetPassword } from "@/actions/password-reset.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ResetPasswordPageProps {
  searchParams?: Promise<{
    error?: string;
    token?: string;
  }>;
}

async function resetPasswordAction(formData: FormData) {
  "use server";

  const token = String(formData.get("token") ?? "");
  const result = await resetPassword(
    token,
    String(formData.get("password") ?? ""),
    String(formData.get("confirmPassword") ?? ""),
  );

  if (!result.success) {
    const params = new URLSearchParams({
      error: result.message,
      token,
    });

    redirect(`/reset-password?${params.toString()}`);
  }

  redirect(`/login?message=${encodeURIComponent(result.message)}`);
}

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const params = await searchParams;
  const token = params?.token ?? "";
  const hasToken = token.trim().length > 0;

  return (
    <main className="bv-page flex min-h-[calc(100vh-140px)] items-center justify-center px-4 py-8">
      <section className="w-full max-w-md rounded-3xl border border-bv-ink/10 bg-white p-6 sm:p-8 shadow-[0_20px_60px_rgba(29,36,51,0.1)]">
        <div className="mb-6 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-bv-primary/10 text-bv-primary">
            <LockKeyhole className="h-6 w-6" aria-hidden="true" />
          </span>
          <h1 className="bv-editorial mt-3 text-2xl sm:text-3xl font-bold text-bv-ink">Đặt lại mật khẩu</h1>
          <p className="mt-2 text-xs leading-5 text-bv-text-muted">
            Tạo mật khẩu mới mạnh hơn để tiếp tục bảo vệ tài khoản BookVerse của bạn.
          </p>
        </div>

        {params?.error ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700">
            {params.error}
          </div>
        ) : null}

        {!hasToken ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-800">
            Link đặt lại mật khẩu thiếu token hoặc đã hết hạn. Hãy yêu cầu liên kết mới.
            <div className="mt-3">
              <Link className="font-black text-bv-primary hover:underline" href="/forgot-password">
                Tạo lại yêu cầu quên mật khẩu
              </Link>
            </div>
          </div>
        ) : (
          <form action={resetPasswordAction} className="space-y-4">
            <input name="token" type="hidden" value={token} />

            <div className="space-y-1.5">
              <label className="text-sm font-bold text-bv-heading" htmlFor="password">
                Mật khẩu mới
              </label>
              <Input
                autoComplete="new-password"
                className="h-11 rounded-xl text-sm"
                id="password"
                minLength={6}
                name="password"
                placeholder="Tối thiểu 6 ký tự"
                required
                type="password"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-bold text-bv-heading" htmlFor="confirmPassword">
                Xác nhận mật khẩu mới
              </label>
              <Input
                autoComplete="new-password"
                className="h-11 rounded-xl text-sm"
                id="confirmPassword"
                minLength={6}
                name="confirmPassword"
                placeholder="Nhập lại mật khẩu mới"
                required
                type="password"
              />
            </div>

            <Button className="h-11 w-full rounded-xl text-sm font-black shadow-sm transition hover:shadow-md" type="submit">
              Lưu mật khẩu mới
            </Button>
          </form>
        )}

        <p className="mt-6 text-center text-xs text-bv-text-muted">
          Nhớ lại mật khẩu cũ?{" "}
          <Link className="font-black text-bv-primary hover:underline" href="/login">
            Quay lại đăng nhập
          </Link>
        </p>
      </section>
    </main>
  );
}
