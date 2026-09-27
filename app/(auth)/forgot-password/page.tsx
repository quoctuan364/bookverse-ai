import Link from "next/link";
import { redirect } from "next/navigation";
import { KeyRound } from "lucide-react";
import { requestPasswordReset } from "@/actions/password-reset.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ForgotPasswordPageProps {
  searchParams?: Promise<{
    error?: string;
    message?: string;
    resetUrl?: string;
  }>;
}

async function forgotPasswordAction(formData: FormData) {
  "use server";

  const result = await requestPasswordReset(String(formData.get("email") ?? ""));
  const params = new URLSearchParams();

  if (result.success) {
    params.set("message", result.message);

    if (result.resetUrl) {
      params.set("resetUrl", result.resetUrl);
    }
  } else {
    params.set("error", result.message);
  }

  redirect(`/forgot-password?${params.toString()}`);
}

export default async function ForgotPasswordPage({ searchParams }: ForgotPasswordPageProps) {
  const params = await searchParams;

  return (
    <main className="bv-page flex min-h-[calc(100vh-140px)] items-center justify-center px-4 py-8">
      <section className="w-full max-w-md rounded-3xl border border-bv-ink/10 bg-white p-6 sm:p-8 shadow-[0_20px_60px_rgba(29,36,51,0.1)]">
        <div className="mb-6 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-bv-primary/10 text-bv-primary">
            <KeyRound className="h-6 w-6" aria-hidden="true" />
          </span>
          <h1 className="bv-editorial mt-3 text-2xl sm:text-3xl font-bold text-bv-ink">Quên mật khẩu</h1>
          <p className="mt-2 text-xs leading-5 text-bv-text-muted">
            Nhập email tài khoản. Hệ thống sẽ tạo liên kết đặt lại mật khẩu có thời hạn 30 phút.
          </p>
        </div>

        {params?.error ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700">
            {params.error}
          </div>
        ) : null}

        {params?.message ? (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs leading-5 text-emerald-800">
            <p>{params.message}</p>
            {params.resetUrl ? (
              <Link className="mt-2 block break-all font-black text-bv-primary hover:underline" href={params.resetUrl}>
                Mở liên kết đặt lại mật khẩu
              </Link>
            ) : null}
          </div>
        ) : null}

        <form action={forgotPasswordAction} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-bv-heading" htmlFor="email">
              Địa chỉ email
            </label>
            <Input
              autoComplete="email"
              className="h-11 rounded-xl text-sm"
              id="email"
              name="email"
              placeholder="ban@example.com"
              required
              type="email"
            />
          </div>

          <Button className="h-11 w-full rounded-xl text-sm font-black shadow-sm transition hover:shadow-md" type="submit">
            Gửi liên kết đặt lại mật khẩu
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-bv-text-muted">
          Đã nhớ mật khẩu?{" "}
          <Link className="font-black text-bv-primary hover:underline" href="/login">
            Quay lại đăng nhập
          </Link>
        </p>
      </section>
    </main>
  );
}
