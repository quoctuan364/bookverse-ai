import Link from "next/link";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { BookOpen, Check, Sparkles } from "lucide-react";
import { signIn } from "@/auth";
import { CredentialsLoginFields } from "@/components/auth/CredentialsLoginFields";
import { Button } from "@/components/ui/button";
import { isGoogleAuthConfigured } from "@/lib/google-auth";

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

  const callbackUrl = getSafeCallbackUrl(formData.get("callbackUrl"));
  try {
    await signIn("credentials", {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      redirectTo: callbackUrl,
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      const query = new URLSearchParams({
        error: "Email hoặc mật khẩu không đúng.",
        callbackUrl,
      });
      redirect(`/login?${query.toString()}`);
    }

    throw error;
  }
}

async function googleLoginAction(formData: FormData) {
  "use server";

  const callbackUrl = getSafeCallbackUrl(formData.get("callbackUrl"));
  if (!isGoogleAuthConfigured()) {
    const query = new URLSearchParams({
      error: "Đăng nhập Google chưa được cấu hình trên máy chủ.",
      callbackUrl,
    });
    redirect(`/login?${query.toString()}`);
  }

  try {
    await signIn("google", {
      redirectTo: callbackUrl,
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      const query = new URLSearchParams({
        error: "Không thể đăng nhập bằng Google. Vui lòng thử lại.",
        callbackUrl,
      });
      redirect(`/login?${query.toString()}`);
    }

    throw error;
  }
}

function GoogleMark() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24">
      <path d="M21.6 12.227c0-.709-.064-1.39-.182-2.045H12v3.868h5.382a4.6 4.6 0 0 1-1.995 3.018v2.51h3.231c1.89-1.74 2.982-4.304 2.982-7.35Z" fill="#4285F4" />
      <path d="M12 22c2.7 0 4.964-.895 6.618-2.423l-3.231-2.509c-.895.6-2.041.955-3.387.955-2.605 0-4.81-1.76-5.6-4.123H3.06v2.59A10 10 0 0 0 12 22Z" fill="#34A853" />
      <path d="M6.4 13.9A6.01 6.01 0 0 1 6.09 12c0-.66.114-1.3.31-1.9V7.51H3.06A10 10 0 0 0 2 12c0 1.614.386 3.14 1.06 4.49L6.4 13.9Z" fill="#FBBC05" />
      <path d="M12 5.977c1.468 0 2.786.505 3.823 1.496l2.868-2.868C16.96 2.99 14.696 2 12 2a10 10 0 0 0-8.94 5.51L6.4 10.1c.79-2.364 2.995-4.123 5.6-4.123Z" fill="#EA4335" />
    </svg>
  );
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const errorMessage = params?.error;
  const successMessage = params?.message;
  const callbackUrl = params?.callbackUrl ?? "/";
  const googleEnabled = isGoogleAuthConfigured();
  const showDemoAccounts =
    process.env.NODE_ENV !== "production" &&
    process.env.BOOKVERSE_SHOW_DEMO_ACCOUNTS !== "false";

  return (
    <main className="bv-page px-4 py-8 sm:px-6 lg:py-12">
      <section className="mx-auto grid w-full max-w-6xl overflow-hidden rounded-3xl border border-[#1D2433]/10 bg-white shadow-[0_28px_80px_rgba(29,36,51,0.14)] lg:grid-cols-[0.95fr_1.05fr]">
        <aside className="relative isolate hidden overflow-hidden bg-[#104C47] p-10 text-[#FFFDF8] lg:flex lg:flex-col lg:justify-between">
          <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 z-0 h-80 w-80 rounded-full border border-white/10 bg-white/5" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 -left-20 z-0 h-96 w-96 rounded-full border border-[#F2C14E]/20 bg-[#F2C14E]/5" />

          <div className="relative z-10">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-[#F5D98B]">
              <BookOpen className="h-6 w-6" aria-hidden="true" />
            </span>
            <p className="mt-8 text-sm font-black uppercase tracking-[0.18em] text-[#F5D98B]">BookVerse AI</p>
            <h1 className="mt-3 font-sans text-5xl font-black leading-[1.08] tracking-tight">
              Mỗi lần đăng nhập, một hành trình đọc tiếp nối.
            </h1>
            <p className="mt-5 max-w-md text-base leading-7 text-[#D9EEEA]">
              Lưu sách yêu thích, theo dõi tiến độ, mua sách demo và nhận gợi ý phù hợp hơn theo thời gian.
            </p>
          </div>

          <ul className="relative z-10 mt-12 grid gap-4 text-sm font-semibold text-[#EAF5F1]">
            {[
              "Đồng bộ thư viện và sách yêu thích",
              "Theo dõi đơn hàng và giỏ sách",
              "Nhận đề xuất AI có giải thích",
            ].map((item) => (
              <li className="flex items-center gap-3" key={item}>
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-[#F5D98B]">
                  <Check className="h-4 w-4" aria-hidden="true" />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </aside>

        <div className="p-6 sm:p-10 lg:p-12">
          <div className="mb-8">
            <span className="inline-flex items-center gap-2 rounded-full bg-[#E6F3F0] px-3 py-1.5 text-xs font-black uppercase tracking-[0.12em] text-[#176B62]">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Chào mừng trở lại
            </span>
            <h2 className="bv-editorial mt-4 text-4xl font-bold text-[#1D2433]">Đăng nhập BookVerse</h2>
            <p className="mt-2 text-sm leading-6 text-[#66706B]">
              Sử dụng Google để đăng nhập nhanh hoặc tiếp tục bằng email.
            </p>
          </div>

          {errorMessage ? (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700" role="alert">
              {errorMessage}
            </div>
          ) : null}

          {successMessage ? (
            <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800" role="status">
              {successMessage}
            </div>
          ) : null}

          <form action={googleLoginAction}>
            <input name="callbackUrl" type="hidden" value={callbackUrl} />
            <Button
              className="h-12 w-full gap-3 border-[#1D2433]/15 bg-white text-[#1D2433] shadow-sm hover:border-[#176B62]/35 hover:bg-[#F7FAF9]"
              disabled={!googleEnabled}
              type="submit"
              variant="outline"
            >
              <GoogleMark />
              {googleEnabled ? "Tiếp tục với Google" : "Google chưa được cấu hình"}
            </Button>
          </form>

          <div className="my-7 flex items-center gap-4" aria-hidden="true">
            <span className="h-px flex-1 bg-[#1D2433]/10" />
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#8A92A0]">Hoặc dùng email</span>
            <span className="h-px flex-1 bg-[#1D2433]/10" />
          </div>

          <form action={loginAction} className="space-y-5">
            <input name="callbackUrl" type="hidden" value={callbackUrl} />
            <CredentialsLoginFields showDemoAccounts={showDemoAccounts} />
          </form>

          <p className="mt-7 text-center text-sm text-[#66706B]">
            Chưa có tài khoản?{" "}
            <Link
              className="inline-flex min-h-11 items-center font-black text-[#0F766E] hover:underline"
              href="/register"
            >
              Đăng ký miễn phí
            </Link>
          </p>

          {!googleEnabled ? (
            <p className="mt-4 rounded-xl bg-[#F7F4ED] px-4 py-3 text-center text-xs leading-5 text-[#66706B]">
              Quản trị viên cần thêm OAuth Client ID và Client Secret để bật đăng nhập Google.
            </p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
