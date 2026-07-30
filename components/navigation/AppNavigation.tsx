"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  Bot,
  BookMarked,
  Compass,
  Crown,
  Home,
  LayoutDashboard,
  LibraryBig,
  Store,
  UserCircle,
  Users,
} from "lucide-react";

interface NavigationItem {
  label: string;
  shortLabel?: string;
  href: string;
  icon: LucideIcon;
}

interface AppNavigationProps {
  isAuthenticated: boolean;
  canOpenAdmin: boolean;
  canOpenSeller: boolean;
}

const primaryItems: NavigationItem[] = [
  { label: "Trang chủ", href: "/", icon: Home },
  { label: "Danh mục", href: "/catalog", icon: LibraryBig },
  { label: "Khám phá", href: "/discover", icon: Compass },
  { label: "Kho đọc", href: "/read", icon: BookMarked },
  { label: "Hội viên", href: "/membership", icon: Crown },
  { label: "Chợ sách", href: "/marketplace", icon: Store },
  { label: "Cộng đồng", href: "/community", icon: Users },
  { label: "Trợ lý AI", href: "/assistant", icon: Bot },
];

const mobileItems: NavigationItem[] = [
  { label: "Trang chủ", shortLabel: "Trang chủ", href: "/", icon: Home },
  { label: "Khám phá sách", shortLabel: "Khám phá", href: "/discover", icon: Compass },
  { label: "Kho đọc", shortLabel: "Kho đọc", href: "/read", icon: BookMarked },
  { label: "Trợ lý AI", shortLabel: "Trợ lý", href: "/assistant", icon: Bot },
];

function isCurrentPath(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function AppNavigation({
  isAuthenticated,
  canOpenAdmin,
  canOpenSeller,
}: AppNavigationProps) {
  const pathname = usePathname();
  const hideMobileNavigation =
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password" ||
    pathname.startsWith("/read/") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/membership/checkout") ||
    pathname.startsWith("/membership/payment");
  const accountItem: NavigationItem = {
    label: isAuthenticated ? "Tài khoản" : "Đăng nhập",
    shortLabel: isAuthenticated ? "Tài khoản" : "Đăng nhập",
    href: isAuthenticated ? "/profile" : "/login",
    icon: UserCircle,
  };
  const desktopItems = [
    ...primaryItems,
    ...(canOpenSeller ? [{ label: "Kênh người bán", href: "/seller", icon: Store }] : []),
    ...(canOpenAdmin
      ? [{ label: "Quản trị", href: "/admin", icon: LayoutDashboard }]
      : []),
  ];

  return (
    <>
      <div className="hidden border-t border-[#1D2433]/8 bg-[#FFFDF8]/88 lg:block">
        <nav
          aria-label="Điều hướng chính"
          className="bv-scrollbar mx-auto flex min-h-12 w-full max-w-[1800px] items-center gap-1 overflow-x-auto px-6 lg:px-8"
        >
          {desktopItems.map((item) => {
            const Icon = item.icon;
            const active = isCurrentPath(pathname, item.href);

            return (
              <Link
                aria-current={active ? "page" : undefined}
                className={`group relative inline-flex min-h-12 shrink-0 items-center gap-2 px-3 text-sm font-bold transition-colors duration-200 ${
                  active
                    ? "text-[#104C47]"
                    : "text-[#5F6877] hover:text-[#176B62]"
                }`}
                href={item.href}
                key={item.href}
              >
                <Icon
                  className={`h-4 w-4 transition-colors ${
                    active ? "text-[#C65D43]" : "text-[#7A817C] group-hover:text-[#176B62]"
                  }`}
                  aria-hidden="true"
                />
                {item.label}
                <span
                  aria-hidden="true"
                  className={`absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-[#176B62] transition-transform duration-200 ${
                    active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                  }`}
                />
              </Link>
            );
          })}
        </nav>
      </div>

      {!hideMobileNavigation ? (
        <nav
          aria-label="Điều hướng nhanh trên điện thoại"
          className="fixed inset-x-0 bottom-0 z-[65] grid min-h-[4.5rem] grid-cols-5 border-t border-[#1D2433]/10 bg-[#FFFDF8]/96 px-1 pb-[env(safe-area-inset-bottom)] shadow-[0_-12px_32px_rgba(37,49,56,0.12)] backdrop-blur-xl lg:hidden"
        >
          {[...mobileItems, accountItem].map((item) => {
            const Icon = item.icon;
            const active = isCurrentPath(pathname, item.href);

            return (
              <Link
                aria-current={active ? "page" : undefined}
                aria-label={item.label}
                className={`relative flex min-h-[4.5rem] flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-xs font-bold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#176B62] ${
                  active ? "text-[#104C47]" : "text-[#687083] hover:bg-[#EDF7F5] hover:text-[#176B62]"
                }`}
                href={item.href}
                key={item.href}
              >
                <span
                  className={`flex h-8 w-10 items-center justify-center rounded-full transition-colors duration-200 ${
                    active ? "bg-[#DDF0EB] text-[#176B62]" : "text-[#687083]"
                  }`}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="max-w-full truncate">{item.shortLabel ?? item.label}</span>
              </Link>
            );
          })}
        </nav>
      ) : null}
    </>
  );
}
