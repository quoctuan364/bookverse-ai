import * as React from "react";

import { cn } from "@/lib/utils";

type ButtonVariant = "default" | "outline" | "ghost";
type ButtonSize = "default" | "sm" | "lg" | "icon";

const variantClass: Record<ButtonVariant, string> = {
  default:
    "bg-[#0F766E] text-[#FFFDF8] shadow-[0_10px_24px_rgba(15,118,110,0.22)] hover:bg-[#0F5F59]",
  outline:
    "border border-[#D8D0C2] bg-[#FFFDF8] text-[#17202A] shadow-[0_6px_18px_rgba(39,44,51,0.06)] hover:border-[#0F766E]/30 hover:bg-[#EDF7F5]",
  ghost: "text-[#17202A] hover:bg-[#EAF2EF]"
};

const sizeClass: Record<ButtonSize, string> = {
  default: "h-10 px-4 py-2",
  sm: "h-9 px-3",
  lg: "h-11 px-6",
  icon: "h-10 w-10"
};

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", type = "button", ...props }, ref) => (
    <button
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        variantClass[variant],
        sizeClass[size],
        className
      )}
      ref={ref}
      type={type}
      {...props}
    />
  )
);

Button.displayName = "Button";

export { Button };
