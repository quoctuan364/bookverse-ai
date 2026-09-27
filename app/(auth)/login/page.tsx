import Link from "next/link";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { BookOpen, Check, CircleHelp, Sparkles } from "lucide-react";
import { auth, signIn } from "@/auth";
import { getSafeCallbackUrl } from "@/lib/login-navigation";
import { CredentialsLoginFields } from "@/components/auth/CredentialsLoginFields";

interface LoginPageProps {
  searchParams?: Promise<{
    error?: string;
    message?: string;
    callbackUrl?: string;
  }>;
}

async function loginAction(formData: FormData) {
  "use server";

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const rawCallback = formData.get("callbackUrl");
  let callbackUrl = rawCallback ? getSafeCallbackUrl(String(rawCallback)) : "/";

  if (callbackUrl === "/") {
    const { default: prisma } = await import("@/lib/prisma");
    const userRole = await prisma.user.findUnique({
      where: { email },
      select: { role: true },
    });
    if (userRole?.role === "ADMIN" || userRole?.role === "MODERATOR") {
      callbackUrl = "/admin";
    }
  }

  try {
    await signIn("credentials", {
      email,
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
  const currentSession = await auth();
  if (currentSession?.user) {
    const isStaff = currentSession.user.role === "ADMIN" || currentSession.user.role === "MODERATOR";
    const defaultTarget = isStaff ? "/admin" : "/";
    redirect(params?.callbackUrl ? getSafeCallbackUrl(params.callbackUrl) : defaultTarget);
  }
  const errorMessage = params?.error;
  const successMessage = params?.message;
  const callbackUrl = getSafeCallbackUrl(params?.callbackUrl ?? "/");
  const showDemoAccounts = process.env.BOOKVERSE_SHOW_DEMO_ACCOUNTS !== "false";

  return (
    <main className="bv-page flex min-h-[calc(100vh-140px)] items-center justify-center px-4 py-6 sm:px-6">
      <section className="mx-auto grid w-full max-w-4xl overflow-hidden rounded-3xl border border-bv-ink/10 bg-white shadow-[0_20px_60px_rgba(29,36,51,0.1)] lg:grid-cols-[0.9fr_1.1fr]">
        <aside className="relative isolate hidden overflow-hidden bg-bv-primary-dark p-8 text-bv-ivory lg:flex lg:flex-col lg:justify-between">
          <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 z-0 h-80 w-80 rounded-full border border-white/10 bg-white/5" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 -left-20 z-0 h-96 w-96 rounded-full border border-bv-gold/20 bg-bv-gold/5" />

          <div className="relative z-10">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-[#F5D98B]">
              <BookOpen className="h-5 w-5" aria-hidden="true" />
            </span>
            <p className="mt-6 text-xs font-black uppercase tracking-[0.18em] text-[#F5D98B]">Nền tảng BookVerse</p>
            <h1 className="mt-2 text-3xl font-black leading-tight tracking-tight">
              Đăng nhập để tiếp tục đọc sách.
            </h1>
            <p className="mt-3 max-w-sm text-sm leading-6 text-[#D9EEEA]">
              Lưu sách yêu thích, theo dõi tiến độ đọc và tham gia cộng đồng trao đổi sách.
            </p>
          </div>

          <ul className="relative z-10 mt-8 grid gap-3 text-sm font-semibold text-bv-mint-soft">
            {[
              "Đồng bộ thư viện và tiến độ đọc",
              "Mua sách, đăng bán & theo dõi đơn hàng",
              "Nhận gợi ý sách cá nhân hóa theo gu",
            ].map((item) => (
              <li className="flex items-center gap-2.5 text-xs font-medium" key={item}>
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-[#F5D98B]">
                  <Check className="h-3 w-3" aria-hidden="true" />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </aside>

        <div className="flex flex-col justify-center p-6 sm:p-8 lg:p-9">
          <div className="mb-4">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-bv-mint px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.1em] text-bv-primary">
              <Sparkles className="h-3 w-3" aria-hidden="true" />
              Chào mừng trở lại
            </span>
            <h2 className="bv-editorial mt-2.5 text-2xl sm:text-3xl font-bold text-bv-ink">
              Đăng nhập BookVerse
            </h2>
            <p className="mt-1 text-xs text-bv-text-muted">
              Nhập email và mật khẩu của bạn để tiếp tục.
            </p>
          </div>

          {errorMessage ? (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700" role="alert">
              {errorMessage}
            </div>
          ) : null}

          {successMessage ? (
            <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-medium text-emerald-800" role="status">
              {successMessage}
            </div>
          ) : null}

          <form action={loginAction}>
            <input name="callbackUrl" type="hidden" value={callbackUrl} />
            <CredentialsLoginFields showDemoAccounts={showDemoAccounts} />
          </form>

          <p className="mt-5 text-center text-xs text-bv-text-muted">
            Chưa có tài khoản?{" "}
            <Link
              className="font-black text-bv-primary hover:underline"
              href="/register"
            >
              Đăng ký miễn phí
            </Link>
          </p>

          <div className="mt-2 text-center">
            <Link
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold text-bv-text-muted transition hover:bg-bv-mint hover:text-bv-primary"
              href="/help#bat-dau"
            >
              <CircleHelp className="h-3.5 w-3.5" aria-hidden="true" />
              Xem hướng dẫn sử dụng
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
