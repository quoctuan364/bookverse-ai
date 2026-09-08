import Link from "next/link";
import {
  Bell,
  BookOpen,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  Search,
  ShoppingCart,
  Store,
  UserCircle,
} from "lucide-react";
import { auth, signOut } from "@/auth";
import { getNotificationCenterData } from "@/actions/notification.actions";
import { AppNavigation } from "@/components/navigation/AppNavigation";
import { Input } from "@/components/ui/input";
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
    default:
      return "Độc giả";
  }
}

export async function Navbar() {
  const session = await auth();
  const user = session?.user;
  let currentUser: {
    name: string;
    role: string;
    isLocked: boolean;
    profile: { avatarUrl: string | null } | null;
  } | null = null;
  let cartItemCount = 0;
  if (user?.id) {
    try {
      currentUser = await prisma.user.findUnique({
        where: {
          id: user.id,
        },
        select: {
          name: true,
          role: true,
          isLocked: true,
          profile: {
            select: {
              avatarUrl: true,
            },
          },
        },
      });

      if (currentUser && !currentUser.isLocked) {
        const cart = await prisma.order.findFirst({
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
        });
        cartItemCount = cart?.items.reduce((total, item) => total + item.quantity, 0) ?? 0;
      }
    } catch {
      // Trang tĩnh/diagnostic vẫn phải hiển thị được khi database local tạm dừng.
      console.warn("[Navbar] Database không khả dụng; điều hướng đang dùng thông tin session tối thiểu.");
    }
  }
  const activeUser = currentUser && !currentUser.isLocked ? currentUser : null;
  const effectiveRole = activeUser?.role;
  const effectiveName = activeUser?.name ?? user?.name;
  const effectiveAvatar = activeUser?.profile?.avatarUrl ?? user?.image;
  const canOpenAdmin = effectiveRole === "ADMIN" || effectiveRole === "MODERATOR";
  const canOpenSeller = effectiveRole === "SELLER" || effectiveRole === "ADMIN";
  const notificationData = user && activeUser ? await getNotificationCenterData(6) : null;

  return (
    <header className="sticky top-0 z-50 border-b border-bv-ink/8 bg-[#FAF8F2]/92 shadow-[0_6px_24px_rgba(37,49,56,0.07)] backdrop-blur-2xl" style={{ borderTop: '2px solid transparent', backgroundImage: 'linear-gradient(#FAF8F2F0, #FAF8F2F0), linear-gradient(90deg, #176B62, #F2C14E, #176B62)', backgroundOrigin: 'border-box', backgroundClip: 'padding-box, border-box' }}>
      <nav className="mx-auto flex min-h-[72px] w-full max-w-[1800px] items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link className="flex shrink-0 items-center gap-3 text-bv-ink" href="/">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-bv-primary text-bv-ivory shadow-[0_8px_20px_rgba(23,107,98,0.30),_0_0_0_1px_rgba(23,107,98,0.12)]">
            <BookOpen className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="grid leading-none">
            <span className="bv-editorial text-xl font-bold tracking-tight">BookVerse</span>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-bv-accent">Thư viện AI</span>
          </span>
        </Link>

        <form action="/catalog" className="relative hidden min-w-64 flex-1 lg:block">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-bv-text-muted"
            aria-hidden="true"
          />
          <Input
            aria-label="Tìm kiếm sách"
            className="h-11 border-bv-ink/10 bg-white pl-12 text-base text-bv-ink shadow-none placeholder:text-[#5F6877]"
            name="q"
            placeholder="Tìm sách, tác giả, chủ đề..."
            type="search"
          />
        </form>

        <div className="ml-auto hidden items-center gap-2 md:flex">
          {user ? (
            <Link
              className="relative inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg border border-bv-ink/10 bg-white px-3 py-2 text-sm font-bold text-bv-ink shadow-sm transition hover:border-bv-primary/35 hover:bg-[#F2F9F7]"
              href="/notifications"
            >
              <Bell className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">Thông báo</span>
              {notificationData?.unreadCount ? (
                <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-bv-accent px-1.5 py-0.5 text-center text-[10px] font-black text-white">
                  {notificationData.unreadCount}
                </span>
              ) : null}
            </Link>
          ) : null}

          <Link
            className="relative inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-bv-ink/10 bg-white px-4 py-2 text-sm font-bold text-bv-ink shadow-sm transition hover:border-bv-primary/35 hover:bg-[#F2F9F7]"
            href="/cart"
          >
            <ShoppingCart className="h-4 w-4" aria-hidden="true" />
            Giỏ hàng
            {cartItemCount > 0 ? (
              <span className="absolute -right-1.5 -top-1.5 min-w-5 rounded-full bg-bv-accent px-1.5 py-0.5 text-center text-[10px] font-black text-white">
                {cartItemCount > 99 ? "99+" : cartItemCount}
              </span>
            ) : null}
          </Link>

          {user ? (
            <>
              <Link
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-bv-ink/10 bg-white px-4 py-2 text-sm font-bold text-bv-ink shadow-sm transition hover:border-bv-primary/35 hover:bg-[#F2F9F7]"
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
                <span className="rounded-full bg-bv-mint px-2 py-0.5 text-xs text-bv-primary">
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
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-bv-primary px-4 py-2 text-sm font-bold text-bv-ivory shadow-[0_10px_24px_rgba(23,107,98,0.18)] transition hover:bg-bv-primary-dark"
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
            className="flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-lg border border-bv-ink/10 bg-white text-bv-ink shadow-sm transition hover:bg-[#F2F9F7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bv-primary"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
            <span className="sr-only">Mở menu</span>
          </summary>
          <div className="bookverse-mobile-nav-panel absolute left-0 right-0 top-[73px] border-t border-bv-ink/10 bg-[#FAF8F2]/95 px-4 py-4 shadow-lg backdrop-blur-xl">
            <form action="/catalog" className="relative">
              <Search
                className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-bv-text-muted"
                aria-hidden="true"
              />
              <Input
                aria-label="Tìm kiếm sách"
                className="h-11 border-bv-ink/10 bg-white pl-12 text-bv-ink placeholder:text-[#5F6877]"
                name="q"
                placeholder="Tìm sách..."
                type="search"
              />
            </form>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <Link className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#EDF7F5] px-3 py-2 text-sm font-bold text-bv-primary" href="/catalog">
                <Search className="h-4 w-4" aria-hidden="true" /> Danh mục
              </Link>
              <Link className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#EDF7F5] px-3 py-2 text-sm font-bold text-bv-primary" href="/membership">
                <BookOpen className="h-4 w-4" aria-hidden="true" /> Hội viên
              </Link>
              <Link className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#EDF7F5] px-3 py-2 text-sm font-bold text-bv-primary" href="/community">
                <UserCircle className="h-4 w-4" aria-hidden="true" /> Cộng đồng
              </Link>
              <Link className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#EDF7F5] px-3 py-2 text-sm font-bold text-bv-primary" href="/marketplace">
                <Store className="h-4 w-4" aria-hidden="true" /> Chợ sách cũ
              </Link>
              {canOpenAdmin ? (
                <Link
                  className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-bv-text hover:bg-bv-mint hover:text-bv-primary"
                  href="/admin"
                >
                  <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
                  Admin
                </Link>
              ) : null}
              {canOpenSeller ? (
                <Link
                  className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-bv-text hover:bg-bv-mint hover:text-bv-primary"
                  href="/seller"
                >
                  <Store className="h-4 w-4" aria-hidden="true" />
                  Seller
                </Link>
              ) : null}
            </div>

            <div className="mt-4 grid gap-2">
              <Link
                className="relative inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-bv-ink/10 bg-white px-4 py-2 text-sm font-bold text-bv-ink transition hover:bg-[#F2F9F7]"
                href="/cart"
              >
                <ShoppingCart className="h-4 w-4" aria-hidden="true" />
                Giỏ hàng
                {cartItemCount > 0 ? (
                  <span className="rounded-full bg-bv-accent px-2 py-0.5 text-xs font-black text-white">
                    {cartItemCount > 99 ? "99+" : cartItemCount}
                  </span>
                ) : null}
              </Link>
              {user ? (
                <>
                  <Link
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-bv-ink/10 bg-white px-4 py-2 text-sm font-bold text-bv-ink transition hover:bg-[#F2F9F7]"
                    href="/notifications"
                  >
                    <Bell className="h-4 w-4" aria-hidden="true" />
                    Thông báo
                    {notificationData?.unreadCount ? (
                      <span className="rounded-full bg-bv-accent px-2 py-0.5 text-xs font-black text-white">
                        {notificationData.unreadCount}
                      </span>
                    ) : null}
                  </Link>
                  <Link
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-bv-ink/10 bg-white px-4 py-2 text-sm font-bold text-bv-ink transition hover:bg-[#F2F9F7]"
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
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-bv-primary px-4 py-2 text-sm font-bold text-bv-ivory transition hover:bg-bv-primary-dark"
                  href="/login"
                >
                  <LogIn className="h-4 w-4" aria-hidden="true" />
                  Đăng nhập
                </Link>
              )}
            </div>
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
