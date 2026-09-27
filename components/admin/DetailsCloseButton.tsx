"use client";

import type { ReactNode } from "react";

export function DetailsCloseButton({
  children = "Đóng",
  className = "rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition",
}: {
  children?: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={className}
      onClick={(e) => {
        const details = e.currentTarget.closest("details");
        if (details) {
          details.open = false;
        }
      }}
    >
      {children}
    </button>
  );
}
