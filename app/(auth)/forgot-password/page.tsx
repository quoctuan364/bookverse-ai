import Link from "next/link";
import { redirect } from "next/navigation";
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
    <main className="bv-page flex min-h-screen items-center justify-center px-4 py-10">
      <section className="bv-card w-full max-w-md rounded-lg p-6 sm:p-8">
        <div className="mb-8 text-center">
          <p className="text-sm font-black uppercase tracking-[0.16em] text-[#E76F51]">BookVerse AI</p>
          <h1 className="mt-2 text-3xl font-black text-[#17202A]">Quên mật khẩu</h1>
          <p className="mt-2 text-sm leading-6 text-[#66706B]">
            Nhập email tài khoản. Hệ thống sẽ tạo liên kết đặt lại mật khẩu có thời hạn 30 phút.
          </p>
        </div>

        {params?.error ? (
          <div className="mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {params.error}
          </div>
        ) : null}

        {params?.message ? (
          <div className="mb-5 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-800">
            <p>{params.message}</p>
            {params.resetUrl ? (
              <Link className="mt-2 block break-all font-black text-[#0F766E] hover:underline" href={params.resetUrl}>
                Mở link đặt lại mật khẩu demo
              </Link>
            ) : null}
          </div>
        ) : null}

        <form action={forgotPasswordAction} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-bold text-[#17202A]" htmlFor="email">
              Email
            </label>
            <Input
              autoComplete="email"
              id="email"
              name="email"
              placeholder="ban@example.com"
              required
              type="email"
            />
          </div>

          <Button className="h-11 w-full" type="submit">
            Tạo liên kết đặt lại mật khẩu
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-[#66706B]">
          Đã nhớ mật khẩu?{" "}
          <Link className="font-black text-[#0F766E] hover:underline" href="/login">
            Quay lại đăng nhập
          </Link>
        </p>
      </section>
    </main>
  );
}
