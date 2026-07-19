import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Bell,
  Bot,
  BookMarked,
  BookOpen,
  Home,
  LayoutDashboard,
  LibraryBig,
  LogIn,
  LogOut,
  Menu,
  Search,
  ShoppingCart,
  Store,
  UserCircle,
  Users,
} from "lucide-react";
import { auth, signOut } from "@/auth";
import { getNotificationCenterData } from "@/actions/notification.actions";
import { Input } from "@/components/ui/input";
import prisma from "@/lib/prisma";

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

const navItems: NavItem[] = [
  { label: "Trang chủ", href: "/", icon: Home },
  { label: "Danh mục sách", href: "/catalog", icon: LibraryBig },
  { label: "Thư viện", href: "/library", icon: BookMarked },
  { label: "Chợ sách cũ", href: "/marketplace", icon: Store },
  { label: "Cộng đồng", href: "/community", icon: Users },
  { label: "Trợ lý AI", href: "/assistant", icon: Bot },
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
];

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
  let currentUser: { name: string; role: string; isLocked: boolean } | null = null;
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
        },
      });
    } catch {
      // Trang tĩnh/diagnostic vẫn phải hiển thị được khi database local tạm dừng.
      console.error("[Navbar] Database không khả dụng; điều hướng đang dùng thông tin session tối thiểu.");
    }
  }
  const activeUser = currentUser && !currentUser.isLocked ? currentUser : null;
  const effectiveRole = activeUser?.role;
  const effectiveName = activeUser?.name ?? user?.name;
  const canOpenAdmin = effectiveRole === "ADMIN" || effectiveRole === "MODERATOR";
  const canOpenSeller = effectiveRole === "SELLER" || effectiveRole === "ADMIN";
  const notificationData = user && activeUser ? await getNotificationCenterData(6) : null;

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/78 shadow-[0_18px_60px_rgba(0,0,0,0.28)] backdrop-blur-2xl">
      <nav className="mx-auto flex min-h-[72px] w-full max-w-[1800px] items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link className="flex shrink-0 items-center gap-3 text-zinc-50" href="/">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0F766E] text-[#FFFDF8] shadow-[0_14px_30px_rgba(15,118,110,0.24)]">
            <BookOpen className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="grid leading-none">
            <span className="text-lg font-black tracking-tight">BookVerse</span>
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#E76F51]">Thư viện AI</span>
          </span>
        </Link>

        <form action="/catalog" className="relative hidden min-w-64 flex-1 lg:block">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#66706B]"
            aria-hidden="true"
          />
          <Input
            aria-label="Tìm kiếm sách"
            className="h-11 border-white/10 bg-white/[0.07] pl-12 text-base text-zinc-100 shadow-none placeholder:text-zinc-500"
            name="q"
            placeholder="Tìm sách, tác giả, chủ đề..."
            type="search"
          />
        </form>

        <div className="hidden items-center gap-1 2xl:flex">
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-zinc-300 transition hover:bg-white/[0.08] hover:text-[#F2C14E]"
                href={item.href}
                key={item.href}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
          {canOpenAdmin ? (
            <Link
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-zinc-300 transition hover:bg-white/[0.08] hover:text-[#F2C14E]"
              href="/admin"
            >
              <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
              Admin
            </Link>
          ) : null}
          {canOpenSeller ? (
            <Link
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-zinc-300 transition hover:bg-white/[0.08] hover:text-[#F2C14E]"
              href="/seller"
            >
              <Store className="h-4 w-4" aria-hidden="true" />
              Seller
            </Link>
          ) : null}
        </div>

        <div className="ml-auto hidden items-center gap-2 md:flex">
          {user ? (
            <Link
              className="relative inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.07] px-3 py-2 text-sm font-bold text-zinc-100 shadow-[0_10px_28px_rgba(0,0,0,0.18)] transition hover:border-[#F2C14E]/35 hover:bg-white/[0.11]"
              href="/notifications"
            >
              <Bell className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">Thông báo</span>
              {notificationData?.unreadCount ? (
                <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-[#F2C14E] px-1.5 py-0.5 text-center text-[10px] font-black text-slate-950">
                  {notificationData.unreadCount}
                </span>
              ) : null}
            </Link>
          ) : null}

          <Link
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.07] px-4 py-2 text-sm font-bold text-zinc-100 shadow-[0_10px_28px_rgba(0,0,0,0.18)] transition hover:border-[#F2C14E]/35 hover:bg-white/[0.11]"
            href="/cart"
          >
            <ShoppingCart className="h-4 w-4" aria-hidden="true" />
            Giỏ hàng
          </Link>

          {user ? (
            <>
              <Link
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.07] px-4 py-2 text-sm font-bold text-zinc-100 shadow-[0_10px_28px_rgba(0,0,0,0.18)] transition hover:border-[#F2C14E]/35 hover:bg-white/[0.11]"
                href="/profile"
              >
                <UserCircle className="h-4 w-4" aria-hidden="true" />
                <span className="max-w-36 truncate">{effectiveName ?? "Tài khoản"}</span>
                <span className="rounded-full bg-[#F2C14E]/25 px-2 py-0.5 text-xs text-[#8A5C00]">
                  {getRoleLabel(effectiveRole)}
                </span>
              </Link>
              <form action={logoutAction}>
                <button
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#D6A84F] px-4 py-2 text-sm font-bold text-slate-950 shadow-[0_10px_24px_rgba(214,168,79,0.18)] transition hover:bg-[#F2C14E]"
                  type="submit"
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  Đăng xuất
                </button>
              </form>
            </>
          ) : (
            <Link
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#0F766E] px-4 py-2 text-sm font-bold text-[#FFFDF8] shadow-[0_10px_24px_rgba(15,118,110,0.22)] transition hover:bg-[#0F5F59]"
              href="/login"
            >
              <LogIn className="h-4 w-4" aria-hidden="true" />
              Đăng nhập
            </Link>
          )}
        </div>

        <details className="group 2xl:hidden">
          <summary className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-lg border border-white/10 bg-white/[0.07] text-zinc-100 shadow-[0_10px_28px_rgba(0,0,0,0.18)] transition hover:bg-white/[0.11]">
            <Menu className="h-5 w-5" aria-hidden="true" />
            <span className="sr-only">Mở menu</span>
          </summary>
          <div className="bookverse-mobile-nav-panel absolute left-0 right-0 top-[73px] border-t border-white/10 bg-slate-950/95 px-4 py-4 shadow-lg backdrop-blur-2xl">
            <form action="/catalog" className="relative">
              <Search
                className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#66706B]"
                aria-hidden="true"
              />
              <Input
                aria-label="Tìm kiếm sách"
                className="h-11 border-white/10 bg-white/[0.07] pl-12 text-zinc-100 placeholder:text-zinc-500"
                name="q"
                placeholder="Tìm sách..."
                type="search"
              />
            </form>

            <div className="mt-4 grid gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;

                return (
                  <Link
                    className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-zinc-300 hover:bg-white/[0.08] hover:text-[#F2C14E]"
                    href={item.href}
                    key={item.href}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {item.label}
                  </Link>
                );
              })}
              {canOpenAdmin ? (
                <Link
                  className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-zinc-300 hover:bg-white/[0.08] hover:text-[#F2C14E]"
                  href="/admin"
                >
                  <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
                  Admin
                </Link>
              ) : null}
              {canOpenSeller ? (
                <Link
                  className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-zinc-300 hover:bg-white/[0.08] hover:text-[#F2C14E]"
                  href="/seller"
                >
                  <Store className="h-4 w-4" aria-hidden="true" />
                  Seller
                </Link>
              ) : null}
            </div>

            <div className="mt-4 grid gap-2">
              <Link
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.07] px-4 py-2 text-sm font-bold text-zinc-100 transition hover:bg-white/[0.11]"
                href="/cart"
              >
                <ShoppingCart className="h-4 w-4" aria-hidden="true" />
                Giỏ hàng
              </Link>
              <Link
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.07] px-4 py-2 text-sm font-bold text-zinc-100 transition hover:bg-white/[0.11]"
                href="/notifications"
              >
                <Bell className="h-4 w-4" aria-hidden="true" />
                Thông báo
                {notificationData?.unreadCount ? (
                  <span className="rounded-full bg-[#F2C14E] px-2 py-0.5 text-xs font-black text-slate-950">
                    {notificationData.unreadCount}
                  </span>
                ) : null}
              </Link>
              <Link
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.07] px-4 py-2 text-sm font-bold text-zinc-100 transition hover:bg-white/[0.11]"
                href="/assistant"
              >
                <Bot className="h-4 w-4" aria-hidden="true" />
                Trợ lý AI
              </Link>
              {user ? (
                <>
                  <Link
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.07] px-4 py-2 text-sm font-bold text-zinc-100 transition hover:bg-white/[0.11]"
                    href="/profile"
                  >
                    <UserCircle className="h-4 w-4" aria-hidden="true" />
                    {effectiveName ?? "Tài khoản"}
                  </Link>
                  <form action={logoutAction}>
                    <button
                      className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#D6A84F] px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-[#F2C14E]"
                      type="submit"
                    >
                      <LogOut className="h-4 w-4" aria-hidden="true" />
                      Đăng xuất
                    </button>
                  </form>
                </>
              ) : (
                <Link
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#0F766E] px-4 py-2 text-sm font-bold text-[#FFFDF8] transition hover:bg-[#0F5F59]"
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
    </header>
  );
}
