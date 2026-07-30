import Link from "next/link";
import { BookOpen, CircleHelp, FileText, Heart, LibraryBig, MessageCircle, ShieldCheck, Sparkles } from "lucide-react";

const exploreLinks = [
  { href: "/catalog", label: "Danh mục sách", icon: LibraryBig },
  { href: "/marketplace", label: "Chợ sách cũ", icon: BookOpen },
  { href: "/community", label: "Cộng đồng", icon: Heart },
];

export function Footer() {
  return (
    <footer className="bv-footer mt-auto border-t border-[#1D2433]/10">
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.25fr_1fr_1fr] lg:px-8">
        <div>
          <Link className="inline-flex items-center gap-3 text-[#1D2433]" href="/">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#176B62] text-[#FFFDF8] shadow-[0_10px_22px_rgba(23,107,98,0.2)]">
              <BookOpen className="h-5 w-5" aria-hidden="true" />
            </span>
            <span>
              <span className="bv-editorial block text-xl font-bold">BookVerse</span>
              <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-[#C65D43]">Thư viện AI</span>
            </span>
          </Link>
          <p className="mt-4 max-w-sm text-sm leading-6 text-[#687083]">
            Không gian đọc, khám phá và trao đổi sách dành cho cộng đồng yêu tri thức.
          </p>
        </div>

        <div>
          <h2 className="text-sm font-black uppercase tracking-[0.14em] text-[#1D2433]">Khám phá</h2>
          <nav aria-label="Khám phá BookVerse" className="mt-4 grid gap-3">
            {exploreLinks.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#536071] transition hover:text-[#176B62]"
                  href={item.href}
                  key={item.href}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div>
          <h2 className="text-sm font-black uppercase tracking-[0.14em] text-[#1D2433]">Đọc thông minh</h2>
          <div className="mt-4 grid gap-3">
            <Link className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#536071] transition hover:text-[#176B62]" href="/assistant">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Hỏi trợ lý AI
            </Link>
            <Link className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#536071] transition hover:text-[#176B62]" href="/library">
              <BookOpen className="h-4 w-4" aria-hidden="true" />
              Thư viện của tôi
            </Link>
            <Link className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#536071] transition hover:text-[#176B62]" href="/community">
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
              Chia sẻ cảm nhận
            </Link>
          </div>
        </div>
      </div>
      <div className="border-t border-[#1D2433]/10 px-4 py-4">
        <nav aria-label="Pháp lý và hỗ trợ" className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-5">
          <Link className="inline-flex min-h-11 items-center gap-1.5 text-xs font-bold text-[#536071] hover:text-[#176B62]" href="/help"><CircleHelp className="h-4 w-4" aria-hidden="true" />Trợ giúp</Link>
          <Link className="inline-flex min-h-11 items-center gap-1.5 text-xs font-bold text-[#536071] hover:text-[#176B62]" href="/terms"><FileText className="h-4 w-4" aria-hidden="true" />Điều khoản</Link>
          <Link className="inline-flex min-h-11 items-center gap-1.5 text-xs font-bold text-[#536071] hover:text-[#176B62]" href="/privacy"><ShieldCheck className="h-4 w-4" aria-hidden="true" />Bảo mật</Link>
          <Link className="inline-flex min-h-11 items-center text-xs font-bold text-[#536071] hover:text-[#176B62]" href="/refund-policy">Hoàn tiền</Link>
          <Link className="inline-flex min-h-11 items-center text-xs font-bold text-[#536071] hover:text-[#176B62]" href="/copyright">Bản quyền</Link>
        </nav>
        <p className="text-center text-xs leading-5 text-[#687083]">
          BookVerse AI là sản phẩm học thuật. Một phần catalog, giá và gợi ý sử dụng dữ liệu demo có ghi nhãn rõ ràng.
        </p>
      </div>
    </footer>
  );
}
