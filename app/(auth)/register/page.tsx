import Link from "next/link";
import { redirect } from "next/navigation";
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

  redirect("/login");
}

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const params = await searchParams;
  const errorMessage = params?.error;

  return (
    <main className="bv-page flex min-h-screen items-center justify-center px-4 py-10">
      <section className="bv-card w-full max-w-md rounded-lg p-6 sm:p-8">
        <div className="mb-8 text-center">
          <p className="text-sm font-black uppercase tracking-[0.16em] text-[#E76F51]">BookVerse AI</p>
          <h1 className="mt-2 text-3xl font-black text-[#17202A]">Đăng ký</h1>
          <p className="mt-2 text-sm text-[#66706B]">
            Tạo tài khoản để lưu lịch sử đọc và nhận gợi ý AI.
          </p>
        </div>

        {errorMessage ? (
          <div className="mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        ) : null}

        <form action={registerAction} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-bold text-[#17202A]" htmlFor="name">
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
            <label className="text-sm font-bold text-[#17202A]" htmlFor="password">
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

          <Button className="h-11 w-full" type="submit">
            Đăng ký
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-[#66706B]">
          Đã có tài khoản?{" "}
          <Link className="font-black text-[#0F766E] hover:underline" href="/login">
            Đăng nhập
          </Link>
        </p>
      </section>
    </main>
  );
}
