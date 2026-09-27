import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => (
    <input
      className={cn(
        "flex h-11 w-full rounded-xl border border-bv-border bg-bv-ivory px-3.5 py-2 text-base text-bv-heading shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] outline-none transition-all placeholder:text-[#7A817C] focus:border-bv-focus focus:ring-2 focus:ring-bv-focus/25 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm",
        className,
      )}
      ref={ref}
      type={type}
      {...props}
    />
  ),
);

Input.displayName = "Input";

export { Input };
