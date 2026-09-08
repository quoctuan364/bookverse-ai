import * as React from "react";

import { cn } from "@/lib/utils";

type ButtonVariant = "default" | "outline" | "ghost" | "secondary" | "destructive";
type ButtonSize = "default" | "sm" | "lg" | "icon";

const variantClass: Record<ButtonVariant, string> = {
  default:
    "bg-bv-focus text-bv-ivory shadow-[0_8px_20px_rgba(15,118,110,0.22)] hover:bg-[#0F5F59] hover:shadow-[0_12px_24px_rgba(15,118,110,0.3)]",
  outline:
    "border border-bv-border bg-bv-ivory text-bv-heading shadow-[0_4px_12px_rgba(39,44,51,0.05)] hover:border-bv-focus/40 hover:bg-[#EDF7F5] hover:text-bv-focus",
  ghost: "text-bv-heading hover:bg-bv-muted/80 hover:text-bv-focus",
  secondary: "bg-bv-muted text-bv-primary-dark hover:bg-bv-muted/80",
  destructive: "bg-bv-accent text-white shadow-[0_8px_20px_rgba(169,68,50,0.25)] hover:bg-[#8F3525]"
};

const sizeClass: Record<ButtonSize, string> = {
  default: "min-h-11 px-4 py-2",
  sm: "min-h-9 px-3 text-xs",
  lg: "min-h-12 px-6 text-base",
  icon: "h-11 w-11"
};

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", type = "button", ...props }, ref) => (
    <button
      className={cn(
        "inline-flex cursor-pointer items-center justify-center whitespace-nowrap rounded-xl text-sm font-bold transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bv-focus focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:pointer-events-none disabled:opacity-50",
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
