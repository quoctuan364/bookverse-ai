import Link from "next/link";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { BookOpen, Check, Sparkles } from "lucide-react";
import { signIn } from "@/auth";
import { CredentialsLoginFields } from "@/components/auth/CredentialsLoginFields";

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

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const errorMessage = params?.error;
  const successMessage = params?.message;
  const callbackUrl = params?.callbackUrl ?? "/";
  const showDemoAccounts =
    process.env.NODE_ENV !== "production" &&
    process.env.BOOKVERSE_SHOW_DEMO_ACCOUNTS !== "false";

  return (
    <main className="bv-page px-4 py-8 sm:px-6 lg:py-12">
      <section className="mx-auto grid w-full max-w-6xl overflow-hidden rounded-3xl border border-bv-ink/10 bg-white shadow-[0_28px_80px_rgba(29,36,51,0.14)] lg:grid-cols-[0.95fr_1.05fr]">
        <aside className="relative isolate hidden overflow-hidden bg-bv-primary-dark p-10 text-bv-ivory lg:flex lg:flex-col lg:justify-between">
          <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 z-0 h-80 w-80 rounded-full border border-white/10 bg-white/5" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 -left-20 z-0 h-96 w-96 rounded-full border border-bv-gold/20 bg-bv-gold/5" />

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

          <ul className="relative z-10 mt-12 grid gap-4 text-sm font-semibold text-bv-mint-soft">
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
            <span className="inline-flex items-center gap-2 rounded-full bg-bv-mint px-3 py-1.5 text-xs font-black uppercase tracking-[0.12em] text-bv-primary">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Chào mừng trở lại
            </span>
            <h2 className="bv-editorial mt-4 text-4xl font-bold text-bv-ink">Đăng nhập BookVerse</h2>
            <p className="mt-2 text-sm leading-6 text-bv-text-muted">
              Tiếp tục hành trình đọc bằng email và mật khẩu của bạn.
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

          <form action={loginAction} className="space-y-5">
            <input name="callbackUrl" type="hidden" value={callbackUrl} />
            <CredentialsLoginFields showDemoAccounts={showDemoAccounts} />
          </form>

          <p className="mt-7 text-center text-sm text-bv-text-muted">
            Chưa có tài khoản?{" "}
            <Link
              className="inline-flex min-h-11 items-center font-black text-bv-focus hover:underline"
              href="/register"
            >
              Đăng ký miễn phí
            </Link>
          </p>

        </div>
      </section>
    </main>
  );
}
