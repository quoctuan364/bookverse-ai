"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { LucideIcon } from "lucide-react";
import {
  Bot,
  BookMarked,
  Compass,
  CreditCard,
  Crown,
  FileSpreadsheet,
  Home,
  LayoutDashboard,
  LibraryBig,
  MessageCircle,
  ShieldCheck,
  Store,
  TrendingUp,
  UserCircle,
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

// Điều hướng dành cho độc giả / người dùng thông thường
const primaryItems: NavigationItem[] = [
  { label: "Trang chủ", href: "/", icon: Home },
  { label: "Khám phá sách", href: "/catalog", icon: LibraryBig },
  { label: "Kho đọc", href: "/read", icon: BookMarked },
  { label: "Gợi ý cho bạn", href: "/discover", icon: Compass },
  { label: "Cộng đồng", href: "/community", icon: MessageCircle },
  { label: "Chợ sách", href: "/marketplace", icon: Store },
  { label: "Nova", href: "/assistant", icon: Bot },
  { label: "Hội viên", href: "/membership", icon: Crown },
];

const mobileItems: NavigationItem[] = [
  { label: "Trang chủ", shortLabel: "Trang chủ", href: "/", icon: Home },
  { label: "Khám phá sách", shortLabel: "Khám phá", href: "/catalog", icon: LibraryBig },
  { label: "Kho đọc", shortLabel: "Đọc", href: "/read", icon: BookMarked },
  { label: "Nova", shortLabel: "Nova", href: "/assistant", icon: Bot },
];

// Điều hướng chuyên biệt dành cho tài khoản Quản trị viên / Kiểm duyệt viên
const adminDesktopItems: NavigationItem[] = [
  { label: "Bảng điều hành", href: "/admin", icon: LayoutDashboard },
  { label: "Báo cáo & Thống kê", href: "/admin/statistics", icon: TrendingUp },
  { label: "Gói hội viên", href: "/admin/membership-plans", icon: Crown },
  { label: "Đăng ký hội viên", href: "/admin/subscriptions", icon: CreditCard },
  { label: "Kiểm duyệt sách", href: "/admin/data-quality", icon: ShieldCheck },
  { label: "Dữ liệu & AI", href: "/admin/research-data", icon: FileSpreadsheet },
  { label: "Xem sàn người dùng", href: "/", icon: Store },
];

const adminMobileItems: NavigationItem[] = [
  { label: "Bảng điều hành", shortLabel: "Tổng quan", href: "/admin", icon: LayoutDashboard },
  { label: "Thống kê", shortLabel: "Thống kê", href: "/admin/statistics", icon: TrendingUp },
  { label: "Gói hội viên", shortLabel: "Gói cước", href: "/admin/membership-plans", icon: Crown },
  { label: "Kiểm duyệt", shortLabel: "Kiểm duyệt", href: "/admin/data-quality", icon: ShieldCheck },
];

function isCurrentPath(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/";
  }
  if (href === "/admin") {
    return pathname === "/admin";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppNavigation({
  isAuthenticated,
  canOpenAdmin,
  canOpenSeller,
}: AppNavigationProps) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentPath = pathname || "";
  // Chỉ ẩn với tài khoản thông thường khi ở trong admin
  if (currentPath.startsWith("/admin") && !canOpenAdmin) {
    return null;
  }

  const hideMobileNavigation =
    currentPath === "/login" ||
    currentPath === "/register" ||
    currentPath === "/forgot-password" ||
    currentPath === "/reset-password" ||
    currentPath.startsWith("/read/");

  const accountItem: NavigationItem = {
    label: isAuthenticated ? (canOpenAdmin ? "Hồ sơ quản trị" : "Tài khoản") : "Đăng nhập",
    shortLabel: isAuthenticated ? (canOpenAdmin ? "Hồ sơ" : "Tài khoản") : "Đăng nhập",
    href: isAuthenticated ? "/profile" : "/login",
    icon: UserCircle,
  };

  // Tài khoản Admin CHỈ hiển thị các công cụ quản lý hệ thống, không hiển thị trang độc giả
  const desktopItems = canOpenAdmin
    ? adminDesktopItems
    : [
        ...primaryItems,
        ...(isAuthenticated
          ? [{ label: "Thư viện của tôi", href: "/library", icon: BookMarked }]
          : []),
        ...(canOpenSeller ? [{ label: "Đăng bán sách", href: "/seller/listings/new", icon: Store }] : []),
      ];

  const quickItems = canOpenAdmin
    ? [...adminMobileItems, accountItem]
    : [...mobileItems, accountItem];

  return (
    <>
      <div className="hidden border-t border-bv-ink/8 bg-bv-ivory/90 backdrop-blur-sm lg:block">
        <nav
          aria-label="Điều hướng chính"
          className="bv-scrollbar mx-auto flex min-h-12 w-full max-w-[1800px] items-center gap-0.5 overflow-x-auto px-6 lg:px-8"
        >
          {desktopItems.map((item) => {
            const Icon = item.icon;
            const active = isCurrentPath(pathname, item.href);

            return (
              <Link
                aria-current={active ? "page" : undefined}
                className={`group relative inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg px-3.5 text-sm font-bold transition-all duration-200 ${
                  active
                    ? "bg-bv-primary/8 text-bv-primary-dark shadow-sm"
                    : "text-[#5F6877] hover:bg-bv-primary/5 hover:text-bv-primary"
                }`}
                href={item.href}
                key={item.href}
                prefetch={true}
              >
                <Icon
                  className={`h-4 w-4 transition-colors ${
                    active ? "text-bv-primary" : "text-[#7A817C] group-hover:text-bv-primary"
                  }`}
                  aria-hidden="true"
                />
                {item.label}
                {active && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-3 bottom-0.5 h-[2.5px] rounded-full bg-gradient-to-r from-bv-primary/80 via-bv-primary to-bv-primary/80"
                  />
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {mounted && !hideMobileNavigation
        ? createPortal(
        <nav
          aria-label="Điều hướng nhanh trên điện thoại"
          className={`fixed inset-x-0 bottom-0 z-[65] grid min-h-[4.5rem] border-t border-bv-ink/8 bg-bv-ivory px-1 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_32px_rgba(37,49,56,0.1)] lg:hidden ${
            canOpenAdmin ? "grid-cols-4" : "grid-cols-5"
          }`}
        >
          {quickItems.map((item) => {
            const Icon = item.icon;
            const active = isCurrentPath(pathname, item.href);

            return (
              <Link
                aria-current={active ? "page" : undefined}
                aria-label={item.label}
                className={`relative flex min-h-[4.5rem] flex-col items-center justify-center gap-1 px-1 py-2 text-xs font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-bv-primary ${
                  active ? "text-bv-primary-dark" : "text-[#5F6877] hover:text-bv-primary"
                }`}
                href={item.href}
                key={item.href}
                prefetch={true}
              >
                <span
                  className={`flex h-9 w-12 items-center justify-center rounded-xl transition-all duration-200 ${
                    active
                      ? "bg-gradient-to-b from-bv-primary/12 to-bv-primary/6 text-bv-primary shadow-sm"
                      : "text-[#5F6877] hover:bg-bv-primary/5 hover:text-bv-primary"
                  }`}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="max-w-full truncate">{item.shortLabel ?? item.label}</span>
                {active && (
                  <span
                    aria-hidden="true"
                    className="absolute bottom-0 left-1/2 h-1 w-6 -translate-x-1/2 rounded-t-full bg-bv-primary"
                  />
                )}
              </Link>
            );
          })}
        </nav>
          ,
          document.body,
        )
        : null}
    </>
  );
}
