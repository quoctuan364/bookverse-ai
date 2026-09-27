import Link from "next/link";
import {
  Bell,
  BookOpen,
  CreditCard,
  Crown,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  Search,
  ShieldCheck,
  ShoppingCart,
  Store,
  TrendingUp,
  UserCircle,
} from "lucide-react";
import { signOut } from "@/auth";
import { AppNavigation } from "@/components/navigation/AppNavigation";
import { Input } from "@/components/ui/input";
import { getCurrentUser } from "@/lib/permissions";
import prisma from "@/lib/prisma";

async function logoutAction() {
  "use server";

  await signOut({
    redirectTo: "/",
  });
}

function getRoleLabel(role?: string): string {
  switch (role) {
    case "ADMIN":
      return "Quản trị";
    case "MODERATOR":
      return "Kiểm duyệt";
    case "SELLER":
      return "Người bán";
    case "MEMBER":
      return "Thành viên";
    default:
      return "Độc giả";
  }
}

export async function Navbar() {
  const user = await getCurrentUser();
  let avatarUrl: string | null = null;
  let cartItemCount = 0;
  let unreadNotificationCount = 0;
  if (user && !user.isLocked) {
    try {
      // Hồ sơ, giỏ hàng và thông báo độc lập nên được lấy trong cùng một vòng chờ.
      const [profile, cart, notificationCount] = await Promise.all([
        prisma.profile.findUnique({
          where: { userId: user.id },
          select: { avatarUrl: true },
        }),
        prisma.order.findFirst({
          where: {
            buyerId: user.id,
            status: "PENDING",
            paymentMethod: null,
          },
          orderBy: {
            updatedAt: "desc",
          },
          select: {
            items: {
              select: {
                quantity: true,
              },
            },
          },
        }),
        prisma.notification.count({
          where: {
            userId: user.id,
            readAt: null,
          },
        }),
      ]);
      avatarUrl = profile?.avatarUrl ?? null;
      cartItemCount = cart?.items.reduce((total, item) => total + item.quantity, 0) ?? 0;
      unreadNotificationCount = notificationCount;
    } catch {
      // Trang tĩnh/diagnostic vẫn phải hiển thị được khi database local tạm dừng.
      console.warn("[Navbar] Database không khả dụng; điều hướng đang dùng thông tin session tối thiểu.");
    }
  }
  const activeUser = user && !user.isLocked ? user : null;
  const effectiveRole = activeUser?.role;
  const effectiveName = activeUser?.name;
  const effectiveAvatar = avatarUrl;
  const canOpenAdmin = effectiveRole === "ADMIN" || effectiveRole === "MODERATOR";
  const canOpenSeller = effectiveRole === "SELLER" || effectiveRole === "ADMIN";

  return (
    <header className="bv-navbar sticky top-0 z-50 border-b border-[#1D2433]/10 bg-[#FAF8F2]/90 shadow-[0_8px_28px_rgba(37,49,56,0.08)] backdrop-blur-xl">
      <nav className="mx-auto flex min-h-[72px] w-full max-w-[1800px] items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link className="flex shrink-0 items-center gap-3 text-[#1D2433]" href="/">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#176B62] text-[#FFFDF8] shadow-[0_12px_24px_rgba(23,107,98,0.24)]">
            <BookOpen className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="grid leading-none">
            <span className="bv-editorial text-xl font-bold tracking-tight">BookVerse</span>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#C65D43]">Thư viện AI</span>
          </span>
        </Link>

        {canOpenAdmin ? (
          <div className="hidden flex-1 items-center gap-3 lg:flex">
            <span className="inline-flex items-center gap-2 rounded-lg border border-[#176B62]/20 bg-[#EDF7F5] px-3 py-1.5 text-xs font-black text-[#176B62]">
              <ShieldCheck className="h-4 w-4 text-[#176B62]" />
              Trung tâm Quản trị Hệ thống
            </span>
            <span className="text-xs text-[#5F6877]">
              Điều hành số liệu, kiểm duyệt sách &amp; tài khoản người dùng
            </span>
          </div>
        ) : (
          <form action="/catalog" className="relative hidden min-w-64 flex-1 lg:block">
            <Search
              className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#66706B]"
              aria-hidden="true"
            />
            <Input
              aria-label="Tìm kiếm sách"
              className="h-11 border-[#1D2433]/10 bg-white pl-12 text-base text-[#1D2433] shadow-none placeholder:text-[#8A92A0]"
              name="q"
              placeholder="Tìm sách, tác giả, chủ đề..."
              type="search"
            />
          </form>
        )}

        <div className="ml-auto hidden items-center gap-2 md:flex">
          {user ? (
            <Link
              className="relative inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg border border-[#1D2433]/10 bg-white px-3 py-2 text-sm font-bold text-[#1D2433] shadow-sm transition hover:border-[#176B62]/35 hover:bg-[#F2F9F7]"
              href="/notifications"
            >
              <Bell className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">Thông báo</span>
              {unreadNotificationCount ? (
                <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-[#C65D43] px-1.5 py-0.5 text-center text-[10px] font-black text-white">
                  {unreadNotificationCount}
                </span>
              ) : null}
            </Link>
          ) : null}

          {canOpenAdmin ? (
            <Link
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#176B62] px-4 py-2 text-sm font-bold text-[#FFFDF8] shadow-[0_10px_24px_rgba(23,107,98,0.18)] transition hover:bg-[#104C47]"
              href="/admin"
            >
              <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
              Bảng điều hành
            </Link>
          ) : (
            <Link
              className="relative inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#1D2433]/10 bg-white px-4 py-2 text-sm font-bold text-[#1D2433] shadow-sm transition hover:border-[#176B62]/35 hover:bg-[#F2F9F7]"
              href="/cart"
            >
              <ShoppingCart className="h-4 w-4" aria-hidden="true" />
              Giỏ hàng
              {cartItemCount > 0 ? (
                <span className="absolute -right-1.5 -top-1.5 min-w-5 rounded-full bg-[#C65D43] px-1.5 py-0.5 text-center text-[10px] font-black text-white">
                  {cartItemCount > 99 ? "99+" : cartItemCount}
                </span>
              ) : null}
            </Link>
          )}

          {user ? (
            <>
              <Link
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#1D2433]/10 bg-white px-4 py-2 text-sm font-bold text-[#1D2433] shadow-sm transition hover:border-[#176B62]/35 hover:bg-[#F2F9F7]"
                href="/profile"
              >
                {effectiveAvatar ? (
                  <img
                    alt=""
                    className="h-6 w-6 rounded-full object-cover"
                    height="24"
                    referrerPolicy="no-referrer"
                    src={effectiveAvatar}
                    width="24"
                  />
                ) : (
                  <UserCircle className="h-4 w-4" aria-hidden="true" />
                )}
                <span className="max-w-36 truncate">{effectiveName ?? "Tài khoản"}</span>
                <span className="rounded-full bg-[#E6F3F0] px-2 py-0.5 text-xs text-[#176B62]">
                  {getRoleLabel(effectiveRole)}
                </span>
              </Link>
              <form action={logoutAction}>
                <button
                  className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#F1E3BD] px-4 py-2 text-sm font-bold text-[#6F4B08] shadow-sm transition hover:bg-[#E8D29A]"
                  type="submit"
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  Đăng xuất
                </button>
              </form>
            </>
          ) : (
            <Link
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#176B62] px-4 py-2 text-sm font-bold text-[#FFFDF8] shadow-[0_10px_24px_rgba(23,107,98,0.18)] transition hover:bg-[#104C47]"
              href="/login"
            >
              <LogIn className="h-4 w-4" aria-hidden="true" />
              Đăng nhập
            </Link>
          )}
        </div>

        <details className="group lg:hidden">
          <summary
            aria-label="Mở menu điều hướng"
            className="flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-lg border border-[#1D2433]/10 bg-white text-[#1D2433] shadow-sm transition hover:bg-[#F2F9F7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#176B62]"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
            <span className="sr-only">Mở menu</span>
          </summary>
          <div className="bookverse-mobile-nav-panel absolute left-0 right-0 top-[73px] border-t border-[#1D2433]/10 bg-[#FAF8F2]/95 px-4 py-4 shadow-lg backdrop-blur-xl">
            {canOpenAdmin ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 rounded-lg border border-[#176B62]/20 bg-[#EDF7F5] px-3.5 py-2 text-xs font-black text-[#176B62]">
                  <ShieldCheck className="h-4 w-4" />
                  <span>Quản trị &amp; Điều hành Hệ thống</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#1D2433]/10 bg-white px-3 py-2 text-xs font-bold text-[#1D2433]"
                    href="/admin"
                  >
                    <LayoutDashboard className="h-4 w-4 text-[#176B62]" /> Bảng điều hành
                  </Link>
                  <Link
                    className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#1D2433]/10 bg-white px-3 py-2 text-xs font-bold text-[#1D2433]"
                    href="/admin/statistics"
                  >
                    <TrendingUp className="h-4 w-4 text-[#176B62]" /> Báo cáo &amp; Thống kê
                  </Link>
                  <Link
                    className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#1D2433]/10 bg-white px-3 py-2 text-xs font-bold text-[#1D2433]"
                    href="/admin/membership-plans"
                  >
                    <Crown className="h-4 w-4 text-[#176B62]" /> Gói hội viên
                  </Link>
                  <Link
                    className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#1D2433]/10 bg-white px-3 py-2 text-xs font-bold text-[#1D2433]"
                    href="/admin/subscriptions"
                  >
                    <CreditCard className="h-4 w-4 text-[#176B62]" /> Đăng ký hội viên
                  </Link>
                  <Link
                    className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#1D2433]/10 bg-white px-3 py-2 text-xs font-bold text-[#1D2433]"
                    href="/admin/data-quality"
                  >
                    <ShieldCheck className="h-4 w-4 text-[#176B62]" /> Dữ liệu &amp; Lỗi
                  </Link>
                  <Link
                    className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#1D2433]/10 bg-white px-3 py-2 text-xs font-bold text-[#1D2433]"
                    href="/"
                  >
                    <Store className="h-4 w-4 text-[#176B62]" /> Xem sàn sách
                  </Link>
                </div>
                <div className="grid gap-2 border-t border-[#1D2433]/10 pt-3">
                  <Link
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[#1D2433]/10 bg-white px-4 py-2 text-sm font-bold text-[#1D2433]"
                    href="/profile"
                  >
                    <UserCircle className="h-4 w-4" />
                    {effectiveName ?? "Tài khoản"}
                  </Link>
                  <form action={logoutAction}>
                    <button
                      className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#F1E3BD] px-4 py-2 text-sm font-bold text-[#6F4B08]"
                      type="submit"
                    >
                      <LogOut className="h-4 w-4" />
                      Đăng xuất
                    </button>
                  </form>
                </div>
              </div>
            ) : (
              <>
                <form action="/catalog" className="relative">
                  <Search
                    className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#66706B]"
                    aria-hidden="true"
                  />
                  <Input
                    aria-label="Tìm kiếm sách"
                    className="h-11 border-[#1D2433]/10 bg-white pl-12 text-[#1D2433] placeholder:text-[#8A92A0]"
                    name="q"
                    placeholder="Tìm sách..."
                    type="search"
                  />
                </form>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Link className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#EDF7F5] px-3 py-2 text-sm font-bold text-[#176B62]" href="/catalog">
                    <Search className="h-4 w-4" aria-hidden="true" /> Danh mục
                  </Link>
                  <Link className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#EDF7F5] px-3 py-2 text-sm font-bold text-[#176B62]" href="/membership">
                    <BookOpen className="h-4 w-4" aria-hidden="true" /> Hội viên
                  </Link>
                  {canOpenSeller ? (
                    <Link
                      className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-[#536071] hover:bg-[#E6F3F0] hover:text-[#176B62]"
                      href="/seller"
                    >
                      <Store className="h-4 w-4" aria-hidden="true" />
                      Seller
                    </Link>
                  ) : null}
                </div>

                <div className="mt-4 grid gap-2">
                  <Link
                    className="relative inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#1D2433]/10 bg-white px-4 py-2 text-sm font-bold text-[#1D2433] transition hover:bg-[#F2F9F7]"
                    href="/cart"
                  >
                    <ShoppingCart className="h-4 w-4" aria-hidden="true" />
                    Giỏ hàng
                    {cartItemCount > 0 ? (
                      <span className="rounded-full bg-[#C65D43] px-2 py-0.5 text-xs font-black text-white">
                        {cartItemCount > 99 ? "99+" : cartItemCount}
                      </span>
                    ) : null}
                  </Link>
                  {user ? (
                    <>
                      <Link
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[#1D2433]/10 bg-white px-4 py-2 text-sm font-bold text-[#1D2433] transition hover:bg-[#F2F9F7]"
                        href="/notifications"
                      >
                        <Bell className="h-4 w-4" aria-hidden="true" />
                        Thông báo
                        {unreadNotificationCount ? (
                          <span className="rounded-full bg-[#C65D43] px-2 py-0.5 text-xs font-black text-white">
                            {unreadNotificationCount}
                          </span>
                        ) : null}
                      </Link>
                      <Link
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[#1D2433]/10 bg-white px-4 py-2 text-sm font-bold text-[#1D2433] transition hover:bg-[#F2F9F7]"
                        href="/profile"
                      >
                        <UserCircle className="h-4 w-4" aria-hidden="true" />
                        {effectiveName ?? "Tài khoản"}
                      </Link>
                      <form action={logoutAction}>
                        <button
                          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#F1E3BD] px-4 py-2 text-sm font-bold text-[#6F4B08] transition hover:bg-[#E8D29A]"
                          type="submit"
                        >
                          <LogOut className="h-4 w-4" aria-hidden="true" />
                          Đăng xuất
                        </button>
                      </form>
                    </>
                  ) : (
                    <Link
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#176B62] px-4 py-2 text-sm font-bold text-[#FFFDF8] transition hover:bg-[#104C47]"
                      href="/login"
                    >
                      <LogIn className="h-4 w-4" aria-hidden="true" />
                      Đăng nhập
                    </Link>
                  )}
                </div>
              </>
            )}
          </div>
        </details>
      </nav>
      <AppNavigation
        canOpenAdmin={canOpenAdmin}
        canOpenSeller={canOpenSeller}
        isAuthenticated={Boolean(user && activeUser)}
      />
    </header>
  );
}
