import Link from "next/link";
import { redirect } from "next/navigation";
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
    <main className="bv-page flex min-h-screen items-center justify-center px-4 py-10">
      <section className="bv-card w-full max-w-md rounded-lg p-6 sm:p-8">
        <div className="mb-8 text-center">
          <p className="text-sm font-black uppercase tracking-[0.16em] text-bv-accent">BookVerse AI</p>
          <h1 className="mt-2 text-3xl font-black text-bv-heading">Đặt lại mật khẩu</h1>
          <p className="mt-2 text-sm leading-6 text-bv-text-muted">
            Tạo mật khẩu mới mạnh hơn để tiếp tục dùng tài khoản BookVerse.
          </p>
        </div>

        {params?.error ? (
          <div className="mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {params.error}
          </div>
        ) : null}

        {!hasToken ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
            Link đặt lại mật khẩu thiếu token. Hãy tạo lại yêu cầu quên mật khẩu.
          </div>
        ) : (
          <form action={resetPasswordAction} className="space-y-5">
            <input name="token" type="hidden" value={token} />

            <div className="space-y-2">
              <label className="text-sm font-bold text-bv-heading" htmlFor="password">
                Mật khẩu mới
              </label>
              <Input
                autoComplete="new-password"
                id="password"
                minLength={8}
                name="password"
                placeholder="Tối thiểu 8 ký tự"
                required
                type="password"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-bv-heading" htmlFor="confirmPassword">
                Nhập lại mật khẩu mới
              </label>
              <Input
                autoComplete="new-password"
                id="confirmPassword"
                minLength={8}
                name="confirmPassword"
                placeholder="Nhập lại mật khẩu"
                required
                type="password"
              />
            </div>

            <Button className="h-11 w-full" type="submit">
              Cập nhật mật khẩu
            </Button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-bv-text-muted">
          Cần link mới?{" "}
          <Link className="font-black text-bv-focus hover:underline" href="/forgot-password">
            Gửi lại yêu cầu
          </Link>
        </p>
      </section>
    </main>
  );
}
