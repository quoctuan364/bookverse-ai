import * as React from "react";
import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "secondary" | "outline" | "destructive" | "success" | "gold";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: BadgeVariant;
}

const badgeVariants: Record<BadgeVariant, string> = {
  default: "border-transparent bg-bv-primary text-white shadow-sm",
  secondary: "border-transparent bg-bv-muted text-bv-primary-dark",
  outline: "border-bv-border bg-white/80 text-bv-heading",
  destructive: "border-transparent bg-bv-accent text-white shadow-sm",
  success: "border-transparent bg-emerald-600 text-white shadow-sm",
  gold: "border-transparent bg-[#F4D787] text-[#173A36] font-black",
};

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-bv-focus focus:ring-offset-2",
        badgeVariants[variant],
        className,
      )}
      {...props}
    />
  );
}
