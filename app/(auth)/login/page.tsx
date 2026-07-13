import Link from "next/link";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface LoginPageProps {
  searchParams?: Promise<{
    error?: string;
    message?: string;
    callbackUrl?: string;
  }>;
}

function getSafeCallbackUrl(value: FormDataEntryValue | null): string {
  const callbackUrl = typeof value === "string" ? value.trim() : "";

  if (!callbackUrl.startsWith("/") || callbackUrl.startsWith("//")) {
    return "/";
  }

  return callbackUrl;
}

async function loginAction(formData: FormData) {
  "use server";

  try {
    await signIn("credentials", {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      redirectTo: getSafeCallbackUrl(formData.get("callbackUrl")),
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      redirect(`/login?error=${encodeURIComponent("Email hoặc mật khẩu không đúng.")}`);
    }

    throw error;
  }
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const errorMessage = params?.error;
  const successMessage = params?.message;
  const callbackUrl = params?.callbackUrl ?? "/";

  return (
    <main className="bv-page flex min-h-screen items-center justify-center px-4 py-10">
      <section className="bv-card w-full max-w-md rounded-lg p-6 sm:p-8">
        <div className="mb-8 text-center">
          <p className="text-sm font-black uppercase tracking-[0.16em] text-[#E76F51]">BookVerse AI</p>
          <h1 className="mt-2 text-3xl font-black text-[#17202A]">Đăng nhập</h1>
          <p className="mt-2 text-sm text-[#66706B]">
            Tiếp tục đọc sách, viết review và nhận gợi ý cá nhân hóa.
          </p>
        </div>

        {errorMessage ? (
          <div className="mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        ) : null}

        {successMessage ? (
          <div className="mb-5 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {successMessage}
          </div>
        ) : null}

        <form action={loginAction} className="space-y-5">
          <input name="callbackUrl" type="hidden" value={callbackUrl} />

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

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <label className="text-sm font-bold text-[#17202A]" htmlFor="password">
                Mật khẩu
              </label>
              <Link className="text-xs font-black text-[#0F766E] hover:underline" href="/forgot-password">
                Quên mật khẩu?
              </Link>
            </div>
            <Input
              autoComplete="current-password"
              id="password"
              name="password"
              placeholder="Nhập mật khẩu"
              required
              type="password"
            />
          </div>

          <Button className="h-11 w-full" type="submit">
            Đăng nhập
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-[#66706B]">
          Chưa có tài khoản?{" "}
          <Link className="font-black text-[#0F766E] hover:underline" href="/register">
            Đăng ký ngay
          </Link>
        </p>
      </section>
    </main>
  );
}
