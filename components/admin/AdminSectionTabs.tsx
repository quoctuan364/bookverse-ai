"use client";

import Link from "next/link";
import {
  BookOpen,
  ClipboardList,
  Gauge,
  ShieldAlert,
  ShoppingBag,
  UserCheck,
} from "lucide-react";

interface AdminSectionTabsProps {
  counts: {
    users: number;
    books: number;
    orders?: number;
    pendingOrders?: number;
    reports: number;
    audit: number;
  };
  currentTab: string;
}

export function AdminSectionTabs({ counts, currentTab }: AdminSectionTabsProps) {
  const tabs = [
    {
      id: "overview",
      label: "Tổng quan",
      href: "/admin",
      icon: Gauge,
    },
    {
      id: "orders",
      label: "Đơn hàng & Duyệt đơn",
      href: "/admin?tab=orders",
      icon: ShoppingBag,
      count: counts.orders,
      urgent: (counts.pendingOrders ?? 0) > 0,
    },
    {
      id: "books",
      label: "Kho sách hệ thống",
      href: "/admin?tab=books",
      icon: BookOpen,
      count: counts.books,
    },
    {
      id: "users",
      label: "Tài khoản người dùng",
      href: "/admin?tab=users",
      icon: UserCheck,
      count: counts.users,
    },
    {
      id: "community",
      label: "An toàn cộng đồng",
      href: "/admin?tab=community",
      icon: ShieldAlert,
      count: counts.reports,
      urgent: counts.reports > 0,
    },
    {
      id: "audit",
      label: "Nhật ký quản trị",
      href: "/admin?tab=audit",
      icon: ClipboardList,
      count: counts.audit,
    },
  ];

  return (
    <nav
      aria-label="Các phân hệ quản trị"
      className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-slate-200 bg-white p-2 shadow-xs"
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = (currentTab || "overview") === tab.id;
        return (
          <Link
            key={tab.id}
            href={tab.href}
            className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-4 py-2 text-xs font-black transition-all ${
              isActive
                ? "bg-bv-primary text-white shadow-xs"
                : "bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-bv-primary"
            }`}
          >
            <Icon className={`h-4 w-4 ${isActive ? "text-white" : "text-slate-500"}`} />
            <span>{tab.label}</span>
            {typeof tab.count === "number" && (
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                  isActive
                    ? "bg-white/20 text-white"
                    : tab.urgent
                    ? "bg-amber-100 text-amber-900 ring-1 ring-amber-300"
                    : "bg-slate-200 text-slate-700"
                }`}
              >
                {tab.count.toLocaleString("vi-VN")}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
