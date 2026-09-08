import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpen, Check, Sparkles } from "lucide-react";
import { registerUser } from "@/actions/auth.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface RegisterPageProps {
  searchParams?: Promise<{
    error?: string;
  }>;
}

async function registerAction(formData: FormData) {
  "use server";

  const result = await registerUser({
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });

  if (!result.success) {
    redirect(`/register?error=${encodeURIComponent(result.message)}`);
  }

  const query = new URLSearchParams({
    message: "Đăng ký thành công. Hãy đăng nhập để chọn thể loại yêu thích.",
    callbackUrl: "/onboarding/preferences",
  });
  redirect(`/login?${query.toString()}`);
}

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const params = await searchParams;
  const errorMessage = params?.error;

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
            <h1 className="mt-3 text-5xl font-black leading-[1.08] tracking-tight">
              Tạo kệ sách mang dấu ấn của riêng bạn.
            </h1>
            <p className="mt-5 max-w-md text-base leading-7 text-[#D9EEEA]">
              Chọn chủ đề yêu thích, lưu tiến độ đọc và khám phá những đầu sách phù hợp hơn theo thời gian.
            </p>
          </div>

          <ul className="relative z-10 mt-12 grid gap-4 text-sm font-semibold text-bv-mint-soft">
            {["Đọc thử và lưu tiến độ", "Theo dõi sách yêu thích", "Nhận gợi ý có giải thích"].map((item) => (
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
          <div className="mb-7">
            <span className="inline-flex items-center gap-2 rounded-full bg-bv-mint px-3 py-1.5 text-xs font-black uppercase tracking-[0.12em] text-bv-primary">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Bắt đầu miễn phí
            </span>
            <h2 className="bv-editorial mt-4 text-4xl font-bold text-bv-ink">Tạo tài khoản BookVerse</h2>
            <p className="mt-2 text-sm leading-6 text-bv-text-muted">
              Đăng ký bằng email để tạo thư viện và lưu hành trình đọc của bạn.
            </p>
          </div>

        {errorMessage ? (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700" role="alert">
            {errorMessage}
          </div>
        ) : null}

          <form action={registerAction} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-bold text-bv-heading" htmlFor="name">
              Họ và tên
            </label>
            <Input
              autoComplete="name"
              id="name"
              name="name"
              placeholder="Nguyễn Văn A"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-bv-heading" htmlFor="email">
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
            <label className="text-sm font-bold text-bv-heading" htmlFor="password">
              Mật khẩu
            </label>
            <Input
              autoComplete="new-password"
              id="password"
              minLength={6}
              name="password"
              placeholder="Tối thiểu 6 ký tự"
              required
              type="password"
            />
          </div>

          <Button className="h-12 w-full" type="submit">
            Tạo tài khoản miễn phí
          </Button>
        </form>

        <p className="mt-7 text-center text-sm text-bv-text-muted">
          Đã có tài khoản?{" "}
          <Link className="inline-flex min-h-11 items-center rounded-lg px-2 font-black text-bv-focus hover:bg-bv-muted hover:underline" href="/login">
            Đăng nhập
          </Link>
        </p>
        </div>
      </section>
    </main>
  );
}
