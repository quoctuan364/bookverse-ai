"use client";

import Link from "next/link";
import { BookOpen, Check, CircleHelp, Eye, EyeOff, Sparkles } from "lucide-react";
import { useState } from "react";
import { registerUser } from "@/actions/auth.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function RegisterPage() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setPending(true);

    const formData = new FormData(event.currentTarget);
    const result = await registerUser({
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
    });

    if (!result.success) {
      setErrorMessage(result.message);
      setPending(false);
      return;
    }

    const query = new URLSearchParams({
      message: "Đăng ký thành công. Hãy đăng nhập để chọn thể loại yêu thích.",
      callbackUrl: "/onboarding/preferences",
    });
    window.location.href = `/login?${query.toString()}`;
  }

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
              Tạo kệ sách mang dấu ấn của riêng bạn.
            </h1>
            <p className="mt-3 max-w-sm text-sm leading-6 text-[#D9EEEA]">
              Chọn chủ đề yêu thích, lưu tiến độ đọc và khám phá những cuốn sách hợp gu bạn.
            </p>
          </div>

          <ul className="relative z-10 mt-8 grid gap-3 text-sm font-semibold text-bv-mint-soft">
            {["Đọc thử và lưu tiến độ đọc", "Mua sách và theo dõi đơn hàng", "Nhận gợi ý sách có giải thích"].map((item) => (
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
              Bắt đầu miễn phí
            </span>
            <h2 className="bv-editorial mt-2.5 text-2xl sm:text-3xl font-bold text-bv-ink">
              Tạo tài khoản BookVerse
            </h2>
            <p className="mt-1 text-xs text-bv-text-muted">
              Đăng ký để đọc sách, quản lý tủ sách và giao lưu cộng đồng.
            </p>
          </div>

          {errorMessage ? (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700" role="alert">
              {errorMessage}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-bv-heading" htmlFor="name">
                Họ và tên
              </label>
              <Input
                autoComplete="name"
                className="h-11 rounded-xl text-sm"
                id="name"
                name="name"
                placeholder="Nguyễn Văn A"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-bold text-bv-heading" htmlFor="email">
                Email
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

            <div className="space-y-1.5">
              <label className="text-sm font-bold text-bv-heading" htmlFor="password">
                Mật khẩu
              </label>
              <div className="relative">
                <Input
                  autoComplete="new-password"
                  className="h-11 rounded-xl pr-11 text-sm"
                  id="password"
                  minLength={6}
                  name="password"
                  placeholder="Tối thiểu 6 ký tự"
                  required
                  type={showPassword ? "text" : "password"}
                />
                <button
                  aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  className="absolute right-1 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-bv-text-muted transition hover:bg-bv-muted hover:text-bv-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bv-primary"
                  onClick={() => setShowPassword((current) => !current)}
                  type="button"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            <Button
              className="mt-2 h-11 w-full rounded-xl text-sm font-black shadow-sm transition hover:shadow-md"
              disabled={pending}
              type="submit"
            >
              {pending ? "Đang tạo tài khoản..." : "Tạo tài khoản miễn phí"}
            </Button>
          </form>

          <p className="mt-5 text-center text-xs text-bv-text-muted">
            Đã có tài khoản?{" "}
            <Link className="font-black text-bv-primary hover:underline" href="/login">
              Đăng nhập ngay
            </Link>
          </p>

          <div className="mt-2 text-center">
            <Link
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold text-bv-text-muted transition hover:bg-bv-mint hover:text-bv-primary"
              href="/help#bat-dau"
            >
              <CircleHelp className="h-3.5 w-3.5" aria-hidden="true" />
              Xem hướng dẫn đăng ký
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
